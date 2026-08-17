import { describe, expect, it } from "vitest";
import { attachAcknowledgementsToOperationalOrders, attachItemsToOperationalOrders } from "./db";

describe("attachItemsToOperationalOrders", () => {
  it("anexa cada item ao pedido correspondente sem misturar comandas", () => {
    const orders = [{ id: 1, code: "TB-1" }, { id: 2, code: "TB-2" }];
    const items = [
      { orderId: 1, productName: "Marmita" },
      { orderId: 2, productName: "Suco" },
      { orderId: 1, productName: "Sobremesa" },
    ];

    expect(attachItemsToOperationalOrders(orders, items)).toEqual([
      { id: 1, code: "TB-1", items: [{ orderId: 1, productName: "Marmita" }, { orderId: 1, productName: "Sobremesa" }] },
      { id: 2, code: "TB-2", items: [{ orderId: 2, productName: "Suco" }] },
    ]);
  });
});

describe("attachAcknowledgementsToOperationalOrders", () => {
  it("associa a data de reconhecimento ao pedido correspondente", () => {
    const acknowledgedAt = new Date("2026-08-17T15:35:00.000Z");
    expect(attachAcknowledgementsToOperationalOrders(
      [{ id: 1, code: "TB-1" }, { id: 2, code: "TB-2" }],
      [{ orderId: 1, createdAt: acknowledgedAt }],
    )).toEqual([
      { id: 1, code: "TB-1", acknowledgedAt },
      { id: 2, code: "TB-2", acknowledgedAt: null },
    ]);
  });
});
