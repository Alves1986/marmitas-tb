import { boolean, index, int, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin", "staff"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const categories = mysqlTable("categories", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  slug: varchar("slug", { length: 140 }).notNull().unique(),
  sortOrder: int("sortOrder").default(0).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const products = mysqlTable("products", {
  id: int("id").autoincrement().primaryKey(),
  categoryId: int("categoryId").notNull().references(() => categories.id),
  name: varchar("name", { length: 180 }).notNull(),
  description: text("description"),
  imageUrl: text("imageUrl"),
  priceInCents: int("priceInCents").notNull(),
  originalPriceInCents: int("originalPriceInCents"),
  isActive: boolean("isActive").default(true).notNull(),
  requiresConfiguration: boolean("requiresConfiguration").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("products_category_idx").on(table.categoryId),
]);

export const productOptions = mysqlTable("productOptions", {
  id: int("id").autoincrement().primaryKey(),
  productId: int("productId").notNull().references(() => products.id),
  groupName: varchar("groupName", { length: 100 }).notNull(),
  label: varchar("label", { length: 160 }).notNull(),
  priceDeltaInCents: int("priceDeltaInCents").default(0).notNull(),
  isRequired: boolean("isRequired").default(false).notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
});

export const orders = mysqlTable("orders", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 32 }).notNull(),
  customerName: varchar("customerName", { length: 160 }).notNull(),
  customerPhone: varchar("customerPhone", { length: 32 }).notNull(),
  customerPhoneLookup: varchar("customerPhoneLookup", { length: 32 }).notNull(),
  fulfillmentMethod: mysqlEnum("fulfillmentMethod", ["delivery", "pickup"]).notNull(),
  deliveryAddress: text("deliveryAddress"),
  customerNotes: text("customerNotes"),
  subtotalInCents: int("subtotalInCents").notNull(),
  deliveryFeeInCents: int("deliveryFeeInCents").default(0).notNull(),
  totalInCents: int("totalInCents").notNull(),
  status: mysqlEnum("status", [
    "aguardando_pagamento",
    "confirmado",
    "em_preparo",
    "saiu_para_entrega",
    "pronto_para_retirada",
    "concluido",
    "cancelado",
  ]).default("aguardando_pagamento").notNull(),
  paymentMethod: mysqlEnum("paymentMethod", ["pix", "credit_card", "voucher", "cash"]).notNull(),
  paymentProvider: mysqlEnum("paymentProvider", ["asaas_test", "asaas"]).default("asaas_test").notNull(),
  paymentStatus: mysqlEnum("paymentStatus", ["pending", "confirmed", "failed", "cancelled", "refunded"]).default("pending").notNull(),
  paymentReference: varchar("paymentReference", { length: 160 }),
  paymentConfirmedAt: timestamp("paymentConfirmedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  uniqueIndex("orders_code_unique").on(table.code),
  index("orders_status_created_idx").on(table.status, table.createdAt),
  index("orders_phone_idx").on(table.customerPhone),
  index("orders_phone_lookup_created_idx").on(table.customerPhoneLookup, table.createdAt),
]);

export const orderItems = mysqlTable("orderItems", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull().references(() => orders.id),
  productId: int("productId"),
  productName: varchar("productName", { length: 180 }).notNull(),
  unitPriceInCents: int("unitPriceInCents").notNull(),
  quantity: int("quantity").notNull(),
  configurationJson: text("configurationJson"),
  notes: text("notes"),
});

export const orderEvents = mysqlTable("orderEvents", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull().references(() => orders.id),
  actorUserId: int("actorUserId").references(() => users.id),
  eventType: varchar("eventType", { length: 80 }).notNull(),
  fromStatus: varchar("fromStatus", { length: 40 }),
  toStatus: varchar("toStatus", { length: 40 }),
  message: text("message"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [
  index("order_events_order_created_idx").on(table.orderId, table.createdAt),
]);

export const paymentEvents = mysqlTable("paymentEvents", {
  id: int("id").autoincrement().primaryKey(),
  provider: varchar("provider", { length: 40 }).notNull(),
  externalEventId: varchar("externalEventId", { length: 160 }).notNull(),
  orderId: int("orderId").references(() => orders.id),
  eventType: varchar("eventType", { length: 120 }).notNull(),
  payloadJson: text("payloadJson").notNull(),
  processedAt: timestamp("processedAt").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("payment_events_provider_event_unique").on(table.provider, table.externalEventId),
  index("payment_events_order_processed_idx").on(table.orderId, table.processedAt),
]);

export const printJobs = mysqlTable("printJobs", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull().references(() => orders.id),
  status: mysqlEnum("status", ["queued", "printed", "failed"]).default("queued").notNull(),
  attempts: int("attempts").default(0).notNull(),
  printerName: varchar("printerName", { length: 160 }),
  printedAt: timestamp("printedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [
  index("print_jobs_status_created_idx").on(table.status, table.createdAt),
]);

export const storeSettings = mysqlTable("storeSettings", {
  id: int("id").autoincrement().primaryKey(),
  settingKey: varchar("settingKey", { length: 120 }).notNull(),
  settingValue: text("settingValue").notNull(),
  updatedByUserId: int("updatedByUserId").references(() => users.id),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  uniqueIndex("store_settings_key_unique").on(table.settingKey),
]);

export type Category = typeof categories.$inferSelect;
export type Product = typeof products.$inferSelect;
export type ProductOption = typeof productOptions.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
export type OrderEvent = typeof orderEvents.$inferSelect;
export type PaymentEvent = typeof paymentEvents.$inferSelect;
export type PrintJob = typeof printJobs.$inferSelect;
