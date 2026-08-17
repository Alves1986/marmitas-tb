import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  getStoreSettings: vi.fn(),
  updateStoreSettings: vi.fn(),
}));

vi.mock("./db", () => dbMocks);

import { appRouter } from "./routers";

const adminContext = {
  req: {} as never,
  res: {} as never,
  user: {
    id: 1,
    openId: "admin-settings-test",
    name: "Gestora",
    email: null,
    loginMethod: null,
    role: "admin" as const,
    createdAt: new Date("2026-08-17T12:00:00.000Z"),
    updatedAt: new Date("2026-08-17T12:00:00.000Z"),
    lastSignedIn: new Date("2026-08-17T12:00:00.000Z"),
  },
};

describe("procedimentos administrativos de configurações", () => {
  beforeEach(() => vi.clearAllMocks());

  it("salva a operação em modo de pagamento de teste sem exigir credenciais reais", async () => {
    const caller = appRouter.createCaller(adminContext);
    const input = {
      storeName: "Marmitas TB",
      deliveryFeeInCents: 700,
      openingHours: "Segunda a sábado, 10h às 14h",
      paymentMode: "test" as const,
      autoPrint: true,
    };
    dbMocks.getStoreSettings.mockResolvedValue(input);
    dbMocks.updateStoreSettings.mockResolvedValue(input);

    await expect(caller.admin.getSettings()).resolves.toEqual(input);
    await expect(caller.admin.updateSettings(input)).resolves.toEqual(input);
    expect(dbMocks.updateStoreSettings).toHaveBeenCalledWith({ ...input, actorUserId: 1 });
  });
});
