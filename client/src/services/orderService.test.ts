import { describe, expect, it } from "vitest";
import { createLocalOrderService } from "./orderService";

describe("local order service", () => {
  it("confirms a delivery order through the standard payload contract", async () => {
    const service = createLocalOrderService({
      now: () => new Date("2026-08-17T15:30:00.000Z"),
      createOrderNumber: () => "TB-2841",
    });

    const confirmation = await service.submit({
      id: "local-order-1",
      createdAt: "2026-08-17T15:30:00.000Z",
      deliveryMode: "delivery",
      customer: {
        name: "Ana Oliveira",
        phone: "(42) 99999-0000",
        address: "Rua Exemplo, 100",
        neighborhood: "Centro",
        reference: "Portão azul",
        paymentMethod: "card",
        changeFor: "",
      },
      items: [],
      summary: { subtotal: 0, savings: 0, deliveryFee: 0, total: 0 },
    });

    expect(confirmation).toEqual({
      orderNumber: "TB-2841",
      estimatedTime: "35 a 50 min",
      submittedAt: "2026-08-17T15:30:00.000Z",
    });
  });

  it("uses the pickup estimate for orders collected at the store", async () => {
    const service = createLocalOrderService({
      now: () => new Date("2026-08-17T15:30:00.000Z"),
      createOrderNumber: () => "TB-2842",
    });

    const confirmation = await service.submit({
      id: "local-order-2",
      createdAt: "2026-08-17T15:30:00.000Z",
      deliveryMode: "pickup",
      customer: {
        name: "Caio Lima",
        phone: "(42) 98888-0000",
        address: "",
        neighborhood: "",
        reference: "",
        paymentMethod: "cash",
        changeFor: "50",
      },
      items: [],
      summary: { subtotal: 0, savings: 0, deliveryFee: 0, total: 0 },
    });

    expect(confirmation.estimatedTime).toBe("15 a 25 min");
  });
});
