import { describe, expect, it } from "vitest";
import { getNextStatusActions, getManualPrintRequest } from "./OrderQueue";

describe("getNextStatusActions", () => {
  it("oferece iniciar preparo para pedido confirmado", () => {
    expect(getNextStatusActions("confirmado")).toEqual([
      { nextStatus: "em_preparo", label: "Iniciar preparo" },
      { nextStatus: "cancelado", label: "Cancelar pedido" },
    ]);
  });

  it("não oferece nova ação para pedido concluído", () => {
    expect(getNextStatusActions("concluido")).toEqual([]);
  });
});

describe("getManualPrintRequest", () => {
  it("vincula a reimpressão ao identificador persistente do pedido", () => {
    expect(getManualPrintRequest(42)).toEqual({ orderId: 42 });
  });
});
