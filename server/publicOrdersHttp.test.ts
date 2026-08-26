import { describe, expect, it, vi } from "vitest";
import * as publicOrders from "../api/public/orders.js";

const { createPublicOrdersHandler } = publicOrders;

const validOrder = {
  idempotencyKey: "b2a5f4d8-9a4d-4d66-b1a9-9aa5f93c9241",
  sourceChannel: "COUNTER",
  customer: { name: "Ana Oliveira", phone: "42999991234" },
  fulfillmentMethod: "pickup",
  paymentMethod: "pix",
  items: [{ productId: "19c4f23b-1e6d-4ca1-8e62-c44876fc65f2", quantity: 1, optionIds: [], note: "" }],
};

describe("endpoint público de pedidos", () => {
  it("exige chave idempotente UUID", async () => {
    const handler = createPublicOrdersHandler({
      createOrder: vi.fn(),
      findTracking: vi.fn(),
      findLatestTrackingByPhone: vi.fn(),
    });

    const response = await handler(new Request("https://example.test/api/public/orders", {
      method: "POST",
      body: JSON.stringify({ ...validOrder, idempotencyKey: "invalida" }),
    }));

    expect(response.status).toBe(400);
  });

  it("fixa OWN_APP e não aceita escalonamento de canal pelo navegador", async () => {
    const createOrder = vi.fn().mockResolvedValue({
      orderNumber: "TB-20260826-CORE",
      estimatedTime: "35 a 45 min",
      submittedAt: "2026-08-26T23:16:00.000Z",
      paymentStatus: "pending",
      isTestPayment: true,
    });
    const handler = createPublicOrdersHandler({
      createOrder,
      findTracking: vi.fn(),
      findLatestTrackingByPhone: vi.fn(),
    });

    const response = await handler(new Request("https://example.test/api/public/orders", {
      method: "POST",
      body: JSON.stringify(validOrder),
    }));

    expect(response.status).toBe(201);
    expect(createOrder).toHaveBeenCalledWith(expect.objectContaining({
      idempotencyKey: validOrder.idempotencyKey,
      sourceChannel: "OWN_APP",
    }));
  });

  it("expõe um handler próprio de KIOSK que fixa a origem do pedido", async () => {
    const createKioskOrdersHandler = Reflect.get(publicOrders, "createKioskOrdersHandler") as undefined | ((repository: { createOrder: (input: unknown) => Promise<unknown> }) => (request: Request) => Promise<Response>);
    expect(createKioskOrdersHandler).toBeTypeOf("function");
    if (!createKioskOrdersHandler) return;

    const createOrder = vi.fn().mockResolvedValue({
      orderNumber: "TB-20260826-KIOSK",
      estimatedTime: "15 a 25 min",
      submittedAt: "2026-08-26T23:30:00.000Z",
    });
    const handler = createKioskOrdersHandler({ createOrder });
    const response = await handler(new Request("https://example.test/api/public/kiosk-orders", {
      method: "POST",
      body: JSON.stringify({
        idempotencyKey: "b2a5f4d8-9a4d-4d66-b1a9-9aa5f93c9241",
        displayName: "Anderson",
        paymentMethod: "card",
        items: [{ productId: "19c4f23b-1e6d-4ca1-8e62-c44876fc65f2", quantity: 1, optionIds: [], note: "" }],
      }),
    }));

    expect(response.status).toBe(201);
    expect(createOrder).toHaveBeenCalledWith(expect.objectContaining({ sourceChannel: "KIOSK" }));
  });
});
