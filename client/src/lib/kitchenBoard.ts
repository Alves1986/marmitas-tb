import type { OrderStatus } from "@shared/operations";
import type { VercelOperationalOrder } from "@/services/operationsService";

export type KitchenOrder = Pick<VercelOperationalOrder, "id" | "code" | "customerName" | "customerNotes" | "status" | "createdAt" | "items" | "sourceChannel" | "counterTicket">;

export type KitchenBoard = {
  counterPriority: KitchenOrder[];
  confirmed: KitchenOrder[];
  preparing: KitchenOrder[];
  ready: KitchenOrder[];
};

const kitchenActiveStatuses = new Set<OrderStatus>(["confirmado", "em_preparo", "pronto_para_retirada"]);

export function isKitchenActiveStatus(status: OrderStatus): boolean {
  return kitchenActiveStatuses.has(status);
}

export function sortOldestFirst(left: KitchenOrder, right: KitchenOrder): number {
  return new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
}

export function buildKitchenBoard(orders: KitchenOrder[]): KitchenBoard {
  const active = orders.filter((order) => isKitchenActiveStatus(order.status));
  const counterPriority = active.filter((order) => order.sourceChannel === "COUNTER").sort(sortOldestFirst);
  const nonCounter = active.filter((order) => order.sourceChannel !== "COUNTER");

  return {
    counterPriority,
    confirmed: nonCounter.filter((order) => order.status === "confirmado").sort(sortOldestFirst),
    preparing: nonCounter.filter((order) => order.status === "em_preparo").sort(sortOldestFirst),
    ready: nonCounter.filter((order) => order.status === "pronto_para_retirada").sort(sortOldestFirst),
  };
}
