import type { InventoryLevel, InventoryMovementValidationInput } from "../../../shared/inventory.js";

export type InventoryMovementValidationResult =
  | { ok: true }
  | { ok: false; message: string };

export function validateMovement(input: InventoryMovementValidationInput): InventoryMovementValidationResult {
  if (!Number.isFinite(input.quantityDelta) || input.quantityDelta === 0) {
    return { ok: false, message: "Informe uma quantidade diferente de zero." };
  }

  if (input.type === "ENTRY" && input.quantityDelta < 0) {
    return { ok: false, message: "Entrada deve aumentar o saldo." };
  }

  if ((input.type === "INTERNAL_CONSUMPTION" || input.type === "LOSS") && input.quantityDelta > 0) {
    return { ok: false, message: "Consumo e perda devem reduzir o saldo." };
  }

  if ((input.type === "LOSS" || input.type === "ADJUSTMENT") && (input.reason?.trim().length ?? 0) < 3) {
    return { ok: false, message: "Informe o motivo da perda ou do ajuste." };
  }

  return { ok: true };
}

export function getInventoryLevel(balanceQuantity: number, minimumStock: number): InventoryLevel {
  if (balanceQuantity <= minimumStock) return "critical";
  if (minimumStock > 0 && balanceQuantity <= minimumStock * 1.25) return "attention";
  return "healthy";
}
