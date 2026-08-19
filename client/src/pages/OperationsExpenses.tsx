import { ArrowLeft, ClipboardList, LogIn } from "lucide-react";
import { useState } from "react";
import { canAccessOperation } from "@shared/permissions";
import { ExpenseDraftForm } from "@/components/admin/ExpenseDraftForm";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/_core/hooks/useAuth";
import { createVercelAdminService, type AdminExpenseInput } from "@/services/adminService";
import { OperationsAccessGate } from "./Operations";

function failureMessage(error: unknown) {
  return error instanceof Error ? error.message : "Não foi possível registrar a despesa. Tente novamente.";
}

export default function OperationsExpenses() {
  const { user, loading } = useAuth();
  const [pending, setPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>();
  const [successMessage, setSuccessMessage] = useState<string>();
  const role = user?.role ?? null;

  async function submitExpense(expense: AdminExpenseInput) {
    setPending(true);
    setErrorMessage(undefined);
    setSuccessMessage(undefined);
    try {
      await createVercelAdminService().createExpense(expense);
      setSuccessMessage("Despesa enviada como rascunho para aprovação administrativa.");
    } catch (error) {
      setErrorMessage(failureMessage(error));
    } finally {
      setPending(false);
    }
  }

  if (loading) {
    return <main className="grid min-h-screen place-items-center bg-[#fffaf1]"><ClipboardList aria-label="Carregando despesas" className="size-8 animate-pulse text-[#a82926]" /></main>;
  }

  if (!user) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#fffaf1] p-6 text-center">
        <section className="max-w-md rounded-3xl border border-[#ead9c0] bg-white p-8 shadow-[0_18px_50px_rgba(72,30,31,0.10)]">
          <LogIn aria-hidden="true" className="mx-auto size-9 text-[#68703d]" />
          <h1 className="mt-4 font-display text-3xl font-bold text-[#481e1f]">Acesso da equipe</h1>
          <p className="mt-3 text-sm leading-6 text-[#765f50]">Entre com uma conta autorizada para registrar despesas da operação.</p>
          <Button asChild className="mt-6 bg-[#a82926] text-white hover:bg-[#7e1f1d]"><a href="/acesso">Entrar para operar</a></Button>
        </section>
      </main>
    );
  }

  return (
    <OperationsAccessGate role={role}>
      <main className="min-h-screen bg-[#fffaf1] text-[#481e1f]">
        <header className="border-b border-[#ead9c0] bg-white/80 backdrop-blur">
          <div className="container flex min-h-20 flex-wrap items-center justify-between gap-4 py-4">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.15em] text-[#68703d]">Marmitas TB · equipe</p>
              <h1 className="mt-1 font-display text-3xl font-bold">Registro de despesas da equipe</h1>
            </div>
            <Button asChild variant="outline" className="border-[#c9b28f] text-[#481e1f] hover:bg-[#fff5df]"><a href="/operacao"><ArrowLeft aria-hidden="true" className="mr-2 size-4" />Voltar para a fila</a></Button>
          </div>
        </header>
        <div className="container max-w-3xl py-7">
          <p className="mb-5 rounded-xl border border-[#ead7bc] bg-[#fff7e8] px-4 py-3 text-sm leading-6 text-[#6b4c42]">Todo lançamento começa como rascunho e só entra no fluxo de caixa depois da aprovação de um administrador.</p>
          <ExpenseDraftForm onSubmit={submitExpense} pending={pending} errorMessage={errorMessage} successMessage={successMessage} />
        </div>
      </main>
    </OperationsAccessGate>
  );
}
