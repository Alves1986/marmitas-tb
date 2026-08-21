import { describe, expect, it } from "vitest";
import { createInitialTotemState, createTotemReceipt, expireTotemSession, formatTotemTag, getTotemLocalDay, incrementTotemDailySequence, readTotemDailySequence } from "./totem";

describe("estado local do totem", () => {
  it("cria uma tag diária com senha e primeiro nome opcional", () => {
    expect(formatTotemTag(1, "Anderson Alves")).toBe("MTB-001 · ANDERSON");
    expect(formatTotemTag(27)).toBe("MTB-027");
  });

  it("mantém a sequência armazenada quando o totem é usado no mesmo dia", () => {
    const now = new Date(2026, 7, 21, 10, 30);
    const current = readTotemDailySequence(JSON.stringify({ day: getTotemLocalDay(now), sequence: 4 }), now);

    expect(incrementTotemDailySequence(current)).toEqual({ day: "2026-08-21", sequence: 5 });
  });

  it("reinicia a sequência da tag quando a data local muda", () => {
    const today = new Date(2026, 7, 21, 23, 59);
    const tomorrow = new Date(2026, 7, 22, 0, 1);
    const stored = JSON.stringify({ day: getTotemLocalDay(today), sequence: 18 });

    expect(readTotemDailySequence(stored, tomorrow)).toEqual({ day: "2026-08-22", sequence: 0 });
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
