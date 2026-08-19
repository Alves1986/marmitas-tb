import { ClipboardList } from "lucide-react";

type OperationalOrder = {
  id: string;
  code: string;
  status: string;
};

type AdminOperationsOverviewProps = {
  orders: OperationalOrder[] | null;
  loading?: boolean;
  errorMessage?: string;
};

const statusLabels: Record<string, string> = {
  aguardando_pagamento: "Aguardando pagamento",
  confirmado: "Confirmados",
  em_preparo: "Em preparo",
  saiu_para_entrega: "Em entrega",
  pronto_para_retirada: "Prontos para retirada",
  concluido: "Concluídos",
  cancelado: "Cancelados",
  pending: "Aguardando",
};

const highlightedStatuses = ["aguardando_pagamento", "confirmado", "em_preparo", "saiu_para_entrega", "pronto_para_retirada"];

export function AdminOperationsOverview({ orders, loading, errorMessage }: AdminOperationsOverviewProps) {
  const total = orders?.length ?? 0;
  const grouped = (orders ?? []).reduce<Record<string, number>>((totals, order) => {
    totals[order.status] = (totals[order.status] ?? 0) + 1;
    return totals;
  }, {});
  const statuses = Object.keys(grouped).sort((left, right) => {
    const leftIndex = highlightedStatuses.indexOf(left);
    const rightIndex = highlightedStatuses.indexOf(right);
    return (leftIndex === -1 ? Number.MAX_SAFE_INTEGER : leftIndex) - (rightIndex === -1 ? Number.MAX_SAFE_INTEGER : rightIndex);
  });

  return (
    <section aria-labelledby="operations-overview-title" className="rounded-3xl border border-[#e4d5bd] bg-[#fffdf8] p-5 shadow-[0_12px_34px_rgba(72,30,31,0.07)] sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#68703d]">Operação ao vivo</p>
          <h2 id="operations-overview-title" className="mt-1 font-display text-2xl font-bold text-[#481e1f]">Situação operacional</h2>
          <p className="mt-2 text-sm leading-6 text-[#765f50]">Distribuição atual dos pedidos na fila, atualizada pelas informações da operação.</p>
        </div>
        <span className="rounded-full bg-[#e7edd3] px-3 py-1.5 text-sm font-bold text-[#53602e]">{total} pedido{total === 1 ? "" : "s"}</span>
      </div>

      {errorMessage ? <p role="alert" className="mt-5 rounded-xl border border-[#f1c7c7] bg-[#fff1f1] px-4 py-3 text-sm text-[#9c2f2c]">{errorMessage}</p> : null}
      {loading ? <p className="mt-5 text-sm text-[#765f50]">Carregando a situação operacional...</p> : null}

      {!loading && !errorMessage && total === 0 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-[#dcccb2] bg-white p-6 text-center">
          <ClipboardList aria-hidden="true" className="mx-auto size-7 text-[#68703d]" />
          <p className="mt-3 font-semibold text-[#481e1f]">Nenhum pedido ativo no momento.</p>
          <p className="mt-1 text-sm text-[#765f50]">Quando houver pedidos, a distribuição por etapa será exibida aqui.</p>
        </div>
      ) : null}

      {!loading && !errorMessage && total > 0 ? (
        <ul className="mt-5 space-y-3">
          {statuses.map((status) => {
            const count = grouped[status];
            const ratio = Math.max(6, Math.round((count / total) * 100));
            return (
              <li key={status} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                <div>
                  <div className="flex justify-between gap-3 text-sm"><span className="font-semibold text-[#4c312b]">{statusLabels[status] ?? status}</span><span className="text-[#765f50]">{count} pedido{count === 1 ? "" : "s"}</span></div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[#eee4d6]"><div className="h-full rounded-full bg-[#b52a25]" style={{ width: `${ratio}%` }} /></div>
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}
