import { describe, expect, it, vi } from "vitest";
import { createPublicOrdersHandler } from "./orders";

const validRequest = {
  customer: {
    name: "Ana da Silva",
    phone: "(42) 99999-1234",
    address: "Rua das Flores, 123",
    notes: "Portão azul",
  },
  fulfillmentMethod: "delivery",
  paymentMethod: "pix",
  items: [{ productId: "19c4f23b-1e6d-4ca1-8e62-c44876fc65f2", quantity: 2, optionIds: [], note: "Sem cebola" }],
};

describe("/api/public/orders", () => {
  it("cria um pedido com telefone normalizado e retorna somente a confirmação pública", async () => {
    const createOrder = vi.fn().mockResolvedValue({
      orderNumber: "TB-20260818-A1B2C3",
      estimatedTime: "35 a 45 min",
      submittedAt: "2026-08-18T18:00:00.000Z",
      paymentStatus: "pending",
      isTestPayment: true,
    });
    const handler = createPublicOrdersHandler({ createOrder, findTracking: vi.fn() });

    const response = await handler(
      new Request("https://marmitas-tb.vercel.app/api/public/orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(validRequest),
      }),
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({ orderNumber: "TB-20260818-A1B2C3" });
    expect(createOrder).toHaveBeenCalledWith(expect.objectContaining({ customerPhoneLookup: "42999991234" }));
  });

  it("consulta rastreamento com código e telefone, sem expor endereço ou telefone", async () => {
    const findTracking = vi.fn().mockResolvedValue({
      code: "TB-20260818-A1B2C3",
      status: "em_preparo",
      customerName: "Ana da Silva",
      items: [{ name: "Marmita executiva", quantity: 2 }],
    });
    const handler = createPublicOrdersHandler({ createOrder: vi.fn(), findTracking });

    const response = await handler(
      new Request("https://marmitas-tb.vercel.app/api/public/orders?code=tb-20260818-a1b2c3&phone=(42)%2099999-1234"),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      code: "TB-20260818-A1B2C3",
      status: "em_preparo",
      customerName: "Ana da Silva",
      items: [{ name: "Marmita executiva", quantity: 2 }],
    });
    expect(findTracking).toHaveBeenCalledWith({ code: "TB-20260818-A1B2C3", phone: "42999991234" });
  });

  it("valida requisições e métodos antes de acessar a persistência", async () => {
    const createOrder = vi.fn();
    const handler = createPublicOrdersHandler({ createOrder, findTracking: vi.fn() });

    const invalid = await handler(new Request("https://marmitas-tb.vercel.app/api/public/orders", { method: "POST", body: "{}" }));
    const invalidMethod = await handler(new Request("https://marmitas-tb.vercel.app/api/public/orders", { method: "DELETE" }));

    expect(invalid.status).toBe(400);
    expect(invalidMethod.status).toBe(405);
    expect(invalidMethod.headers.get("allow")).toBe("GET, POST");
    expect(createOrder).not.toHaveBeenCalled();
  });
});
