// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
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

afterEach(() => cleanup());

describe("Tela de estoque", () => {
  it("mostra resumo, busca e lançamentos permitidos à equipe", async () => {
    render(<InventoryContent role="staff" loadInventory={vi.fn().mockResolvedValue([
      inventoryItem(),
      inventoryItem({ id: "beans", name: "Feijão", level: "healthy", balanceQuantity: 5 }),
    ])} />);

    expect(await screen.findByRole("heading", { name: "Estoque" })).toBeTruthy();
    expect(screen.getByText("1 item crítico")).toBeTruthy();
    expect(screen.getByText("Estoque crítico")).toBeTruthy();
    expect((screen.getByRole("button", { name: "Registrar entrada" }) as HTMLButtonElement).disabled).toBe(false);
    expect((screen.getByRole("button", { name: "Registrar consumo" }) as HTMLButtonElement).disabled).toBe(false);
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
    expect(screen.getByRole("button", { name: "Editar insumo Arroz" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Inativar insumo Arroz" })).toBeTruthy();
  });

  it("permite à administração editar e inativar um insumo somente após confirmação", async () => {
    const updateItem = vi.fn().mockResolvedValue(undefined);
    const setItemActive = vi.fn().mockResolvedValue(undefined);
    render(<InventoryContent role="admin" loadInventory={vi.fn().mockResolvedValue([inventoryItem()])} updateItem={updateItem} setItemActive={setItemActive} />);

    await screen.findByText("Arroz");
    fireEvent.click(screen.getByRole("button", { name: "Editar insumo Arroz" }));
    fireEvent.change(screen.getByLabelText("Nome do insumo"), { target: { value: "Arroz integral" } });
    fireEvent.change(screen.getByLabelText("Estoque mínimo"), { target: { value: "3" } });
    fireEvent.submit(screen.getByRole("button", { name: "Salvar alterações" }).closest("form")!);
    await waitFor(() => expect(updateItem).toHaveBeenCalledWith({ inventoryItemId: "rice", name: "Arroz integral", minimumStock: 3 }));

    fireEvent.click(screen.getByRole("button", { name: "Inativar insumo Arroz" }));
    expect(screen.getByText("O histórico será preservado, mas novos lançamentos serão bloqueados.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Confirmar inativação" }));
    await waitFor(() => expect(setItemActive).toHaveBeenCalledWith({ inventoryItemId: "rice", isActive: false }));
  });

  it("permite que a equipe registre entrada com quantidade positiva e atualiza a posição", async () => {
    const createMovement = vi.fn().mockResolvedValue(undefined);
    render(<InventoryContent role="staff" loadInventory={vi.fn().mockResolvedValue([inventoryItem()])} createMovement={createMovement} createIdempotencyKey={() => "d94890f7-9f80-4cb6-9d14-f81e3d9ca0be"} />);

    await screen.findByText("Arroz");
    fireEvent.click(screen.getByRole("button", { name: "Registrar entrada" }));
    fireEvent.change(screen.getByLabelText("Insumo"), { target: { value: "rice" } });
    fireEvent.change(screen.getByLabelText("Quantidade"), { target: { value: "3" } });
    expect((screen.getByRole("button", { name: "Confirmar entrada" }) as HTMLButtonElement).disabled).toBe(false);
    fireEvent.submit(screen.getByRole("button", { name: "Confirmar entrada" }).closest("form")!);

    await waitFor(() => expect(createMovement).toHaveBeenCalledWith(expect.objectContaining({
      inventoryItemId: "rice",
      type: "ENTRY",
      quantityDelta: 3,
    })));
  });

  it("mostra estados de vazio e falha recuperável de leitura", async () => {
    const { rerender } = render(<InventoryContent role="staff" loadInventory={vi.fn().mockResolvedValue([])} />);
    expect(await screen.findByText("Nenhum insumo cadastrado nesta etapa.")).toBeTruthy();

    rerender(<InventoryContent role="staff" loadInventory={vi.fn().mockRejectedValue(new Error("Falha temporária"))} />);
    expect((await screen.findByRole("alert")).textContent).toContain("Não foi possível carregar estoque.");
  });

  it("não consulta a API para perfil sem acesso operacional", () => {
    const loadInventory = vi.fn().mockResolvedValue([]);
    render(<InventoryContent role="user" loadInventory={loadInventory} />);

    expect(screen.getByText("Acesso restrito")).toBeTruthy();
    expect(loadInventory).not.toHaveBeenCalled();
  });
});
