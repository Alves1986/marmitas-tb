import type { AdminFinanceAuditLog } from "@/services/adminService";

const actionLabels: Record<AdminFinanceAuditLog["action"], string> = {
  "expense.approved": "Despesa aprovada",
  "expense.rejected": "Despesa rejeitada",
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

export function FinanceAuditLog({ auditLogs, loading = false, errorMessage }: { auditLogs: AdminFinanceAuditLog[]; loading?: boolean; errorMessage?: string }) {
  return (
    <section id="admin-audit" className="rounded-3xl border border-[#ead7bc] bg-[#fffaf1] p-5 shadow-sm scroll-mt-24 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#77823f]">Rastreabilidade</p>
          <h2 className="mt-1 font-display text-2xl font-semibold text-[#481e1f]">Auditoria financeira</h2>
          <p className="mt-1 text-sm leading-6 text-[#6b4c42]">Decisões reais de aprovação e rejeição registradas pela administração.</p>
        </div>
      </div>
      {loading ? <p className="mt-4 text-sm text-[#6b4c42]">Carregando decisões registradas...</p> : null}
      {errorMessage ? <p className="mt-4 rounded-xl border border-[#efc5c2] bg-[#fff5f3] p-3 text-sm text-[#8e2522]">{errorMessage}</p> : null}
      {!loading && !errorMessage && auditLogs.length === 0 ? <p className="mt-4 rounded-xl border border-dashed border-[#d9c7ab] bg-[#fffdf8] p-4 text-sm text-[#6b4c42]">Ainda não há decisões financeiras registradas neste ambiente.</p> : null}
      {!loading && !errorMessage && auditLogs.length ? (
        <ul className="mt-4 space-y-2" aria-label="Decisões financeiras auditadas">
          {auditLogs.map((item) => (
            <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#ead7bc] bg-white px-4 py-3 text-sm">
              <div>
                <p className="font-semibold text-[#481e1f]">{actionLabels[item.action]}</p>
                <p className="mt-0.5 text-xs text-[#6b4c42]">Responsável: {item.actorName ?? "Não identificado"}</p>
              </div>
              <time dateTime={item.createdAt} className="text-xs text-[#6b4c42]">{formatDateTime(item.createdAt)}</time>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
