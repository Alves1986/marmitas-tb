import { beforeEach, describe, expect, it, vi } from "vitest";

const { registerSW } = vi.hoisted(() => ({ registerSW: vi.fn() }));

vi.mock("virtual:pwa-register", () => ({ registerSW }));
vi.mock("@/lib/trpc", () => ({
  trpc: {
    createClient: vi.fn(() => ({})),
    Provider: ({ children }: { children: unknown }) => children,
  },
}));
vi.mock("@/lib/supabaseClient", () => ({
  supabase: { auth: { getSession: vi.fn(async () => ({ data: { session: null } })) } },
}));
vi.mock("@shared/const", () => ({ UNAUTHED_ERR_MSG: "não autenticado" }));
vi.mock("@tanstack/react-query", () => ({
  QueryClient: class {
    getQueryCache() { return { subscribe: vi.fn() }; }
    getMutationCache() { return { subscribe: vi.fn() }; }
  },
  QueryClientProvider: ({ children }: { children: unknown }) => children,
}));
vi.mock("@trpc/client", () => ({
  httpBatchLink: vi.fn(),
  TRPCClientError: class extends Error {},
}));
vi.mock("superjson", () => ({ default: {} }));
vi.mock("react-dom/client", () => ({ createRoot: vi.fn(() => ({ render: vi.fn() })) }));
vi.mock("./App", () => ({ default: () => null }));
vi.mock("./contexts/OrderContext", () => ({ OrderProvider: ({ children }: { children: unknown }) => children }));

describe("registro da PWA", () => {
  beforeEach(() => {
    vi.resetModules();
    registerSW.mockReset();
    vi.stubEnv("PROD", true);
    vi.stubGlobal("document", { getElementById: vi.fn(() => ({})) });
    vi.stubGlobal("window", { location: { pathname: "/" } });
  });

  it("pede atualização imediata quando o service worker é registrado", async () => {
    await import("./main");

    const options = registerSW.mock.calls[0]?.[0] as { onRegisteredSW?: unknown } | undefined;

    expect(options?.onRegisteredSW).toEqual(expect.any(Function));
  });

  it("consulta a atualização assim que recebe o registro do service worker", async () => {
    await import("./main");

    const update = vi.fn(async () => undefined);
    const options = registerSW.mock.calls[0]?.[0] as {
      onRegisteredSW?: (scriptUrl: string, registration?: { update: () => Promise<void> }) => void;
    };

    options.onRegisteredSW?.("/sw.js", { update });

    expect(update).toHaveBeenCalledOnce();
  });
});
