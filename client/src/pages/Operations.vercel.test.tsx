// @vitest-environment happy-dom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useEffect } from "react";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ acknowledgeAlert: vi.fn() }));

vi.mock("@/_core/hooks/useAuth", () => ({ useAuth: () => ({ loading: false, user: { id: "operator-1", role: "staff" } }) }));
vi.mock("wouter", () => ({ useLocation: () => ["/operacao", vi.fn()] }));
vi.mock("@/lib/runtimeConfig", () => ({ isVercelRuntime: () => true }));
vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ operations: { list: { invalidate: vi.fn() } } }),
    operations: { acknowledge: { useMutation: () => ({ mutate: vi.fn() }) } },
  },
}));
vi.mock("@/services/operationsService", () => ({ vercelOperationsService: { acknowledgeAlert: mocks.acknowledgeAlert } }));
vi.mock("@/components/operations/OrderQueue", () => ({
  OrderQueue: ({ onOrdersChange }: { onOrdersChange(orders: Array<{ id: string; code: string; status: "confirmado"; acknowledgedAt: Date | null }>): void }) => {
    useEffect(() => onOrdersChange([{ id: "order-1", code: "TB-0001", status: "confirmado", acknowledgedAt: null }]), [onOrdersChange]);
    return <div>Fila simulada</div>;
  },
}));
vi.mock("@/components/operations/OrderAlert", () => ({
  OrderAlert: ({ orders, onAcknowledge }: { orders: Array<{ id: string; acknowledgedAt: Date | null }>; onAcknowledge(id: string): void }) => (
    <section>
      <p>{orders[0]?.acknowledgedAt ? "Reconhecido" : "Pendente"}</p>
      <button type="button" onClick={() => onAcknowledge("order-1")}>Reconhecer pedido</button>
    </section>
  ),
}));

import Operations from "./Operations";

describe("Operations no runtime Vercel", () => {
  it("mantém o pedido pendente e mostra o erro quando o reconhecimento falha", async () => {
    mocks.acknowledgeAlert.mockRejectedValueOnce(new Error("Serviço indisponível"));
    render(<Operations />);

    expect(await screen.findByText("Pendente")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Reconhecer pedido" }));

    expect((await screen.findByRole("alert")).textContent).toContain("Serviço indisponível");
    expect(screen.getByText("Pendente")).toBeTruthy();
  });
});
