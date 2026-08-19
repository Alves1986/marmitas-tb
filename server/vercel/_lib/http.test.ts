import { describe, expect, it } from "vitest";
import { json, jsonError, methodNotAllowed } from "./http";

describe("respostas HTTP das funções Vercel", () => {
  it("remove segredos e detalhes internos de um erro 500", async () => {
    const response = jsonError(500, new Error("SUPABASE_SERVICE_ROLE_KEY=segredo-interno"));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "Erro interno." });
  });

  it("preserva uma mensagem pública em erros conhecidos", async () => {
    const response = jsonError(403, "Acesso restrito.");

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "Acesso restrito." });
  });

  it("declara os métodos permitidos ao recusar uma requisição", () => {
    const response = methodNotAllowed(["GET", "POST"]);

    expect(response.status).toBe(405);
    expect(response.headers.get("allow")).toBe("GET, POST");
  });

  it("serializa payloads JSON com cabeçalho apropriado", async () => {
    const response = json(201, { code: "TB-000001" });

    expect(response.headers.get("content-type")).toContain("application/json");
    await expect(response.json()).resolves.toEqual({ code: "TB-000001" });
  });
});
