export const ORDER_SOURCE_CHANNELS = [
  "OWN_APP",
  "KIOSK",
  "COUNTER",
  "IFOOD",
  "PHONE",
  "WHATSAPP",
  "INTERNAL",
] as const;

export type OrderSourceChannel = (typeof ORDER_SOURCE_CHANNELS)[number];

export function normalizeOrderSource(value: string): OrderSourceChannel {
  if (!ORDER_SOURCE_CHANNELS.includes(value as OrderSourceChannel)) {
    throw new Error("Canal de origem inválido.");
  }

  return value as OrderSourceChannel;
}

export function assertPublicOrderSource(value?: string): "OWN_APP" {
  if (value && value !== "OWN_APP") {
    throw new Error("Canal não permitido.");
  }

  return "OWN_APP";
}

export function getPrintPriority(sourceChannel: OrderSourceChannel): number {
  return sourceChannel === "COUNTER" ? 100 : 50;
}

export type UnifiedOrderItem = {
  productId: string;
  productName: string;
  unitPriceInCents: number;
  quantity: number;
  configuration: Array<{ id: string; groupName: string; label: string; priceDeltaInCents: number }>;
  note: string;
};

export type UnifiedOrderPayload = {
  code: string;
  sourceChannel: OrderSourceChannel;
  idempotencyKey: string;
  externalProvider?: string;
  externalOrderId?: string;
  customer: { name: string; phone: string; phoneLookup: string; address?: string; notes?: string };
  fulfillmentMethod: "delivery" | "pickup";
  subtotalInCents: number;
  deliveryFeeInCents: number;
  totalInCents: number;
  status: "aguardando_pagamento" | "confirmado" | "em_preparo" | "saiu_para_entrega" | "pronto_para_retirada" | "concluido" | "cancelado";
  paymentMethod: "pix" | "credit_card" | "debit_card" | "voucher" | "cash";
  paymentProvider: "asaas_test" | "asaas" | "counter_record";
  paymentStatus: "pending" | "confirmed" | "failed" | "cancelled" | "refunded";
  paymentReference?: string;
  items: UnifiedOrderItem[];
  actorUserId?: string;
  printStationCode?: string;
};

type UnifiedOrderRpcRow = {
  order_id: string;
  order_code: string;
  order_created_at: string;
  reused: boolean;
};

type UnifiedOrderRpcClient = {
  rpc: (functionName: "create_unified_order", arguments_: Record<string, unknown>) => PromiseLike<{
    data: UnifiedOrderRpcRow[] | null;
    error: { message: string } | null;
  }>;
};

export type PersistedUnifiedOrder = {
  id: string;
  code: string;
  createdAt: string;
  reused: boolean;
};

export async function persistUnifiedOrder(client: UnifiedOrderRpcClient, payload: UnifiedOrderPayload): Promise<PersistedUnifiedOrder> {
  const { data, error } = await client.rpc("create_unified_order", {
    p_code: payload.code,
    p_source_channel: payload.sourceChannel,
    p_idempotency_key: payload.idempotencyKey,
    p_external_provider: payload.externalProvider ?? null,
    p_external_order_id: payload.externalOrderId ?? null,
    p_customer_name: payload.customer.name,
    p_customer_phone: payload.customer.phone,
    p_customer_phone_lookup: payload.customer.phoneLookup,
    p_fulfillment_method: payload.fulfillmentMethod,
    p_delivery_address: payload.customer.address ?? null,
    p_customer_notes: payload.customer.notes ?? null,
    p_subtotal_in_cents: payload.subtotalInCents,
    p_delivery_fee_in_cents: payload.deliveryFeeInCents,
    p_total_in_cents: payload.totalInCents,
    p_status: payload.status,
    p_payment_method: payload.paymentMethod,
    p_payment_provider: payload.paymentProvider,
    p_payment_status: payload.paymentStatus,
    p_payment_reference: payload.paymentReference ?? null,
    p_items: payload.items,
    p_actor_user_id: payload.actorUserId ?? null,
    p_print_station_code: payload.printStationCode ?? "COZINHA",
  });

  if (error) throw new Error(`Não foi possível registrar o pedido unificado: ${error.message}`);
  const row = data?.[0];
  if (!row) throw new Error("O núcleo de pedidos não retornou confirmação.");

  return { id: row.order_id, code: row.order_code, createdAt: row.order_created_at, reused: row.reused };
}

export type CounterOrderPayload = {
  code: string;
  idempotencyKey: string;
  displayName?: string;
  subtotalInCents: number;
  totalInCents: number;
  paymentMethod: "cash" | "pix" | "debit_card" | "credit_card" | "voucher";
  items: UnifiedOrderItem[];
  actorUserId: string;
  printStationCode?: string;
};

type CounterOrderRpcRow = {
  order_id: string;
  order_code: string;
  order_created_at: string;
  counter_ticket_date: string;
  counter_ticket_number: number;
  reused: boolean;
};

type CounterOrderRpcClient = {
  rpc: (functionName: "create_counter_order", arguments_: Record<string, unknown>) => PromiseLike<{
    data: CounterOrderRpcRow[] | null;
    error: { message: string } | null;
  }>;
};

export type PersistedCounterOrder = {
  id: string;
  code: string;
  createdAt: string;
  ticket: string;
  reused: boolean;
};

export async function persistCounterOrder(client: CounterOrderRpcClient, payload: CounterOrderPayload): Promise<PersistedCounterOrder> {
  const { data, error } = await client.rpc("create_counter_order", {
    p_code: payload.code,
    p_idempotency_key: payload.idempotencyKey,
    p_display_name: payload.displayName?.trim() || null,
    p_subtotal_in_cents: payload.subtotalInCents,
    p_total_in_cents: payload.totalInCents,
    p_payment_method: payload.paymentMethod,
    p_items: payload.items,
    p_actor_user_id: payload.actorUserId,
    p_print_station_code: payload.printStationCode ?? "COZINHA",
  });
  if (error) throw new Error(`Não foi possível registrar o pedido de balcão: ${error.message}`);
  const row = data?.[0];
  if (!row) throw new Error("O PDV não recebeu confirmação do pedido de balcão.");

  return {
    id: row.order_id,
    code: row.order_code,
    createdAt: row.order_created_at,
    ticket: `MTB-${String(row.counter_ticket_number).padStart(3, "0")}`,
    reused: row.reused,
  };
}
