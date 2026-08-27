import { describe, expect, it } from "vitest";
import {
  filterInventoryItems,
  formatInventoryQuantity,
  getInventoryLevelLabel,
  sortInventoryItems,
  type InventoryBoardItem,
} from "./inventoryBoard";

function item(overrides: Partial<InventoryBoardItem> = {}): InventoryBoardItem {
  return {
    id: "rice",
    name: "Arroz",
    unit: "kg",
    minimumStock: 2,
    balanceQuantity: 3,
    level: "healthy",
    isActive: true,
    ...overrides,
  };
}

describe("projeção da tela de estoque", () => {
  it("filtra insumos pelo nome sem diferenciar maiúsculas de minúsculas", () => {
    const items = [item(), item({ id: "beans", name: "Feijão" })];

    expect(filterInventoryItems(items, "ARROZ").map((inventoryItem) => inventoryItem.id)).toEqual(["rice"]);
  });

  it("prioriza estoque crítico, depois atenção e finalmente saldo adequado", () => {
    const items = [
      item({ id: "healthy", name: "Óleo", level: "healthy" }),
      item({ id: "critical", name: "Arroz", level: "critical" }),
      item({ id: "attention", name: "Feijão", level: "attention" }),
    ];

    expect(sortInventoryItems(items).map((inventoryItem) => inventoryItem.id)).toEqual(["critical", "attention", "healthy"]);
  });

  it("expõe rótulos e quantidades compreensíveis sem converter unidades", () => {
    expect(getInventoryLevelLabel("critical")).toBe("Estoque crítico");
    expect(formatInventoryQuantity(2.5, "kg")).toBe("2,5 kg");
    expect(formatInventoryQuantity(1, "unidade")).toBe("1 unidade");
  });
});
