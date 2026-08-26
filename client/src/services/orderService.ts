import type { CartItem, OrderConfirmation, OrderPayload } from "@shared/order";

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
  loadMenu?: () => Promise<PublicMenu>;
  createIdempotencyKey?: () => string;
};

export type PublicMenu = {
  products: Array<{
    id: string;
    name: string;
    options: Array<{ id: string; groupName: string; label: string }>;
  }>;
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function hasSupabaseIds(item: CartItem) {
  return uuidPattern.test(item.productId) && item.selections.every((selection) => uuidPattern.test(selection.optionId));
}

async function resolveItemsForPublicOrder(items: CartItem[], loadMenu?: () => Promise<PublicMenu>) {
  if (items.every(hasSupabaseIds)) return items;
  if (!loadMenu) throw new Error("Não foi possível validar os itens do cardápio. Atualize a página e tente novamente.");

  const menu = await loadMenu();
  return items.map((item) => {
    const product = menu.products.find((candidate) => candidate.id === item.productId || candidate.name === item.name);
    if (!product) throw new Error(`O item “${item.name}” não está mais disponível. Atualize a página e revise a sacola.`);

    const selections = item.selections.map((selection) => {
      const option = product.options.find((candidate) => candidate.id === selection.optionId || (candidate.groupName === selection.groupLabel && candidate.label === selection.optionLabel));
      if (!option) throw new Error(`A opção “${selection.optionLabel}” não está mais disponível para “${item.name}”. Atualize a página e revise a sacola.`);
      return { ...selection, optionId: option.id };
    });

    return { ...item, productId: product.id, selections };
  });
}

export function createVercelOrderService(options: VercelOrderServiceOptions): OrderService {
  const createIdempotencyKey = options.createIdempotencyKey ?? (() => crypto.randomUUID());
  const idempotencyKeys = new Map<string, string>();

  return {
    async submit(payload) {
      const items = await resolveItemsForPublicOrder(payload.items, options.loadMenu);
      const paymentMethod = payload.customer.paymentMethod === "card" ? "credit_card" : payload.customer.paymentMethod === "food_voucher" ? "voucher" : payload.customer.paymentMethod;
      const idempotencyKey = idempotencyKeys.get(payload.id) ?? createIdempotencyKey();
      idempotencyKeys.set(payload.id, idempotencyKey);
      return options.request("/api/public/orders", {
        method: "POST",
        body: {
          idempotencyKey,
          customer: {
            name: payload.customer.name,
            phone: payload.customer.phone,
            address: [payload.customer.address, payload.customer.neighborhood].filter(Boolean).join(", ") || undefined,
            notes: [payload.customer.reference, payload.customer.changeFor ? `Troco para R$ ${payload.customer.changeFor}` : ""].filter(Boolean).join(". ") || undefined,
          },
          fulfillmentMethod: payload.deliveryMode,
          paymentMethod,
          items: items.map((item) => ({ productId: item.productId, quantity: item.quantity, optionIds: item.selections.map((selection) => selection.optionId), note: item.note })),
        },
      });
    },
  };
}

export type KioskOrderPayload = {
  id: string;
  displayName?: string;
  paymentMethod: "pix" | "card";
  items: Array<{ productId: string; quantity: number; optionIds: string[]; note: string }>;
};

export type KioskOrderConfirmation = {
  orderNumber: string;
  estimatedTime: string;
  submittedAt: string;
};

type KioskOrderServiceOptions = {
  request: (path: string, options: { method: "POST"; body: unknown }) => Promise<KioskOrderConfirmation>;
  createIdempotencyKey?: () => string;
};

export function createKioskOrderService(options: KioskOrderServiceOptions) {
  const createIdempotencyKey = options.createIdempotencyKey ?? (() => crypto.randomUUID());
  const idempotencyKeys = new Map<string, string>();

  return {
    async submit(payload: KioskOrderPayload): Promise<KioskOrderConfirmation> {
      const idempotencyKey = idempotencyKeys.get(payload.id) ?? createIdempotencyKey();
      idempotencyKeys.set(payload.id, idempotencyKey);

      return options.request("/api/public/kiosk-orders", {
        method: "POST",
        body: {
          idempotencyKey,
          displayName: payload.displayName || undefined,
          paymentMethod: payload.paymentMethod,
          items: payload.items,
        },
      });
    },
  };
}

export const localOrderService = createLocalOrderService();
