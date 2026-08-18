import type { OrderStatus } from "@shared/operations";
import { apiRequest } from "@/lib/api";

export type OperationsApi = <T>(path: string, init?: { method?: string; body?: unknown }) => Promise<T>;

const vercelApi: OperationsApi = (path, init = {}) => apiRequest(path, {
  method: init.method,
  headers: init.body === undefined ? undefined : { "content-type": "application/json" },
  body: init.body === undefined ? undefined : JSON.stringify(init.body),
});

export function createVercelOperationsService(api: OperationsApi = vercelApi) {
  return {
    listOrders<T>() {
      return api<T>("/api/operations/orders");
    },
    transitionOrder(orderId: string, nextStatus: OrderStatus) {
      return api<{ id: string; status: OrderStatus }>("/api/operations/orders", {
        method: "PATCH",
        body: { orderId, nextStatus },
      });
    },
  };
}

export const vercelOperationsService = createVercelOperationsService();
