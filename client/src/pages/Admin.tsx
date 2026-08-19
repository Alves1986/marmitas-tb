import { useCallback, useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { AdminDashboardOverview } from "@/components/admin/AdminDashboardOverview";
import { ExpenseDraftForm } from "@/components/admin/ExpenseDraftForm";
import { FinanceReportActions } from "@/components/admin/FinanceReportActions";
import { MenuManager } from "@/components/admin/MenuManager";
import { StaffManager } from "@/components/admin/StaffManager";
import { StoreSettingsForm } from "@/components/admin/StoreSettingsForm";
import { createVercelAdminService, type AdminExpenseInput, type AdminFinanceSummary } from "@/services/adminService";
import { canManageCatalog, type OperationalRole } from "@shared/permissions";

function currentMonthPeriod() {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  return {
    from: firstDay.toISOString().slice(0, 10),
    to: now.toISOString().slice(0, 10),
  };
}

function AdminFinanceDashboard() {
  const [summary, setSummary] = useState<AdminFinanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string>();
  const [expensePending, setExpensePending] = useState(false);
  const [expenseErrorMessage, setExpenseErrorMessage] = useState<string>();
  const [expenseSuccessMessage, setExpenseSuccessMessage] = useState<string>();
  const period = currentMonthPeriod();

  const loadFinance = useCallback(async () => {
    setLoading(true);
    setErrorMessage(undefined);
    try {
      setSummary(await createVercelAdminService().getFinance(period));
    } catch {
      setSummary(null);
      setErrorMessage("Não foi possível carregar o resumo financeiro agora. Verifique a conexão e tente novamente.");
    } finally {
      setLoading(false);
    }
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

  return (
    <div id="admin-overview" className="space-y-3 scroll-mt-24">
      <AdminDashboardOverview summary={summary} loading={loading} errorMessage={errorMessage} />
      {errorMessage ? <button type="button" onClick={() => void loadFinance()} className="rounded-xl border border-[#b52a25] bg-white px-4 py-2 text-sm font-semibold text-[#8e2522] transition hover:bg-[#fff5f3] active:scale-[0.97]">Tentar novamente</button> : null}
      <div id="admin-finance" className="scroll-mt-24">
        <ExpenseDraftForm onSubmit={(expense) => void submitExpense(expense)} pending={expensePending} errorMessage={expenseErrorMessage} successMessage={expenseSuccessMessage} />
      </div>
      <FinanceReportActions summary={summary} />
    </div>
  );
}

export function AdminView({ actorRole }: { actorRole: OperationalRole }) {
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

      <nav aria-label="Módulos administrativos" className="grid grid-cols-2 gap-2 rounded-2xl border border-[#ead7bc] bg-[#fffaf1] p-3 sm:grid-cols-4">
        {[
          ["Visão geral", "#admin-overview"],
          ["Financeiro", "#admin-finance"],
          ["Cardápio", "#admin-catalog"],
          ["Equipe", "#admin-team"],
          ["Configurações", "#admin-settings"],
        ].map(([label, target]) => (
          <a key={label} href={target} className="rounded-xl px-3 py-2 text-center text-sm font-semibold text-[#6b4c42] transition hover:bg-[#f4eadb] hover:text-[#481e1f] focus:outline-none focus:ring-2 focus:ring-[#b52a25]">
            {label}
          </a>
        ))}
      </nav>

      <AdminFinanceDashboard />
      <div id="admin-catalog" className="scroll-mt-24"><MenuManager /></div>
      <div className="grid gap-6 xl:grid-cols-2">
        <div id="admin-team" className="scroll-mt-24"><StaffManager /></div>
        <div id="admin-settings" className="scroll-mt-24"><StoreSettingsForm /></div>
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
