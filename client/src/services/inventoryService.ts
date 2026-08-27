import type { InventoryBoardItem } from "@/lib/inventoryBoard";
import { apiRequest } from "@/lib/api";
import type { InventoryMovementType, InventoryUnit } from "../../../shared/inventory";

export type InventoryMovement = {
  id: string;
  inventoryItemId: string;
  type: InventoryMovementType;
  quantityDelta: number;
  reason: string | null;
  note: string | null;
  actorDisplayName: string | null;
  balanceAfter: number;
  createdAt: string;
};

export type CreateInventoryMovementInput = {
  inventoryItemId: string;
  type: InventoryMovementType;
  quantityDelta: number;
  reason?: string;
  note?: string;
  idempotencyKey: string;
};

export type CreateInventoryItemInput = {
  name: string;
  unit: InventoryUnit;
  minimumStock: number;
};

export type UpdateInventoryItemInput = {
  inventoryItemId: string;
  name: string;
  minimumStock: number;
};

export type SetInventoryItemActiveInput = {
  inventoryItemId: string;
  isActive: boolean;
};

export function createInventoryService(request = apiRequest) {
  return {
    listItems: () => request<InventoryBoardItem[]>("/api/operations/inventory"),
    listHistory: (inventoryItemId: string) => request<InventoryMovement[]>(`/api/operations/inventory?historyItemId=${encodeURIComponent(inventoryItemId)}&limit=20`),
    createMovement: (input: CreateInventoryMovementInput) => request<InventoryMovement>("/api/operations/inventory", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "create-movement", ...input }),
    }),
    createItem: (input: CreateInventoryItemInput) => request<InventoryBoardItem>("/api/operations/inventory", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "create-item", ...input }),
    }),
    updateItem: (input: UpdateInventoryItemInput) => request<InventoryBoardItem>("/api/operations/inventory", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "update-item", ...input }),
    }),
    setItemActive: (input: SetInventoryItemActiveInput) => request<{ id: string; isActive: boolean }>("/api/operations/inventory", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "set-item-active", ...input }),
    }),
  };
}

export const inventoryService = createInventoryService();
