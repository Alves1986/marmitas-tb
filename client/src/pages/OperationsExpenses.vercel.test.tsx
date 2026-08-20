// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/_core/hooks/useAuth", () => ({
  useAuth: () => ({ loading: false, user: { id: "operator-1", role: "staff" } }),
}));
vi.mock("@/components/admin/ExpenseDraftForm", () => ({
  ExpenseDraftForm: () => <div>Formulário de despesa</div>,
}));
vi.mock("@/services/adminService", () => ({
  createVercelAdminService: () => ({ createExpense: vi.fn() }),
}));
vi.mock("./Operations", () => ({
  OperationsAccessGate: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import OperationsExpenses from "./OperationsExpenses";

describe("OperationsExpenses no runtime Vercel", () => {
  afterEach(() => cleanup());

  it("oferece retornos distintos para a gestão e para a fila operacional", () => {
    render(<OperationsExpenses />);

    expect(screen.getByRole("link", { name: "Gestão administrativa" }).getAttribute("href")).toBe("/admin");
    expect(screen.getByRole("link", { name: "Voltar para a fila" }).getAttribute("href")).toBe("/operacao");
  });
});
