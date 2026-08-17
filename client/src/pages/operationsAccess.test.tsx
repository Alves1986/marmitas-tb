// @vitest-environment happy-dom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { OperationsAccessGate, toAlertableOrders } from "./Operations";

describe("OperationsAccessGate", () => {
  it("bloqueia usuário comum e apresenta mensagem de acesso restrito", () => {
    render(<OperationsAccessGate role="user"><p>Fila de pedidos</p></OperationsAccessGate>);

    expect(screen.getByText(/acesso restrito/i)).toBeTruthy();
    expect(screen.queryByText("Fila de pedidos")).toBeNull();
  });

  it("libera a fila para membro da equipe", () => {
    render(<OperationsAccessGate role="staff"><p>Fila de pedidos</p></OperationsAccessGate>);

    expect(screen.getByText("Fila de pedidos")).toBeTruthy();
  });
});

describe("toAlertableOrders", () => {
  it("mantém o reconhecimento persistido do pedido ao preparar os alertas", () => {
    const acknowledgedAt = new Date("2026-08-17T15:30:00.000Z");
    expect(toAlertableOrders([{ id: 7, code: "TB-20260817-0007", status: "confirmado", acknowledgedAt }])).toEqual([
      { id: 7, code: "TB-20260817-0007", status: "confirmado", acknowledgedAt },
    ]);
  });
});
