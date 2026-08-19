// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AdminView } from "@/pages/Admin";
import { CategoryManagerList, formatPriceForEditor, parsePriceFromEditor, ProductImagePreview } from "./MenuManager";
import { StaffManagerView } from "./StaffManager";
import { StoreSettingsFormView } from "./StoreSettingsForm";
import { dashboardMenuItems, MobileSessionActions } from "@/components/DashboardLayout";
import { ExpenseDraftForm } from "./ExpenseDraftForm";
import { buildFinanceCsv } from "./FinanceReportActions";

afterEach(cleanup);

describe("AdminView", () => {
  it("expõe atalhos internos explícitos para administração, fila e cardápio", () => {
    expect(dashboardMenuItems.map((item) => item.label)).toEqual(["Administração", "Fila operacional", "Cardápio público"]);
  });

  it("oferece identificação de sessão e logout visível no cabeçalho móvel", () => {
    const onLogout = vi.fn();
    render(<MobileSessionActions userName="Cássia" onLogout={onLogout} />);

    expect(screen.getByText(/sessão: cássia/i)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /sair da sessão/i }));
    expect(onLogout).toHaveBeenCalledTimes(1);
  });

  it("não renderiza o editor de cardápio para membro da equipe operacional", () => {
    render(<AdminView actorRole="staff" />);

    expect(screen.getByText(/acesso administrativo necessário/i)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /novo produto/i })).toBeNull();
  });

  it("apresenta uma visão geral com receitas, despesas e caixa sem valores simulados", async () => {
    const dashboardModulePath = "./AdminDashboardOverview";
    const dashboardModule = await import(dashboardModulePath).catch(() => null);

    expect(dashboardModule).not.toBeNull();
    const AdminDashboardOverview = (dashboardModule as { AdminDashboardOverview: any }).AdminDashboardOverview;
    render(<AdminDashboardOverview summary={null} />);

    expect(screen.getByRole("heading", { name: /visão geral/i })).toBeTruthy();
    expect(screen.getByText(/faturamento confirmado/i)).toBeTruthy();
    expect(screen.getAllByText(/despesas aprovadas/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/caixa líquido/i)).toBeTruthy();
    expect(screen.getByText(/aguardando dados financeiros reais/i)).toBeTruthy();
  });

  it("registra uma despesa financeira como rascunho com valor convertido em centavos", () => {
    const onSubmit = vi.fn();
    render(<ExpenseDraftForm onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText(/descrição da despesa/i), { target: { value: "Gás da cozinha" } });
    fireEvent.change(screen.getByLabelText(/categoria da despesa/i), { target: { value: "Insumos" } });
    fireEvent.change(screen.getByLabelText(/valor da despesa/i), { target: { value: "120,00" } });
    fireEvent.change(screen.getByLabelText(/data da despesa/i), { target: { value: "2026-08-19" } });
    fireEvent.click(screen.getByRole("button", { name: /enviar para aprovação/i }));

    expect(onSubmit).toHaveBeenCalledWith({ description: "Gás da cozinha", category: "Insumos", amountInCents: 12000, incurredOn: "2026-08-19", notes: undefined });
  });

  it("gera CSV financeiro a partir do resumo real e da composição por pagamento", () => {
    const csv = buildFinanceCsv({
      period: { from: "2026-08-01", to: "2026-08-19" }, revenueInCents: 30000, expenseInCents: 12000, netCashInCents: 18000,
      confirmedOrderCount: 3, averageTicketInCents: 10000, paymentBreakdown: [{ paymentMethod: "pix", amountInCents: 20000, orderCount: 2 }],
    });

    expect(csv).toContain('"Faturamento confirmado";"R$ 300,00"');
    expect(csv).toContain('"PIX";"R$ 200,00";"2"');
    expect(csv).not.toContain("estimado");
  });

  it("converte valores em reais para centavos no editor de cardápio", () => {
    expect(formatPriceForEditor(4590)).toBe("45,90");
    expect(parsePriceFromEditor("45,90")).toBe(4590);
  });

  it("oculta uma categoria existente preservando sua identidade e ordenação", () => {
    const onSaveCategory = vi.fn();
    render(<CategoryManagerList categories={[{ id: 3, name: "Marmitas", slug: "marmitas", sortOrder: 2, isActive: true }]} onSaveCategory={onSaveCategory} />);

    fireEvent.click(screen.getByRole("button", { name: /ocultar categoria/i }));
    expect(onSaveCategory).toHaveBeenCalledWith({ id: 3, name: "Marmitas", slug: "marmitas", sortOrder: 2, isActive: false });
  });

  it("atualiza nome e ordenação de uma categoria existente", () => {
    const onSaveCategory = vi.fn();
    render(<CategoryManagerList categories={[{ id: 3, name: "Marmitas", slug: "marmitas", sortOrder: 2, isActive: true }]} onSaveCategory={onSaveCategory} />);

    fireEvent.click(screen.getByRole("button", { name: /editar categoria/i }));
    fireEvent.change(screen.getByLabelText(/nome da categoria marmitas/i), { target: { value: "Marmitas do dia" } });
    fireEvent.change(screen.getByLabelText(/ordem da categoria marmitas/i), { target: { value: "5" } });
    fireEvent.click(screen.getByRole("button", { name: /salvar categoria/i }));
    expect(onSaveCategory).toHaveBeenCalledWith({ id: 3, name: "Marmitas do dia", slug: "marmitas-do-dia", sortOrder: 5, isActive: true });
  });

  it("pré-visualiza a foto configurada para o produto antes de salvar", () => {
    render(<ProductImagePreview productName="Marmita especial" imageUrl="/manus-storage/marmita-especial.jpg" />);
    const image = screen.getByRole("img", { name: /prévia da foto de marmita especial/i });
    expect(image.getAttribute("src")).toBe("/manus-storage/marmita-especial.jpg");
  });

  it.each([
    ["Sem acesso", "user"],
    ["Operação", "staff"],
    ["Administrador", "admin"],
  ] as const)("atribui %s ao usuário", (_label, role) => {
    const onUpdateRole = vi.fn();
    render(<StaffManagerView members={[{ id: 7, name: "Joana", email: "joana@tb.local", role: "user", lastSignedIn: new Date() }]} onUpdateRole={onUpdateRole} />);

    fireEvent.change(screen.getByLabelText(/papel de joana/i), { target: { value: role } });
    expect(onUpdateRole).toHaveBeenCalledWith({ userId: 7, role });
  });

  it("informa que a atualização de papel está em andamento", () => {
    render(<StaffManagerView members={[{ id: 7, name: "Joana", email: "joana@tb.local", role: "staff", lastSignedIn: new Date() }]} onUpdateRole={vi.fn()} pending />);

    expect(screen.getByText(/salvando acesso/i)).toBeTruthy();
    expect(screen.getByLabelText(/papel de joana/i)).toHaveProperty("disabled", true);
  });

  it("apresenta uma falha de atualização sem ocultar a equipe", () => {
    render(<StaffManagerView members={[{ id: 7, name: "Joana", email: "joana@tb.local", role: "staff", lastSignedIn: new Date() }]} onUpdateRole={vi.fn()} errorMessage="Não foi possível atualizar o acesso." />);

    expect(screen.getByRole("alert").textContent).toMatch(/não foi possível atualizar o acesso/i);
    expect(screen.getByText("Joana")).toBeTruthy();
  });

  it("converte a taxa de entrega em reais antes de salvar configurações", () => {
    const onSave = vi.fn();
    render(<StoreSettingsFormView settings={{ storeName: "Marmitas TB", deliveryFeeInCents: 500, openingHours: "Segunda a sábado", paymentMode: "test", autoPrint: true }} onSave={onSave} />);

    fireEvent.change(screen.getByLabelText(/taxa de entrega/i), { target: { value: "7,50" } });
    fireEvent.click(screen.getByRole("button", { name: /salvar configurações/i }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ deliveryFeeInCents: 750, paymentMode: "test" }));
  });
});
