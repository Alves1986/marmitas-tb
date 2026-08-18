import { useEffect, useState } from "react";
import { ArrowLeft, CircleCheck, Clock3, CreditCard, PackageCheck, Search, ShieldCheck } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { apiRequest } from "@/lib/api";
import { createVercelTrackingService, type PublicTracking } from "@/services/trackingService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/order";
import { PaymentModeNotice, toPaymentNoticeModeFromProvider } from "@/components/delivery/PaymentModeNotice";

const statusLabels: Record<string, string> = {
  aguardando_pagamento: "Aguardando pagamento",
  confirmado: "Pedido confirmado",
  em_preparo: "Em preparo",
  saiu_para_entrega: "Saiu para entrega",
  pronto_para_retirada: "Pronto para retirada",
  concluido: "Pedido concluído",
  cancelado: "Pedido cancelado",
};

function formatDate(value: Date | string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

export default function TrackOrder() {
  const useVercelApi = import.meta.env.VITE_API_RUNTIME === "vercel" && import.meta.env.PROD;
  const params = new URLSearchParams(window.location.search);
  const [phone, setPhone] = useState("");
  const [submittedPhone, setSubmittedPhone] = useState<string | null>(null);
  const [specificCode, setSpecificCode] = useState(params.get("pedido") ?? "");
  const [specificPhone, setSpecificPhone] = useState("");
  const [submittedSpecificTracking, setSubmittedSpecificTracking] = useState<{ code: string; phone: string } | null>(null);
  const [vercelTracking, setVercelTracking] = useState<{ data: PublicTracking | null; isFetching: boolean; error: Error | null }>({ data: null, isFetching: false, error: null });

  const trackingByPhone = trpc.orders.trackByPhone.useQuery(
    { phone: submittedPhone ?? "_" },
    { enabled: !useVercelApi && Boolean(submittedPhone), retry: false },
  );
  const trackingByCode = trpc.orders.track.useQuery(
    { code: submittedSpecificTracking?.code ?? "_", phone: submittedSpecificTracking?.phone ?? "_" },
    { enabled: !useVercelApi && Boolean(submittedSpecificTracking), retry: false },
  );

  useEffect(() => {
    if (!useVercelApi || (!submittedPhone && !submittedSpecificTracking)) return;
    let cancelled = false;
    const service = createVercelTrackingService({ request: (path) => apiRequest<PublicTracking>(path) });
    setVercelTracking({ data: null, isFetching: true, error: null });
    const request = submittedPhone ? service.byPhone(submittedPhone) : service.byCode(submittedSpecificTracking!.code, submittedSpecificTracking!.phone);
    void request
      .then((data) => { if (!cancelled) setVercelTracking({ data, isFetching: false, error: null }); })
      .catch((error: unknown) => { if (!cancelled) setVercelTracking({ data: null, isFetching: false, error: error instanceof Error ? error : new Error("Falha ao consultar pedido.") }); });
    return () => { cancelled = true; };
  }, [submittedPhone, submittedSpecificTracking, useVercelApi]);

  const publicTracking = trackingByPhone.data;
  const specificTracking = trackingByCode.data;
  const activeTracking = useVercelApi
    ? vercelTracking.data && {
      order: {
        code: vercelTracking.data.code,
        status: vercelTracking.data.status,
        totalInCents: vercelTracking.data.totalInCents,
        paymentStatus: vercelTracking.data.paymentStatus,
        paymentMethod: vercelTracking.data.paymentMethod,
        paymentProvider: vercelTracking.data.paymentProvider,
        fulfillmentMethod: vercelTracking.data.fulfillmentMethod,
        createdAt: vercelTracking.data.createdAt,
      },
      events: vercelTracking.data.events,
    }
    : publicTracking ?? specificTracking;
  const order = activeTracking?.order;
  const timeline = activeTracking?.events ?? [];
  const isFetching = useVercelApi ? vercelTracking.isFetching : trackingByPhone.isFetching || trackingByCode.isFetching;
  const hasNetworkError = useVercelApi
    ? Boolean(vercelTracking.error) && !activeTracking
    : (Boolean(trackingByPhone.error) || Boolean(trackingByCode.error)) && !activeTracking;
  const searchedByPhone = Boolean(submittedPhone);
  const searchedByCode = Boolean(submittedSpecificTracking);

  return (
    <main className="min-h-screen bg-[#fffaf1] text-[#481e1f]">
      <header className="border-b border-[#ead8c0] bg-white/85 px-5 py-4 backdrop-blur sm:px-8">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4"><a href="/" className="inline-flex items-center gap-2 text-sm font-extrabold text-[#664b3d] hover:text-[#a82926]"><ArrowLeft className="size-4" /> Voltar ao cardápio</a><span className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#a82926]">Marmitas TB</span></div>
      </header>

      <section className="mx-auto grid max-w-5xl gap-8 px-5 py-10 sm:px-8 lg:grid-cols-[0.85fr_1.15fr] lg:py-16">
        <div><p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#a82926]">Acompanhamento</p><h1 className="font-display mt-2 text-4xl tracking-[-0.04em] sm:text-5xl">Seu pedido, em cada etapa.</h1><p className="mt-4 max-w-md text-sm leading-relaxed text-[#765f50]">Informe o telefone usado no checkout para acompanhar o pedido que está em andamento.</p><div className="mt-7 rounded-3xl bg-[#f3ead8] p-5 text-xs leading-relaxed text-[#765f50]"><ShieldCheck className="mb-3 size-5 text-[#68703d]" /><strong className="block text-[#481e1f]">Acompanhamento simplificado</strong> Exibimos somente o pedido ativo mais recente para este telefone.</div></div>

        <div className="rounded-[2rem] border border-[#ead8c0] bg-white p-5 shadow-[0_16px_40px_rgba(72,30,31,0.08)] sm:p-7">
          <form onSubmit={(event) => { event.preventDefault(); setSubmittedSpecificTracking(null); setSubmittedPhone(phone.trim()); }} className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
            <div><Label htmlFor="track-phone" className="font-bold">Telefone</Label><Input id="track-phone" value={phone} onChange={(event) => setPhone(event.target.value)} inputMode="tel" placeholder="(42) 99999-9999" className="mt-2 h-11 border-[#ead8c0]" /></div>
            <Button type="submit" disabled={isFetching || !phone.trim()} className="h-11 rounded-xl bg-[#a82926] px-5 font-extrabold hover:bg-[#8e1718]"><Search className="mr-2 size-4" /> Acompanhar pedido</Button>
          </form>

          <details className="mt-5 rounded-2xl border border-[#ead8c0] bg-[#fffaf1] px-4 py-3">
            <summary className="cursor-pointer text-sm font-extrabold text-[#664b3d]">Tenho o código do pedido</summary>
            <form onSubmit={(event) => { event.preventDefault(); setSubmittedPhone(null); setSubmittedSpecificTracking({ code: specificCode.trim().toUpperCase(), phone: specificPhone.trim() }); }} className="mt-4 grid gap-4 sm:grid-cols-2">
              <div><Label htmlFor="specific-track-code" className="font-bold">Código do pedido</Label><Input id="specific-track-code" value={specificCode} onChange={(event) => setSpecificCode(event.target.value)} placeholder="TB-20260817-0001" className="mt-2 h-11 border-[#ead8c0]" /></div>
              <div><Label htmlFor="specific-track-phone" className="font-bold">Telefone</Label><Input id="specific-track-phone" value={specificPhone} onChange={(event) => setSpecificPhone(event.target.value)} inputMode="tel" placeholder="(42) 99999-9999" className="mt-2 h-11 border-[#ead8c0]" /></div>
              <Button type="submit" disabled={isFetching || !specificCode.trim() || !specificPhone.trim()} className="h-11 rounded-xl border border-[#a82926] bg-white px-5 font-extrabold text-[#a82926] hover:bg-[#fff1ed] sm:col-span-2">Consultar pedido específico</Button>
            </form>
          </details>

          {isFetching && <div className="mt-8 flex items-center gap-3 rounded-2xl bg-[#fff7eb] p-4 text-sm font-semibold text-[#765f50]"><Clock3 className="size-5 animate-spin text-[#a82926]" /> Consultando o status do pedido...</div>}
          {hasNetworkError && <div role="alert" className="mt-8 rounded-2xl bg-[#fff1ed] p-4 text-sm leading-relaxed text-[#8e3025]"><strong>Não foi possível consultar agora.</strong><br />Verifique sua conexão e tente novamente.</div>}
          {!hasNetworkError && (searchedByPhone || searchedByCode) && !isFetching && !order && <div className="mt-8 rounded-2xl bg-[#fff1ed] p-4 text-sm leading-relaxed text-[#8e3025]"><strong>{searchedByPhone ? "Não há pedido em andamento para este telefone." : "Não encontramos esse pedido."}</strong><br />{searchedByPhone ? "Confira o número informado e tente novamente." : "Confira o código e use o mesmo telefone informado no checkout."}</div>}

          {order && <div className="mt-8"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.15em] text-[#a58f7a]">Pedido {order.code}</p><h2 className="font-display mt-1 text-3xl tracking-[-0.04em]">{statusLabels[order.status]}</h2></div><span className={`rounded-full px-3 py-1.5 text-xs font-extrabold ${order.paymentStatus === "confirmed" ? "bg-[#e6efd0] text-[#53652b]" : "bg-[#f7e7d5] text-[#8d3c2f]"}`}>{order.paymentStatus === "confirmed" ? "Pagamento confirmado" : order.paymentMethod === "cash" ? "Pagamento no recebimento" : "Pagamento pendente"}</span></div><div className="mt-4"><PaymentModeNotice mode={toPaymentNoticeModeFromProvider(order.paymentProvider)} /></div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2"><div className="rounded-2xl bg-[#f8f0e3] p-4"><p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.14em] text-[#8b735f]"><PackageCheck className="size-4 text-[#a82926]" /> Recebimento</p><p className="mt-2 text-sm font-bold text-[#481e1f]">{order.fulfillmentMethod === "delivery" ? "Entrega em andamento" : "Retirada na Marmitas TB"}</p>{!useVercelApi && specificTracking?.order?.fulfillmentMethod === "delivery" && specificTracking.order.deliveryAddress && <p className="mt-1 text-xs leading-relaxed text-[#765f50]">{specificTracking.order.deliveryAddress}</p>}</div><div className="rounded-2xl bg-[#f8f0e3] p-4"><p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.14em] text-[#8b735f]"><CreditCard className="size-4 text-[#a82926]" /> Total</p><p className="mt-2 text-xl font-black text-[#a82926]">{formatCurrency(order.totalInCents / 100)}</p><p className="mt-1 text-xs text-[#765f50]">{order.paymentProvider === "asaas_test" ? "Pagamento em modo de teste" : "Pagamento processado pelo Asaas"}</p></div></div>

            <ol className="mt-7 space-y-0" aria-label="Linha do tempo do pedido">{timeline.map((event, index) => <li key={event.id} className="relative flex gap-4 pb-6 last:pb-0"><span className="relative z-10 mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-[#e6efd0] text-[#53652b]"><CircleCheck className="size-3.5" /></span>{index < timeline.length - 1 && <span className="absolute left-3 top-6 h-[calc(100%-18px)] w-px bg-[#d7c5ac]" />}<div><p className="text-sm font-extrabold text-[#481e1f]">{event.toStatus ? statusLabels[event.toStatus] ?? event.toStatus : "Atualização do pedido"}</p><p className="mt-0.5 text-xs leading-relaxed text-[#765f50]">{event.message ?? "Sua solicitação foi atualizada."}</p><p className="mt-1 text-[11px] font-semibold text-[#a58f7a]">{formatDate(event.createdAt)}</p></div></li>)}</ol>
          </div>}
        </div>
      </section>
    </main>
  );
}
