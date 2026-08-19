import type { LegacyRow, ReadonlyLegacyDatabase } from "./legacyOperationalExport";

export type LegacyOperationalInventory = {
  orders: number;
  orderItems: number;
  orderEvents: number;
  paymentEvents: number;
  printJobs: number;
  storeSettings: number;
};

const inventoryTables = [
  ["orders", "orders"],
  ["orderItems", "orderItems"],
  ["orderEvents", "orderEvents"],
  ["paymentEvents", "paymentEvents"],
  ["printJobs", "printJobs"],
  ["storeSettings", "storeSettings"],
] as const;

function parseCount(row: LegacyRow | undefined, tableName: string): number {
  const rawCount = row?.total;
  const count = typeof rawCount === "number" ? rawCount : Number(rawCount);
  if (!Number.isSafeInteger(count) || count < 0) {
    throw new Error(`Contagem inválida retornada para a tabela legada ${tableName}.`);
  }
  return count;
}

export async function createLegacyOperationalInventory(
  database: ReadonlyLegacyDatabase,
): Promise<LegacyOperationalInventory> {
  const results = await Promise.all(inventoryTables.map(async ([key, tableName]) => {
    const [rows] = await database.query(`SELECT COUNT(*) AS total FROM ${tableName}`);
    return [key, parseCount(rows[0], tableName)] as const;
  }));

  return Object.fromEntries(results) as LegacyOperationalInventory;
}
