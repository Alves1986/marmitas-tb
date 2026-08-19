import { describe, expect, it, vi } from "vitest";
import { ApiAuthError } from "../_lib/auth";
import { createOperationsOrdersHandler } from "../../../api/operations/orders";

const staff = {
  id: "d9071683-ba84-45a8-bb4d-3f026d356fe0",
  email: "cozinha@marmitastb.com.br",
  displayName: "Cozinha",
  role: "staff" as const,
};

describe("/api/operations/orders", () => {
  it("não expõe a fila para um usuário sem papel operacional", async () => {
    const handler = createOperationsOrdersHandler({
      requireStaff: vi.fn().mockRejectedValue(new ApiAuthError(403, "Acesso restrito à equipe.")),
      listOrders: vi.fn(),
      transitionOrder: vi.fn(),
    });

    const response = await handler(new Request("https://marmitas-tb.vercel.app/api/operations/orders"));

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "Acesso restrito à equipe." });
  });

  it("lista a fila e grava o UUID do operador na transição", async () => {
    const listOrders = vi.fn().mockResolvedValue([{ id: "order-uuid", code: "TB-20260818-A1B2C3", status: "confirmado" }]);
    const transitionOrder = vi.fn().mockResolvedValue({ id: "order-uuid", status: "em_preparo" });
    const handler = createOperationsOrdersHandler({
      requireStaff: vi.fn().mockResolvedValue(staff),
      listOrders,
      transitionOrder,
    });

    const listResponse = await handler(new Request("https://marmitas-tb.vercel.app/api/operations/orders"));
    const transitionResponse = await handler(
      new Request("https://marmitas-tb.vercel.app/api/operations/orders", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ orderId: "f10c41ea-a610-46f3-a340-9cae1e8b09f6", nextStatus: "em_preparo", actorUserId: "browser-id" }),
      }),
    );

    await expect(listResponse.json()).resolves.toEqual([{ id: "order-uuid", code: "TB-20260818-A1B2C3", status: "confirmado" }]);
    expect(transitionResponse.status).toBe(200);
    expect(transitionOrder).toHaveBeenCalledWith({
      orderId: "f10c41ea-a610-46f3-a340-9cae1e8b09f6",
      nextStatus: "em_preparo",
      actorUserId: staff.id,
    });
  });
});
