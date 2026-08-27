export const inventoryUnits = ["kg", "g", "L", "mL", "unidade"] as const;
export type InventoryUnit = (typeof inventoryUnits)[number];

export const inventoryMovementTypes = [
  "ENTRY",
  "INTERNAL_CONSUMPTION",
  "LOSS",
  "ADJUSTMENT",
] as const;
export type InventoryMovementType = (typeof inventoryMovementTypes)[number];

export type InventoryLevel = "healthy" | "attention" | "critical";

export type InventoryMovementValidationInput = {
  type: InventoryMovementType;
  quantityDelta: number;
  reason?: string | null;
};
