import { describe, expect, it, vi } from "vitest";

const authGetUser = vi.hoisted(() => vi.fn());
const profileMaybeSingle = vi.hoisted(() => vi.fn());
const profileEq = vi.hoisted(() => vi.fn(() => ({ maybeSingle: profileMaybeSingle })));
const profileSelect = vi.hoisted(() => vi.fn(() => ({ eq: profileEq })));
const from = vi.hoisted(() => vi.fn(() => ({ select: profileSelect })));

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    auth: { getUser: authGetUser },
    from,
  })),
}));

import { authenticateSupabaseRequest, getBearerToken } from "./supabaseSession";

describe("getBearerToken", () => {
  it("extrai somente um token Bearer válido", () => {
    expect(getBearerToken("Bearer eyJhbGciOiJIUzI1NiJ9.test")).toBe("eyJhbGciOiJIUzI1NiJ9.test");
  });

  it("mantém a chamada anônima quando o cabeçalho não é Bearer", () => {
    expect(getBearerToken("Basic abc")).toBeNull();
    expect(getBearerToken(undefined)).toBeNull();
  });

  it("lê display_name e role do perfil existente no Supabase", async () => {
    authGetUser.mockResolvedValue({
      data: { user: { id: "8c3a4fe7-6e4f-4d06-a86c-9c2d65d5c650", email: "cozinha@marmitastb.com.br" } },
      error: null,
    });
    profileMaybeSingle.mockResolvedValue({
      data: { id: "8c3a4fe7-6e4f-4d06-a86c-9c2d65d5c650", display_name: "Posto da cozinha", role: "staff" },
      error: null,
    });

    await expect(authenticateSupabaseRequest("Bearer access-token", {
      url: "https://hwkgplnzvcaobjozfmqx.supabase.co",
      publishableKey: "sb_publishable_test",
    })).resolves.toEqual({
      id: "8c3a4fe7-6e4f-4d06-a86c-9c2d65d5c650",
      email: "cozinha@marmitastb.com.br",
      name: "Posto da cozinha",
      role: "staff",
    });
    expect(profileSelect).toHaveBeenCalledWith("id, display_name, role");
  });
});
