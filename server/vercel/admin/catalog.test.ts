import { describe, expect, it, vi } from "vitest";
import { ApiAuthError } from "../_lib/auth";
import { createAdminCatalogHandler } from "../../../api/admin/catalog";

const admin = {
  id: "a68c3d5e-2b56-4462-96e8-5d05d1b19bc0",
  email: "gestao@marmitastb.com.br",
  displayName: "Gestão",
  role: "admin" as const,
};

describe("/api/admin/catalog", () => {
  it("bloqueia usuários sem papel administrativo", async () => {
    const handler = createAdminCatalogHandler({
      requireAdmin: vi.fn().mockRejectedValue(new ApiAuthError(403, "Acesso restrito à administração.")),
      getCatalog: vi.fn(),
      setProductAvailability: vi.fn(),
      createProductImageUpload: vi.fn(),
      upsertCategory: vi.fn(),
      upsertProduct: vi.fn(),
    });

    const response = await handler(new Request("https://marmitas-tb.vercel.app/api/admin/catalog"));

    expect(response.status).toBe(403);
  });

  it("lista o catálogo interno e permite alterar apenas a disponibilidade de produto", async () => {
    const getCatalog = vi.fn().mockResolvedValue({ categories: [], products: [{ id: "product-uuid", isActive: true }] });
    const setProductAvailability = vi.fn().mockResolvedValue({ id: "product-uuid", isActive: false });
    const handler = createAdminCatalogHandler({ requireAdmin: vi.fn().mockResolvedValue(admin), getCatalog, setProductAvailability, createProductImageUpload: vi.fn(), upsertCategory: vi.fn(), upsertProduct: vi.fn() });

    const list = await handler(new Request("https://marmitas-tb.vercel.app/api/admin/catalog"));
    const update = await handler(
      new Request("https://marmitas-tb.vercel.app/api/admin/catalog", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ productId: "f10c41ea-a610-46f3-a340-9cae1e8b09f6", isActive: false }),
      }),
    );

    expect(list.status).toBe(200);
    expect(update.status).toBe(200);
    expect(setProductAvailability).toHaveBeenCalledWith({ productId: "f10c41ea-a610-46f3-a340-9cae1e8b09f6", isActive: false });
  });

  it("permite ao administrador criar uma categoria e salvar um produto com opções", async () => {
    const upsertCategory = vi.fn().mockResolvedValue({ id: "8cf41e92-f3dc-433b-9a51-0548dc6f54b4", name: "Pratos especiais" });
    const upsertProduct = vi.fn().mockResolvedValue({ id: "fc9b65b4-802e-4631-81ba-8fbf2b8354dd", name: "Marmita especial" });
    const handler = createAdminCatalogHandler({
      requireAdmin: vi.fn().mockResolvedValue(admin),
      getCatalog: vi.fn(),
      setProductAvailability: vi.fn(),
      createProductImageUpload: vi.fn(),
      upsertCategory,
      upsertProduct,
    });

    const category = await handler(new Request("https://marmitas-tb.vercel.app/api/admin/catalog", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "upsert-category",
        category: { name: "Pratos especiais", slug: "pratos-especiais", sortOrder: 9, isActive: true },
      }),
    }));
    const product = await handler(new Request("https://marmitas-tb.vercel.app/api/admin/catalog", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "upsert-product",
        product: {
          categoryId: "8cf41e92-f3dc-433b-9a51-0548dc6f54b4",
          name: "Marmita especial",
          description: "Carne e acompanhamentos.",
          imagePath: "catalogo/marmita-especial.jpg",
          priceInCents: 2990,
          originalPriceInCents: null,
          isActive: true,
          requiresConfiguration: true,
          options: [{ groupName: "Acompanhamento", label: "Feijão", priceDeltaInCents: 0, isRequired: true, sortOrder: 0, isActive: true }],
        },
      }),
    }));

    expect(category.status).toBe(200);
    expect(product.status).toBe(200);
    expect(upsertCategory).toHaveBeenCalledWith(expect.objectContaining({ slug: "pratos-especiais" }));
    expect(upsertProduct).toHaveBeenCalledWith(expect.objectContaining({ name: "Marmita especial", options: [expect.objectContaining({ label: "Feijão" })] }));
  });

  it("emite um destino de upload assinado somente para foto WebP solicitada por administrador", async () => {
    const createProductImageUpload = vi.fn().mockResolvedValue({ path: "catalog/products/123.webp", token: "signed-token" });
    const handler = createAdminCatalogHandler({
      requireAdmin: vi.fn().mockResolvedValue(admin),
      getCatalog: vi.fn(),
      setProductAvailability: vi.fn(),
      upsertCategory: vi.fn(),
      upsertProduct: vi.fn(),
      createProductImageUpload,
    } as never);

    const response = await handler(new Request("https://marmitas-tb.vercel.app/api/admin/catalog", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ contentType: "image/webp" }),
    }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ path: "catalog/products/123.webp", token: "signed-token" });
    expect(createProductImageUpload).toHaveBeenCalledTimes(1);
  });

  it("recusa solicitar upload de produto para tipo diferente de WebP", async () => {
    const handler = createAdminCatalogHandler({
      requireAdmin: vi.fn().mockResolvedValue(admin),
      getCatalog: vi.fn(),
      setProductAvailability: vi.fn(),
      upsertCategory: vi.fn(),
      upsertProduct: vi.fn(),
      createProductImageUpload: vi.fn(),
    });

    const response = await handler(new Request("https://marmitas-tb.vercel.app/api/admin/catalog", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ contentType: "image/jpeg" }),
    }));

    expect(response.status).toBe(400);
  });
});
