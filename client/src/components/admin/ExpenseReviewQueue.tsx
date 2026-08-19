import { CheckCircle2, CircleAlert, ClipboardCheck, XCircle } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AdminExpenseForReview, AdminExpenseReview } from "@/services/adminService";

type ExpenseReviewQueueProps = {
  expenses: AdminExpenseForReview[];
  onReview: (review: AdminExpenseReview) => void | Promise<void>;
  pendingId?: string;
  errorMessage?: string;
};

function formatCurrency(amountInCents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(amountInCents / 100);
}

export function ExpenseReviewQueue({ expenses, onReview, pendingId, errorMessage }: ExpenseReviewQueueProps) {
  const [reasons, setReasons] = useState<Record<string, string>>({});

  return (
    <section aria-labelledby="expense-review-title" className="rounded-3xl border border-[#e4d5bd] bg-white p-5 shadow-[0_12px_34px_rgba(72,30,31,0.07)] sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#68703d]">Controle financeiro</p>
          <h2 id="expense-review-title" className="mt-1 font-display text-2xl font-bold text-[#481e1f]">Despesas aguardando revisão</h2>
          <p className="mt-2 text-sm leading-6 text-[#765f50]">Apenas despesas aprovadas passam a compor o fluxo de caixa.</p>
        </div>
        <span className="rounded-full bg-[#fff3dc] px-3 py-1.5 text-sm font-bold text-[#795925]">{expenses.length} pendente{expenses.length === 1 ? "" : "s"}</span>
      </div>

      {errorMessage ? <p role="alert" className="mt-5 rounded-xl border border-[#f1c7c7] bg-[#fff1f1] px-4 py-3 text-sm text-[#9c2f2c]">{errorMessage}</p> : null}

      {expenses.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-[#dcccb2] bg-[#fffaf1] p-6 text-center">
          <ClipboardCheck aria-hidden="true" className="mx-auto size-7 text-[#68703d]" />
          <p className="mt-3 font-semibold text-[#481e1f]">Nenhuma despesa pendente de revisão.</p>
          <p className="mt-1 text-sm text-[#765f50]">Novos lançamentos da equipe aparecerão aqui como rascunho.</p>
        </div>
      ) : (
        <ul className="mt-5 space-y-4">
          {expenses.map((expense) => {
            const reason = reasons[expense.id] ?? "";
            const isPending = pendingId === expense.id;
            const expenseName = expense.description || "Despesa sem descrição";
            return (
              <li key={expense.id} className="rounded-2xl border border-[#eadfcd] bg-[#fffdf8] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-[#481e1f]">{expenseName}</h3>
                    <p className="mt-1 text-sm text-[#765f50]">{expense.category || "Sem categoria"} · {new Date(`${expense.incurredOn}T12:00:00`).toLocaleDateString("pt-BR")}</p>
                  </div>
                  <strong className="text-lg text-[#481e1f]">{formatCurrency(expense.amountInCents)}</strong>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-center">
                  <Input aria-label={`Motivo da rejeição da despesa ${expenseName}`} value={reason} onChange={(event) => setReasons((current) => ({ ...current, [expense.id]: event.target.value }))} placeholder="Motivo obrigatório para rejeitar" disabled={isPending} />
                  <Button type="button" variant="outline" className="border-[#bd5148] text-[#a82926] hover:bg-[#fff1ee]" onClick={() => void onReview({ expenseId: expense.id, decision: "rejected", rejectionReason: reason.trim() })} disabled={isPending || reason.trim().length < 2} aria-label={`Rejeitar despesa ${expenseName}`}><XCircle aria-hidden="true" className="mr-2 size-4" />Rejeitar</Button>
                  <Button type="button" className="bg-[#68703d] text-white hover:bg-[#535b30]" onClick={() => void onReview({ expenseId: expense.id, decision: "approved" })} disabled={isPending} aria-label={`Aprovar despesa ${expenseName}`}><CheckCircle2 aria-hidden="true" className="mr-2 size-4" />Aprovar</Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
