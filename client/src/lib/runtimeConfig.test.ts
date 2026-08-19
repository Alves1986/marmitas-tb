import { describe, expect, it } from "vitest";
import { isVercelRuntime } from "./runtimeConfig";

describe("configuração pública de runtime", () => {
  it("ativa o transporte Vercel no ambiente de homologação", () => {
    expect(import.meta.env.VITE_API_RUNTIME).toBe("vercel");
  });

  it("requer homologação Vercel e build de produção", () => {
    expect(isVercelRuntime({ apiRuntime: "vercel", isProduction: true })).toBe(true);
    expect(isVercelRuntime({ apiRuntime: "vercel", isProduction: false })).toBe(false);
    expect(isVercelRuntime({ apiRuntime: "local", isProduction: true })).toBe(false);
  });

  it("mantém o transporte HTTP Vercel no domínio publicado mesmo sem variável de build", () => {
    expect(isVercelRuntime({ apiRuntime: undefined, isProduction: true, hostname: "marmitastb.vercel.app" })).toBe(true);
  });
});
