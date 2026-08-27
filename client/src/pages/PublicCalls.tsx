import { CircleAlert, Clock3, LoaderCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { brandAsset } from "@/data/assets";
import { buildPublicCallsBoard, type PublicReadyTicket } from "@/lib/publicCallsBoard";
import { publicCallsService } from "@/services/publicCallsService";

type PublicCallsContentProps = {
  loadTickets?: () => Promise<PublicReadyTicket[]>;
};

export function PublicCallsContent({ loadTickets = publicCallsService.listReadyTickets }: PublicCallsContentProps) {
  const [tickets, setTickets] = useState<PublicReadyTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const response = await loadTickets();
        if (!active) return;
        setTickets(response);
        setError(false);
      } catch {
        if (!active) return;
        setTickets([]);
        setError(true);
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    const interval = window.setInterval(() => void load(), 10_000);
    return () => { active = false; window.clearInterval(interval); };
  }, [loadTickets]);

  const board = useMemo(() => buildPublicCallsBoard(tickets), [tickets]);

  return <main className="min-h-screen overflow-hidden bg-[#fffaf1] text-[#481e1f]">
    <div className="relative mx-auto flex min-h-screen max-w-[100rem] flex-col px-5 py-6 sm:px-8 lg:px-12 lg:py-8">
      <header className="flex items-center justify-between border-b border-[#e4d7c4] pb-5">
        <div className="flex items-center gap-3">
          <img src={brandAsset("logo-marmitastb.jpg")} alt="Marmitas TB" className="size-12 rounded-full object-cover ring-2 ring-[#f5d489]" />
          <div><p className="font-display text-2xl font-bold leading-none text-[#481e1f]">Marmitas TB</p><p className="mt-1 text-xs font-extrabold uppercase tracking-[.17em] text-[#68703d]">Telêmaco Borba</p></div>
        </div>
        <p className="hidden items-center gap-2 text-sm font-bold text-[#765f50] sm:flex"><Clock3 className="size-4 text-[#68703d]" />Atualização automática</p>
      </header>

      <section className="flex flex-1 flex-col justify-center py-8 lg:py-10" aria-live="polite">
        <p className="text-center text-sm font-extrabold uppercase tracking-[.2em] text-[#a82926] sm:text-base">Acompanhe sua senha</p>
        {loading ? <div className="grid flex-1 place-items-center py-16 text-center text-[#765f50]"><div><LoaderCircle className="mx-auto size-10 animate-spin text-[#a82926]" /><p className="mt-4 font-bold">Preparando as chamadas…</p></div></div> : null}
        {!loading && error ? <div role="alert" className="mx-auto mt-8 max-w-xl rounded-3xl border border-[#f2b4a2] bg-[#fff1eb] p-8 text-center text-[#8c2522]"><CircleAlert className="mx-auto size-8" /><p className="mt-3 font-display text-2xl font-bold">Não foi possível atualizar as chamadas.</p><p className="mt-2 text-sm">Tente novamente em instantes.</p></div> : null}
        {!loading && !error && !board.featured ? <div className="mx-auto mt-8 max-w-xl rounded-[2rem] border border-dashed border-[#c9b28f] bg-white/75 p-10 text-center shadow-sm"><p className="font-display text-3xl font-bold text-[#481e1f]">Nenhuma senha chamada agora</p><p className="mt-3 text-sm text-[#765f50]">Aguarde a liberação do seu pedido para retirada.</p></div> : null}
        {!loading && !error && board.featured ? <div className="mt-6 space-y-6 lg:mt-8 lg:space-y-8">
          <section className="mx-auto w-full max-w-5xl rounded-[2rem] bg-[#68703d] px-6 py-9 text-center text-white shadow-[0_18px_45px_rgba(68,82,33,0.28)] sm:px-10 lg:px-14 lg:py-11 motion-safe:transition-opacity motion-safe:duration-200">
            <p className="text-xs font-extrabold uppercase tracking-[.24em] text-[#f5dfa8] sm:text-sm">Pronto para retirada</p>
            <h1 className="mt-3 font-display text-6xl font-bold tracking-tight sm:text-7xl lg:text-9xl">{board.featured.ticket}</h1>
          </section>
          {board.recent.length ? <section aria-label="Chamadas recentes" className="mx-auto grid w-full max-w-6xl gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {board.recent.map((ticket) => <article key={ticket.ticket} className="rounded-2xl border border-[#e4d7c4] bg-white px-4 py-5 text-center shadow-sm"><p className="text-xs font-extrabold uppercase tracking-[.14em] text-[#765f50]">Também pronta</p><p className="mt-2 font-display text-3xl font-bold text-[#a82926] lg:text-4xl">{ticket.ticket}</p></article>)}
          </section> : null}
        </div> : null}
      </section>

      <footer className="border-t border-[#e4d7c4] pt-4 text-center text-xs font-bold text-[#765f50] sm:hidden"><Clock3 className="mr-1 inline size-3.5 text-[#68703d]" />Atualização automática</footer>
    </div>
  </main>;
}

export default function PublicCalls() {
  return <PublicCallsContent />;
}
