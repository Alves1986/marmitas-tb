import { describe, expect, it, vi } from "vitest";
import { createCounterOrderService } from "./counterOrderService";

describe("serviço de pedidos COUNTER", () => {
  it("envia o registro presencial ao endpoint interno e preserva a chave idempotente da tentativa", async () => {
    const request = vi.fn().mockResolvedValue({ orderNumber: "TB-20260827-COUNTER", ticket: "MTB-001", estimatedTime: "15 a 25 min", submittedAt: "2026-08-27T10:00:00.000Z" });
    const service = createCounterOrderService(request);
    const payload = {
      id: "counter-session-1",
      displayName: "Anderson",
      paymentMethod: "cash" as const,
      items: [{ productId: "19c4f23b-1e6d-4ca1-8e62-c44876fc65f2", quantity: 1, optionIds: [], note: "" }],
    };

    await service.submit(payload);
    await service.submit(payload);

    expect(request).toHaveBeenNthCalledWith(1, "/api/operations/counter-orders", expect.objectContaining({
      method: "POST",
      body: expect.objectContaining({ paymentMethod: "cash", displayName: "Anderson", idempotencyKey: expect.any(String) }),
    }));
    expect(request.mock.calls[1]?.[1]?.body).toMatchObject({ idempotencyKey: request.mock.calls[0]?.[1]?.body.idempotencyKey });
  });
});
