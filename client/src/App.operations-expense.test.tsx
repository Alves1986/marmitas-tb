// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("./pages/Home", () => ({ default: () => <div>Cardápio</div> }));
vi.mock("./pages/TrackOrder", () => ({ default: () => <div>Acompanhar pedido</div> }));
vi.mock("./pages/StaffAccess", () => ({ default: () => <div>Acesso da equipe</div> }));
vi.mock("./pages/Operations", () => ({
  default: () => <div>Fila operacional</div>,
  OperationsAccessGate: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock("./pages/Admin", () => ({ default: () => <div>Administração</div> }));
vi.mock("./pages/NotFound", () => ({ default: () => <div>Página não encontrada</div> }));
vi.mock("./_core/hooks/useAuth", () => ({ useAuth: () => ({ loading: false, user: { id: "staff-1", role: "staff" } }) }));
vi.mock("./components/pwa/InstallAppPrompt", () => ({ InstallAppPrompt: () => null }));
vi.mock("./components/pwa/OfflineNotice", () => ({ OfflineNotice: () => null }));

import App from "./App";

describe("rota de despesas operacionais", () => {
  afterEach(() => {
    cleanup();
    window.history.replaceState({}, "", "/");
  });

  it("abre a tela para registrar despesas da equipe", () => {
    window.history.replaceState({}, "", "/operacao/despesas");

    render(<App />);

    expect(screen.getByText("Registro de despesas da equipe")).toBeTruthy();
  });
});
