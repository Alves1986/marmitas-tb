import { describe, expect, it } from "vitest";
import { buildKitchenBoard, getKitchenOrderAction, type KitchenOrder } from "./kitchenBoard";

function order(overrides: Partial<KitchenOrder> = {}): KitchenOrder {
  return {
    id: "order-default",
    code: "TB-0001",
    customerName: "Cliente",
    customerNotes: null,
    status: "confirmado",
    createdAt: "2026-08-27T12:00:00.000Z",
    items: [{ productName: "Marmita", quantity: 1, unitPriceInCents: 2500, notes: null }],
    sourceChannel: "OWN_APP",
    counterTicket: null,
    ...overrides,
  };
}

describe("buildKitchenBoard", () => {
  it("expõe somente a próxima ação permitida para os estados ativos da cozinha", () => {
    expect(getKitchenOrderAction("confirmado")).toEqual({ label: "Iniciar preparo", nextStatus: "em_preparo" });
    expect(getKitchenOrderAction("em_preparo")).toEqual({ label: "Marcar pronto", nextStatus: "pronto_para_retirada" });
    expect(getKitchenOrderAction("pronto_para_retirada")).toBeNull();
    expect(getKitchenOrderAction("concluido")).toBeNull();
  });

  it("destaca COUNTER ativo sem duplicá-lo nas colunas e mantém a ordem mais antiga primeiro", () => {
    const board = buildKitchenBoard([
      order({ id: "own-new", createdAt: "2026-08-27T12:10:00.000Z" }),
      order({ id: "counter-new", sourceChannel: "COUNTER", counterTicket: "MTB-001", createdAt: "2026-08-27T12:00:00.000Z" }),
      order({ id: "kiosk-preparing", sourceChannel: "KIOSK", status: "em_preparo" }),
      order({ id: "own-ready", status: "pronto_para_retirada" }),
      order({ id: "counter-finished", sourceChannel: "COUNTER", status: "concluido" }),
      order({ id: "waiting-payment", status: "aguardando_pagamento" }),
    ]);

    expect(board.counterPriority.map((item) => item.id)).toEqual(["counter-new"]);
    expect(board.confirmed.map((item) => item.id)).toEqual(["own-new"]);
    expect(board.preparing.map((item) => item.id)).toEqual(["kiosk-preparing"]);
    expect(board.ready.map((item) => item.id)).toEqual(["own-ready"]);
  });

  it("ordena cada grupo pelo horário de criação crescente", () => {
    const board = buildKitchenBoard([
      order({ id: "newer", createdAt: "2026-08-27T12:20:00.000Z" }),
      order({ id: "older", createdAt: "2026-08-27T12:10:00.000Z" }),
    ]);

    expect(board.confirmed.map((item) => item.id)).toEqual(["older", "newer"]);
  });
});
