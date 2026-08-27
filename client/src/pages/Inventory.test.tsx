// @vitest-environment happy-dom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { InventoryContent } from "./Inventory";
import type { InventoryBoardItem } from "@/lib/inventoryBoard";

function inventoryItem(overrides: Partial<InventoryBoardItem> = {}): InventoryBoardItem {
  return {
    id: "rice",
    name: "Arroz",
    unit: "kg",
    minimumStock: 2,
    balanceQuantity: 1,
    level: "critical",
    isActive: true,
    ...overrides,
  };
}

describe("Tela de estoque", () => {
  it("mostra resumo, busca e lançamentos permitidos à equipe", async () => {
    render(<InventoryContent role="staff" loadInventory={vi.fn().mockResolvedValue([
      inventoryItem(),
      inventoryItem({ id: "beans", name: "Feijão", level: "healthy", balanceQuantity: 5 }),
    ])} />);

    expect(await screen.findByRole("heading", { name: "Estoque" })).toBeTruthy();
    expect(screen.getByText("1 item crítico")).toBeTruthy();
    expect(screen.getByText("Estoque crítico")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Registrar entrada" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Registrar consumo" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Registrar perda" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Registrar ajuste" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Cadastrar insumo" })).toBeNull();

    fireEvent.change(screen.getByRole("searchbox", { name: "Buscar insumo" }), { target: { value: "feijão" } });
    expect(screen.getByText("Feijão")).toBeTruthy();
    expect(screen.queryByText("Arroz")).toBeNull();
  });

  it("oferece controles de perda, ajuste e cadastro somente à administração", async () => {
    render(<InventoryContent role="admin" loadInventory={vi.fn().mockResolvedValue([inventoryItem()])} />);

    await screen.findByText("Arroz");
    expect(screen.getByRole("button", { name: "Registrar perda" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Registrar ajuste" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Cadastrar insumo" })).toBeTruthy();
  });

  it("mostra estados de vazio e de ativação pendente de forma recuperável", async () => {
    const { rerender } = render(<InventoryContent role="staff" loadInventory={vi.fn().mockResolvedValue([])} />);
    expect(await screen.findByText("Nenhum insumo cadastrado nesta etapa.")).toBeTruthy();

    rerender(<InventoryContent role="staff" loadInventory={vi.fn().mockRejectedValue(new Error("O estoque está preparado e aguarda ativação da base de dados."))} />);
    expect((await screen.findByRole("alert")).textContent).toContain("aguarda ativação da base de dados");
  });

  it("não consulta a API para perfil sem acesso operacional", () => {
    const loadInventory = vi.fn().mockResolvedValue([]);
    render(<InventoryContent role="user" loadInventory={loadInventory} />);

    expect(screen.getByText("Acesso restrito")).toBeTruthy();
    expect(loadInventory).not.toHaveBeenCalled();
  });
});
