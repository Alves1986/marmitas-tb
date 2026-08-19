import { createTemporaryOrderCode } from "./orders";
import { createSupabaseAdmin } from "./supabaseAdmin";
import type { CreatePublicOrderInput, PublicOrderConfirmation, PublicTrackingOrder } from "../../../api/public/orders";

type ProductRecord = { id: string; name: string; price_in_cents: number };
type OptionRecord = {
  id: string;
  product_id: string;
  group_name: string;
  label: string;
  price_delta_in_cents: number;
  is_required: boolean;
};

function unique<T>(values: readonly T[]): T[] {
  return values.filter((value, index) => values.indexOf(value) === index);
}

export async function createSupabaseOrder(input: CreatePublicOrderInput): Promise<PublicOrderConfirmation> {
  const client = createSupabaseAdmin();
  const productIds = unique(input.items.map((item) => item.productId));
  const { data: productData, error: productError } = await client
    .from("products")
    .select("id, name, price_in_cents")
    .in("id", productIds)
    .eq("is_active", true);
  if (productError) throw new Error("Não foi possível validar os produtos.");

  const products = (productData ?? []) as ProductRecord[];
  const productsById = new Map(products.map((product) => [product.id, product]));
  if (productsById.size !== productIds.length) throw new Error("Um dos produtos não está disponível.");

  const { data: optionData, error: optionError } = await client
    .from("product_options")
    .select("id, product_id, group_name, label, price_delta_in_cents, is_required")
    .in("product_id", productIds)
    .eq("is_active", true);
  if (optionError) throw new Error("Não foi possível validar as opções.");

  const options = (optionData ?? []) as OptionRecord[];
  const optionsById = new Map(options.map((option) => [option.id, option]));
  const orderItems = input.items.map((item) => {
    const product = productsById.get(item.productId)!;
    const selectedOptions = item.optionIds.map((optionId) => optionsById.get(optionId));
    if (selectedOptions.some((option) => !option || option.product_id !== product.id)) {
      throw new Error("Configuração de produto inválida.");
    }

    const selectedGroupNames = new Set(selectedOptions.map((option) => option!.group_name));
    const requiredGroupNames = unique(
      options.filter((option) => option.product_id === product.id && option.is_required).map((option) => option.group_name),
    );
    if (requiredGroupNames.some((groupName) => !selectedGroupNames.has(groupName))) {
      throw new Error("Selecione as opções obrigatórias do produto.");
    }

    const optionTotal = selectedOptions.reduce((total, option) => total + option!.price_delta_in_cents, 0);
    return {
      productId: product.id,
      productName: product.name,
      unitPriceInCents: product.price_in_cents + optionTotal,
      quantity: item.quantity,
      configuration: selectedOptions.map((option) => ({
        id: option!.id,
        groupName: option!.group_name,
        label: option!.label,
        priceDeltaInCents: option!.price_delta_in_cents,
      })),
      note: item.note,
    };
  });

  const subtotalInCents = orderItems.reduce((total, item) => total + item.unitPriceInCents * item.quantity, 0);
  const deliveryFeeInCents = input.fulfillmentMethod === "delivery" ? 500 : 0;
  const now = new Date();
  const code = createTemporaryOrderCode(now, crypto.randomUUID());
  const { data: order, error: orderError } = await client
    .from("orders")
    .insert({
      code,
      customer_name: input.customer.name,
      customer_phone: input.customer.phone,
      customer_phone_lookup: input.customerPhoneLookup,
      fulfillment_method: input.fulfillmentMethod,
      delivery_address: input.fulfillmentMethod === "delivery" ? input.customer.address : null,
      customer_notes: input.customer.notes || null,
      subtotal_in_cents: subtotalInCents,
      delivery_fee_in_cents: deliveryFeeInCents,
      total_in_cents: subtotalInCents + deliveryFeeInCents,
      status: "aguardando_pagamento",
      payment_method: input.paymentMethod,
      payment_provider: "asaas_test",
      payment_status: "pending",
      payment_reference: `test_${code}_${now.getTime()}`,
    })
    .select("id, code, created_at")
    .single();
  if (orderError || !order) throw new Error("Não foi possível registrar o pedido.");

  const { error: itemsError } = await client.from("order_items").insert(
    orderItems.map((item) => ({
      order_id: order.id,
      product_id: item.productId,
      product_name: item.productName,
      unit_price_in_cents: item.unitPriceInCents,
      quantity: item.quantity,
      configuration: item.configuration,
      notes: item.note || null,
    })),
  );
  if (itemsError) throw new Error("Não foi possível registrar os itens do pedido.");

  const { error: eventError } = await client.from("order_events").insert({
    order_id: order.id,
    event_type: "created",
    to_status: "aguardando_pagamento",
    message: "Pedido recebido.",
  });
  if (eventError) throw new Error("Não foi possível registrar o histórico do pedido.");

  return {
    orderNumber: order.code,
    trackingCode: order.code,
    estimatedTime: "35 a 45 min",
    submittedAt: order.created_at,
    paymentStatus: "pending",
    isTestPayment: true,
  };
}

export async function findSupabaseTracking(input: { code: string; phone: string }): Promise<PublicTrackingOrder | null> {
  const client = createSupabaseAdmin();
  const { data: order, error } = await client
    .from("orders")
    .select("id, code, status, customer_name, total_in_cents, payment_status, payment_method, payment_provider, fulfillment_method, created_at")
    .eq("code", input.code)
    .eq("customer_phone_lookup", input.phone)
    .maybeSingle();
  if (error) throw new Error("Não foi possível consultar o pedido.");
  if (!order) return null;

  const { data: items, error: itemsError } = await client.from("order_items").select("product_name, quantity").eq("order_id", order.id);
  if (itemsError) throw new Error("Não foi possível consultar os itens do pedido.");
  const { data: events, error: eventsError } = await client
    .from("order_events")
    .select("id, to_status, message, created_at")
    .eq("order_id", order.id)
    .order("created_at", { ascending: true });
  if (eventsError) throw new Error("Não foi possível consultar o histórico do pedido.");

  return {
    code: order.code,
    status: order.status,
    customerName: order.customer_name,
    items: (items ?? []).map((item) => ({ name: item.product_name, quantity: item.quantity })),
    totalInCents: order.total_in_cents,
    paymentStatus: order.payment_status,
    paymentMethod: order.payment_method,
    paymentProvider: order.payment_provider,
    fulfillmentMethod: order.fulfillment_method,
    createdAt: order.created_at,
    events: (events ?? []).map((event) => ({ id: event.id, toStatus: event.to_status, message: event.message, createdAt: event.created_at })),
  };
}

export async function findSupabaseTrackingByPhone(phone: string): Promise<PublicTrackingOrder | null> {
  const client = createSupabaseAdmin();
  const { data: order, error } = await client
    .from("orders")
    .select("id, code, status, customer_name, total_in_cents, payment_status, payment_method, payment_provider, fulfillment_method, created_at")
    .eq("customer_phone_lookup", phone)
    .not("status", "in", "(concluido,cancelado)")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error("Não foi possível consultar o pedido.");
  if (!order) return null;

  const { data: events, error: eventsError } = await client
    .from("order_events")
    .select("id, to_status, message, created_at")
    .eq("order_id", order.id)
    .order("created_at", { ascending: true });
  if (eventsError) throw new Error("Não foi possível consultar o histórico do pedido.");

  return {
    code: order.code,
    status: order.status,
    customerName: order.customer_name,
    items: [],
    totalInCents: order.total_in_cents,
    paymentStatus: order.payment_status,
    paymentMethod: order.payment_method,
    paymentProvider: order.payment_provider,
    fulfillmentMethod: order.fulfillment_method,
    createdAt: order.created_at,
    events: (events ?? []).map((event) => ({ id: event.id, toStatus: event.to_status, message: event.message, createdAt: event.created_at })),
  };
}
