import { describe, expect, it, vi } from "vitest";
import { createLegacyOperationalSnapshot } from "./legacyOperationalExport";

describe("createLegacyOperationalSnapshot", () => {
  it("exporta pedidos e dependências preservando os IDs legados de auditoria sem escrever no banco", async () => {
    const query = vi.fn(async (statement: string) => {
      if (statement.includes("FROM orders")) return [[{ id: 41, code: "TB-41", status: "confirmado" }]];
      if (statement.includes("FROM orderItems")) return [[{ id: 7, orderId: 41, configurationJson: '{"arroz":"integral"}' }]];
      if (statement.includes("FROM orderEvents")) return [[{ id: 9, orderId: 41, actorUserId: 3, message: "Confirmado" }]];
      if (statement.includes("FROM paymentEvents")) return [[{ id: 2, orderId: 41, payloadJson: '{"id":"evt_1"}' }]];
      if (statement.includes("FROM printJobs")) return [[{ id: 4, orderId: 41, status: "queued" }]];
      if (statement.includes("FROM storeSettings")) return [[{ id: 1, settingKey: "store", settingValue: '{"isOpen":true}' }]];
      throw new Error(`Consulta inesperada: ${statement}`);
    });

    const snapshot = await createLegacyOperationalSnapshot({ query }, new Date("2026-08-18T20:00:00.000Z"));

    expect(snapshot).toEqual({
      formatVersion: 2,
      exportedAt: "2026-08-18T20:00:00.000Z",
      orders: [{ id: 41, code: "TB-41", status: "confirmado" }],
      orderItems: [{ id: 7, orderId: 41, configurationJson: { arroz: "integral" } }],
      orderEvents: [{ id: 9, orderId: 41, actorUserId: 3, message: "Confirmado" }],
      paymentEvents: [{ id: 2, orderId: 41, payloadJson: { id: "evt_1" } }],
      printJobs: [{ id: 4, orderId: 41, status: "queued" }],
      storeSettings: [{ id: 1, settingKey: "store", settingValue: { isOpen: true } }],
    });
    expect(query).toHaveBeenCalledTimes(6);
  });

  it("conserva texto inválido de JSON para impedir perda silenciosa de dados históricos", async () => {
    const query = vi.fn(async (statement: string) => {
      if (statement.includes("FROM orders")) return [[]];
      if (statement.includes("FROM orderItems")) return [[{ id: 8, configurationJson: "legado-inválido" }]];
      if (statement.includes("FROM orderEvents")) return [[]];
      if (statement.includes("FROM paymentEvents")) return [[{ id: 3, payloadJson: "{inválido" }]];
      if (statement.includes("FROM printJobs")) return [[]];
      if (statement.includes("FROM storeSettings")) return [[{ id: 1, settingValue: "{inválido" }]];
      throw new Error("Consulta inesperada");
    });

    const snapshot = await createLegacyOperationalSnapshot({ query }, new Date("2026-08-18T20:00:00.000Z"));

    expect(snapshot.orderItems[0]?.configurationJson).toBe("legado-inválido");
    expect(snapshot.paymentEvents[0]?.payloadJson).toBe("{inválido");
    expect(snapshot.storeSettings[0]?.settingValue).toBe("{inválido");
  });
});
