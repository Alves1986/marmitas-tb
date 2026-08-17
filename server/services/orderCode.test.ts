import { describe, expect, it } from "vitest";
import { createOrderCode } from "./orderCode";

describe("order tracking code", () => {
  it("gera código público com o prefixo da Marmitas TB e data compacta", () => {
    const code = createOrderCode(new Date("2026-08-17T15:40:00.000Z"), 42);

    expect(code).toBe("TB-20260817-0042");
  });

  it("mantém ao menos quatro dígitos sequenciais", () => {
    const code = createOrderCode(new Date("2026-08-17T15:40:00.000Z"), 7);

    expect(code).toBe("TB-20260817-0007");
  });
});
