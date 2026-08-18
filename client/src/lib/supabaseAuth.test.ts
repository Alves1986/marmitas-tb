import { describe, expect, it } from "vitest";
import { loadSessionUser, requestTeamOtp, toSessionUser } from "./supabaseAuth";

describe("toSessionUser", () => {
  it("preserva o papel operacional de um perfil Supabase", () => {
    expect(
      toSessionUser({
        id: "3b34b47e-5025-4a78-8f34-238d7d8f1b1d",
        email: "cozinha@marmitastb.com.br",
        fullName: "Equipe Cozinha",
        role: "staff",
      }),
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
        email: "cliente@example.com",
        fullName: null,
        role: "owner",
      }),
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
});
