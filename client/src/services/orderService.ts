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

type VercelOrderServiceOptions = {
  request: (path: string, options: { method: "POST"; body: unknown }) => Promise<OrderConfirmation>;
};

export function createVercelOrderService(options: VercelOrderServiceOptions): OrderService {
  return {
    submit(payload) {
      const paymentMethod = payload.customer.paymentMethod === "card" ? "credit_card" : payload.customer.paymentMethod === "food_voucher" ? "voucher" : payload.customer.paymentMethod;
      return options.request("/api/public/orders", {
        method: "POST",
        body: {
          customer: {
            name: payload.customer.name,
            phone: payload.customer.phone,
            address: [payload.customer.address, payload.customer.neighborhood].filter(Boolean).join(", ") || undefined,
            notes: [payload.customer.reference, payload.customer.changeFor ? `Troco para R$ ${payload.customer.changeFor}` : ""].filter(Boolean).join(". ") || undefined,
          },
          fulfillmentMethod: payload.deliveryMode,
          paymentMethod,
          items: payload.items.map((item) => ({ productId: item.productId, quantity: item.quantity, optionIds: item.selections.map((selection) => selection.optionId), note: item.note })),
        },
      });
    },
  };
}

export const localOrderService = createLocalOrderService();
