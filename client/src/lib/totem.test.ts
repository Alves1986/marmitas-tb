import { describe, expect, it } from "vitest";
import { createInitialTotemState, createTotemReceipt, expireTotemSession, formatTotemTag } from "./totem";

describe("estado local do totem", () => {
  it("cria uma tag diária com senha e primeiro nome opcional", () => {
    expect(formatTotemTag(1, "Anderson Alves")).toBe("MTB-001 · ANDERSON");
    expect(formatTotemTag(27)).toBe("MTB-027");
  });

  it("limpa o carrinho e os dados pessoais ao expirar", () => {
    const active = {
      ...createInitialTotemState(),
      step: "payment" as const,
      displayName: "Anderson",
      items: [{ id: "marmita-1", name: "Marmita", price: 20, quantity: 1 }],
    };

    expect(expireTotemSession(active)).toEqual(createInitialTotemState());
  });

  it("gera recibo demonstrativo sem identificador de cobrança real", () => {
    const receipt = createTotemReceipt({
      sequence: 4,
      displayName: "Cássia",
      paymentMethod: "card",
      items: [{ id: "marmita-1", name: "Marmita", price: 20, quantity: 1 }],
    });

    expect(receipt.tag).toBe("MTB-004 · CÁSSIA");
    expect(receipt.isDemo).toBe(true);
    expect(receipt.paymentLabel).toMatch(/cartão/i);
  });
});
