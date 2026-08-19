import { describe, expect, it, vi } from "vitest";
import { createMenuHandler } from "../../../api/public/menu";

describe("GET /api/public/menu", () => {
  it("recusa métodos diferentes de GET", async () => {
    const handler = createMenuHandler({ listMenu: vi.fn() });

    const response = await handler(new Request("https://marmitas-tb.vercel.app/api/public/menu", { method: "POST" }));

    expect(response.status).toBe(405);
    expect(response.headers.get("allow")).toBe("GET");
  });

  it("devolve o catálogo ativo normalizado", async () => {
    const listMenu = vi.fn().mockResolvedValue({
      categories: [{ id: "category-uuid", name: "Marmitas", slug: "marmitas", sortOrder: 1 }],
      products: [],
    });
    const handler = createMenuHandler({ listMenu });

    const response = await handler(new Request("https://marmitas-tb.vercel.app/api/public/menu"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      categories: [{ id: "category-uuid", name: "Marmitas", slug: "marmitas", sortOrder: 1 }],
      products: [],
    });
  });
});
