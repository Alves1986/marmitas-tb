import { createTemporaryOrderCode } from "./orders.js";
import { createSupabaseAdmin } from "./supabaseAdmin.js";
import { createAsaasSandboxPixPayment } from "./asaasSandboxPayments.js";
import { persistCounterOrder, persistUnifiedOrder, type UnifiedOrderItem, type UnifiedOrderPayload } from "./unifiedOrders.js";
import type { CreateKioskOrderInput, CreatePublicOrderInput, KioskOrderConfirmation, PublicOrderConfirmation, PublicTrackingOrder } from "../../../api/public/orders";

type ProductRecord = { id: string; name: string; price_in_cents: number };
type OptionRecord = {
  id: string;
  product_id: string;
  group_name: string;
  label: string;
  price_delta_in_cents: number;
  is_required: boolean;
};

export type CounterPaymentMethod = "cash" | "pix" | "debit_card" | "credit_card" | "voucher";

export type CreateCounterOrderInput = {
  sourceChannel: "COUNTER";
  idempotencyKey: string;
  displayName?: string;
  paymentMethod: CounterPaymentMethod;
  actorUserId: string;
  items: Array<{ productId: string; quantity: number; optionIds: string[]; note: string }>;
};

export type CounterOrderConfirmation = {
  orderNumber: string;
  ticket: string;
  estimatedTime: string;
  submittedAt: string;
};

type BuildOwnAppUnifiedOrderInput = {
  code: string;
  sourceChannel: "OWN_APP";
  idempotencyKey: string;
  customer: CreatePublicOrderInput["customer"];
  customerPhoneLookup: string;
  fulfillmentMethod: CreatePublicOrderInput["fulfillmentMethod"];
  paymentMethod: CreatePublicOrderInput["paymentMethod"];
  orderItems: UnifiedOrderItem[];
};

type BuildKioskUnifiedOrderInput = {
  code: string;
  idempotencyKey: string;
  displayName?: string;
  paymentMethod: "pix" | "card";
  orderItems: UnifiedOrderItem[];
};

type BuildCounterUnifiedOrderInput = {
  code: string;
  idempotencyKey: string;
  displayName?: string;
  paymentMethod: "cash" | "pix" | "debit_card" | "credit_card" | "voucher";
  orderItems: UnifiedOrderItem[];
};

export function buildOwnAppUnifiedOrderPayload(input: BuildOwnAppUnifiedOrderInput): UnifiedOrderPayload {
  const subtotalInCents = input.orderItems.reduce((total, item) => total + item.unitPriceInCents * item.quantity, 0);
  const deliveryFeeInCents = input.fulfillmentMethod === "delivery" ? 500 : 0;

  return {
    code: input.code,
    sourceChannel: input.sourceChannel,
    idempotencyKey: input.idempotencyKey,
    customer: {
      name: input.customer.name,
      phone: input.customer.phone,
      phoneLookup: input.customerPhoneLookup,
      address: input.fulfillmentMethod === "delivery" ? input.customer.address : undefined,
      notes: input.customer.notes,
    },
    fulfillmentMethod: input.fulfillmentMethod,
    subtotalInCents,
    deliveryFeeInCents,
    totalInCents: subtotalInCents + deliveryFeeInCents,
    status: "aguardando_pagamento",
    paymentMethod: input.paymentMethod,
    paymentProvider: "asaas_test",
    paymentStatus: "pending",
    paymentReference: `test_${input.code}`,
    items: input.orderItems,
  };
}

export function buildKioskUnifiedOrderPayload(input: BuildKioskUnifiedOrderInput): UnifiedOrderPayload {
  const subtotalInCents = input.orderItems.reduce((total, item) => total + item.unitPriceInCents * item.quantity, 0);

  return {
    code: input.code,
    sourceChannel: "KIOSK",
    idempotencyKey: input.idempotencyKey,
    customer: {
      name: input.displayName || "Cliente do totem",
      phone: "TOTEM",
      phoneLookup: "TOTEM",
      notes: "Pagamento demonstrativo aprovado no totem.",
    },
    fulfillmentMethod: "pickup",
    subtotalInCents,
    deliveryFeeInCents: 0,
    totalInCents: subtotalInCents,
    status: "confirmado",
    paymentMethod: input.paymentMethod === "card" ? "credit_card" : "pix",
    paymentProvider: "asaas_test",
    paymentStatus: "confirmed",
    paymentReference: `kiosk_demo_${input.code}`,
    items: input.orderItems,
  };
}

export function buildCounterUnifiedOrderPayload(input: BuildCounterUnifiedOrderInput): UnifiedOrderPayload {
  const subtotalInCents = input.orderItems.reduce((total, item) => total + item.unitPriceInCents * item.quantity, 0);

  return {
    code: input.code,
    sourceChannel: "COUNTER",
    idempotencyKey: input.idempotencyKey,
    customer: {
      name: input.displayName?.trim() || "Cliente de balcão",
      phone: "BALCAO",
      phoneLookup: "BALCAO",
      notes: "Pagamento registrado presencialmente no PDV.",
    },
    fulfillmentMethod: "pickup",
    subtotalInCents,
    deliveryFeeInCents: 0,
    totalInCents: subtotalInCents,
    status: "confirmado",
    paymentMethod: input.paymentMethod,
    paymentProvider: "counter_record",
    paymentStatus: "confirmed",
    paymentReference: `counter_${input.code}`,
    items: input.orderItems,
  };
}

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

  const now = new Date();
  const code = createTemporaryOrderCode(now, crypto.randomUUID());
  const unifiedPayload = buildOwnAppUnifiedOrderPayload({
    code,
    sourceChannel: input.sourceChannel,
    idempotencyKey: input.idempotencyKey,
    customer: input.customer,
    customerPhoneLookup: input.customerPhoneLookup,
    fulfillmentMethod: input.fulfillmentMethod,
    paymentMethod: input.paymentMethod,
    orderItems,
  });
  const persisted = await persistUnifiedOrder(client, unifiedPayload);
  const order = { id: persisted.id, code: persisted.code, created_at: persisted.createdAt };
  const subtotalInCents = unifiedPayload.subtotalInCents;
  const deliveryFeeInCents = unifiedPayload.deliveryFeeInCents;

  let paymentReference = unifiedPayload.paymentReference ?? `test_${code}`;
  let paymentUrl: string | undefined;
  if (input.paymentMethod === "pix") {
    const sandboxPayment = await createAsaasSandboxPixPayment({
      environment: process.env,
      input: {
        orderCode: code,
        customer: { name: input.customer.name, phone: input.customer.phone },
        totalInCents: subtotalInCents + deliveryFeeInCents,
      },
    });

    if (sandboxPayment.available) {
      const { error: paymentUpdateError } = await client
        .from("orders")
        .update({ payment_reference: sandboxPayment.paymentId })
        .eq("id", order.id);
      if (paymentUpdateError) throw new Error("Não foi possível vincular a cobrança Pix ao pedido.");

      const { error: paymentEventError } = await client.from("order_events").insert({
        order_id: order.id,
        event_type: "payment_created",
        to_status: "aguardando_pagamento",
        message: "Cobrança PIX emitida no ambiente de teste.",
      });
      if (paymentEventError) throw new Error("Não foi possível registrar a emissão da cobrança Pix.");

      paymentReference = sandboxPayment.paymentId;
      paymentUrl = sandboxPayment.paymentUrl;
    }
  }

  return {
    orderNumber: order.code,
    trackingCode: order.code,
    estimatedTime: "35 a 45 min",
    submittedAt: order.created_at,
    paymentReference,
    paymentUrl,
    paymentStatus: "pending",
    isTestPayment: true,
  };
}

export async function createSupabaseKioskOrder(input: CreateKioskOrderInput): Promise<KioskOrderConfirmation> {
  const client = createSupabaseAdmin();
  const productIds = unique(input.items.map((item) => item.productId));
  const { data: productData, error: productError } = await client
    .from("products")
    .select("id, name, price_in_cents")
    .in("id", productIds)
    .eq("is_active", true);
  if (productError) throw new Error("Não foi possível validar os produtos do totem.");

  const products = (productData ?? []) as ProductRecord[];
  const productsById = new Map(products.map((product) => [product.id, product]));
  if (productsById.size !== productIds.length) throw new Error("Um dos produtos do totem não está disponível.");

  const { data: optionData, error: optionError } = await client
    .from("product_options")
    .select("id, product_id, group_name, label, price_delta_in_cents, is_required")
    .in("product_id", productIds)
    .eq("is_active", true);
  if (optionError) throw new Error("Não foi possível validar as opções do totem.");

  const options = (optionData ?? []) as OptionRecord[];
  const optionsById = new Map(options.map((option) => [option.id, option]));
  const orderItems: UnifiedOrderItem[] = input.items.map((item) => {
    const product = productsById.get(item.productId)!;
    const selectedOptions = item.optionIds.map((optionId) => optionsById.get(optionId));
    if (selectedOptions.some((option) => !option || option.product_id !== product.id)) {
      throw new Error("Configuração de produto inválida no totem.");
    }

    const selectedGroupNames = new Set(selectedOptions.map((option) => option!.group_name));
    const requiredGroupNames = unique(
      options.filter((option) => option.product_id === product.id && option.is_required).map((option) => option.group_name),
    );
    if (requiredGroupNames.some((groupName) => !selectedGroupNames.has(groupName))) {
      throw new Error("Selecione as opções obrigatórias do produto no totem.");
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

  const code = createTemporaryOrderCode(new Date(), crypto.randomUUID());
  const persisted = await persistUnifiedOrder(client, buildKioskUnifiedOrderPayload({
    code,
    idempotencyKey: input.idempotencyKey,
    displayName: input.displayName,
    paymentMethod: input.paymentMethod,
    orderItems,
  }));

  return {
    orderNumber: persisted.code,
    estimatedTime: "15 a 25 min",
    submittedAt: persisted.createdAt,
  };
}

export async function createSupabaseCounterOrder(input: CreateCounterOrderInput): Promise<CounterOrderConfirmation> {
  const client = createSupabaseAdmin();
  const productIds = unique(input.items.map((item) => item.productId));
  const { data: productData, error: productError } = await client
    .from("products")
    .select("id, name, price_in_cents")
    .in("id", productIds)
    .eq("is_active", true);
  if (productError) throw new Error("Não foi possível validar os produtos do balcão.");

  const products = (productData ?? []) as ProductRecord[];
  const productsById = new Map(products.map((product) => [product.id, product]));
  if (productsById.size !== productIds.length) throw new Error("Um dos produtos do balcão não está disponível.");

  const { data: optionData, error: optionError } = await client
    .from("product_options")
    .select("id, product_id, group_name, label, price_delta_in_cents, is_required")
    .in("product_id", productIds)
    .eq("is_active", true);
  if (optionError) throw new Error("Não foi possível validar as opções do balcão.");

  const options = (optionData ?? []) as OptionRecord[];
  const optionsById = new Map(options.map((option) => [option.id, option]));
  const orderItems: UnifiedOrderItem[] = input.items.map((item) => {
    const product = productsById.get(item.productId)!;
    const selectedOptions = item.optionIds.map((optionId) => optionsById.get(optionId));
    if (selectedOptions.some((option) => !option || option.product_id !== product.id)) {
      throw new Error("Configuração de produto inválida no balcão.");
    }

    const selectedGroupNames = new Set(selectedOptions.map((option) => option!.group_name));
    const requiredGroupNames = unique(
      options.filter((option) => option.product_id === product.id && option.is_required).map((option) => option.group_name),
    );
    if (requiredGroupNames.some((groupName) => !selectedGroupNames.has(groupName))) {
      throw new Error("Selecione as opções obrigatórias do produto no balcão.");
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

  const code = createTemporaryOrderCode(new Date(), crypto.randomUUID());
  const persisted = await persistCounterOrder(client, {
    code,
    idempotencyKey: input.idempotencyKey,
    displayName: input.displayName,
    subtotalInCents: orderItems.reduce((total, item) => total + item.unitPriceInCents * item.quantity, 0),
    totalInCents: orderItems.reduce((total, item) => total + item.unitPriceInCents * item.quantity, 0),
    paymentMethod: input.paymentMethod,
    items: orderItems,
    actorUserId: input.actorUserId,
  });

  return {
    orderNumber: persisted.code,
    ticket: persisted.ticket,
    estimatedTime: "15 a 25 min",
    submittedAt: persisted.createdAt,
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
