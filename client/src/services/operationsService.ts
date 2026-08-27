import type { OrderStatus } from "@shared/operations";
import { apiRequest } from "@/lib/api";

export type OperationsApi = <T>(path: string, init?: { method?: string; body?: unknown }) => Promise<T>;

export type VercelOperationalOrder = {
  id: string;
  code: string;
  sourceChannel: "OWN_APP" | "KIOSK" | "COUNTER" | "IFOOD" | "PHONE" | "WHATSAPP" | "INTERNAL";
  counterTicket: string | null;
  customerName: string;
  customerPhone: string;
  fulfillmentMethod: "delivery" | "pickup";
  deliveryAddress: string | null;
  customerNotes: string | null;
  totalInCents: number;
  status: OrderStatus;
  paymentMethod: string;
  paymentStatus: string;
  acknowledgedAt: string | null;
  createdAt: string;
  items: Array<{ productName: string; quantity: number; unitPriceInCents: number; notes: string | null }>;
};

export type VercelPrintJob = {
  id: string;
  order_id: string;
  status: "queued";
  orders: { code: string } | null;
};

const vercelApi: OperationsApi = (path, init = {}) => apiRequest(path, {
  method: init.method,
  headers: init.body === undefined ? undefined : { "content-type": "application/json" },
  body: init.body === undefined ? undefined : JSON.stringify(init.body),
});

export function createVercelOperationsService(api: OperationsApi = vercelApi) {
  return {
    listOrders() {
      return api<VercelOperationalOrder[]>("/api/operations/orders");
    },
    transitionOrder(orderId: string, nextStatus: OrderStatus) {
      return api<{ id: string; status: OrderStatus }>("/api/operations/orders", {
        method: "PATCH",
        body: { orderId, nextStatus },
      });
    },
    acknowledgeAlert(orderId: string) {
      return api<{ orderId: string }>("/api/operations/alerts", {
        method: "POST",
        body: { orderId },
      });
    },
    listPrintJobs() {
      return api<VercelPrintJob[]>("/api/operations/printJobs");
    },
    requeuePrint(orderId: string, reason: string) {
      return api<VercelPrintJob>("/api/operations/printJobs", {
        method: "POST",
        body: { orderId, reason },
      });
    },
    markPrintJob(printJobId: string, status: "printed" | "failed", printerName?: string) {
      return api("/api/operations/printJobs", {
        method: "PATCH",
        body: { printJobId, status, printerName },
      });
    },
  };
}

export const vercelOperationsService = createVercelOperationsService();
