import { describe, expect, it, vi } from "vitest";
import { createVercelAdminService } from "./adminService";

describe("VercelAdminService", () => {
  it("consulta e atualiza o catálogo administrativo com UUIDs Supabase", async () => {
    const api = vi.fn().mockResolvedValue({ categories: [], products: [], options: [] });
    const service = createVercelAdminService(api);
    const category = { name: "Especiais", slug: "especiais", sortOrder: 4, isActive: true };
    const product = {
      categoryId: "8cf41e92-f3dc-433b-9a51-0548dc6f54b4",
      name: "Marmita especial",
      description: null,
      imagePath: null,
      priceInCents: 2990,
      originalPriceInCents: null,
      isActive: true,
      requiresConfiguration: false,
      options: [],
    };

    await service.getCatalog();
    await service.setProductAvailability("fc9b65b4-802e-4631-81ba-8fbf2b8354dd", false);
    await service.upsertCategory(category);
    await service.upsertProduct(product);

    expect(api).toHaveBeenNthCalledWith(1, "/api/admin/catalog");
    expect(api).toHaveBeenNthCalledWith(2, "/api/admin/catalog", { method: "PATCH", body: { productId: "fc9b65b4-802e-4631-81ba-8fbf2b8354dd", isActive: false } });
    expect(api).toHaveBeenNthCalledWith(3, "/api/admin/catalog", { method: "PUT", body: { action: "upsert-category", category } });
    expect(api).toHaveBeenNthCalledWith(4, "/api/admin/catalog", { method: "PUT", body: { action: "upsert-product", product } });
  });

  it("lista a equipe Supabase e atualiza papéis e configurações por endpoints protegidos", async () => {
    const api = vi.fn()
      .mockResolvedValueOnce([{ id: "f37a4e26-ae35-4f9d-824e-e4c348e5b7e3", display_name: "Ana", role: "staff", created_at: "2026-08-18T12:00:00Z" }])
      .mockResolvedValueOnce({ storeName: "Marmitas TB", deliveryFeeInCents: 500, openingHours: "11h às 14h", paymentMode: "test", autoPrint: true });
    const service = createVercelAdminService(api);
    const settings = { storeName: "Marmitas TB", deliveryFeeInCents: 700, openingHours: "11h às 14h", paymentMode: "test" as const, autoPrint: false };

    await expect(service.listStaff()).resolves.toHaveLength(1);
    await expect(service.getSettings()).resolves.toMatchObject({ storeName: "Marmitas TB" });
    await service.setStaffRole("f37a4e26-ae35-4f9d-824e-e4c348e5b7e3", "admin");
    await service.updateSettings(settings);

    expect(api).toHaveBeenNthCalledWith(1, "/api/admin/staff");
    expect(api).toHaveBeenNthCalledWith(2, "/api/admin/settings");
    expect(api).toHaveBeenNthCalledWith(3, "/api/admin/staff", { method: "PATCH", body: { userId: "f37a4e26-ae35-4f9d-824e-e4c348e5b7e3", role: "admin" } });
    expect(api).toHaveBeenNthCalledWith(4, "/api/admin/settings", { method: "PATCH", body: settings });
  });
});
