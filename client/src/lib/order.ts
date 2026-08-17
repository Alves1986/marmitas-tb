import type { CartItem, CartSummary, DeliveryMode } from "@shared/order";

const DELIVERY_FEE = 5;
const CART_STORAGE_KEY = "marmitas-tb-cart";

type StorageLike = Pick<Storage, "getItem" | "setItem">;

export function calculateCartSummary(items: CartItem[], deliveryMode: DeliveryMode): CartSummary {
  const subtotal = items.reduce((total, item) => total + item.unitPrice * item.quantity, 0);
  const savings = items.reduce((total, item) => {
    const originalPrice = item.originalUnitPrice ?? item.unitPrice;
    return total + Math.max(0, originalPrice - item.unitPrice) * item.quantity;
  }, 0);
  const deliveryFee = subtotal > 0 && deliveryMode === "delivery" ? DELIVERY_FEE : 0;

  return {
    subtotal,
    savings,
    deliveryFee,
    total: subtotal + deliveryFee,
  };
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function createCartItemKey(productId: string, selections: string[], note: string) {
  const configuration = [...selections].sort().join("|");
  return `${productId}::${configuration}::${note.trim().toLocaleLowerCase("pt-BR")}`;
}

function isCartItem(value: unknown): value is CartItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<CartItem>;
  return (
    typeof item.id === "string" &&
    typeof item.productId === "string" &&
    typeof item.name === "string" &&
    typeof item.unitPrice === "number" &&
    typeof item.quantity === "number" &&
    Array.isArray(item.selections) &&
    typeof item.note === "string"
  );
}

export function readStoredCart(storage: Pick<StorageLike, "getItem">): CartItem[] {
  try {
    const rawValue = storage.getItem(CART_STORAGE_KEY);
    if (!rawValue) return [];
    const parsed: unknown = JSON.parse(rawValue);
    return Array.isArray(parsed) && parsed.every(isCartItem) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeStoredCart(storage: Pick<StorageLike, "setItem">, items: CartItem[]) {
  storage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
}
