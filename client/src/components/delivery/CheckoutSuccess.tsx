import { useEffect, useRef } from "react";
import { CheckCircle2, Clipboard, MessageCircle, PackageCheck, X } from "lucide-react";
import type { CartItem, CartSummary, DeliveryMode, OrderConfirmation } from "@shared/order";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/order";
import { toast } from "sonner";

type CheckoutSuccessProps = {
  confirmation: OrderConfirmation;
  items: CartItem[];
  summary: CartSummary;
  deliveryMode: DeliveryMode;
  onClose: () => void;
};

export function CheckoutSuccess({ confirmation, items, summary, deliveryMode, onClose }: CheckoutSuccessProps) {
  const successHeadingRef = useRef<HTMLHeadingElement>(null);
  const orderText = `Olá, Marmitas TB! Meu pedido ${confirmation.orderNumber} foi registrado. Total: ${formatCurrency(summary.total)}.`;
  const whatsappHref = `https://api.whatsapp.com/send?text=${encodeURIComponent(orderText)}`;

  useEffect(() => {
    successHeadingRef.current?.focus();
  }, []);

  async function copyOrderNumber() {
    try {
      await navigator.clipboard.writeText(confirmation.orderNumber);
      toast.success("Número do pedido copiado.");
    } catch {
      toast.message(`Anote seu pedido: ${confirmation.orderNumber}`);
    }
  }

  return (
    <div className="flex min-h-full flex-col bg-[#fffaf1] p-5 sm:p-7">
      <div className="flex justify-end"><button type="button" onClick={onClose} className="grid size-9 place-items-center rounded-full text-[#806859] transition hover:bg-[#f1e4cc]" aria-label="Fechar confirmação"><X className="size-5" /></button></div>
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center pb-8 text-center">
        <span className="mx-auto grid size-17 place-items-center rounded-full bg-[#e6efd0] text-[#647437]"><CheckCircle2 className="size-9" /></span>
        <p className="mt-5 text-xs font-extrabold uppercase tracking-[0.16em] text-[#68703d]">Pedido registrado</p>
        <h2 ref={successHeadingRef} tabIndex={-1} className="font-display mt-2 text-4xl tracking-[-0.04em] text-[#481e1f]">Tudo certo por aqui.</h2>
        <p className="mt-3 text-sm leading-relaxed text-[#765f50]">Seu pedido local foi confirmado. Agora informe o número abaixo no WhatsApp para o atendimento finalizar os detalhes.</p>
        <div className="mt-6 rounded-[1.5rem] border border-[#ead8c0] bg-white p-5 text-left shadow-[0_12px_28px_rgba(72,30,31,0.06)]">
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#a58f7a]">Número do pedido</p>
          <div className="mt-2 flex items-center justify-between gap-3"><strong className="font-display text-3xl tracking-[-0.03em] text-[#a82926]">{confirmation.orderNumber}</strong><button type="button" onClick={copyOrderNumber} className="inline-flex items-center gap-1.5 rounded-lg bg-[#f4ead8] px-2.5 py-2 text-xs font-bold text-[#664b3d]"><Clipboard className="size-3.5" /> Copiar</button></div>
          <div className="mt-4 border-t border-[#f0e4d0] pt-4 text-sm text-[#664b3d]"><div className="flex items-center justify-between"><span>{deliveryMode === "delivery" ? "Entrega estimada" : "Retirada estimada"}</span><strong>{confirmation.estimatedTime}</strong></div><div className="mt-2 flex items-center justify-between"><span>Total</span><strong className="text-[#a82926]">{formatCurrency(summary.total)}</strong></div></div>
        </div>
        <div className="mt-5 rounded-2xl bg-[#edf0d5] px-4 py-3 text-left text-xs leading-relaxed text-[#596437]"><span className="font-extrabold">Próximo passo:</span> abra o WhatsApp, envie o número <strong>{confirmation.orderNumber}</strong> e aguarde a confirmação do atendimento.</div>
        <a href={whatsappHref} target="_blank" rel="noreferrer" className="mt-5 inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#68703d] text-sm font-extrabold text-white shadow-sm transition hover:bg-[#57622f] active:scale-[0.98]"><MessageCircle className="size-4" /> Abrir mensagem no WhatsApp</a>
        <Button type="button" variant="ghost" onClick={onClose} className="mt-2 h-11 text-sm font-bold text-[#765f50] hover:bg-[#f1e4cc] hover:text-[#481e1f]"><PackageCheck className="mr-2 size-4" /> Voltar ao cardápio</Button>
        <div className="mt-5 text-left"><p className="text-xs font-extrabold uppercase tracking-[0.13em] text-[#a58f7a]">Resumo</p><div className="mt-2 space-y-2">{items.map((item) => <div key={item.id} className="flex justify-between gap-3 text-xs text-[#664b3d]"><span>{item.quantity}× {item.name}</span><span className="shrink-0 font-bold">{formatCurrency(item.unitPrice * item.quantity)}</span></div>)}</div></div>
      </div>
    </div>
  );
}
