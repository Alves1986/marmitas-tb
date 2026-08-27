import { afterEach, describe, expect, it, vi } from "vitest";
import { helpService } from "./helpService";

afterEach(() => vi.unstubAllGlobals());

describe("serviço de ajuda", () => {
  it("envia somente superfície e conversa curta para a operação consolidada", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ answer: "Abra a sacola." }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(helpService.ask({ surface: "storefront", messages: [{ role: "user", content: "Como finalizo?" }] })).resolves.toBe("Abra a sacola.");
    expect(fetchMock).toHaveBeenCalledWith("/api/operations/help", expect.objectContaining({ method: "POST" }));
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ surface: "storefront", messages: [{ role: "user", content: "Como finalizo?" }] });
  });

  it("propaga a mensagem pública do servidor quando a ajuda não estiver disponível", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: "A ajuda está indisponível no momento. Consulte o tutorial desta página." }), { status: 503 })));

    await expect(helpService.ask({ surface: "tracking", messages: [{ role: "user", content: "Como acompanho?" }] })).rejects.toThrow("A ajuda está indisponível no momento. Consulte o tutorial desta página.");
  });
});
