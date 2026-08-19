import { describe, expect, it } from "vitest";
import { products } from "./catalog";

describe("catálogo visual", () => {
  it("associa todos os cards a fotos públicas hospedadas no bucket Supabase da Marmitas TB", () => {
    expect(products).toHaveLength(18);
    expect(products.every((product) => product.imageUrl?.startsWith("https://hwkgplnzvcaobjozfmqx.supabase.co/storage/v1/object/public/marmitas-tb-assets/catalog/"))).toBe(true);
  });
});
