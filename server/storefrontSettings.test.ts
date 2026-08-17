import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({ getStoreSettings: vi.fn() }));
vi.mock("./db", () => dbMocks);

import { appRouter } from "./routers";

const publicContext = { req: {} as never, res: {} as never, user: null };

describe("configuração pública da loja", () => {
  beforeEach(() => vi.clearAllMocks());

  it("expõe apenas o modo de pagamento configurado para orientar o checkout", async () => {
    dbMocks.getStoreSettings.mockResolvedValue({
      storeName: "Marmitas TB",
      deliveryFeeInCents: 700,
      openingHours: "Segunda a sábado",
      paymentMode: "asaas",
      autoPrint: true,
    });

    const caller = appRouter.createCaller(publicContext as never);
    await expect(caller.store.publicSettings()).resolves.toEqual({ paymentMode: "asaas" });
  });
});
