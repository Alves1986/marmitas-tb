export type TotemStep = "categories" | "products" | "drinks" | "desserts" | "review" | "payment" | "receipt";
export type TotemPaymentMethod = "pix" | "card";

export const TOTEM_DAILY_SEQUENCE_STORAGE_KEY = "marmitas-tb-totem-daily-sequence";

export type TotemDailySequence = {
  day: string;
  sequence: number;
};

export type TotemItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  optionIds: string[];
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

export function getTotemLocalDay(now = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function readTotemDailySequence(rawValue: string | null, now = new Date()): TotemDailySequence {
  const today = getTotemLocalDay(now);

  try {
    const stored = rawValue ? JSON.parse(rawValue) as Partial<TotemDailySequence> : null;
    if (stored?.day === today && Number.isSafeInteger(stored.sequence) && (stored.sequence ?? -1) >= 0) {
      return { day: stored.day, sequence: stored.sequence! };
    }
  } catch {
    // Dados locais antigos ou inválidos iniciam uma nova sequência diária segura.
  }

  return { day: today, sequence: 0 };
}

export function incrementTotemDailySequence(current: TotemDailySequence): TotemDailySequence {
  return { ...current, sequence: current.sequence + 1 };
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
