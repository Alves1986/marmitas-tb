import type { AdminFinanceSummary } from "@/services/adminService";

function formatCurrency(valueInCents: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valueInCents / 100);
}

type FinancialMetricProps = {
  label: string;
  value: string;
  detail: string;
  tone: "wine" | "olive" | "gold";
};

function FinancialMetric({ label, value, detail, tone }: FinancialMetricProps) {
  const tones = {
    wine: "border-[#6f2828] bg-[#fff9f3] text-[#481e1f]",
    olive: "border-[#66733c] bg-[#fbfdef] text-[#33401e]",
    gold: "border-[#dba933] bg-[#fff9e5] text-[#61430d]",
  };

  return (
    <article className={`rounded-2xl border p-5 shadow-sm ${tones[tone]}`}>
      <p className="text-xs font-bold uppercase tracking-[0.14em] opacity-75">{label}</p>
      <p className="mt-2 font-display text-3xl font-semibold tracking-tight">{value}</p>
      <p className="mt-2 text-sm leading-5 opacity-80">{detail}</p>
    </article>
  );
}

export function AdminDashboardOverview({
  summary,
  loading = false,
  errorMessage,
}: {
  summary: AdminFinanceSummary | null;
  loading?: boolean;
  errorMessage?: string;
}) {
  const paymentMaximum = Math.max(...(summary?.paymentBreakdown.map((item) => item.amountInCents) ?? []), 1);

  return (
    <section aria-labelledby="admin-overview-title" className="space-y-5">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#66733c]">Painel executivo</p>
          <h2 id="admin-overview-title" className="mt-1 font-display text-3xl font-semibold text-[#481e1f]">Visão geral</h2>
        </div>
        {summary ? <p className="text-sm text-[#6b4c42]">Período: {summary.period.from.split("-").reverse().join("/")} a {summary.period.to.split("-").reverse().join("/")}</p> : null}
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <FinancialMetric
          label="Faturamento confirmado"
          value={summary ? formatCurrency(summary.revenueInCents) : "—"}
          detail={summary ? `${summary.confirmedOrderCount} pedido${summary.confirmedOrderCount === 1 ? "" : "s"} com pagamento confirmado.` : "Entradas de pedidos efetivamente confirmados."}
          tone="wine"
        />
        <FinancialMetric
          label="Despesas aprovadas"
          value={summary ? formatCurrency(summary.expenseInCents) : "—"}
          detail="Somente lançamentos revisados pela administração entram no caixa."
          tone="gold"
        />
        <FinancialMetric
          label="Caixa líquido"
          value={summary ? formatCurrency(summary.netCashInCents) : "—"}
          detail={summary ? `Ticket médio confirmado: ${formatCurrency(summary.averageTicketInCents)}.` : "Receitas confirmadas menos despesas aprovadas."}
          tone="olive"
        />
      </div>

      {loading ? <p role="status" className="rounded-2xl border border-[#ead7bc] bg-[#fffaf1] px-5 py-4 text-sm text-[#6b4c42]">Carregando dados financeiros reais...</p> : null}
      {errorMessage ? <p role="alert" className="rounded-2xl border border-[#f1c5c5] bg-[#fff3f3] px-5 py-4 text-sm text-[#9f2424]">{errorMessage}</p> : null}
      {!loading && !errorMessage && !summary ? <p className="rounded-2xl border border-dashed border-[#d8c8a9] bg-[#fffdf7] px-5 py-4 text-sm leading-6 text-[#6b4c42]">Aguardando dados financeiros reais. Assim que houver pagamentos confirmados ou despesas aprovadas no período, os indicadores serão atualizados aqui.</p> : null}

      {summary ? (
        <article className="rounded-2xl border border-[#ead7bc] bg-[#fffaf1] p-5 shadow-sm">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
            <div>
              <h3 className="font-display text-2xl font-semibold text-[#481e1f]">Receitas por pagamento</h3>
              <p className="mt-1 text-sm text-[#6b4c42]">Composição dos pagamentos confirmados no período.</p>
            </div>
            <p className="text-sm font-semibold text-[#66733c]">{summary.paymentBreakdown.reduce((count, item) => count + item.orderCount, 0)} pedidos</p>
          </div>
          {summary.paymentBreakdown.length ? (
            <div className="mt-5 space-y-4">
              {summary.paymentBreakdown.map((item) => (
                <div key={item.paymentMethod}>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-medium capitalize text-[#481e1f]">{item.paymentMethod.replaceAll("_", " ")}</span>
                    <span className="font-semibold text-[#481e1f]">{formatCurrency(item.amountInCents)}</span>
                  </div>
                  <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-[#eadfce]" aria-label={`${item.paymentMethod}: ${formatCurrency(item.amountInCents)}`}>
                    <div className="h-full rounded-full bg-[#b52a25]" style={{ width: `${Math.max(6, Math.round((item.amountInCents / paymentMaximum) * 100))}%` }} />
                  </div>
                </div>
              ))}
            </div>
          ) : <p className="mt-5 text-sm text-[#6b4c42]">Nenhum pagamento confirmado foi encontrado neste período.</p>}
        </article>
      ) : null}
    </section>
  );
}
