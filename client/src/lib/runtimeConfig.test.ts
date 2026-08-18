import { describe, expect, it } from "vitest";

describe("configuração pública de runtime", () => {
  it("ativa o transporte Vercel no ambiente de homologação", () => {
    expect(import.meta.env.VITE_API_RUNTIME).toBe("vercel");
  });
});
