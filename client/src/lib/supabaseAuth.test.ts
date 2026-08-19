import { describe, expect, it } from "vitest";
import { loadSessionUser, requestTeamOtp, toSessionUser } from "./supabaseAuth";

describe("toSessionUser", () => {
  it("preserva o papel operacional de um perfil Supabase", () => {
    expect(
      toSessionUser({
        id: "3b34b47e-5025-4a78-8f34-238d7d8f1b1d",
        displayName: "Equipe Cozinha",
        role: "staff",
      }, "cozinha@marmitastb.com.br"),
    ).toEqual({
      id: "3b34b47e-5025-4a78-8f34-238d7d8f1b1d",
      email: "cozinha@marmitastb.com.br",
      name: "Equipe Cozinha",
      role: "staff",
    });
  });

  it("recusa um papel desconhecido em vez de ampliar acesso", () => {
    expect(() =>
      toSessionUser({
        id: "3b34b47e-5025-4a78-8f34-238d7d8f1b1d",
        displayName: null,
        role: "owner",
      }, "cliente@example.com"),
    ).toThrow("Papel de acesso inválido");
  });
});

describe("loadSessionUser", () => {
  it("retorna nulo quando não existe sessão autenticada", async () => {
    const client = {
      auth: {
        getUser: async () => ({ data: { user: null }, error: null }),
      },
    };

    await expect(loadSessionUser(client)).resolves.toBeNull();
  });

  it("carrega o perfil administrativo com display_name e o e-mail da sessão Auth", async () => {
    let selectedColumns = "";
    const client = {
      auth: {
        getUser: async () => ({
          data: { user: { id: "58e6ea60-e467-45b3-b5c7-176163de5275", email: "cassia.andinho@gmail.com" } },
          error: null,
        }),
      },
      from: () => ({
        select: (columns: string) => {
          selectedColumns = columns;
          return {
            eq: () => ({
              maybeSingle: async () => ({
                data: {
                  id: "58e6ea60-e467-45b3-b5c7-176163de5275",
                  display_name: "Cássia Andinho",
                  role: "admin",
                },
                error: null,
              }),
            }),
          };
        },
      }),
    };

    await expect(loadSessionUser(client)).resolves.toEqual({
      id: "58e6ea60-e467-45b3-b5c7-176163de5275",
      email: "cassia.andinho@gmail.com",
      name: "Cássia Andinho",
      role: "admin",
    });
    expect(selectedColumns).toBe("id, display_name, role");
  });
});

describe("requestTeamOtp", () => {
  it("normaliza o e-mail e impede o cadastro público", async () => {
    const requests: unknown[] = [];
    const client = {
      auth: {
        signInWithOtp: async (request: unknown) => {
          requests.push(request);
          return { error: null };
        },
      },
    };

    await expect(requestTeamOtp(client, "  equipe@marmitastb.com.br ")).resolves.toBeUndefined();
    expect(requests).toEqual([
      {
        email: "equipe@marmitastb.com.br",
        options: { shouldCreateUser: false },
      },
    ]);
  });

  it("direciona o link de acesso para a operação sem permitir cadastro público", async () => {
    const requests: unknown[] = [];
    const previousWindow = globalThis.window;
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: { location: { origin: "https://marmitastb.vercel.app" } },
    });

    try {
      const client = {
        auth: {
          signInWithOtp: async (request: unknown) => {
            requests.push(request);
            return { error: null };
          },
        },
      };

      await requestTeamOtp(client, "cassia.andinho@gmail.com");
    } finally {
      Object.defineProperty(globalThis, "window", { configurable: true, value: previousWindow });
    }

    expect(requests).toEqual([
      {
        email: "cassia.andinho@gmail.com",
        options: {
          shouldCreateUser: false,
          emailRedirectTo: "https://marmitastb.vercel.app/operacao",
        },
      },
    ]);
  });

  it("encerra com erro controlado quando o pedido de link não responde", async () => {
    const client = {
      auth: {
        signInWithOtp: () => new Promise<never>(() => undefined),
      },
    };

    await expect(
      requestTeamOtp(client, "cassia.andinho@gmail.com", { timeoutMs: 5 }),
    ).rejects.toThrow("tempo limite");
  });
});
