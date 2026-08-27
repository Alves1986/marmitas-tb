import { ArrowLeft, Boxes, CircleAlert, LoaderCircle, PackagePlus, Search, TriangleAlert, Warehouse } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  filterInventoryItems,
  formatInventoryQuantity,
  getInventoryLevelLabel,
  sortInventoryItems,
  type InventoryBoardItem,
} from "@/lib/inventoryBoard";
import { OperationsAccessGate } from "@/pages/Operations";

type InventoryContentProps = {
  role?: "user" | "staff" | "admin" | null;
  loadInventory?: () => Promise<InventoryBoardItem[]>;
};

const inventoryActivationMessage = "O estoque está preparado e aguarda ativação da base de dados.";

async function loadInventoryUnavailable(): Promise<InventoryBoardItem[]> {
  throw new Error(inventoryActivationMessage);
}

function InventoryLevelBadge({ item }: { item: InventoryBoardItem }) {
  const className = item.level === "critical"
    ? "border-[#eab4a6] bg-[#fff0eb] text-[#8c2522]"
    : item.level === "attention"
      ? "border-[#e6ca7b] bg-[#fff8df] text-[#8a5b12]"
      : "border-[#cdd7ae] bg-[#f2f6e7] text-[#53602c]";

  return <span className={`rounded-full border px-2.5 py-1 text-xs font-extrabold ${className}`}>{getInventoryLevelLabel(item.level)}</span>;
}

function InventoryItemCard({ item }: { item: InventoryBoardItem }) {
  return <article className="rounded-2xl border border-[#e4d7c4] bg-white p-4 shadow-sm">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h3 className="font-display text-xl font-bold text-[#481e1f]">{item.name}</h3>
        <p className="mt-1 text-sm text-[#765f50]">Mínimo: {formatInventoryQuantity(item.minimumStock, item.unit)}</p>
      </div>
      <InventoryLevelBadge item={item} />
    </div>
    <div className="mt-4 border-t border-[#ead9c0] pt-3">
      <p className="text-xs font-extrabold uppercase tracking-[.13em] text-[#765f50]">Saldo calculado</p>
      <p className="mt-1 font-display text-2xl font-bold text-[#481e1f]">{formatInventoryQuantity(item.balanceQuantity, item.unit)}</p>
    </div>
  </article>;
}

function MovementActions({ isAdmin }: { isAdmin: boolean }) {
  return <section aria-labelledby="inventory-movements-title" className="rounded-3xl border border-[#dfd0b8] bg-[#f8f1e5] p-5">
    <p className="text-xs font-extrabold uppercase tracking-[.15em] text-[#68703d]">Lançamentos controlados</p>
    <h2 id="inventory-movements-title" className="mt-1 font-display text-2xl font-bold text-[#481e1f]">Movimentações</h2>
    <p className="mt-2 text-sm leading-6 text-[#765f50]">O formulário com seleção de insumo, quantidade e histórico será habilitado junto com a base de dados autorizada. Os tipos disponíveis já respeitam o seu papel.</p>
    <div className="mt-4 flex flex-wrap gap-2">
      <button type="button" disabled className="min-h-11 rounded-xl bg-[#68703d] px-4 text-sm font-bold text-white opacity-60">Registrar entrada</button>
      <button type="button" disabled className="min-h-11 rounded-xl border border-[#c9b28f] bg-white px-4 text-sm font-bold text-[#481e1f] opacity-60">Registrar consumo</button>
      {isAdmin ? <><button type="button" disabled className="min-h-11 rounded-xl border border-[#d9ad8e] bg-[#fff4ec] px-4 text-sm font-bold text-[#8c2522] opacity-60">Registrar perda</button><button type="button" disabled className="min-h-11 rounded-xl border border-[#c9b28f] bg-white px-4 text-sm font-bold text-[#481e1f] opacity-60">Registrar ajuste</button></> : null}
    </div>
  </section>;
}

export function InventoryContent({ role, loadInventory = loadInventoryUnavailable }: InventoryContentProps) {
  const [items, setItems] = useState<InventoryBoardItem[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const canAccessInventory = role === "staff" || role === "admin";
  const isAdmin = role === "admin";

  useEffect(() => {
    if (!canAccessInventory) {
      setLoading(false);
      return;
    }

    let active = true;
    void loadInventory()
      .then((response) => {
        if (!active) return;
        setItems(response);
        setError(null);
      })
      .catch((cause) => {
        if (active) setError(cause instanceof Error ? cause.message : inventoryActivationMessage);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [canAccessInventory, loadInventory]);

  const visibleItems = useMemo(() => sortInventoryItems(filterInventoryItems(items, query)), [items, query]);
  const criticalCount = items.filter((item) => item.level === "critical").length;
  const attentionCount = items.filter((item) => item.level === "attention").length;

  return <OperationsAccessGate role={role}>
    <main className="min-h-screen bg-[#fffaf1] text-[#481e1f]">
      <header className="border-b border-[#ead9c0] bg-white/90 backdrop-blur">
        <div className="container flex min-h-20 flex-wrap items-center justify-between gap-4 py-4">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[.15em] text-[#68703d]">Marmitas TB · operação</p>
            <h1 className="mt-1 flex items-center gap-2 font-display text-3xl font-bold"><Warehouse className="size-7 text-[#a82926]" />Estoque</h1>
          </div>
          <a href="/operacao" className="inline-flex min-h-11 items-center rounded-xl border border-[#c9b28f] px-4 text-sm font-bold transition hover:bg-[#fff5df]"><ArrowLeft className="mr-2 size-4" />Fila operacional</a>
        </div>
      </header>

      <div className="container py-6">
        <p className="rounded-2xl border border-[#dfe5c5] bg-[#f3f5e8] px-4 py-3 text-sm text-[#53602c]">O saldo será sempre calculado por entradas, consumos, perdas e ajustes auditáveis. Nenhum pedido baixa estoque automaticamente nesta etapa.</p>

        {loading ? <div className="grid min-h-64 place-items-center"><div className="text-center text-[#765f50]"><LoaderCircle className="mx-auto size-8 animate-spin text-[#a82926]" /><p className="mt-3 text-sm">Carregando posição de estoque…</p></div></div> : null}
        {!loading && error ? <div role="alert" className="mt-5 rounded-2xl border border-[#e6ca7b] bg-[#fff8df] p-5 text-[#6e4b10]"><CircleAlert className="mb-2 size-5" /><p className="font-bold">Estoque em preparação</p><p className="mt-1 text-sm leading-6">{error}</p></div> : null}

        {!loading && !error ? <>
          <section aria-label="Resumo do estoque" className="mt-5 grid gap-3 sm:grid-cols-3">
            <article className="rounded-2xl border border-[#e4d7c4] bg-white p-4"><p className="text-sm font-bold text-[#765f50]">Insumos ativos</p><p className="mt-1 font-display text-3xl font-bold">{items.length}</p></article>
            <article className="rounded-2xl border border-[#eab4a6] bg-[#fff4ee] p-4"><p className="flex items-center gap-2 text-sm font-bold text-[#8c2522]"><TriangleAlert className="size-4" />{criticalCount} {criticalCount === 1 ? "item crítico" : "itens críticos"}</p><p className="mt-1 text-sm text-[#765f50]">No mínimo ou abaixo dele.</p></article>
            <article className="rounded-2xl border border-[#e6ca7b] bg-[#fff8df] p-4"><p className="text-sm font-bold text-[#8a5b12]">{attentionCount} {attentionCount === 1 ? "item em atenção" : "itens em atenção"}</p><p className="mt-1 text-sm text-[#765f50]">Margem próxima do mínimo.</p></article>
          </section>

          <section className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-extrabold uppercase tracking-[.15em] text-[#68703d]">Posição atual</p><h2 className="mt-1 font-display text-2xl font-bold">Insumos</h2></div>{isAdmin ? <button type="button" disabled className="inline-flex min-h-11 items-center rounded-xl bg-[#a82926] px-4 text-sm font-bold text-white opacity-60"><PackagePlus className="mr-2 size-4" />Cadastrar insumo</button> : null}</div>
              <label className="relative mt-4 block"><Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#765f50]" /><input aria-label="Buscar insumo" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nome" className="min-h-11 w-full rounded-xl border border-[#cdbb9f] bg-white pl-10 pr-3 text-sm outline-none transition focus:border-[#68703d] focus:ring-2 focus:ring-[#dce5bd]" /></label>
              <div className="mt-4 grid gap-3 md:grid-cols-2">{visibleItems.map((item) => <InventoryItemCard key={item.id} item={item} />)}</div>
              {items.length === 0 ? <div className="mt-4 rounded-2xl border border-dashed border-[#cdbb9f] bg-white/65 p-7 text-center"><Boxes className="mx-auto size-7 text-[#68703d]" /><p className="mt-3 text-sm font-bold text-[#765f50]">Nenhum insumo cadastrado nesta etapa.</p></div> : null}
              {items.length > 0 && visibleItems.length === 0 ? <p className="mt-4 rounded-2xl border border-dashed border-[#cdbb9f] bg-white/65 p-5 text-center text-sm text-[#765f50]">Nenhum insumo encontrado para a busca informada.</p> : null}
            </div>
            <MovementActions isAdmin={isAdmin} />
          </section>
        </> : null}
      </div>
    </main>
  </OperationsAccessGate>;
}

export default function Inventory() {
  const { user, loading } = useAuth();
  if (loading) return <main className="grid min-h-screen place-items-center bg-[#fffaf1]"><LoaderCircle className="size-8 animate-spin text-[#a82926]" /></main>;
  return <InventoryContent role={user?.role ?? null} />;
}
