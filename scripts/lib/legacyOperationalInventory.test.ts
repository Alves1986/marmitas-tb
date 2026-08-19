import { describe, expect, it, vi } from "vitest";
import { createLegacyOperationalInventory } from "./legacyOperationalInventory";

describe("createLegacyOperationalInventory", () => {
  it("contabiliza as seis entidades legadas por consultas somente leitura", async () => {
    const query = vi.fn(async (statement: string) => {
      if (statement.includes("FROM orders")) return [[{ total: 4 }]];
      if (statement.includes("FROM orderItems")) return [[{ total: 9 }]];
      if (statement.includes("FROM orderEvents")) return [[{ total: 7 }]];
      if (statement.includes("FROM paymentEvents")) return [[{ total: 3 }]];
      if (statement.includes("FROM printJobs")) return [[{ total: 2 }]];
      if (statement.includes("FROM storeSettings")) return [[{ total: 1 }]];
      throw new Error(`Consulta inesperada: ${statement}`);
    });

    await expect(createLegacyOperationalInventory({ query })).resolves.toEqual({
      orders: 4,
      orderItems: 9,
      orderEvents: 7,
      paymentEvents: 3,
      printJobs: 2,
      storeSettings: 1,
    });

    expect(query).toHaveBeenCalledTimes(6);
    expect(query.mock.calls.every(([statement]) => /^SELECT\s+COUNT\(\*\)/i.test(statement))).toBe(true);
  });
});
