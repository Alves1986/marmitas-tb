// @vitest-environment happy-dom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { KitchenBoardContent } from "./KitchenBoard";
import type { VercelOperationalOrder } from "@/services/operationsService";

function order(overrides: Partial<VercelOperationalOrder> = {}): VercelOperationalOrder {
  return {
    id: "order-default",
    code: "TB-0001",
    sourceChannel: "OWN_APP",
    counterTicket: null,
    customerName: "Cliente",
    customerPhone: "42999999999",
    fulfillmentMethod: "pickup",
    deliveryAddress: null,
    customerNotes: null,
    totalInCents: 2500,
    status: "confirmado",
    paymentMethod: "cash",
    paymentStatus: "confirmed",
    acknowledgedAt: null,
    createdAt: "2026-08-27T12:00:00.000Z",
    items: [{ productName: "Marmita", quantity: 1, unitPriceInCents: 2500, notes: null }],
    ...overrides,
  };
}

describe("Tela de cozinha", () => {
  it("destaca o balcão e separa os demais pedidos ativos por estado sem ações de mutação", async () => {
    render(<KitchenBoardContent role="staff" loadOrders={vi.fn().mockResolvedValue([
      order({ id: "counter", code: "TB-COUNTER", sourceChannel: "COUNTER", counterTicket: "MTB-001" }),
      order({ id: "preparing", code: "TB-PREPARING", status: "em_preparo" }),
      order({ id: "ready", code: "TB-READY", status: "pronto_para_retirada" }),
      order({ id: "finished", code: "TB-FINISHED", status: "concluido" }),
    ])} />);

    expect(await screen.findByText("Prioridade balcão")).toBeTruthy();
    expect(screen.getByText("MTB-001")).toBeTruthy();
    expect(screen.getByText("Novo pedido")).toBeTruthy();
    expect(screen.getByText("Em preparo")).toBeTruthy();
    expect(screen.getByText("Pronto para retirada")).toBeTruthy();
    expect(screen.queryByText("TB-FINISHED")).toBeNull();
    expect(screen.queryByRole("button", { name: /reimprimir|iniciar preparo|cancelar/i })).toBeNull();
  });

  it("mostra estados recuperáveis para fila vazia e falha de consulta", async () => {
    const { rerender } = render(<KitchenBoardContent role="staff" loadOrders={vi.fn().mockResolvedValue([])} />);
    expect(await screen.findByText("Nenhuma comanda ativa nesta etapa.")).toBeTruthy();

    rerender(<KitchenBoardContent role="staff" loadOrders={vi.fn().mockRejectedValue(new Error("Serviço indisponível"))} />);
    expect((await screen.findByRole("alert")).textContent).toContain("Serviço indisponível");
  });

  it("preserva a barreira para perfis sem acesso operacional", () => {
    const loadOrders = vi.fn().mockResolvedValue([]);
    render(<KitchenBoardContent role="user" loadOrders={loadOrders} />);
    expect(screen.getByText("Acesso restrito")).toBeTruthy();
    expect(loadOrders).not.toHaveBeenCalled();
  });
});
