import { describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const mockedDb = vi.hoisted(() => ({
  getLatestActiveOrderByPhone: vi.fn(),
  normalizePhoneForLookup: (value: string) => value.replace(/\D/g, ""),
}));

vi.mock("./db", () => mockedDb);

import { appRouter } from "./routers";

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("orders.trackByPhone", () => {
  it("normaliza o telefone e retorna somente o pedido ativo mais recente", async () => {
    mockedDb.getLatestActiveOrderByPhone.mockResolvedValue({
      order: {
        code: "TB-20260817-0002",
        status: "em_preparo",
        totalInCents: 2890,
        paymentStatus: "confirmed",
        paymentMethod: "pix",
        paymentProvider: "asaas_test",
        fulfillmentMethod: "delivery",
        createdAt: new Date("2026-08-17T15:00:00.000Z"),
      },
      events: [{ id: 11, toStatus: "em_preparo", message: "Pedido em preparo.", createdAt: new Date("2026-08-17T15:05:00.000Z") }],
    });

    const caller = appRouter.createCaller(createPublicContext());
    const orders = caller.orders as unknown as {
      trackByPhone: (input: { phone: string }) => Promise<{ order?: Record<string, unknown> }>;
    };

    const result = await orders.trackByPhone({ phone: "(42) 9 9999-9999" });

    expect(mockedDb.getLatestActiveOrderByPhone).toHaveBeenCalledWith("42999999999");
    expect(result.order).toMatchObject({ code: "TB-20260817-0002", status: "em_preparo" });
    expect(result.order).not.toHaveProperty("deliveryAddress");
    expect(result.order).not.toHaveProperty("customerPhone");
  });

  it("recusa um telefone com menos de oito dígitos", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const orders = caller.orders as unknown as {
      trackByPhone: (input: { phone: string }) => Promise<unknown>;
    };

    await expect(orders.trackByPhone({ phone: "123" })).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: "Informe um telefone válido.",
    });
  });
});
