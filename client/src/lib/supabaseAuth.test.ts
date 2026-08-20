import { describe, expect, it } from "vitest";
import * as supabaseAuth from "./supabaseAuth";
import { loadSessionUser, toSessionUser } from "./supabaseAuth";

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

describe("política de acesso interno", () => {
  it("não expõe mais a solicitação de magic link como fluxo de entrada da equipe", () => {
    expect("requestTeamOtp" in supabaseAuth).toBe(false);
  });
});

describe("signInWithPassword", () => {
  it("normaliza o e-mail antes de autenticar a equipe por senha", async () => {
    const requests: unknown[] = [];
    const client = {
      auth: {
        signInWithPassword: async (request: unknown) => {
          requests.push(request);
          return { error: null };
        },
      },
    };
    const signInWithPassword = (supabaseAuth as typeof supabaseAuth & {
      signInWithPassword?: (client: typeof client, email: string, password: string) => Promise<void>;
    }).signInWithPassword;

    expect(signInWithPassword).toBeTypeOf("function");
    await expect(signInWithPassword!(client, "  equipe@marmitastb.com.br ", "senha-segura-123")).resolves.toBeUndefined();
    expect(requests).toEqual([
      { email: "equipe@marmitastb.com.br", password: "senha-segura-123" },
    ]);
  });
});

describe("setNewPassword", () => {
  it("envia somente a nova senha ao Supabase após um convite ou link de recuperação válido", async () => {
    const requests: unknown[] = [];
    const client = {
      auth: {
        updateUser: async (request: unknown) => {
          requests.push(request);
          return { error: null };
        },
      },
    };
    const setNewPassword = (supabaseAuth as typeof supabaseAuth & {
      setNewPassword?: (client: typeof client, password: string) => Promise<void>;
    }).setNewPassword;

    expect(setNewPassword).toBeTypeOf("function");
    await expect(setNewPassword!(client, "senha-nova-segura-123")).resolves.toBeUndefined();
    expect(requests).toEqual([{ password: "senha-nova-segura-123" }]);
  });
});

describe("requestPasswordReset", () => {
  it("normaliza o e-mail e aponta a recuperação para a rota de definição de senha", async () => {
    const requests: unknown[] = [];
    const previousWindow = globalThis.window;
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: { location: { origin: "https://marmitastb.vercel.app" } },
    });

    try {
      const client = {
        auth: {
          resetPasswordForEmail: async (email: string, options: unknown) => {
            requests.push({ email, options });
            return { error: null };
          },
        },
      };
      const requestPasswordReset = (supabaseAuth as typeof supabaseAuth & {
        requestPasswordReset?: (client: typeof client, email: string) => Promise<void>;
      }).requestPasswordReset;

      expect(requestPasswordReset).toBeTypeOf("function");
      await expect(requestPasswordReset!(client, "  equipe@marmitastb.com.br ")).resolves.toBeUndefined();
    } finally {
      Object.defineProperty(globalThis, "window", { configurable: true, value: previousWindow });
    }

    expect(requests).toEqual([
      {
        email: "equipe@marmitastb.com.br",
        options: { redirectTo: "https://marmitastb.vercel.app/definir-senha" },
      },
    ]);
  });
});
