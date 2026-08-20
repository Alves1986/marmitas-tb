import { describe, expect, it, vi } from "vitest";
import { createVercelAdminService } from "./adminService";

const storage = vi.hoisted(() => {
  const uploadToSignedUrl = vi.fn();
  const from = vi.fn(() => ({ uploadToSignedUrl }));
  return { from, uploadToSignedUrl };
});

vi.mock("@/lib/supabaseClient", () => ({
  supabase: { storage: { from: storage.from } },
}));

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

  it("consulta o resumo financeiro pelo período selecionado", async () => {
    const api = vi.fn().mockResolvedValue({ revenueInCents: 4500, expenseInCents: 1200, netCashInCents: 3300 });
    const service = createVercelAdminService(api);

    await expect(service.getFinance({ from: "2026-08-01", to: "2026-08-31" })).resolves.toMatchObject({ netCashInCents: 3300 });

    expect(api).toHaveBeenCalledWith("/api/admin/finance?from=2026-08-01&to=2026-08-31");
  });

  it("envia despesas como rascunho e encaminha a revisão administrativa ao endpoint financeiro", async () => {
    const api = vi.fn().mockResolvedValue({ id: "62cc75fb-1772-4d47-acfb-c76798fc9aa5", status: "draft" });
    const service = createVercelAdminService(api);
    const expense = { description: "Gás", category: "Insumos", amountInCents: 12000, incurredOn: "2026-08-19", notes: "Botijão da cozinha" };

    await service.createExpense(expense);
    await service.reviewExpense({ expenseId: "62cc75fb-1772-4d47-acfb-c76798fc9aa5", decision: "approved" });

    expect(api).toHaveBeenNthCalledWith(1, "/api/admin/finance", { method: "POST", body: expense });
    expect(api).toHaveBeenNthCalledWith(2, "/api/admin/finance", { method: "PATCH", body: { expenseId: "62cc75fb-1772-4d47-acfb-c76798fc9aa5", decision: "approved" } });
  });

  it("consulta a fila de despesas em rascunho para revisão", async () => {
    const api = vi.fn().mockResolvedValue({ expenses: [{ id: "draft-1", status: "draft" }] });
    const service = createVercelAdminService(api);

    expect("listReviewExpenses" in service).toBe(true);
    const reviewService = service as typeof service & { listReviewExpenses(): Promise<{ expenses: Array<{ id: string; status: "draft" }> }> };
    await expect(reviewService.listReviewExpenses()).resolves.toEqual({ expenses: [{ id: "draft-1", status: "draft" }] });

    expect(api).toHaveBeenCalledWith("/api/admin/finance?view=review");
  });

  it("consulta o histórico de auditoria financeira para administração", async () => {
    const api = vi.fn().mockResolvedValue({ auditLogs: [{ id: "audit-1", action: "expense.approved" }] });
    const service = createVercelAdminService(api);

    expect("listFinanceAudit" in service).toBe(true);
    const auditService = service as typeof service & { listFinanceAudit(): Promise<{ auditLogs: Array<{ id: string; action: string }> }> };
    await expect(auditService.listFinanceAudit()).resolves.toEqual({ auditLogs: [{ id: "audit-1", action: "expense.approved" }] });

    expect(api).toHaveBeenCalledWith("/api/admin/finance?view=audit");
  });

  it("solicita upload assinado e envia somente o WebP preparado para o Storage", async () => {
    const api = vi.fn().mockResolvedValue({ path: "catalog/products/marmita.webp", token: "signed-token" });
    const service = createVercelAdminService(api);
    const file = new File(["imagem-webp"], "marmita.webp", { type: "image/webp" });

    expect("uploadProductImage" in service).toBe(true);

    storage.uploadToSignedUrl.mockResolvedValue({ error: null });
    const imageService = service as typeof service & { uploadProductImage(file: File): Promise<{ path: string }> };
    await expect(imageService.uploadProductImage(file)).resolves.toEqual({ path: "catalog/products/marmita.webp" });

    expect(api).toHaveBeenCalledWith("/api/admin/catalog", { method: "POST", body: { contentType: "image/webp" } });
    expect(storage.from).toHaveBeenCalledWith("marmitas-tb-assets");
    expect(storage.uploadToSignedUrl).toHaveBeenCalledWith(
      "catalog/products/marmita.webp",
      "signed-token",
      file,
      { contentType: "image/webp" },
    );
  });
});
