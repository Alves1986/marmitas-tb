// @vitest-environment happy-dom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { getAlertRepeatInterval, OrderAlert, shouldPlayNotification } from "./OrderAlert";
import { OrderReceiptPreview } from "./OrderQueue";
import { Receipt } from "./Receipt";

describe("Receipt", () => {
  it("exibe uma comanda legível com o código e os itens do pedido", () => {
    render(
      <Receipt
        order={{
          code: "TB-20260817-0007",
          customerName: "Ana",
          customerPhone: "42999990000",
          fulfillmentMethod: "pickup",
          paymentMethod: "cash",
          paymentStatus: "pending",
          totalInCents: 2990,
          items: [{ quantity: 1, productName: "Marmita executiva", unitPriceInCents: 2990 }],
        }}
      />,
    );

    expect(screen.getByText(/TB-20260817-0007/)).toBeTruthy();
    expect(screen.getByText(/Marmita executiva/)).toBeTruthy();
    expect(screen.getByText(/Retirada no balcão/)).toBeTruthy();
  });
});

describe("OrderAlert", () => {
  it("só permite som após interação da equipe e com novo pedido pendente", () => {
    expect(shouldPlayNotification(false, 1)).toBe(false);
    expect(shouldPlayNotification(true, 0)).toBe(false);
    expect(shouldPlayNotification(true, 1)).toBe(true);
  });

  it("repete o alerta de forma moderada apenas enquanto houver pedido pendente", () => {
    expect(getAlertRepeatInterval(0)).toBeNull();
    expect(getAlertRepeatInterval(1)).toBe(30_000);
  });

  it("anuncia um pedido confirmado e permite reconhecê-lo", () => {
    const onAcknowledge = vi.fn();

    render(
      <OrderAlert
        orders={[{ id: "5935c69e-26a4-49a8-a298-3582a4f47c38", code: "TB-20260817-0007", status: "confirmado", acknowledgedAt: null }]}
        onAcknowledge={onAcknowledge}
      />,
    );

    expect(screen.getByRole("alert").textContent).toContain("TB-20260817-0007");
    const acknowledge = screen.getByRole("button", { name: /Reconhecer pedido/i });
    expect(acknowledge).toBeTruthy();
    acknowledge.click();
    expect(onAcknowledge).toHaveBeenCalledWith("5935c69e-26a4-49a8-a298-3582a4f47c38");
  });
});

describe("OrderReceiptPreview", () => {
  it("renderiza a comanda térmica vinculada ao pedido na fila", () => {
    render(
      <OrderReceiptPreview
        order={{
          code: "TB-20260817-0012",
          customerName: "Carla",
          customerPhone: "42999990012",
          fulfillmentMethod: "pickup",
          paymentMethod: "pix",
          paymentStatus: "confirmed",
          totalInCents: 3590,
          customerNotes: null,
          items: [{ quantity: 1, productName: "Marmita família", unitPriceInCents: 3590 }],
        }}
      />,
    );

    expect(screen.getByText(/Pré-visualizar comanda térmica/i)).toBeTruthy();
    expect(screen.getByText(/TB-20260817-0012/)).toBeTruthy();
    expect(screen.getByText(/Marmita família/)).toBeTruthy();
  });
});
