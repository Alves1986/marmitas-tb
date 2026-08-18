import { describe, expect, it, vi } from "vitest";
import { ApiAuthError } from "../_lib/auth";
import { createAdminCatalogHandler } from "./catalog";

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
    });

    const response = await handler(new Request("https://marmitas-tb.vercel.app/api/admin/catalog"));

    expect(response.status).toBe(403);
  });

  it("lista o catálogo interno e permite alterar apenas a disponibilidade de produto", async () => {
    const getCatalog = vi.fn().mockResolvedValue({ categories: [], products: [{ id: "product-uuid", isActive: true }] });
    const setProductAvailability = vi.fn().mockResolvedValue({ id: "product-uuid", isActive: false });
    const handler = createAdminCatalogHandler({ requireAdmin: vi.fn().mockResolvedValue(admin), getCatalog, setProductAvailability });

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
});
