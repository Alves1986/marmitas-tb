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

  it("opera a fila de impressão apenas com UUIDs e estados permitidos", async () => {
    const api = vi.fn().mockResolvedValue([]);
    const service = createVercelOperationsService(api);

    await service.listPrintJobs();
    await service.requeuePrint("5acb1c7d-1630-4b06-9f1e-9496bb3be555", "Via da cozinha ficou ilegível.");
    await service.markPrintJob("090811f6-0535-483d-b2f3-a764d839aaa1", "printed", "Posto cozinha");

    expect(api).toHaveBeenNthCalledWith(1, "/api/operations/printJobs");
    expect(api).toHaveBeenNthCalledWith(2, "/api/operations/printJobs", { method: "POST", body: { orderId: "5acb1c7d-1630-4b06-9f1e-9496bb3be555", reason: "Via da cozinha ficou ilegível." } });
    expect(api).toHaveBeenNthCalledWith(3, "/api/operations/printJobs", { method: "PATCH", body: { printJobId: "090811f6-0535-483d-b2f3-a764d839aaa1", status: "printed", printerName: "Posto cozinha" } });
  });
});
