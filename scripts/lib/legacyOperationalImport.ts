import type { LegacyOperationalSnapshot, LegacyRow } from "./legacyOperationalExport";

type ImportEntity = "orders" | "orderItems" | "orderEvents" | "paymentEvents" | "printJobs" | "storeSettings";

export type LegacyMapReference = {
  legacyEntity: ImportEntity;
  legacyId: number;
};

export type LegacyOperationalImportPlan = {
  mode: "dry-run";
  summary: Record<ImportEntity, { toCreate: number; alreadyMapped: number }>;
  conflicts: Array<{ legacyEntity: ImportEntity; legacyId: number; reason: string }>;
  unresolvedReferences: Array<{ legacyEntity: ImportEntity; legacyId: number; reference: string }>;
};

export type LegacyOperationalImportPlanningOptions = {
  legacyMaps: LegacyMapReference[];
  existingOrderCodes?: ReadonlySet<string>;
  productIdMap?: ReadonlyMap<number, string>;
  userIdMap?: ReadonlyMap<number, string>;
};

const entities: ImportEntity[] = [
  "orders",
  "orderItems",
  "orderEvents",
  "paymentEvents",
  "printJobs",
  "storeSettings",
];

function getLegacyId(row: LegacyRow, entity: ImportEntity): number {
  const legacyId = Number(row.id);
  if (!Number.isSafeInteger(legacyId) || legacyId < 1) {
    throw new Error(`Registro legado inválido em ${entity}: id numérico positivo é obrigatório.`);
  }
  return legacyId;
}

function getOrderId(row: LegacyRow, entity: Exclude<ImportEntity, "orders" | "storeSettings">): number | null {
  if (row.orderId === null || row.orderId === undefined) return null;
  const orderId = Number(row.orderId);
  if (!Number.isSafeInteger(orderId) || orderId < 1) {
    throw new Error(`Referência orderId inválida em ${entity}.`);
  }
  return orderId;
}

function createSummary(): LegacyOperationalImportPlan["summary"] {
  return Object.fromEntries(entities.map(entity => [entity, { toCreate: 0, alreadyMapped: 0 }])) as LegacyOperationalImportPlan["summary"];
}

export function planLegacyOperationalImport(
  snapshot: LegacyOperationalSnapshot,
  options: LegacyOperationalImportPlanningOptions,
): LegacyOperationalImportPlan {
  const summary = createSummary();
  const conflicts: LegacyOperationalImportPlan["conflicts"] = [];
  const unresolvedReferences: LegacyOperationalImportPlan["unresolvedReferences"] = [];
  const mappedKeys = new Set(options.legacyMaps.map(map => `${map.legacyEntity}:${map.legacyId}`));
  const sourceOrderIds = new Set(snapshot.orders.map(order => getLegacyId(order, "orders")));

  const registerEntity = (entity: ImportEntity, row: LegacyRow) => {
    const legacyId = getLegacyId(row, entity);
    if (mappedKeys.has(`${entity}:${legacyId}`)) {
      summary[entity].alreadyMapped += 1;
      return false;
    }
    summary[entity].toCreate += 1;
    return true;
  };

  for (const order of snapshot.orders) {
    const shouldCreate = registerEntity("orders", order);
    const legacyId = getLegacyId(order, "orders");
    const code = typeof order.code === "string" ? order.code.trim() : "";
    if (!code) {
      if (shouldCreate) summary.orders.toCreate -= 1;
      conflicts.push({ legacyEntity: "orders", legacyId, reason: "order_code_missing" });
      continue;
    }
    if (shouldCreate && options.existingOrderCodes?.has(code)) {
      summary.orders.toCreate -= 1;
      conflicts.push({ legacyEntity: "orders", legacyId, reason: "order_code_already_exists_without_legacy_map" });
    }
  }

  const planOrderChild = (entity: Exclude<ImportEntity, "orders" | "storeSettings">, row: LegacyRow) => {
    const shouldCreate = registerEntity(entity, row);
    const legacyId = getLegacyId(row, entity);
    const orderId = getOrderId(row, entity);
    if (shouldCreate && (orderId === null || !sourceOrderIds.has(orderId))) {
      summary[entity].toCreate -= 1;
      unresolvedReferences.push({ legacyEntity: entity, legacyId, reference: "order_id" });
      return false;
    }
    return shouldCreate;
  };

  for (const item of snapshot.orderItems) {
    const shouldCreate = planOrderChild("orderItems", item);
    const productId = item.productId === null || item.productId === undefined ? null : Number(item.productId);
    if (productId !== null && !options.productIdMap?.has(productId)) {
      if (shouldCreate) summary.orderItems.toCreate -= 1;
      unresolvedReferences.push({ legacyEntity: "orderItems", legacyId: getLegacyId(item, "orderItems"), reference: "product_id" });
    }
  }
  for (const event of snapshot.orderEvents) planOrderChild("orderEvents", event);
  for (const event of snapshot.paymentEvents) planOrderChild("paymentEvents", event);
  for (const printJob of snapshot.printJobs) planOrderChild("printJobs", printJob);
  for (const setting of snapshot.storeSettings) registerEntity("storeSettings", setting);

  return { mode: "dry-run", summary, conflicts, unresolvedReferences };
}
