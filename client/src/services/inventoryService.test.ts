import { describe, expect, it, vi } from "vitest";
import { createInventoryService } from "./inventoryService";

describe("serviço cliente de estoque", () => {
  it("envia edição e inativação pela rota operacional consolidada", async () => {
    const request = vi.fn().mockResolvedValue({ id: "item-1" });
    const service = createInventoryService(request);

    await service.updateItem({ inventoryItemId: "item-1", name: "Arroz integral", minimumStock: 3 });
    await service.setItemActive({ inventoryItemId: "item-1", isActive: false });

    expect(request).toHaveBeenNthCalledWith(1, "/api/operations/inventory", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "update-item", inventoryItemId: "item-1", name: "Arroz integral", minimumStock: 3 }),
    });
    expect(request).toHaveBeenNthCalledWith(2, "/api/operations/inventory", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "set-item-active", inventoryItemId: "item-1", isActive: false }),
    });
  });
});
