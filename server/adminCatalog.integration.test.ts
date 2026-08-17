import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  listAdminCatalog: vi.fn(),
  setProductAvailability: vi.fn(),
  upsertProduct: vi.fn(),
  upsertCategory: vi.fn(),
}));

vi.mock("./db", () => dbMocks);

import { appRouter } from "./routers";

const adminContext = {
  req: {} as never,
  res: {} as never,
  user: {
    id: 1,
    openId: "admin-catalog-test",
    name: "Gestora",
    email: null,
    loginMethod: null,
    role: "admin" as const,
    createdAt: new Date("2026-08-17T12:00:00.000Z"),
    updatedAt: new Date("2026-08-17T12:00:00.000Z"),
    lastSignedIn: new Date("2026-08-17T12:00:00.000Z"),
  },
};

describe("procedimentos administrativos de catálogo", () => {
  beforeEach(() => vi.clearAllMocks());

  it("permite desativar um produto sem apagar o histórico", async () => {
    const caller = appRouter.createCaller(adminContext);
    dbMocks.listAdminCatalog.mockResolvedValue([{ product: { id: 4, name: "Marmita executiva", isActive: true }, options: [] }]);
    dbMocks.setProductAvailability.mockResolvedValue({ id: 4, isActive: false });

    await expect(caller.catalog.listAdmin()).resolves.toHaveLength(1);
    await expect(caller.catalog.setAvailability({ productId: 4, available: false })).resolves.toEqual({ id: 4, isActive: false });
    expect(dbMocks.setProductAvailability).toHaveBeenCalledWith({ productId: 4, available: false, actorUserId: 1 });
  });

  it("salva produto e opções configuráveis com valores monetários em centavos", async () => {
    const caller = appRouter.createCaller(adminContext);
    const input = {
      categoryId: 2,
      name: "Marmita família",
      description: "Serve duas pessoas.",
      imageUrl: "/manus-storage/marmita-familia.jpg",
      priceInCents: 4590,
      originalPriceInCents: 4990,
      isActive: true,
      requiresConfiguration: true,
      options: [{ groupName: "Acompanhamento", label: "Salada", priceDeltaInCents: 0, isRequired: true, sortOrder: 0, isActive: true }],
    };
    dbMocks.upsertProduct.mockResolvedValue({ id: 11, ...input });

    await expect(caller.catalog.upsertProduct(input)).resolves.toMatchObject({ id: 11, priceInCents: 4590 });
    expect(dbMocks.upsertProduct).toHaveBeenCalledWith({ ...input, actorUserId: 1 });
  });

  it("cria ou atualiza uma categoria com ordenação administrativa", async () => {
    const caller = appRouter.createCaller(adminContext);
    const input = { name: "Marmitas especiais", slug: "marmitas-especiais", sortOrder: 6, isActive: true };
    dbMocks.upsertCategory.mockResolvedValue({ id: 8, ...input });

    await expect(caller.catalog.upsertCategory(input)).resolves.toEqual({ id: 8, ...input });
    expect(dbMocks.upsertCategory).toHaveBeenCalledWith({ ...input, actorUserId: 1 });
  });
});
