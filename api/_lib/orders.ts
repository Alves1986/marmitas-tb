import { z } from "zod";
import { canTransitionOrderStatus, type OrderStatus } from "../../shared/operations";

export function normalizePhoneForLookup(phone: string): string {
  return phone.replace(/\D/g, "");
}

function compactUtcDate(date: Date): string {
  return [date.getUTCFullYear(), String(date.getUTCMonth() + 1).padStart(2, "0"), String(date.getUTCDate()).padStart(2, "0")].join("");
}

export function buildOrderCode(createdAt: Date, sequence: number): string {
  return `TB-${compactUtcDate(createdAt)}-${String(sequence).padStart(4, "0")}`;
}

export function createTemporaryOrderCode(createdAt: Date, entropy: string): string {
  const suffix = entropy.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 12);
  if (!suffix) throw new Error("Entropia de código temporário inválida.");
  return `TB-${compactUtcDate(createdAt)}-${suffix}`;
}

export class OrderTransitionError extends Error {
  constructor() {
    super("Transição de pedido não permitida.");
    this.name = "OrderTransitionError";
  }
}

export function assertTransition(currentStatus: OrderStatus, nextStatus: OrderStatus): void {
  if (!canTransitionOrderStatus(currentStatus, nextStatus)) {
    throw new OrderTransitionError();
  }
}

export const trackingInput = z.object({
  code: z
    .string()
    .trim()
    .transform((value) => value.toUpperCase())
    .refine((value) => /^TB-[A-Z0-9-]+$/.test(value), "Informe um código de pedido válido."),
  phone: z
    .string()
    .transform(normalizePhoneForLookup)
    .refine((value) => value.length >= 8, "Informe um telefone válido."),
});
