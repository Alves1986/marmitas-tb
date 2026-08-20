import { describe, expect, it, vi } from "vitest";
import { ApiAuthError } from "../_lib/auth";
import { createAdminStaffHandler } from "../../../api/admin/staff";

const admin = { id: "a68c3d5e-2b56-4462-96e8-5d05d1b19bc0", email: "gestao@marmitastb.com.br", displayName: "Gestão", role: "admin" as const };

describe("/api/admin/staff", () => {
  it("exige administrador para alterar papel da equipe", async () => {
    const handler = createAdminStaffHandler({ requireAdmin: vi.fn().mockRejectedValue(new ApiAuthError(403, "Acesso restrito à administração.")), listStaff: vi.fn(), setRole: vi.fn() });
    expect((await handler(new Request("https://marmitas-tb.vercel.app/api/admin/staff"))).status).toBe(403);
  });

  it("atribui somente os papéis previstos ao perfil UUID", async () => {
    const setRole = vi.fn().mockResolvedValue({ id: "f10c41ea-a610-46f3-a340-9cae1e8b09f6", role: "staff" });
    const handler = createAdminStaffHandler({ requireAdmin: vi.fn().mockResolvedValue(admin), listStaff: vi.fn().mockResolvedValue([]), setRole });
    const response = await handler(new Request("https://marmitas-tb.vercel.app/api/admin/staff", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ userId: "f10c41ea-a610-46f3-a340-9cae1e8b09f6", role: "staff" }) }));
    expect(response.status).toBe(200);
    expect(setRole).toHaveBeenCalledWith({ userId: "f10c41ea-a610-46f3-a340-9cae1e8b09f6", role: "staff" });
  });

  it("permite ao administrador criar um membro interno e iniciar o convite sem expor senha", async () => {
    const createStaff = vi.fn().mockResolvedValue({
      id: "f10c41ea-a610-46f3-a340-9cae1e8b09f6",
      email: "cozinha@marmitastb.com.br",
      display_name: "Equipe Cozinha",
      role: "staff",
      invitation_status: "pending",
    });
    const handler = createAdminStaffHandler({ requireAdmin: vi.fn().mockResolvedValue(admin), listStaff: vi.fn().mockResolvedValue([]), setRole: vi.fn(), createStaff, inviteStaff: vi.fn() });
    const response = await handler(new Request("https://marmitas-tb.vercel.app/api/admin/staff", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "create", email: "  cozinha@marmitastb.com.br ", displayName: "Equipe Cozinha", role: "staff" }),
    }));

    expect(response.status).toBe(201);
    expect(createStaff).toHaveBeenCalledWith({ email: "cozinha@marmitastb.com.br", displayName: "Equipe Cozinha", role: "staff" });
    await expect(response.json()).resolves.not.toHaveProperty("password");
  });

  it("permite ao administrador reenviar um convite sem retornar token", async () => {
    const inviteStaff = vi.fn().mockResolvedValue({ id: "f10c41ea-a610-46f3-a340-9cae1e8b09f6", invitation_status: "pending" });
    const handler = createAdminStaffHandler({ requireAdmin: vi.fn().mockResolvedValue(admin), listStaff: vi.fn().mockResolvedValue([]), setRole: vi.fn(), createStaff: vi.fn(), inviteStaff });
    const response = await handler(new Request("https://marmitas-tb.vercel.app/api/admin/staff", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "invite", userId: "f10c41ea-a610-46f3-a340-9cae1e8b09f6" }),
    }));

    expect(response.status).toBe(200);
    expect(inviteStaff).toHaveBeenCalledWith({ userId: "f10c41ea-a610-46f3-a340-9cae1e8b09f6" });
    await expect(response.json()).resolves.not.toHaveProperty("token");
  });

  it("recusa criar um papel de cliente pelo fluxo interno", async () => {
    const createStaff = vi.fn();
    const handler = createAdminStaffHandler({ requireAdmin: vi.fn().mockResolvedValue(admin), listStaff: vi.fn().mockResolvedValue([]), setRole: vi.fn(), createStaff, inviteStaff: vi.fn() });
    const response = await handler(new Request("https://marmitas-tb.vercel.app/api/admin/staff", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "create", email: "cliente@marmitastb.com.br", displayName: "Cliente", role: "customer" }),
    }));

    expect(response.status).toBe(400);
    expect(createStaff).not.toHaveBeenCalled();
  });
});
