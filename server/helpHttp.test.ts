import { describe, expect, it, vi } from "vitest";
import { ApiAuthError } from "./vercel/_lib/auth";
import { createHelpHandler } from "./vercel/_lib/operations/help";

function helpRequest(surface: string, content: string) {
  return new Request("https://app.test/api/operations/help", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ surface, messages: [{ role: "user", content }] }),
  });
}

describe("operação de ajuda", () => {
  it("usa somente o perfil cliente para a ajuda pública", async () => {
    const requireStaff = vi.fn();
    const ask = vi.fn().mockResolvedValue("Abra a sacola e revise o pedido.");
    const response = await createHelpHandler({ requireStaff, ask })(helpRequest("storefront", "Como finalizo?"));

    expect(response.status).toBe(200);
    expect(requireStaff).not.toHaveBeenCalled();
    expect(ask).toHaveBeenCalledWith(expect.objectContaining({ audience: "customer", role: "customer", surface: "storefront", question: "Como finalizo?" }));
    await expect(response.json()).resolves.toEqual({ answer: "Abra a sacola e revise o pedido." });
  });

  it("exige sessão de equipe para a ajuda de gestão e deriva o papel no servidor", async () => {
    const ask = vi.fn();
    const unauthenticated = createHelpHandler({
      requireStaff: vi.fn().mockRejectedValue(new ApiAuthError(401, "Sessão necessária.")),
      ask,
    });
    const denied = await unauthenticated(helpRequest("admin", "Como vejo relatórios?"));

    expect(denied.status).toBe(401);
    await expect(denied.json()).resolves.toEqual({ error: "Sessão necessária." });
    expect(ask).not.toHaveBeenCalled();

    const staffAsk = vi.fn().mockResolvedValue("Abra Relatórios no menu lateral.");
    const authenticated = createHelpHandler({
      requireStaff: vi.fn().mockResolvedValue({ id: "f19a7b76-7b1a-43b1-b4cd-5f90d59e5d34", role: "staff", displayName: "Equipe" }),
      ask: staffAsk,
    });
    const allowed = await authenticated(helpRequest("admin", "Como vejo relatórios?"));

    expect(allowed.status).toBe(200);
    expect(staffAsk).toHaveBeenCalledWith(expect.objectContaining({ audience: "management", role: "staff", surface: "admin" }));
  });

  it("recusa dados pessoais antes de consultar o modelo", async () => {
    const ask = vi.fn();
    const response = await createHelpHandler({ requireStaff: vi.fn(), ask })(helpRequest("tracking", "Meu telefone é 42 99999-9999"));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Não envie dados pessoais ou identificadores de pedido pelo assistente." });
    expect(ask).not.toHaveBeenCalled();
  });

  it("retorna uma orientação recuperável se o modelo falhar", async () => {
    const response = await createHelpHandler({ requireStaff: vi.fn(), ask: vi.fn().mockRejectedValue(new Error("modelo indisponível")) })(helpRequest("storefront", "Como escolho uma marmita?"));

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ error: "A ajuda está indisponível no momento. Consulte o tutorial desta página." });
  });
});
