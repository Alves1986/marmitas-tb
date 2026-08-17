import { Bike, CreditCard, MapPinned, PackageCheck, ShieldCheck, Ticket } from "lucide-react";

const paymentMethods = ["Dinheiro", "Cartão", "Alelo", "Pluxee", "Sodexo", "VR", "Ticket"];

export function StoreInfo() {
  return (
    <section id="informacoes" className="bg-[#f3ead8] py-10 sm:py-13">
      <div className="container grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[1.7rem] bg-[#fffaf1] p-6 shadow-[0_12px_36px_rgba(72,30,31,0.06)] sm:p-7">
          <p className="text-xs font-extrabold uppercase tracking-[0.17em] text-[#a82926]">Atendimento</p>
          <h2 className="font-display mt-2 text-3xl tracking-[-0.035em] text-[#481e1f]">Tudo para facilitar seu pedido.</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl bg-[#f7eedc] p-4"><Bike className="size-5 text-[#a82926]" /><h3 className="mt-4 text-sm font-extrabold text-[#481e1f]">Entrega estimada</h3><p className="mt-1 text-xs leading-relaxed text-[#765f50]">Informe o endereço e veja a taxa estimada antes de confirmar.</p></div>
            <div className="rounded-2xl bg-[#edf0d5] p-4"><PackageCheck className="size-5 text-[#68703d]" /><h3 className="mt-4 text-sm font-extrabold text-[#354022]">Retire no local</h3><p className="mt-1 text-xs leading-relaxed text-[#65704d]">Pronto para buscar, com instruções claras no final do pedido.</p></div>
            <div className="rounded-2xl bg-[#f7e7d5] p-4"><ShieldCheck className="size-5 text-[#a8592f]" /><h3 className="mt-4 text-sm font-extrabold text-[#5e3223]">Pedido seguro</h3><p className="mt-1 text-xs leading-relaxed text-[#805b4d]">Revise cada detalhe antes de concluir sua solicitação.</p></div>
          </div>
        </div>
        <div className="rounded-[1.7rem] bg-[#68703d] p-6 text-[#fff9e9] shadow-[0_12px_36px_rgba(72,30,31,0.09)] sm:p-7">
          <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-extrabold uppercase tracking-[0.17em] text-[#e7eeae]">Localização</p><h2 className="font-display mt-2 text-3xl tracking-[-0.035em]">Telêmaco Borba, PR</h2></div><MapPinned className="size-7 text-[#e7eeae]" /></div>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-[#fff9e9]/75">Almoço todos os dias, das 10h15 às 15h. Jantar de segunda a quinta, das 18h às 22h.</p>
          <div className="mt-6 border-t border-[#fff9e9]/15 pt-5"><p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.14em] text-[#e7eeae]"><CreditCard className="size-4" /> Pagamentos aceitos</p><div className="mt-3 flex flex-wrap gap-2">{paymentMethods.map((method) => <span key={method} className="rounded-full bg-[#fff9e9]/12 px-2.5 py-1.5 text-xs font-bold text-[#fff9e9]">{method}</span>)}</div></div>
          <p className="mt-5 flex items-center gap-2 text-xs text-[#fff9e9]/72"><Ticket className="size-3.5" /> Vouchers alimentação sujeitos à validação no atendimento.</p>
        </div>
      </div>
    </section>
  );
}
