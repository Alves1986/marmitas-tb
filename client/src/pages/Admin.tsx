import { useCallback, useEffect, useState } from "react";
import { useLocation } from "wouter";
import { BarChart3, ClipboardList, LayoutDashboard, ListChecks, ReceiptText, Settings2, ShieldCheck, UsersRound, UtensilsCrossed } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { AdminDashboardOverview } from "@/components/admin/AdminDashboardOverview";
import { AdminOperationsOverview } from "@/components/admin/AdminOperationsOverview";
import { ExpenseDraftForm } from "@/components/admin/ExpenseDraftForm";
import { ExpenseReviewQueue } from "@/components/admin/ExpenseReviewQueue";
import { FinanceAuditLog } from "@/components/admin/FinanceAuditLog";
import { FinanceReportActions } from "@/components/admin/FinanceReportActions";
import { MenuManager } from "@/components/admin/MenuManager";
import { StaffManager } from "@/components/admin/StaffManager";
import { StoreSettingsForm } from "@/components/admin/StoreSettingsForm";
import { createVercelAdminService, type AdminExpenseForReview, type AdminExpenseInput, type AdminExpenseReview, type AdminFinanceAuditLog, type AdminFinanceSummary } from "@/services/adminService";
import { createVercelOperationsService, type VercelOperationalOrder } from "@/services/operationsService";
import { canManageCatalog, type OperationalRole } from "@shared/permissions";

function currentMonthPeriod() {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  return {
    from: firstDay.toISOString().slice(0, 10),
    to: now.toISOString().slice(0, 10),
  };
}

export const adminModuleLinks = [
  ["Visão geral", "#admin-overview"],
  ["Pedidos", "/operacao"],
  ["Financeiro", "#admin-finance"],
  ["Revisões", "#admin-reviews"],
  ["Auditoria", "#admin-audit"],
  ["Relatórios", "#admin-reports"],
  ["Cardápio", "#admin-catalog"],
  ["Equipe", "#admin-team"],
  ["Configurações", "#admin-settings"],
] as const;

export type AdminModuleKey = "overview" | "orders" | "finance" | "reviews" | "audit" | "reports" | "catalog" | "team" | "settings";

const adminModules: Array<{ id: AdminModuleKey; label: string; icon: typeof LayoutDashboard }> = [
  { id: "overview", label: "Visão geral", icon: LayoutDashboard },
  { id: "orders", label: "Pedidos", icon: ClipboardList },
  { id: "finance", label: "Financeiro", icon: ReceiptText },
  { id: "reviews", label: "Revisões", icon: ListChecks },
  { id: "audit", label: "Auditoria", icon: ShieldCheck },
  { id: "reports", label: "Relatórios", icon: BarChart3 },
  { id: "catalog", label: "Cardápio", icon: UtensilsCrossed },
  { id: "team", label: "Equipe", icon: UsersRound },
  { id: "settings", label: "Configurações", icon: Settings2 },
];

export function AdminModuleNavigation({
  activeModule,
  onSelectModule,
}: {
  activeModule: AdminModuleKey;
  onSelectModule: (module: AdminModuleKey) => void;
}) {
  return (
    <nav aria-label="Módulos administrativos" className="rounded-2xl border border-[#ead7bc] bg-[#fffaf1] p-2 shadow-sm xl:sticky xl:top-5 xl:self-start">
      <p className="px-3 pb-2 pt-1 text-xs font-extrabold uppercase tracking-[0.14em] text-[#68703d]">Gestão</p>
      <div className="flex gap-1 overflow-x-auto pb-1 xl:flex-col xl:overflow-visible">
        {adminModules.map(({ id, label, icon: Icon }) => {
          const isActive = activeModule === id;
          return (
            <button
              key={id}
              type="button"
              aria-current={isActive ? "page" : undefined}
              onClick={() => onSelectModule(id)}
              className={`flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-[#b52a25] ${isActive ? "bg-[#f4eadb] text-[#481e1f] shadow-sm" : "text-[#6b4c42] hover:bg-[#fff3df] hover:text-[#481e1f]"}`}
            >
              <Icon aria-hidden="true" className="size-4 shrink-0" />
              <span>{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function AdminFinanceDashboard({ activeModule }: { activeModule: Extract<AdminModuleKey, "overview" | "orders" | "finance" | "reviews" | "audit" | "reports"> }) {
  const [summary, setSummary] = useState<AdminFinanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string>();
  const [expensePending, setExpensePending] = useState(false);
  const [expenseErrorMessage, setExpenseErrorMessage] = useState<string>();
  const [expenseSuccessMessage, setExpenseSuccessMessage] = useState<string>();
  const [reviewExpenses, setReviewExpenses] = useState<AdminExpenseForReview[]>([]);
  const [reviewPendingId, setReviewPendingId] = useState<string>();
  const [reviewErrorMessage, setReviewErrorMessage] = useState<string>();
  const [auditLogs, setAuditLogs] = useState<AdminFinanceAuditLog[]>([]);
  const [auditErrorMessage, setAuditErrorMessage] = useState<string>();
  const [orders, setOrders] = useState<VercelOperationalOrder[] | null>(null);
  const [ordersErrorMessage, setOrdersErrorMessage] = useState<string>();
  const period = currentMonthPeriod();

  const loadFinance = useCallback(async () => {
    setLoading(true);
    setErrorMessage(undefined);
    setReviewErrorMessage(undefined);
    setAuditErrorMessage(undefined);
    setOrdersErrorMessage(undefined);
    const service = createVercelAdminService();
    const [summaryResult, reviewResult, auditResult, ordersResult] = await Promise.allSettled([
      service.getFinance(period),
      service.listReviewExpenses(),
      service.listFinanceAudit(),
      createVercelOperationsService().listOrders(),
    ]);
    if (summaryResult.status === "fulfilled") {
      setSummary(summaryResult.value);
    } else {
      setSummary(null);
      setErrorMessage("Não foi possível carregar o resumo financeiro agora. Verifique a conexão e tente novamente.");
    }
    if (reviewResult.status === "fulfilled") setReviewExpenses(reviewResult.value.expenses);
    else setReviewErrorMessage("Não foi possível carregar a fila de revisão agora. Tente novamente.");
    if (auditResult.status === "fulfilled") setAuditLogs(auditResult.value.auditLogs);
    else setAuditErrorMessage("Não foi possível carregar a auditoria financeira agora. Tente novamente.");
    if (ordersResult.status === "fulfilled") setOrders(ordersResult.value);
    else {
      setOrders(null);
      setOrdersErrorMessage("Não foi possível carregar a situação operacional agora. Tente novamente.");
    }
    setLoading(false);
  }, [period.from, period.to]);

  useEffect(() => {
    void loadFinance();
  }, [loadFinance]);

  const submitExpense = useCallback(async (expense: AdminExpenseInput) => {
    setExpensePending(true);
    setExpenseErrorMessage(undefined);
    setExpenseSuccessMessage(undefined);
    try {
      await createVercelAdminService().createExpense(expense);
      setExpenseSuccessMessage("Despesa enviada como rascunho para aprovação administrativa.");
      await loadFinance();
    } catch {
      setExpenseErrorMessage("Não foi possível registrar a despesa agora. Verifique a conexão e tente novamente.");
    } finally {
      setExpensePending(false);
    }
  }, [loadFinance]);

  const reviewExpense = useCallback(async (review: AdminExpenseReview) => {
    setReviewPendingId(review.expenseId);
    setReviewErrorMessage(undefined);
    try {
      await createVercelAdminService().reviewExpense(review);
      await loadFinance();
    } catch {
      setReviewErrorMessage("Não foi possível concluir a revisão agora. Verifique a conexão e tente novamente.");
    } finally {
      setReviewPendingId(undefined);
    }
  }, [loadFinance]);

  if (activeModule === "overview") {
    return <div id="admin-overview" className="space-y-3"><AdminDashboardOverview summary={summary} loading={loading} errorMessage={errorMessage} />{errorMessage ? <button type="button" onClick={() => void loadFinance()} className="rounded-xl border border-[#b52a25] bg-white px-4 py-2 text-sm font-semibold text-[#8e2522] transition hover:bg-[#fff5f3] active:scale-[0.97]">Tentar novamente</button> : null}</div>;
  }
  if (activeModule === "orders") {
    return <div id="admin-orders" className="space-y-4"><AdminOperationsOverview orders={orders} loading={loading} errorMessage={ordersErrorMessage} /><a href="/operacao" className="inline-flex min-h-11 items-center rounded-xl bg-[#481e1f] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#6b2e2f]">Abrir fila operacional</a></div>;
  }
  if (activeModule === "finance") return <div id="admin-finance"><ExpenseDraftForm onSubmit={(expense) => void submitExpense(expense)} pending={expensePending} errorMessage={expenseErrorMessage} successMessage={expenseSuccessMessage} /></div>;
  if (activeModule === "reviews") return <div id="admin-reviews"><ExpenseReviewQueue expenses={reviewExpenses} onReview={reviewExpense} pendingId={reviewPendingId} errorMessage={reviewErrorMessage} /></div>;
  if (activeModule === "audit") return <div id="admin-audit"><FinanceAuditLog auditLogs={auditLogs} loading={loading} errorMessage={auditErrorMessage} /></div>;
  return <div id="admin-reports"><FinanceReportActions summary={summary} /></div>;
}

export function AdminView({ actorRole }: { actorRole: OperationalRole }) {
  const [activeModule, setActiveModule] = useState<AdminModuleKey>("overview");
  if (!canManageCatalog(actorRole)) {
    return (
      <section className="mx-auto max-w-lg rounded-3xl border border-[#ead7bc] bg-[#fffaf1] p-8 text-center text-[#481e1f] shadow-sm">
        <h1 className="font-display text-3xl font-semibold">Acesso administrativo necessário</h1>
        <p className="mt-3 text-sm leading-6 text-[#6b4c42]">Somente administradores podem gerenciar o cardápio, a equipe e as configurações da Marmitas TB.</p>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-6xl space-y-6 text-[#481e1f]">
      <header className="rounded-3xl bg-[#481e1f] p-6 text-[#fffaf1] shadow-lg md:p-8">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#ffc94f]">Gestão Marmitas TB</p>
        <h1 className="mt-2 font-display text-3xl font-semibold md:text-4xl">Administração da loja</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[#f3dcc7]">Atualize o cardápio, mantenha a equipe preparada e configure a operação de pedidos em um único lugar.</p>
      </header>

      <div className="grid gap-6 xl:grid-cols-[15rem_minmax(0,1fr)]">
        <AdminModuleNavigation activeModule={activeModule} onSelectModule={setActiveModule} />
        <div className="min-w-0" aria-live="polite">
          {activeModule === "catalog" ? <div id="admin-catalog"><MenuManager /></div> : null}
          {activeModule === "team" ? <div id="admin-team"><StaffManager /></div> : null}
          {activeModule === "settings" ? <div id="admin-settings"><StoreSettingsForm /></div> : null}
          {(["overview", "orders", "finance", "reviews", "audit", "reports"] as const).includes(activeModule as "overview" | "orders" | "finance" | "reviews" | "audit" | "reports") ? <AdminFinanceDashboard activeModule={activeModule as Extract<AdminModuleKey, "overview" | "orders" | "finance" | "reviews" | "audit" | "reports">} /> : null}
        </div>
      </div>
    </section>
  );
}

export function getAdminRedirectTarget(role: OperationalRole | undefined): string | null {
  return role === "admin" ? null : "/acesso";
}

export default function Admin() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    const redirectTarget = getAdminRedirectTarget(user?.role);
    if (!loading && redirectTarget) setLocation(redirectTarget);
  }, [loading, setLocation, user?.role]);

  if (loading || user?.role !== "admin") return null;

  return (
    <DashboardLayout>
      <AdminView actorRole="admin" />
    </DashboardLayout>
  );
}
