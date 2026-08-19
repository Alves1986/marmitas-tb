import { describe, expect, it, vi } from "vitest";
import { ApiAuthError, createAuthGuards, createSupabaseAuthGuards } from "./auth";

const profile = {
  id: "8c3a4fe7-6e4f-4d06-a86c-9c2d65d5c650",
  email: "cozinha@marmitastb.com.br",
  displayName: "Posto da cozinha",
};

function requestFor(token = "access-token") {
  return new Request("https://marmitas-tb.vercel.app/api/operations/orders", {
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });
}

describe("guardas de autorização Supabase", () => {
  it("aceita staff e admin, mas bloqueia customer na operação", async () => {
    const getUser = vi.fn().mockResolvedValue(profile);
    const getProfile = vi
      .fn()
      .mockResolvedValueOnce({ id: profile.id, role: "customer" })
      .mockResolvedValueOnce({ id: profile.id, role: "staff" })
      .mockResolvedValueOnce({ id: profile.id, role: "admin" });
    const { requireStaff } = createAuthGuards({ getUser, getProfile });

    await expect(requireStaff(requestFor())).rejects.toMatchObject({ statusCode: 403 });
    await expect(requireStaff(requestFor())).resolves.toMatchObject({ id: profile.id, role: "staff" });
    await expect(requireStaff(requestFor())).resolves.toMatchObject({ id: profile.id, role: "admin" });
  });

  it("rejeita chamadas protegidas sem Bearer token", async () => {
    const { requireUser } = createAuthGuards({
      getUser: vi.fn(),
      getProfile: vi.fn(),
    });

    await expect(requireUser(requestFor(""))).rejects.toEqual(new ApiAuthError(401, "Sessão não autenticada."));
  });

  it("consulta o usuário do JWT e o papel em profiles pelo cliente administrativo", async () => {
    const getUser = vi.fn().mockResolvedValue({
      data: { user: { id: profile.id, email: profile.email } },
      error: null,
    });
    const maybeSingle = vi.fn().mockResolvedValue({
      data: { id: profile.id, display_name: profile.displayName, role: "staff" },
      error: null,
    });
    const eq = vi.fn(() => ({ maybeSingle }));
    const select = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ select }));
    const { requireStaff } = createSupabaseAuthGuards({ auth: { getUser }, from });

    await expect(requireStaff(requestFor())).resolves.toMatchObject({
      id: profile.id,
      displayName: profile.displayName,
      role: "staff",
    });
    expect(getUser).toHaveBeenCalledWith("access-token");
    expect(from).toHaveBeenCalledWith("profiles");
    expect(select).toHaveBeenCalledWith("id, display_name, role");
  });
});
