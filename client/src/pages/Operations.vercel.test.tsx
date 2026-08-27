// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useEffect } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ acknowledgeAlert: vi.fn(), legacyAcknowledge: vi.fn() }));

vi.mock("@/_core/hooks/useAuth", () => ({ useAuth: () => ({ loading: false, user: { id: "operator-1", role: "staff" } }) }));
vi.mock("wouter", () => ({ useLocation: () => ["/operacao", vi.fn()] }));
vi.mock("@/lib/runtimeConfig", () => ({ isVercelRuntime: () => true }));
vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ operations: { list: { invalidate: vi.fn() } } }),
    operations: { acknowledge: { useMutation: () => ({ mutate: mocks.legacyAcknowledge }) } },
  },
}));
vi.mock("@/services/operationsService", () => ({ vercelOperationsService: { acknowledgeAlert: mocks.acknowledgeAlert } }));
vi.mock("@/components/operations/OrderQueue", () => ({
  OrderQueue: ({ onOrdersChange }: { onOrdersChange(orders: Array<{ id: string; code: string; status: "confirmado"; acknowledgedAt: Date | null }>): void }) => {
    useEffect(() => onOrdersChange([{ id: "18e59e53-81f3-494d-90b9-420dbe4a0892", code: "TB-0001", status: "confirmado", acknowledgedAt: null }]), [onOrdersChange]);
    return <div>Fila simulada</div>;
  },
}));
vi.mock("@/components/operations/OrderAlert", () => ({
  OrderAlert: ({ orders, onAcknowledge }: { orders: Array<{ id: string; acknowledgedAt: Date | null }>; onAcknowledge(id: string): void }) => (
    <section>
      <p>{orders[0]?.acknowledgedAt ? "Reconhecido" : "Pendente"}</p>
      <button type="button" onClick={() => onAcknowledge("18e59e53-81f3-494d-90b9-420dbe4a0892")}>Reconhecer pedido</button>
    </section>
  ),
}));

import Operations from "./Operations";

describe("Operations no runtime Vercel", () => {
  afterEach(() => cleanup());

  it("oferece à equipe um atalho para registrar uma despesa em rascunho", async () => {
    render(<Operations />);

    expect((await screen.findByRole("link", { name: "Registrar despesa" })).getAttribute("href")).toBe("/operacao/despesas");
    expect(screen.getByText("Lançamentos seguem como rascunho até revisão administrativa.")).toBeTruthy();
  });

  it("oferece à equipe um retorno explícito para a gestão administrativa", async () => {
    render(<Operations />);

    expect((await screen.findByRole("link", { name: "Gestão administrativa" })).getAttribute("href")).toBe("/admin");
  });

  it("oferece à equipe um atalho interno para o PDV de balcão", async () => {
    render(<Operations />);

    expect((await screen.findByRole("link", { name: "Abrir PDV de balcão" })).getAttribute("href")).toBe("/operacao/pdv");
  });

  it("oferece à equipe um atalho para a tela de cozinha", async () => {
    render(<Operations />);

    expect((await screen.findByRole("link", { name: "Abrir tela de cozinha" })).getAttribute("href")).toBe("/operacao/cozinha");
  });

  it("oferece à equipe um atalho para consultar o estoque", async () => {
    render(<Operations />);

    expect((await screen.findByRole("link", { name: "Abrir estoque" })).getAttribute("href")).toBe("/operacao/estoque");
  });

  it("mantém o pedido pendente e mostra o erro quando o reconhecimento falha", async () => {
    mocks.acknowledgeAlert.mockRejectedValueOnce(new Error("Serviço indisponível"));
    render(<Operations />);

    expect(await screen.findByText("Pendente")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Reconhecer pedido" }));

    expect((await screen.findByRole("alert")).textContent).toContain("Serviço indisponível");
    expect(screen.getByText("Pendente")).toBeTruthy();
    expect(mocks.acknowledgeAlert).toHaveBeenCalledWith("18e59e53-81f3-494d-90b9-420dbe4a0892");
    expect(mocks.legacyAcknowledge).not.toHaveBeenCalled();
  });
});
