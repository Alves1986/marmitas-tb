import mysql from "mysql2/promise";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL não está configurada; o inventário legado não pode ser executado.");
}

const tables = ["orders", "orderItems", "orderEvents", "paymentEvents", "printJobs", "storeSettings"];
const connection = await mysql.createConnection(databaseUrl);

try {
  const entries = await Promise.all(tables.map(async tableName => {
    const [rows] = await connection.query(`SELECT COUNT(*) AS total FROM \`${tableName}\``);
    const firstRow = rows[0];
    const total = Number(firstRow?.total);
    if (!Number.isSafeInteger(total) || total < 0) {
      throw new Error(`Contagem inválida retornada para a tabela legada ${tableName}.`);
    }
    return [tableName, total];
  }));

  process.stdout.write(`${JSON.stringify({
    mode: "read-only",
    inventoriedAt: new Date().toISOString(),
    recordCounts: Object.fromEntries(entries),
  }, null, 2)}\n`);
} finally {
  await connection.end();
}
