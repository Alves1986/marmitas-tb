import { apiRequest } from "@/lib/api";

export type CounterPaymentMethod = "cash" | "pix" | "debit_card" | "credit_card" | "voucher";

export type CounterOrderPayload = {
  id: string;
  displayName?: string;
  paymentMethod: CounterPaymentMethod;
  items: Array<{ productId: string; quantity: number; optionIds: string[]; note: string }>;
};

export type CounterOrderConfirmation = {
  orderNumber: string;
  ticket: string;
  estimatedTime: string;
  submittedAt: string;
};

export type CounterOrderRequest = <T>(path: string, init: { method: "POST"; body: Record<string, unknown> }) => Promise<T>;

const defaultRequest: CounterOrderRequest = (path, init) => apiRequest(path, {
  method: init.method,
  headers: { "content-type": "application/json" },
  body: JSON.stringify(init.body),
});

export function createCounterOrderService(request: CounterOrderRequest = defaultRequest) {
  const idempotencyKeys = new Map<string, string>();

  return {
    submit(payload: CounterOrderPayload) {
      const idempotencyKey = idempotencyKeys.get(payload.id) ?? crypto.randomUUID();
      idempotencyKeys.set(payload.id, idempotencyKey);
      return request<CounterOrderConfirmation>("/api/operations/counter-orders", {
        method: "POST",
        body: {
          idempotencyKey,
          displayName: payload.displayName?.trim() || undefined,
          paymentMethod: payload.paymentMethod,
          items: payload.items,
        },
      });
    },
    reset(attemptId: string) {
      idempotencyKeys.delete(attemptId);
    },
  };
}

export const counterOrderService = createCounterOrderService();
