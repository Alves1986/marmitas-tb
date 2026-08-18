import { describe, expect, it } from "vitest";
import {
  assertTransition,
  buildOrderCode,
  createTemporaryOrderCode,
  normalizePhoneForLookup,
  trackingInput,
} from "./orders";

describe("domínio de pedidos das funções Vercel", () => {
  it("normaliza telefone brasileiro removendo formatação", () => {
    expect(normalizePhoneForLookup("(42) 99999-1234")).toBe("42999991234");
  });

  it("gera códigos estáveis para confirmação e referências temporárias", () => {
    const createdAt = new Date("2026-08-18T15:00:00.000Z");

    expect(buildOrderCode(createdAt, 42)).toBe("TB-20260818-0042");
    expect(createTemporaryOrderCode(createdAt, "a1b2c3")).toBe("TB-20260818-A1B2C3");
  });

  it("aceita somente transições operacionais permitidas", () => {
    expect(() => assertTransition("confirmado", "em_preparo")).not.toThrow();
    expect(() => assertTransition("concluido", "em_preparo")).toThrow("Transição de pedido não permitida.");
  });

  it("exige código e telefone válido no rastreamento", () => {
    expect(trackingInput.parse({ code: "TB-20260818-0042", phone: "(42) 99999-1234" })).toEqual({
      code: "TB-20260818-0042",
      phone: "42999991234",
    });
    expect(() => trackingInput.parse({ code: "", phone: "999" })).toThrow();
  });
});
