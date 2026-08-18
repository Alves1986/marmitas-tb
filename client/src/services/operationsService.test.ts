import { describe, expect, it, vi } from "vitest";
import { createVercelOperationsService } from "./operationsService";

describe("VercelOperationsService", () => {
  it("consulta a fila e usa UUIDs nas transições autenticadas", async () => {
    const api = vi.fn().mockResolvedValue([{ id: "5acb1c7d-1630-4b06-9f1e-9496bb3be555", code: "TB-ABCD" }]);
    const service = createVercelOperationsService(api);

    await expect(service.listOrders()).resolves.toEqual([{ id: "5acb1c7d-1630-4b06-9f1e-9496bb3be555", code: "TB-ABCD" }]);
    await service.transitionOrder("5acb1c7d-1630-4b06-9f1e-9496bb3be555", "em_preparo");

    expect(api).toHaveBeenNthCalledWith(1, "/api/operations/orders");
    expect(api).toHaveBeenNthCalledWith(2, "/api/operations/orders", { method: "PATCH", body: { orderId: "5acb1c7d-1630-4b06-9f1e-9496bb3be555", nextStatus: "em_preparo" } });
  });
});
