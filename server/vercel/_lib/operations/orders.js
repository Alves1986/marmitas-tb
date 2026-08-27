import { z } from "zod";
import { ApiAuthError, createSupabaseAuthGuards } from "../auth.js";
import { json, jsonError, methodNotAllowed } from "../http.js";
import { assertTransition, OrderTransitionError } from "../orders.js";
import { orderStatuses } from "../../../../shared/operations.js";
import { createSupabaseAdmin } from "../supabaseAdmin.js";
const transitionInput = z.object({
  orderId: z.string().uuid(),
  nextStatus: z.enum(orderStatuses)
});
function toErrorResponse(error) {
  if (error instanceof ApiAuthError) return jsonError(error.statusCode, error.message);
  if (error instanceof OrderTransitionError) return jsonError(409, error.message);
  return jsonError(500, error);
}
function createOperationsOrdersHandler(dependencies) {
  return async function operationsOrdersHandler(request) {
    try {
      const actor = await dependencies.requireStaff(request);
      if (request.method === "GET") return json(200, await dependencies.listOrders());
      if (request.method !== "PATCH") return methodNotAllowed(["GET", "PATCH"]);
      const input = transitionInput.safeParse(await request.json());
      if (!input.success) return jsonError(400, "Dados de transi\xE7\xE3o inv\xE1lidos.");
      return json(
        200,
        await dependencies.transitionOrder({
          ...input.data,
          actorUserId: actor.id
        })
      );
    } catch (error) {
      return toErrorResponse(error);
    }
  };
}
function toOperationalOrder(order, acknowledgedAt) {
  return {
    id: order.id,
    code: order.code,
    sourceChannel: order.source_channel,
    counterTicket: order.source_channel === "COUNTER" && typeof order.counter_ticket_number === "number" ? `MTB-${String(order.counter_ticket_number).padStart(3, "0")}` : null,
    customerName: order.customer_name,
    customerPhone: order.customer_phone,
    fulfillmentMethod: order.fulfillment_method,
    deliveryAddress: order.delivery_address,
    customerNotes: order.customer_notes,
    totalInCents: order.total_in_cents,
    status: order.status,
    paymentMethod: order.payment_method,
    paymentStatus: order.payment_status,
    acknowledgedAt,
    createdAt: order.created_at,
    items: (order.order_items ?? []).map((item) => ({
      productName: item.product_name,
      quantity: item.quantity,
      unitPriceInCents: item.unit_price_in_cents,
      configuration: item.configuration,
      notes: item.notes
    }))
  };
}
async function listSupabaseOperationsOrders() {
  const client = createSupabaseAdmin();
  const { data, error } = await client.from("orders").select("id, code, source_channel, counter_ticket_number, customer_name, customer_phone, fulfillment_method, delivery_address, customer_notes, total_in_cents, status, payment_method, payment_status, created_at, order_items(product_name, quantity, unit_price_in_cents, configuration, notes)").in("status", ["aguardando_pagamento", "confirmado", "em_preparo", "saiu_para_entrega", "pronto_para_retirada"]).order("created_at", { ascending: false });
  if (error) throw new Error("N\xE3o foi poss\xEDvel carregar a fila operacional.");
  const orderIds = (data ?? []).map((order) => order.id);
  const acknowledgedAtByOrderId = /* @__PURE__ */ new Map();
  if (orderIds.length > 0) {
    const { data: acknowledgements, error: acknowledgementError } = await client.from("order_events").select("order_id, created_at").in("order_id", orderIds).eq("event_type", "alert_acknowledged").order("created_at", { ascending: false });
    if (acknowledgementError) throw new Error("N\xE3o foi poss\xEDvel carregar os alertas operacionais.");
    for (const event of acknowledgements ?? []) {
      if (!acknowledgedAtByOrderId.has(event.order_id)) acknowledgedAtByOrderId.set(event.order_id, event.created_at);
    }
  }
  return (data ?? []).map((order) => toOperationalOrder(order, acknowledgedAtByOrderId.get(order.id) ?? null));
}
async function transitionSupabaseOrder(input) {
  const client = createSupabaseAdmin();
  const { data: currentOrder, error: currentError } = await client.from("orders").select("id, status").eq("id", input.orderId).maybeSingle();
  if (currentError || !currentOrder) throw new Error("Pedido n\xE3o encontrado.");
  assertTransition(currentOrder.status, input.nextStatus);
  const { data: updatedOrder, error: updateError } = await client.from("orders").update({ status: input.nextStatus }).eq("id", input.orderId).eq("status", currentOrder.status).select("id, status").single();
  if (updateError || !updatedOrder) throw new Error("O pedido foi alterado por outro operador. Atualize a fila e tente novamente.");
  const { error: eventError } = await client.from("order_events").insert({
    order_id: updatedOrder.id,
    actor_user_id: input.actorUserId,
    event_type: "status_changed",
    from_status: currentOrder.status,
    to_status: input.nextStatus,
    message: "Status atualizado pela opera\xE7\xE3o."
  });
  if (eventError) throw new Error("N\xE3o foi poss\xEDvel registrar o hist\xF3rico operacional.");
  return { id: updatedOrder.id, status: updatedOrder.status };
}
function createDefaultOperationsOrdersHandler() {
  const client = createSupabaseAdmin();
  const guards = createSupabaseAuthGuards(client);
  return createOperationsOrdersHandler({
    requireStaff: guards.requireStaff,
    listOrders: listSupabaseOperationsOrders,
    transitionOrder: transitionSupabaseOrder
  });
}
export {
  createDefaultOperationsOrdersHandler,
  createOperationsOrdersHandler,
  listSupabaseOperationsOrders,
  toOperationalOrder,
  transitionSupabaseOrder
};
