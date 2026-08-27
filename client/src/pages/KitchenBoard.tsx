import { ArrowLeft, CircleAlert, ChefHat, LoaderCircle, MonitorCog, ShoppingBag, UtensilsCrossed } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { buildKitchenBoard, type KitchenOrder } from "@/lib/kitchenBoard";
import { OperationsAccessGate } from "@/pages/Operations";
import { vercelOperationsService, type VercelOperationalOrder } from "@/services/operationsService";

type KitchenBoardContentProps = {
  role?: "user" | "staff" | "admin" | null;
  loadOrders?: () => Promise<VercelOperationalOrder[]>;
};

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function KitchenTicket({ order, priority = false }: { order: KitchenOrder; priority?: boolean }) {
  return <article className={`rounded-2xl border p-4 shadow-sm ${priority ? "border-[#c39843] bg-[#fff6dd] shadow-[0_8px_24px_rgba(135,90,20,0.12)]" : "border-[#e4d7c4] bg-white"}`}>
    <div className="flex flex-wrap items-start justify-between gap-2">
      <div>
        {priority ? <p className="text-xs font-extrabold uppercase tracking-[.14em] text-[#8a5b12]">Balcão · atender primeiro</p> : null}
        <h3 className="mt-1 font-display text-xl font-bold text-[#481e1f]">{order.counterTicket ?? order.code}</h3>
        {order.counterTicket ? <p className="mt-1 text-xs font-bold text-[#765f50]">{order.code}</p> : null}
      </div>
      <time dateTime={order.createdAt} className="rounded-full bg-white/80 px-2.5 py-1 text-xs font-bold text-[#765f50]">{formatTime(order.createdAt)}</time>
    </div>
    <ul className="mt-4 space-y-2 border-t border-[#ead9c0] pt-3 text-sm text-[#4c382e]">
      {order.items.map((item, index) => <li key={`${item.productName}-${index}`}><strong>{item.quantity}×</strong> {item.productName}{item.notes ? <span className="block pl-5 pt-1 text-xs italic text-[#765f50]">{item.notes}</span> : null}</li>)}
    </ul>
    {order.customerNotes ? <p className="mt-3 rounded-xl bg-white/70 p-2 text-xs text-[#66473e]"><strong>Observação:</strong> {order.customerNotes}</p> : null}
  </article>;
}

function KitchenColumn({ title, icon: Icon, orders }: { title: string; icon: typeof ShoppingBag; orders: KitchenOrder[] }) {
  return <section aria-labelledby={`kitchen-${title.replaceAll(" ", "-").toLowerCase()}`} className="rounded-3xl border border-[#e4d7c4] bg-[#f8f1e5] p-4">
    <div className="flex items-center justify-between gap-3 border-b border-[#decdb4] pb-3">
      <h2 id={`kitchen-${title.replaceAll(" ", "-").toLowerCase()}`} className="flex items-center gap-2 font-display text-xl font-bold text-[#481e1f]"><Icon className="size-5 text-[#68703d]" />{title}</h2>
      <span className="rounded-full bg-white px-2.5 py-1 text-xs font-extrabold text-[#765f50]">{orders.length}</span>
    </div>
    <div className="mt-4 space-y-3">
      {orders.length ? orders.map((order) => <KitchenTicket key={order.id} order={order} />) : <p className="rounded-2xl border border-dashed border-[#cdbb9f] bg-white/60 p-5 text-center text-sm text-[#765f50]">Sem pedidos neste estado.</p>}
    </div>
  </section>;
}

export function KitchenBoardContent({ role, loadOrders = vercelOperationsService.listOrders }: KitchenBoardContentProps) {
  const [orders, setOrders] = useState<VercelOperationalOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const canReadKitchen = role === "staff" || role === "admin";

  useEffect(() => {
    if (!canReadKitchen) {
      setLoading(false);
      return;
    }
    let active = true;
    const load = async () => {
      try {
        const response = await loadOrders();
        if (!active) return;
        setOrders(response);
        setError(null);
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : "Não foi possível carregar a tela de cozinha.");
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    const interval = window.setInterval(() => void load(), 10_000);
    return () => { active = false; window.clearInterval(interval); };
  }, [canReadKitchen, loadOrders]);

  const board = useMemo(() => buildKitchenBoard(orders), [orders]);
  const activeCount = board.counterPriority.length + board.confirmed.length + board.preparing.length + board.ready.length;

  return <OperationsAccessGate role={role}>
    <main className="min-h-screen bg-[#fffaf1] text-[#481e1f]">
      <header className="border-b border-[#ead9c0] bg-white/90 backdrop-blur"><div className="container flex min-h-20 flex-wrap items-center justify-between gap-4 py-4"><div><p className="text-xs font-extrabold uppercase tracking-[.15em] text-[#68703d]">Marmitas TB · acompanhamento da produção</p><h1 className="mt-1 flex items-center gap-2 font-display text-3xl font-bold"><ChefHat className="size-7 text-[#a82926]" />Cozinha</h1></div><a href="/operacao" className="inline-flex min-h-11 items-center rounded-xl border border-[#c9b28f] px-4 text-sm font-bold transition hover:bg-[#fff5df]"><ArrowLeft className="mr-2 size-4" />Fila operacional</a></div></header>
      <div className="container py-6"><p className="rounded-2xl border border-[#dfe5c5] bg-[#f3f5e8] px-4 py-3 text-sm text-[#53602c]">Tela somente consulta. Os pedidos são atualizados automaticamente a cada 10 segundos.</p>{loading ? <div className="grid min-h-64 place-items-center"><div className="text-center text-[#765f50]"><LoaderCircle className="mx-auto size-8 animate-spin text-[#a82926]" /><p className="mt-3 text-sm">Carregando comandas ativas…</p></div></div> : null}{!loading && error ? <div role="alert" className="mt-5 rounded-2xl border border-[#f2b4a2] bg-[#fff1eb] p-5 text-[#8c2522]"><CircleAlert className="mb-2 size-5" /><p className="font-bold">Não foi possível carregar a tela de cozinha.</p><p className="mt-1 text-sm">{error}</p></div> : null}{!loading && !error ? <><section aria-labelledby="counter-priority-title" className="mt-5 rounded-3xl border border-[#d8b86e] bg-[#fff0c9] p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-extrabold uppercase tracking-[.15em] text-[#8a5b12]">Produção com preferência operacional</p><h2 id="counter-priority-title" className="mt-1 flex items-center gap-2 font-display text-2xl font-bold"><UtensilsCrossed className="size-6 text-[#a82926]" />Prioridade balcão</h2></div><span className="rounded-full bg-white px-3 py-1 text-xs font-extrabold text-[#765f50]">{board.counterPriority.length} na fila</span></div><div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{board.counterPriority.length ? board.counterPriority.map((order) => <KitchenTicket key={order.id} order={order} priority />) : <p className="rounded-2xl border border-dashed border-[#d3b36a] bg-white/55 p-4 text-sm text-[#765f50]">Nenhuma comanda de balcão aguardando produção.</p>}</div></section><section aria-label="Comandas ativas por estado" className="mt-6 grid gap-4 xl:grid-cols-3"><KitchenColumn title="Novo pedido" icon={ShoppingBag} orders={board.confirmed} /><KitchenColumn title="Em preparo" icon={MonitorCog} orders={board.preparing} /><KitchenColumn title="Pronto para retirada" icon={ChefHat} orders={board.ready} /></section>{activeCount === 0 ? <p className="mt-6 rounded-2xl border border-dashed border-[#cdbb9f] bg-white/70 p-5 text-center text-sm font-bold text-[#765f50]">Nenhuma comanda ativa nesta etapa.</p> : null}</> : null}</div>
    </main>
  </OperationsAccessGate>;
}

export default function KitchenBoard() {
  const { user, loading } = useAuth();
  if (loading) return <main className="grid min-h-screen place-items-center bg-[#fffaf1]"><LoaderCircle className="size-8 animate-spin text-[#a82926]" /></main>;
  return <KitchenBoardContent role={user?.role ?? null} />;
}
