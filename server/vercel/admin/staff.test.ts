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
});
