import { z } from "zod";
import { ApiAuthError, createSupabaseAuthGuards, type AuthenticatedProfile } from "../_lib/auth";
import { json, jsonError, methodNotAllowed } from "../_lib/http";
import { assertTransition, OrderTransitionError } from "../_lib/orders";
import { orderStatuses, type OrderStatus } from "../../shared/operations";
import { createSupabaseAdmin } from "../_lib/supabaseAdmin";

const transitionInput = z.object({
  orderId: z.string().uuid(),
  nextStatus: z.enum(orderStatuses),
});

type OperationalOrder = {
  id: string;
  code: string;
  customerName: string;
  customerPhone: string;
  fulfillmentMethod: "delivery" | "pickup";
  deliveryAddress: string | null;
  customerNotes: string | null;
  totalInCents: number;
  status: OrderStatus;
  paymentMethod: string;
  paymentStatus: string;
  acknowledgedAt: string | null;
  createdAt: string;
  items: Array<{ productName: string; quantity: number; unitPriceInCents: number; configuration: unknown; notes: string | null }>;
};

export type OperationsOrdersDependencies = {
  requireStaff(request: Request): Promise<AuthenticatedProfile>;
  listOrders(): Promise<OperationalOrder[]>;
  transitionOrder(input: { orderId: string; nextStatus: OrderStatus; actorUserId: string }): Promise<{ id: string; status: OrderStatus }>;
};

function toErrorResponse(error: unknown): Response {
  if (error instanceof ApiAuthError) return jsonError(error.statusCode, error.message);
  if (error instanceof OrderTransitionError) return jsonError(409, error.message);
  return jsonError(500, error);
}

export function createOperationsOrdersHandler(dependencies: OperationsOrdersDependencies) {
  return async function operationsOrdersHandler(request: Request): Promise<Response> {
    try {
      const actor = await dependencies.requireStaff(request);

      if (request.method === "GET") return json(200, await dependencies.listOrders());
      if (request.method !== "PATCH") return methodNotAllowed(["GET", "PATCH"]);

      const input = transitionInput.safeParse(await request.json());
      if (!input.success) return jsonError(400, "Dados de transição inválidos.");

      return json(
        200,
        await dependencies.transitionOrder({
          ...input.data,
          actorUserId: actor.id,
        }),
      );
    } catch (error) {
      return toErrorResponse(error);
    }
  };
}

type RawOperationalItem = { product_name: string; quantity: number; unit_price_in_cents: number; configuration: unknown; notes: string | null };
type RawOperationalOrder = {
  id: string;
  code: string;
  customer_name: string;
  customer_phone: string;
  fulfillment_method: "delivery" | "pickup";
  delivery_address: string | null;
  customer_notes: string | null;
  total_in_cents: number;
  status: OrderStatus;
  payment_method: string;
  payment_status: string;
  created_at: string;
  order_items: RawOperationalItem[] | null;
};

async function listSupabaseOperationsOrders(): Promise<OperationalOrder[]> {
  const client = createSupabaseAdmin();
  const { data, error } = await client
    .from("orders")
    .select("id, code, customer_name, customer_phone, fulfillment_method, delivery_address, customer_notes, total_in_cents, status, payment_method, payment_status, created_at, order_items(product_name, quantity, unit_price_in_cents, configuration, notes)")
    .in("status", ["aguardando_pagamento", "confirmado", "em_preparo", "saiu_para_entrega", "pronto_para_retirada"])
    .order("created_at", { ascending: false });
  if (error) throw new Error("Não foi possível carregar a fila operacional.");

  const orderIds = (data ?? []).map((order) => order.id);
  const acknowledgedAtByOrderId = new Map<string, string>();
  if (orderIds.length > 0) {
    const { data: acknowledgements, error: acknowledgementError } = await client
      .from("order_events")
      .select("order_id, created_at")
      .in("order_id", orderIds)
      .eq("event_type", "alert_acknowledged")
      .order("created_at", { ascending: false });
    if (acknowledgementError) throw new Error("Não foi possível carregar os alertas operacionais.");
    for (const event of acknowledgements ?? []) {
      if (!acknowledgedAtByOrderId.has(event.order_id)) acknowledgedAtByOrderId.set(event.order_id, event.created_at);
    }
  }

  return ((data ?? []) as RawOperationalOrder[]).map((order) => ({
    id: order.id,
    code: order.code,
    customerName: order.customer_name,
    customerPhone: order.customer_phone,
    fulfillmentMethod: order.fulfillment_method,
    deliveryAddress: order.delivery_address,
    customerNotes: order.customer_notes,
    totalInCents: order.total_in_cents,
    status: order.status,
    paymentMethod: order.payment_method,
    paymentStatus: order.payment_status,
    acknowledgedAt: acknowledgedAtByOrderId.get(order.id) ?? null,
    createdAt: order.created_at,
    items: (order.order_items ?? []).map((item) => ({
      productName: item.product_name,
      quantity: item.quantity,
      unitPriceInCents: item.unit_price_in_cents,
      configuration: item.configuration,
      notes: item.notes,
    })),
  }));
}

async function transitionSupabaseOrder(input: { orderId: string; nextStatus: OrderStatus; actorUserId: string }) {
  const client = createSupabaseAdmin();
  const { data: currentOrder, error: currentError } = await client
    .from("orders")
    .select("id, status")
    .eq("id", input.orderId)
    .maybeSingle();
  if (currentError || !currentOrder) throw new Error("Pedido não encontrado.");

  assertTransition(currentOrder.status as OrderStatus, input.nextStatus);
  const { data: updatedOrder, error: updateError } = await client
    .from("orders")
    .update({ status: input.nextStatus })
    .eq("id", input.orderId)
    .eq("status", currentOrder.status)
    .select("id, status")
    .single();
  if (updateError || !updatedOrder) throw new Error("O pedido foi alterado por outro operador. Atualize a fila e tente novamente.");

  const { error: eventError } = await client.from("order_events").insert({
    order_id: updatedOrder.id,
    actor_user_id: input.actorUserId,
    event_type: "status_changed",
    from_status: currentOrder.status,
    to_status: input.nextStatus,
    message: "Status atualizado pela operação.",
  });
  if (eventError) throw new Error("Não foi possível registrar o histórico operacional.");

  return { id: updatedOrder.id, status: updatedOrder.status as OrderStatus };
}

export default function defaultOperationsOrdersHandler(request: Request): Promise<Response> {
  const client = createSupabaseAdmin();
  const guards = createSupabaseAuthGuards(client);
  return createOperationsOrdersHandler({
    requireStaff: guards.requireStaff,
    listOrders: listSupabaseOperationsOrders,
    transitionOrder: transitionSupabaseOrder,
  })(request);
}
