import type { AdminFinanceSummary } from "@/services/adminService";

function formatCurrency(valueInCents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valueInCents / 100);
}

function csvValue(value: string | number) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

export function buildFinanceCsv(summary: AdminFinanceSummary) {
  const rows: Array<Array<string | number>> = [
    ["Relatório financeiro Marmitas TB"],
    ["Período", `${summary.period.from} a ${summary.period.to}`],
    [],
    ["Indicador", "Valor"],
    ["Faturamento confirmado", formatCurrency(summary.revenueInCents)],
    ["Despesas aprovadas", formatCurrency(summary.expenseInCents)],
    ["Caixa líquido", formatCurrency(summary.netCashInCents)],
    ["Pedidos confirmados", summary.confirmedOrderCount],
    ["Ticket médio", formatCurrency(summary.averageTicketInCents)],
    [],
    ["Forma de pagamento", "Receita", "Pedidos"],
    ...summary.paymentBreakdown.map((entry) => [entry.paymentMethod.toUpperCase(), formatCurrency(entry.amountInCents), entry.orderCount]),
  ];
  return rows.map((row) => row.map(csvValue).join(";")).join("\n");
}

function downloadFinanceCsv(summary: AdminFinanceSummary) {
  const content = `\uFEFF${buildFinanceCsv(summary)}`;
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `relatorio-financeiro-${summary.period.from}-a-${summary.period.to}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function FinanceReportActions({ summary }: { summary: AdminFinanceSummary | null }) {
  const disabled = !summary;
  return (
    <section className="rounded-3xl border border-[#ead7bc] bg-white p-5 shadow-sm print:hidden" aria-labelledby="finance-reports-heading">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#7d8738]">Relatórios</p>
      <h2 id="finance-reports-heading" className="mt-1 font-display text-2xl font-semibold text-[#481e1f]">Exportar visão financeira</h2>
      <p className="mt-1 text-sm leading-6 text-[#6b4c42]">As exportações usam exclusivamente o período e os valores carregados acima.</p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <button type="button" onClick={() => summary && downloadFinanceCsv(summary)} disabled={disabled} className="rounded-xl bg-[#481e1f] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#633033] active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60">Baixar CSV</button>
        <button type="button" onClick={() => window.print()} disabled={disabled} className="rounded-xl border border-[#b52a25] bg-white px-4 py-2.5 text-sm font-bold text-[#8e2522] transition hover:bg-[#fff5f3] active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60">Imprimir / salvar PDF</button>
      </div>
    </section>
  );
}
