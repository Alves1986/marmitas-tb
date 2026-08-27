// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
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
  afterEach(() => cleanup());

  it("destaca o balcão e apresenta somente a próxima ação permitida em cada cartão ativo", async () => {
    const transitionOrder = vi.fn().mockResolvedValue({ id: "counter", status: "em_preparo" });
    render(<KitchenBoardContent role="staff" loadOrders={vi.fn().mockResolvedValue([
      order({ id: "counter", code: "TB-COUNTER", sourceChannel: "COUNTER", counterTicket: "MTB-001" }),
      order({ id: "preparing", code: "TB-PREPARING", status: "em_preparo" }),
      order({ id: "ready", code: "TB-READY", status: "pronto_para_retirada" }),
      order({ id: "finished", code: "TB-FINISHED", status: "concluido" }),
    ])} transitionOrder={transitionOrder} />);

    expect(await screen.findByText("Prioridade balcão")).toBeTruthy();
    expect(screen.getByText("MTB-001")).toBeTruthy();
    expect(screen.getByText("Novo pedido")).toBeTruthy();
    expect(screen.getByText("Em preparo")).toBeTruthy();
    expect(screen.getByText("Pronto para retirada")).toBeTruthy();
    expect(screen.queryByText("TB-FINISHED")).toBeNull();
    const startCounter = screen.getByRole("button", { name: "Iniciar preparo pedido MTB-001" });
    expect(screen.getByRole("button", { name: "Marcar pronto pedido TB-PREPARING" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /TB-READY/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /reimprimir|cancelar/i })).toBeNull();

    fireEvent.click(startCounter);
    expect(transitionOrder).toHaveBeenCalledWith("counter", "em_preparo");
  });

  it("bloqueia nova ação do cartão enquanto a atualização está pendente", async () => {
    let resolveTransition: ((value: { id: string; status: "em_preparo" }) => void) | undefined;
    const transitionOrder = vi.fn().mockImplementation(() => new Promise<{ id: string; status: "em_preparo" }>((resolve) => { resolveTransition = resolve; }));
    render(<KitchenBoardContent role="staff" loadOrders={vi.fn().mockResolvedValue([order()])} transitionOrder={transitionOrder} />);

    const button = await screen.findByRole("button", { name: "Iniciar preparo pedido TB-0001" });
    fireEvent.click(button);

    expect(button.getAttribute("disabled")).not.toBeNull();
    expect(screen.getByText("Atualizando…")).toBeTruthy();
    resolveTransition?.({ id: "order-default", status: "em_preparo" });
  });

  it("mantém o cartão no estado atual e mostra falha recuperável quando a transição é recusada", async () => {
    const transitionOrder = vi.fn().mockRejectedValue(new Error("Conflito de status"));
    render(<KitchenBoardContent role="staff" loadOrders={vi.fn().mockResolvedValue([order()])} transitionOrder={transitionOrder} />);

    fireEvent.click(await screen.findByRole("button", { name: "Iniciar preparo pedido TB-0001" }));

    expect((await screen.findByRole("alert")).textContent).toContain("Conflito de status");
    expect(screen.getByRole("button", { name: "Iniciar preparo pedido TB-0001" })).toBeTruthy();
    expect(screen.getByText("Novo pedido")).toBeTruthy();
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
