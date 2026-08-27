import type { InventoryLevel, InventoryUnit } from "@shared/inventory";

export type InventoryBoardItem = {
  id: string;
  name: string;
  unit: InventoryUnit;
  minimumStock: number;
  balanceQuantity: number;
  level: InventoryLevel;
  isActive: boolean;
};

const levelOrder: Record<InventoryLevel, number> = {
  critical: 0,
  attention: 1,
  healthy: 2,
};

export function filterInventoryItems(items: InventoryBoardItem[], query: string): InventoryBoardItem[] {
  const normalizedQuery = query.trim().toLocaleLowerCase("pt-BR");
  return normalizedQuery ? items.filter((item) => item.name.toLocaleLowerCase("pt-BR").includes(normalizedQuery)) : items;
}

export function sortInventoryItems(items: InventoryBoardItem[]): InventoryBoardItem[] {
  return [...items].sort((left, right) => {
    const byLevel = levelOrder[left.level] - levelOrder[right.level];
    return byLevel || left.name.localeCompare(right.name, "pt-BR");
  });
}

export function getInventoryLevelLabel(level: InventoryLevel): string {
  return level === "critical" ? "Estoque crítico" : level === "attention" ? "Estoque em atenção" : "Estoque adequado";
}

export function formatInventoryQuantity(quantity: number, unit: InventoryUnit): string {
  return `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 3 }).format(quantity)} ${unit}`;
}
