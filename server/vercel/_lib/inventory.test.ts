import { describe, expect, it } from "vitest";
import { getInventoryLevel, validateMovement } from "./inventory.js";

describe("regras puras de estoque", () => {
  it("aceita entrada positiva e consumo interno negativo", () => {
    expect(validateMovement({ type: "ENTRY", quantityDelta: 1 })).toEqual({ ok: true });
    expect(validateMovement({ type: "INTERNAL_CONSUMPTION", quantityDelta: -0.25 })).toEqual({ ok: true });
  });

  it("exige motivo para perda e ajuste", () => {
    expect(validateMovement({ type: "LOSS", quantityDelta: -1 })).toEqual({
      ok: false,
      message: "Informe o motivo da perda ou do ajuste.",
    });
    expect(validateMovement({ type: "ADJUSTMENT", quantityDelta: 1, reason: "Contagem corrigida" })).toEqual({ ok: true });
  });

  it("rejeita sinal incompatível e quantidade nula", () => {
    expect(validateMovement({ type: "ENTRY", quantityDelta: -1 })).toEqual({
      ok: false,
      message: "Entrada deve aumentar o saldo.",
    });
    expect(validateMovement({ type: "INTERNAL_CONSUMPTION", quantityDelta: 0 })).toEqual({
      ok: false,
      message: "Informe uma quantidade diferente de zero.",
    });
  });

  it("classifica saldo no mínimo como crítico e margem próxima como atenção", () => {
    expect(getInventoryLevel(2, 2)).toBe("critical");
    expect(getInventoryLevel(2.5, 2)).toBe("attention");
    expect(getInventoryLevel(3, 2)).toBe("healthy");
  });
});
