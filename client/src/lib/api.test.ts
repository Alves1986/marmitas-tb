import { afterEach, describe, expect, it, vi } from "vitest";

const getSession = vi.hoisted(() => vi.fn());

vi.mock("./supabaseClient", () => ({
  supabase: { auth: { getSession } },
}));

import { ApiError, apiRequest } from "./api";

describe("cliente HTTP das funções Vercel", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("anexa o Bearer token Supabase somente quando existe sessão", async () => {
    getSession.mockResolvedValue({ data: { session: { access_token: "jwt-access-token" } } });
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ code: "TB-000001" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(apiRequest<{ code: string }>("/api/public/orders")).resolves.toEqual({ code: "TB-000001" });
    const request = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(new Headers(request.headers).get("authorization")).toBe("Bearer jwt-access-token");
  });

  it("converte uma resposta não exitosa na mensagem pública da API", async () => {
    getSession.mockResolvedValue({ data: { session: null } });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: "Acesso restrito." }), { status: 403 })));

    await expect(apiRequest("/api/admin/catalog")).rejects.toEqual(new ApiError(403, "Acesso restrito."));
  });

  it("encerra a requisição pendente da fila operacional em vez de deixá-la carregando", async () => {
    vi.useFakeTimers();
    getSession.mockResolvedValue({ data: { session: { access_token: "jwt-access-token" } } });
    let requestSignal: AbortSignal | undefined;
    vi.stubGlobal("fetch", vi.fn((_path: string, init?: RequestInit) => new Promise((_resolve, reject) => {
      requestSignal = init?.signal ?? undefined;
      requestSignal?.addEventListener("abort", () => reject(requestSignal?.reason));
    })));

    const request = apiRequest("/api/operations/orders");
    const expectedFailure = expect(request).rejects.toThrow("A solicitação demorou mais do que o esperado");
    await vi.advanceTimersByTimeAsync(15_000);

    await expectedFailure;
    expect(requestSignal?.aborted).toBe(true);
  });
});
