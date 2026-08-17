import type { OrderConfirmation, OrderPayload } from "@shared/order";

export type OrderService = {
  submit: (payload: OrderPayload) => Promise<OrderConfirmation>;
};

type LocalOrderServiceOptions = {
  now?: () => Date;
  createOrderNumber?: () => string;
};

function defaultOrderNumber() {
  return `TB-${Math.floor(1000 + Math.random() * 9000)}`;
}

export function createLocalOrderService(options: LocalOrderServiceOptions = {}): OrderService {
  const now = options.now ?? (() => new Date());
  const createOrderNumber = options.createOrderNumber ?? defaultOrderNumber;

  return {
    async submit(payload) {
      return {
        orderNumber: createOrderNumber(),
        estimatedTime: payload.deliveryMode === "delivery" ? "35 a 50 min" : "15 a 25 min",
        submittedAt: now().toISOString(),
      };
    },
  };
}

export const localOrderService = createLocalOrderService();
