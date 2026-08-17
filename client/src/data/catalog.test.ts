import { describe, expect, it } from "vitest";
import { products } from "./catalog";

describe("catálogo visual", () => {
  it("associa todos os cards a fotos estáticas do catálogo de origem", () => {
    expect(products).toHaveLength(18);
    expect(products.every((product) => product.imageUrl?.startsWith("/manus-storage/"))).toBe(true);
  });
});
