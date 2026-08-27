// @vitest-environment happy-dom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CounterPdvContent } from "./CounterPdv";

const catalog = {
  categories: [{ id: "food", name: "Marmitas", slug: "marmitas", sortOrder: 0 }],
  products: [{
    id: "19c4f23b-1e6d-4ca1-8e62-c44876fc65f2",
    categoryId: "food",
    name: "Marmita executiva",
    description: "Arroz, feijão e proteína",
    imagePath: null,
    priceInCents: 2500,
    originalPriceInCents: null,
    requiresConfiguration: false,
    options: [],
  }],
};

describe("PDV de balcão", () => {
  it("confirma uma venda presencial e só mostra a senha após o servidor responder", async () => {
    const submitOrder = vi.fn().mockResolvedValue({ orderNumber: "TB-20260827-COUNTER", ticket: "MTB-001", estimatedTime: "15 a 25 min", submittedAt: "2026-08-27T10:00:00.000Z" });
    render(<CounterPdvContent role="staff" initialCatalog={catalog} submitOrder={submitOrder} />);

    fireEvent.click(screen.getByRole("button", { name: /adicionar marmita executiva/i }));
    fireEvent.click(screen.getByRole("button", { name: /finalizar venda/i }));
    expect(screen.getByText(/selecione a forma de pagamento/i)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /registrar dinheiro/i }));

    expect(await screen.findByText("MTB-001")).toBeTruthy();
    expect(submitOrder).toHaveBeenCalledWith(expect.objectContaining({ paymentMethod: "cash", items: [expect.objectContaining({ productId: catalog.products[0].id })] }));
  });

  it("preserva o carrinho e comunica falha quando a confirmação não é registrada", async () => {
    const submitOrder = vi.fn().mockRejectedValue(new Error("Sem conexão"));
    render(<CounterPdvContent role="staff" initialCatalog={catalog} submitOrder={submitOrder} />);

    fireEvent.click(screen.getByRole("button", { name: /adicionar marmita executiva/i }));
    fireEvent.click(screen.getByRole("button", { name: /finalizar venda/i }));
    fireEvent.click(screen.getByRole("button", { name: /registrar dinheiro/i }));

    expect((await screen.findByRole("alert")).textContent).toContain("Sem conexão");
    expect(screen.getAllByText("Marmita executiva").length).toBeGreaterThan(1);
  });
});
