import { describe, expect, it } from "vitest";
import { canTransitionOrderStatus } from "./operations";

describe("order status transitions", () => {
  it("permite avançar de confirmado para em_preparo", () => {
    expect(canTransitionOrderStatus("confirmado", "em_preparo")).toBe(true);
  });

  it("permite despachar pedido em preparo para entrega", () => {
    expect(canTransitionOrderStatus("em_preparo", "saiu_para_entrega")).toBe(true);
  });

  it("recusa concluir pedido aguardando pagamento", () => {
    expect(canTransitionOrderStatus("aguardando_pagamento", "concluido")).toBe(false);
  });

  it("recusa movimentar pedido concluído", () => {
    expect(canTransitionOrderStatus("concluido", "em_preparo")).toBe(false);
  });
});
