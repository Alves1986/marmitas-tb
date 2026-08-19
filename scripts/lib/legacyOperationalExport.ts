export type LegacyRow = Record<string, unknown>;

export type ReadonlyLegacyDatabase = {
  query(statement: string): Promise<[LegacyRow[]]>;
};

export type LegacyOperationalSnapshot = {
  formatVersion: 2;
  exportedAt: string;
  orders: LegacyRow[];
  orderItems: LegacyRow[];
  orderEvents: LegacyRow[];
  paymentEvents: LegacyRow[];
  printJobs: LegacyRow[];
  storeSettings: LegacyRow[];
};

function parsePreservingRawJson(value: unknown): unknown {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function deserializeJsonField(row: LegacyRow, field: string): LegacyRow {
  return {
    ...row,
    [field]: parsePreservingRawJson(row[field]),
  };
}

async function readTable(database: ReadonlyLegacyDatabase, tableName: string): Promise<LegacyRow[]> {
  const [rows] = await database.query(`SELECT * FROM ${tableName} ORDER BY id ASC`);
  return rows;
}

export async function createLegacyOperationalSnapshot(
  database: ReadonlyLegacyDatabase,
  exportedAt = new Date(),
): Promise<LegacyOperationalSnapshot> {
  const [orders, orderItems, orderEvents, paymentEvents, printJobs, storeSettings] = await Promise.all([
    readTable(database, "orders"),
    readTable(database, "orderItems"),
    readTable(database, "orderEvents"),
    readTable(database, "paymentEvents"),
    readTable(database, "printJobs"),
    readTable(database, "storeSettings"),
  ]);

  return {
    formatVersion: 2,
    exportedAt: exportedAt.toISOString(),
    orders,
    orderItems: orderItems.map(row => deserializeJsonField(row, "configurationJson")),
    orderEvents,
    paymentEvents: paymentEvents.map(row => deserializeJsonField(row, "payloadJson")),
    printJobs,
    storeSettings: storeSettings.map(row => deserializeJsonField(row, "settingValue")),
  };
}
