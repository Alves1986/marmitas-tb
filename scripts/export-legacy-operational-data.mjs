import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import mysql from "mysql2/promise";
import { createLegacyOperationalSnapshot } from "./lib/legacyOperationalExport.ts";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL é obrigatória para exportar o histórico legado.");
}

const outputDirectory = path.resolve(process.cwd(), "migration-artifacts");
const timestamp = new Date().toISOString().replaceAll(":", "-");
const outputPath = path.join(outputDirectory, `legacy-operational-${timestamp}.json`);

const connection = await mysql.createConnection(databaseUrl);
try {
  const snapshot = await createLegacyOperationalSnapshot(connection);
  await mkdir(outputDirectory, { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(snapshot, null, 2)}\n`, { mode: 0o600 });
  console.log(JSON.stringify({
    outputPath,
    orders: snapshot.orders.length,
    orderItems: snapshot.orderItems.length,
    orderEvents: snapshot.orderEvents.length,
    paymentEvents: snapshot.paymentEvents.length,
    printJobs: snapshot.printJobs.length,
  }));
} finally {
  await connection.end();
}
