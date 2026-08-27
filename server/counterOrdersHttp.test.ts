import { describe, expect, it, vi } from "vitest";
import { ApiAuthError } from "../server/vercel/_lib/auth.js";
import { createCounterOrdersHandler } from "../api/operations/counter-orders.js";

const actor = { id: "5acb1c7d-1630-4b06-9f1e-9496bb3be555", role: "staff" };
const validBody = {
  idempotencyKey: "b2a5f4d8-9a4d-4d66-b1a9-9aa5f93c9241",
  displayName: "Anderson",
  paymentMethod: "credit_card",
  sourceChannel: "OWN_APP",
  items: [{ productId: "19c4f23b-1e6d-4ca1-8e62-c44876fc65f2", quantity: 1, optionIds: [], note: "" }],
};

describe("endpoint de pedidos de balcão", () => {
  it("exige papel operacional antes de criar uma venda COUNTER", async () => {
    const handler = createCounterOrdersHandler({
      requireOperator: vi.fn().mockRejectedValue(new ApiAuthError(403, "Acesso restrito à operação.")),
      createCounterOrder: vi.fn(),
    });

    const response = await handler(new Request("https://example.test/api/operations/counter-orders", { method: "POST", body: JSON.stringify(validBody) }));
    expect(response.status).toBe(403);
  });

  it("fixa COUNTER e atribui a venda ao operador autenticado", async () => {
    const createCounterOrder = vi.fn().mockResolvedValue({ orderNumber: "TB-20260827-COUNTER", ticket: "MTB-001", estimatedTime: "15 a 25 min", submittedAt: "2026-08-27T10:00:00.000Z" });
    const handler = createCounterOrdersHandler({ requireOperator: vi.fn().mockResolvedValue(actor), createCounterOrder });

    const response = await handler(new Request("https://example.test/api/operations/counter-orders", { method: "POST", body: JSON.stringify(validBody) }));

    expect(response.status).toBe(201);
    expect(createCounterOrder).toHaveBeenCalledWith(expect.objectContaining({
      sourceChannel: "COUNTER",
      actorUserId: actor.id,
      paymentMethod: "credit_card",
    }));
    await expect(response.json()).resolves.toEqual(expect.objectContaining({ ticket: "MTB-001" }));
  });
});
