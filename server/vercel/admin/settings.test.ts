import { describe, expect, it, vi } from "vitest";
import { createAdminSettingsHandler } from "../../../api/admin/settings";

const admin = { id: "f8a1240b-5d57-4c98-9a3d-45d94f6ddc5e", role: "admin" as const, displayName: "Gestora" };

describe("/api/admin/settings", () => {
  it("permite ao administrador ler as configurações normalizadas", async () => {
    const getSettings = vi.fn().mockResolvedValue({ storeName: "Marmitas TB", deliveryFeeInCents: 500, openingHours: "10h às 15h", paymentMode: "test", autoPrint: true });
    const handler = createAdminSettingsHandler({ requireAdmin: vi.fn().mockResolvedValue(admin), getSettings, updateSettings: vi.fn() });

    const response = await handler(new Request("https://marmitas-tb.vercel.app/api/admin/settings"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ storeName: "Marmitas TB", autoPrint: true });
  });

  it("atualiza apenas campos administrativos válidos e audita o UUID do administrador", async () => {
    const updateSettings = vi.fn().mockResolvedValue({ storeName: "Marmitas TB", deliveryFeeInCents: 700, openingHours: "10h às 15h", paymentMode: "test", autoPrint: false });
    const handler = createAdminSettingsHandler({ requireAdmin: vi.fn().mockResolvedValue(admin), getSettings: vi.fn(), updateSettings });

    const response = await handler(new Request("https://marmitas-tb.vercel.app/api/admin/settings", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ storeName: "Marmitas TB", deliveryFeeInCents: 700, openingHours: "10h às 15h", paymentMode: "test", autoPrint: false, actorUserId: "browser-id" }),
    }));

    expect(response.status).toBe(200);
    expect(updateSettings).toHaveBeenCalledWith(expect.objectContaining({ actorUserId: admin.id, deliveryFeeInCents: 700 }));
  });
});
