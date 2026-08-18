import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  categories,
  InsertUser,
  orderEvents,
  orderItems,
  orders,
  paymentEvents,
  printJobs,
  productOptions,
  products,
  storeSettings,
  users,
} from "../drizzle/schema";
import { ENV } from './_core/env';
import { canTransitionOrderStatus, type OrderStatus } from "../shared/operations";
import { confirmTestPayment, createTestPayment, type TestPaymentMethod } from "./services/testPayment";
import { createOrderCode } from "./services/orderCode";
import { selectPaymentAdapter } from "./services/asaasPaymentAdapter";
import {
  buildAsaasPaymentEventRecord,
  getAsaasWebhookPaymentUpdate,
  type AsaasPaymentWebhookEvent,
} from "./services/asaasWebhookEvent";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export type StoredOrderItemInput = {
  productId?: number;
  productName: string;
  unitPriceInCents: number;
  quantity: number;
  selections: unknown[];
  notes?: string;
};

export type CreateStoredOrderInput = {
  customerName: string;
  customerPhone: string;
  fulfillmentMethod: "delivery" | "pickup";
  deliveryAddress?: string;
  customerNotes?: string;
  subtotalInCents: number;
  deliveryFeeInCents: number;
  totalInCents: number;
  paymentMethod: "pix" | "credit_card" | "voucher" | "cash";
  items: StoredOrderItemInput[];
};

function ensureDatabase<T>(database: T | null): T {
  if (!database) throw new Error("Banco de dados indisponível.");
  return database;
}

export function buildOperationalAcknowledgementEvent(orderId: number, actorUserId: number) {
  return {
    orderId,
    actorUserId,
    eventType: "alert_acknowledged",
    message: "Alerta de novo pedido reconhecido pela equipe.",
  } as const;
}

export function buildQueuedPrintJob(orderId: number) {
  return { orderId, status: "queued" as const };
}

export async function acknowledgeOperationalAlert({ orderId, actorUserId }: { orderId: number; actorUserId: number }) {
  const database = ensureDatabase(await getDb());
  return database.transaction(async (tx) => {
    const [order] = await tx.select({ id: orders.id }).from(orders).where(eq(orders.id, orderId)).limit(1);
    if (!order) throw new Error("Pedido não encontrado.");

    const [existing] = await tx.select().from(orderEvents)
      .where(and(eq(orderEvents.orderId, orderId), eq(orderEvents.eventType, "alert_acknowledged")))
      .limit(1);
    if (existing) return existing;

    const event = buildOperationalAcknowledgementEvent(orderId, actorUserId);
    const [inserted] = await tx.insert(orderEvents).values(event).$returningId();
    const [acknowledgement] = await tx.select().from(orderEvents).where(eq(orderEvents.id, inserted.id)).limit(1);
    return acknowledgement;
  });
}

function createTemporaryOrderCode(): string {
  return `TMP-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

const activePublicTrackingStatuses = [
  "aguardando_pagamento",
  "confirmado",
  "em_preparo",
  "saiu_para_entrega",
  "pronto_para_retirada",
] as const;

export function normalizePhoneForLookup(value: string) {
  return value.replace(/\D/g, "");
}

export async function createStoredOrder(input: CreateStoredOrderInput) {
  const database = ensureDatabase(await getDb());
  const paymentAdapter = selectPaymentAdapter((await getStoreSettings()).paymentMode);

  return database.transaction(async (tx) => {
    const isCash = input.paymentMethod === "cash";
    const [inserted] = await tx.insert(orders).values({
      code: createTemporaryOrderCode(),
      customerName: input.customerName,
      customerPhone: input.customerPhone,
      customerPhoneLookup: normalizePhoneForLookup(input.customerPhone),
      fulfillmentMethod: input.fulfillmentMethod,
      deliveryAddress: input.deliveryAddress ?? null,
      customerNotes: input.customerNotes ?? null,
      subtotalInCents: input.subtotalInCents,
      deliveryFeeInCents: input.deliveryFeeInCents,
      totalInCents: input.totalInCents,
      status: isCash ? "confirmado" : "aguardando_pagamento",
      paymentMethod: input.paymentMethod,
      paymentProvider: paymentAdapter.provider,
      paymentStatus: isCash ? "pending" : "pending",
    }).$returningId();

    const code = createOrderCode(new Date(), inserted.id);
    const payment = isCash
      ? undefined
      : await paymentAdapter.createPayment({
          orderCode: code,
          amountInCents: input.totalInCents,
          method: input.paymentMethod as TestPaymentMethod,
        });

    await tx.update(orders).set({
      code,
      paymentReference: payment?.reference ?? `cash_${code}`,
    }).where(eq(orders.id, inserted.id));

    await tx.insert(orderItems).values(input.items.map((item) => ({
      orderId: inserted.id,
      productId: item.productId ?? null,
      productName: item.productName,
      unitPriceInCents: item.unitPriceInCents,
      quantity: item.quantity,
      configurationJson: JSON.stringify(item.selections),
      notes: item.notes ?? null,
    })));

    await tx.insert(orderEvents).values([
      {
        orderId: inserted.id,
        eventType: "order_created",
        toStatus: isCash ? "confirmado" : "aguardando_pagamento",
        message: isCash ? "Pedido criado para pagamento na entrega." : "Pedido criado aguardando pagamento de teste.",
      },
      ...(isCash ? [{
        orderId: inserted.id,
        eventType: "order_released_for_preparation",
        fromStatus: "aguardando_pagamento",
        toStatus: "confirmado",
        message: "Pedido em dinheiro liberado para preparo.",
      }] : []),
    ]);

    if (isCash) {
      await tx.insert(printJobs).values(buildQueuedPrintJob(inserted.id));
    }

    return {
      id: inserted.id,
      code,
      paymentReference: payment?.reference ?? `cash_${code}`,
      paymentStatus: isCash ? "pending" as const : "pending" as const,
      orderStatus: isCash ? "confirmado" as const : "aguardando_pagamento" as const,
      totalInCents: input.totalInCents,
    };
  });
}

export async function confirmStoredTestPayment(paymentReference: string) {
  const database = ensureDatabase(await getDb());

  return database.transaction(async (tx) => {
    const [order] = await tx.select().from(orders)
      .where(eq(orders.paymentReference, paymentReference)).limit(1);

    if (!order) throw new Error("Cobrança de teste não encontrada.");
    if (order.paymentProvider !== "asaas_test") throw new Error("Cobrança não pertence ao modo de teste.");
    if (order.paymentStatus === "confirmed") return order;
    if (order.paymentMethod === "cash") throw new Error("Pagamento em dinheiro não requer confirmação online.");

    const payment = confirmTestPayment(createTestPayment({
      orderCode: order.code,
      amountInCents: order.totalInCents,
      method: order.paymentMethod as TestPaymentMethod,
    }));

    await tx.update(orders).set({
      status: "confirmado",
      paymentStatus: "confirmed",
      paymentConfirmedAt: new Date(payment.confirmedAt ?? Date.now()),
    }).where(eq(orders.id, order.id));

    await tx.insert(orderEvents).values({
      orderId: order.id,
      eventType: "payment_confirmed",
      fromStatus: order.status,
      toStatus: "confirmado",
      message: "Pagamento de teste confirmado; pedido liberado para preparo.",
    });
    await tx.insert(printJobs).values(buildQueuedPrintJob(order.id));

    const [confirmedOrder] = await tx.select().from(orders).where(eq(orders.id, order.id)).limit(1);
    return confirmedOrder;
  });
}

export async function processAsaasWebhookEvent(event: AsaasPaymentWebhookEvent): Promise<"processed" | "duplicate"> {
  const database = ensureDatabase(await getDb());

  return database.transaction(async (tx) => {
    const [existingEvent] = await tx.select({ id: paymentEvents.id }).from(paymentEvents)
      .where(and(eq(paymentEvents.provider, "asaas"), eq(paymentEvents.externalEventId, event.id)))
      .limit(1);
    if (existingEvent) return "duplicate";

    const eventRecord = buildAsaasPaymentEventRecord(event);
    const paymentUpdate = getAsaasWebhookPaymentUpdate(event);
    let orderId: number | null = null;

    if (paymentUpdate) {
      const [order] = await tx.select().from(orders)
        .where(and(eq(orders.paymentProvider, "asaas"), eq(orders.paymentReference, paymentUpdate.paymentReference)))
        .limit(1);

      if (order) {
        orderId = order.id;
        if (order.paymentStatus !== "confirmed") {
          await tx.update(orders).set({
            status: paymentUpdate.orderStatus,
            paymentStatus: paymentUpdate.paymentStatus,
            paymentConfirmedAt: new Date(),
          }).where(eq(orders.id, order.id));
          await tx.insert(orderEvents).values({
            orderId: order.id,
            eventType: paymentUpdate.eventType,
            fromStatus: order.status,
            toStatus: paymentUpdate.orderStatus,
            message: "Pagamento oficial confirmado pelo webhook do Asaas; pedido liberado para preparo.",
          });
          await tx.insert(printJobs).values(buildQueuedPrintJob(order.id));
        }
      }
    }

    await tx.insert(paymentEvents).values({ ...eventRecord, orderId });
    return "processed";
  });
}

export async function getOrderByTracking(code: string, phone: string) {
  const database = ensureDatabase(await getDb());
  const [order] = await database.select().from(orders)
    .where(and(eq(orders.code, code), eq(orders.customerPhoneLookup, normalizePhoneForLookup(phone)))).limit(1);
  if (!order) return undefined;

  const [items, events] = await Promise.all([
    database.select().from(orderItems).where(eq(orderItems.orderId, order.id)),
    database.select().from(orderEvents).where(eq(orderEvents.orderId, order.id)).orderBy(asc(orderEvents.createdAt)),
  ]);

  return { order, items, events };
}

export async function getLatestActiveOrderByPhone(phone: string) {
  const database = ensureDatabase(await getDb());
  const [selectedOrder] = await database.select({
    id: orders.id,
    code: orders.code,
    status: orders.status,
    totalInCents: orders.totalInCents,
    paymentStatus: orders.paymentStatus,
    paymentMethod: orders.paymentMethod,
    paymentProvider: orders.paymentProvider,
    fulfillmentMethod: orders.fulfillmentMethod,
    createdAt: orders.createdAt,
  }).from(orders)
    .where(and(
      eq(orders.customerPhoneLookup, normalizePhoneForLookup(phone)),
      inArray(orders.status, activePublicTrackingStatuses),
    ))
    .orderBy(desc(orders.createdAt))
    .limit(1);
  if (!selectedOrder) return undefined;

  const events = await database.select({
    id: orderEvents.id,
    toStatus: orderEvents.toStatus,
    message: orderEvents.message,
    createdAt: orderEvents.createdAt,
  }).from(orderEvents)
    .where(eq(orderEvents.orderId, selectedOrder.id))
    .orderBy(asc(orderEvents.createdAt));

  const { id: _internalOrderId, ...order } = selectedOrder;
  return { order, events };
}

export async function listAdminCatalog() {
  const database = ensureDatabase(await getDb());
  const [catalogCategories, catalogProducts, catalogOptions] = await Promise.all([
    database.select().from(categories).orderBy(asc(categories.sortOrder), asc(categories.name)),
    database.select().from(products).orderBy(asc(products.categoryId), asc(products.name)),
    database.select().from(productOptions).orderBy(asc(productOptions.productId), asc(productOptions.sortOrder)),
  ]);

  const optionsByProductId = new Map<number, typeof catalogOptions>();
  for (const option of catalogOptions) {
    const options = optionsByProductId.get(option.productId) ?? [];
    options.push(option);
    optionsByProductId.set(option.productId, options);
  }
  const productsByCategoryId = new Map<number, Array<typeof catalogProducts[number] & { options: typeof catalogOptions }>>();
  for (const product of catalogProducts) {
    const categoryProducts = productsByCategoryId.get(product.categoryId) ?? [];
    categoryProducts.push({ ...product, options: optionsByProductId.get(product.id) ?? [] });
    productsByCategoryId.set(product.categoryId, categoryProducts);
  }

  return catalogCategories.map((category) => ({
    category,
    products: productsByCategoryId.get(category.id) ?? [],
  }));
}

export type UpsertCategoryInput = {
  id?: number;
  name: string;
  slug: string;
  sortOrder: number;
  isActive: boolean;
  actorUserId: number;
};

export async function upsertCategory(input: UpsertCategoryInput) {
  const database = ensureDatabase(await getDb());
  const categoryValues = {
    name: input.name,
    slug: input.slug,
    sortOrder: input.sortOrder,
    isActive: input.isActive,
  };
  const categoryId = input.id
    ? input.id
    : (await database.insert(categories).values(categoryValues).$returningId())[0].id;
  if (input.id) await database.update(categories).set(categoryValues).where(eq(categories.id, input.id));
  const [category] = await database.select().from(categories).where(eq(categories.id, categoryId)).limit(1);
  if (!category) throw new Error("Categoria não encontrada após salvar.");
  return category;
}

export async function listStaffMembers() {
  const database = ensureDatabase(await getDb());
  return database.select({
    id: users.id,
    name: users.name,
    email: users.email,
    role: users.role,
    lastSignedIn: users.lastSignedIn,
  }).from(users).orderBy(asc(users.name), asc(users.id));
}

export type StoreSettingsInput = {
  storeName: string;
  deliveryFeeInCents: number;
  openingHours: string;
  paymentMode: "test" | "asaas";
  autoPrint: boolean;
};

export const defaultStoreSettings: StoreSettingsInput = {
  storeName: "Marmitas TB",
  deliveryFeeInCents: 500,
  openingHours: "Segunda a sábado, 10h às 14h",
  paymentMode: "test",
  autoPrint: true,
};

export async function getStoreSettings(): Promise<StoreSettingsInput> {
  const database = ensureDatabase(await getDb());
  const rows = await database.select().from(storeSettings);
  const values = new Map(rows.map((row) => [row.settingKey, row.settingValue]));
  const deliveryFee = Number(values.get("deliveryFeeInCents"));
  const paymentMode = values.get("paymentMode");
  return {
    storeName: values.get("storeName") || defaultStoreSettings.storeName,
    deliveryFeeInCents: Number.isSafeInteger(deliveryFee) && deliveryFee >= 0 ? deliveryFee : defaultStoreSettings.deliveryFeeInCents,
    openingHours: values.get("openingHours") || defaultStoreSettings.openingHours,
    paymentMode: paymentMode === "asaas" ? "asaas" : "test",
    autoPrint: values.has("autoPrint") ? values.get("autoPrint") === "true" : defaultStoreSettings.autoPrint,
  };
}

export async function updateStoreSettings(input: StoreSettingsInput & { actorUserId: number }) {
  const database = ensureDatabase(await getDb());
  const entries = Object.entries({
    storeName: input.storeName,
    deliveryFeeInCents: String(input.deliveryFeeInCents),
    openingHours: input.openingHours,
    paymentMode: input.paymentMode,
    autoPrint: String(input.autoPrint),
  });
  await database.transaction(async (tx) => {
    for (const [settingKey, settingValue] of entries) {
      await tx.insert(storeSettings).values({ settingKey, settingValue, updatedByUserId: input.actorUserId }).onDuplicateKeyUpdate({
        set: { settingValue, updatedByUserId: input.actorUserId, updatedAt: new Date() },
      });
    }
  });
  return getStoreSettings();
}

export async function upsertStaffMember({ userId, role }: { userId: number; role: "user" | "staff" | "admin"; actorUserId: number }) {
  const database = ensureDatabase(await getDb());
  return database.transaction(async (tx) => {
    const [member] = await tx.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!member) throw new Error("Usuário não encontrado. Peça para a pessoa acessar o sistema ao menos uma vez.");
    if (member.role === "admin" && role !== "admin") {
      const administrators = await tx.select({ id: users.id }).from(users).where(eq(users.role, "admin"));
      if (administrators.length <= 1) throw new Error("Não é possível remover o último administrador.");
    }
    await tx.update(users).set({ role }).where(eq(users.id, userId));
    const [updatedMember] = await tx.select().from(users).where(eq(users.id, userId)).limit(1);
    return updatedMember;
  });
}

export async function setProductAvailability({ productId, available }: { productId: number; available: boolean; actorUserId: number }) {
  const database = ensureDatabase(await getDb());
  await database.update(products).set({ isActive: available }).where(eq(products.id, productId));
  const [product] = await database.select().from(products).where(eq(products.id, productId)).limit(1);
  if (!product) throw new Error("Produto não encontrado.");
  return product;
}

export type UpsertProductInput = {
  id?: number;
  categoryId: number;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  priceInCents: number;
  originalPriceInCents?: number | null;
  isActive: boolean;
  requiresConfiguration: boolean;
  options: Array<{
    groupName: string;
    label: string;
    priceDeltaInCents: number;
    isRequired: boolean;
    sortOrder: number;
    isActive: boolean;
  }>;
  actorUserId: number;
};

export async function upsertProduct(input: UpsertProductInput) {
  const database = ensureDatabase(await getDb());
  return database.transaction(async (tx) => {
    const productValues = {
      categoryId: input.categoryId,
      name: input.name,
      description: input.description ?? null,
      imageUrl: input.imageUrl ?? null,
      priceInCents: input.priceInCents,
      originalPriceInCents: input.originalPriceInCents ?? null,
      isActive: input.isActive,
      requiresConfiguration: input.requiresConfiguration,
    };
    const productId = input.id
      ? input.id
      : (await tx.insert(products).values(productValues).$returningId())[0].id;

    if (input.id) await tx.update(products).set(productValues).where(eq(products.id, input.id));
    await tx.delete(productOptions).where(eq(productOptions.productId, productId));
    if (input.options.length > 0) {
      await tx.insert(productOptions).values(input.options.map((option) => ({ ...option, productId })));
    }

    const [product] = await tx.select().from(products).where(eq(products.id, productId)).limit(1);
    if (!product) throw new Error("Produto não encontrado após salvar.");
    const savedOptions = await tx.select().from(productOptions).where(eq(productOptions.productId, productId)).orderBy(asc(productOptions.sortOrder));
    return { ...product, options: savedOptions };
  });
}

export function attachItemsToOperationalOrders<
  TOrder extends { id: number },
  TItem extends { orderId: number },
>(ordersToHydrate: TOrder[], itemsToAttach: TItem[]): Array<TOrder & { items: TItem[] }> {
  const itemsByOrderId = new Map<number, TItem[]>();
  for (const item of itemsToAttach) {
    const items = itemsByOrderId.get(item.orderId) ?? [];
    items.push(item);
    itemsByOrderId.set(item.orderId, items);
  }

  return ordersToHydrate.map((order) => ({
    ...order,
    items: itemsByOrderId.get(order.id) ?? [],
  }));
}

export function attachAcknowledgementsToOperationalOrders<
  TOrder extends { id: number },
  TAcknowledgement extends { orderId: number; createdAt: Date },
>(ordersToHydrate: TOrder[], acknowledgements: TAcknowledgement[]): Array<TOrder & { acknowledgedAt: Date | null }> {
  const acknowledgedAtByOrderId = new Map(acknowledgements.map((event) => [event.orderId, event.createdAt]));
  return ordersToHydrate.map((order) => ({
    ...order,
    acknowledgedAt: acknowledgedAtByOrderId.get(order.id) ?? null,
  }));
}

export async function listOperationalOrders() {
  const database = ensureDatabase(await getDb());
  const operationalOrders = await database.select().from(orders)
    .where(inArray(orders.status, ["confirmado", "em_preparo", "saiu_para_entrega", "pronto_para_retirada"]))
    .orderBy(asc(orders.createdAt));

  if (operationalOrders.length === 0) return [];
  const [items, acknowledgementEvents] = await Promise.all([
    database.select().from(orderItems)
      .where(inArray(orderItems.orderId, operationalOrders.map((order) => order.id))),
    database.select().from(orderEvents)
      .where(and(
        inArray(orderEvents.orderId, operationalOrders.map((order) => order.id)),
        eq(orderEvents.eventType, "alert_acknowledged"),
      )),
  ]);
  return attachAcknowledgementsToOperationalOrders(
    attachItemsToOperationalOrders(operationalOrders, items),
    acknowledgementEvents,
  );
}

export async function transitionStoredOrder(input: {
  orderId: number;
  nextStatus: OrderStatus;
  actorUserId: number;
  message?: string;
}) {
  const database = ensureDatabase(await getDb());

  return database.transaction(async (tx) => {
    const [order] = await tx.select().from(orders).where(eq(orders.id, input.orderId)).limit(1);
    if (!order) throw new Error("Pedido não encontrado.");
    if (!canTransitionOrderStatus(order.status as OrderStatus, input.nextStatus)) {
      throw new Error("Transição de status inválida.");
    }

    await tx.update(orders).set({ status: input.nextStatus }).where(eq(orders.id, order.id));
    await tx.insert(orderEvents).values({
      orderId: order.id,
      actorUserId: input.actorUserId,
      eventType: "status_changed",
      fromStatus: order.status,
      toStatus: input.nextStatus,
      message: input.message ?? "Status atualizado pela equipe.",
    });

    const [updatedOrder] = await tx.select().from(orders).where(eq(orders.id, order.id)).limit(1);
    return updatedOrder;
  });
}

export async function listQueuedPrintJobs() {
  const database = ensureDatabase(await getDb());
  return database.select({ job: printJobs, order: orders })
    .from(printJobs)
    .innerJoin(orders, eq(printJobs.orderId, orders.id))
    .where(eq(printJobs.status, "queued"))
    .orderBy(asc(printJobs.createdAt));
}

export async function queueManualPrintJob({ orderId, actorUserId }: { orderId: number; actorUserId: number }) {
  const database = ensureDatabase(await getDb());
  return database.transaction(async (tx) => {
    const [order] = await tx.select({ id: orders.id }).from(orders).where(eq(orders.id, orderId)).limit(1);
    if (!order) throw new Error("Pedido não encontrado.");

    const [inserted] = await tx.insert(printJobs).values(buildQueuedPrintJob(orderId)).$returningId();
    await tx.insert(orderEvents).values({
      orderId,
      actorUserId,
      eventType: "print_requeued",
      message: "Reimpressão de comanda solicitada pela equipe.",
    });
    const [job] = await tx.select().from(printJobs).where(eq(printJobs.id, inserted.id)).limit(1);
    return job;
  });
}

export async function markPrintJobResult(input: {
  printJobId: number;
  status: "printed" | "failed";
  printerName?: string;
}) {
  const database = ensureDatabase(await getDb());
  await database.update(printJobs).set({
    status: input.status,
    printerName: input.printerName ?? null,
    printedAt: input.status === "printed" ? new Date() : null,
  }).where(eq(printJobs.id, input.printJobId));
}
