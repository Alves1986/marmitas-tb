export type TotemStep = "categories" | "products" | "drinks" | "desserts" | "review" | "payment" | "receipt";
export type TotemPaymentMethod = "pix" | "card";

export type TotemItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
};

export type TotemState = {
  step: TotemStep;
  displayName: string;
  items: TotemItem[];
};

export function createInitialTotemState(): TotemState {
  return { step: "categories", displayName: "", items: [] };
}

export function expireTotemSession(_state: TotemState): TotemState {
  return createInitialTotemState();
}

export function formatTotemTag(sequence: number, displayName?: string): string {
  const tag = `MTB-${String(sequence).padStart(3, "0")}`;
  const name = displayName?.trim().split(/\s+/)[0]?.toLocaleUpperCase("pt-BR");
  return name ? `${tag} · ${name}` : tag;
}

export function createTotemReceipt(input: {
  sequence: number;
  displayName?: string;
  paymentMethod: TotemPaymentMethod;
  items: TotemItem[];
}) {
  return {
    tag: formatTotemTag(input.sequence, input.displayName),
    paymentLabel: input.paymentMethod === "pix" ? "PIX demonstrativo" : "Cartão demonstrativo",
    total: input.items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    isDemo: true as const,
  };
}
