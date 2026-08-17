import { describe, expect, it } from "vitest";
import {
  calculateCartSummary,
  createCartItemKey,
  formatCurrency,
  readStoredCart,
  writeStoredCart,
} from "./order";

describe("order calculations", () => {
  it("calculates subtotal, promotion savings and estimated delivery fee", () => {
    const summary = calculateCartSummary(
      [
        {
          id: "cart-1",
          productId: "marmita-frango",
          name: "Frango à milanesa",
          unitPrice: 20,
          originalUnitPrice: 24,
          quantity: 2,
          selections: [],
          note: "",
        },
        {
          id: "cart-2",
          productId: "coca-200",
          name: "Coca-Cola 200 ml",
          unitPrice: 4,
          quantity: 1,
          selections: [],
          note: "",
        },
      ],
      "delivery",
    );

    expect(summary).toEqual({
      subtotal: 44,
      savings: 8,
      deliveryFee: 5,
      total: 49,
    });
  });

  it("does not charge delivery fee for pickup", () => {
    const summary = calculateCartSummary([], "pickup");

    expect(summary.deliveryFee).toBe(0);
    expect(summary.total).toBe(0);
  });

  it("formats Brazilian real values", () => {
    expect(formatCurrency(23.9)).toBe("R$ 23,90");
  });

  it("keeps distinct product configurations as distinct cart lines", () => {
    const medium = createCartItemKey("marmita-frango", ["tamanho:média", "embalagem:isopor"], "");
    const large = createCartItemKey("marmita-frango", ["tamanho:grande", "embalagem:isopor"], "");

    expect(medium).not.toBe(large);
  });

  it("persists and restores a valid cart without throwing on malformed storage", () => {
    const storage = new Map<string, string>();
    const safeStorage = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
    };
    const items = [
      {
        id: "cart-3",
        productId: "marmita-fit",
        name: "Marmita Fit",
        unitPrice: 16,
        quantity: 1,
        selections: [],
        note: "",
      },
    ];

    writeStoredCart(safeStorage, items);
    expect(readStoredCart(safeStorage)).toEqual(items);

    storage.set("marmitas-tb-cart", "not-json");
    expect(readStoredCart(safeStorage)).toEqual([]);
  });
});
