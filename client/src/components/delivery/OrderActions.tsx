import { ShoppingBag } from "lucide-react";
import { useOrder } from "@/contexts/OrderContext";
import { formatCurrency } from "@/lib/order";

export function DesktopOrderSummary() {
  const { itemCount, summary, setCartOpen } = useOrder();
  return <aside className="sticky top-23 hidden h-fit rounded-[1.7rem] border border-[#ead8c0] bg-[#fffaf1] p-5 shadow-[0_14px_34px_rgba(72,30,31,0.06)] xl:block"><div className="flex items-center gap-2"><span className="grid size-9 place-items-center rounded-xl bg-[#f3ead8] text-[#a82926]"><ShoppingBag className="size-4" /></span><div><p className="text-sm font-extrabold text-[#481e1f]">Seu pedido</p><p className="text-[11px] text-[#806859]">{itemCount ? `${itemCount} itens na sacola` : "Ainda está vazio"}</p></div></div><div className="my-4 border-t border-[#ead8c0]" /><div className="flex justify-between text-sm text-[#765f50]"><span>Total estimado</span><strong className="text-[#a82926]">{formatCurrency(summary.total)}</strong></div><button type="button" onClick={() => setCartOpen(true)} className="mt-4 h-11 w-full rounded-xl bg-[#481e1f] text-xs font-extrabold text-white transition hover:bg-[#a82926]">{itemCount ? "Ver pedido" : "Montar pedido"}</button></aside>;
}

export function MobileCartBar() {
  const { itemCount, summary, setCartOpen } = useOrder();
  if (!itemCount) return null;
  return <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[#d8bd9b] bg-[#fffaf1]/95 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-8px_24px_rgba(72,30,31,0.1)] backdrop-blur lg:hidden"><button type="button" onClick={() => setCartOpen(true)} className="flex h-13 w-full items-center justify-between rounded-xl bg-[#a82926] px-4 text-white shadow-sm active:scale-[0.99]"><span className="flex items-center gap-2 text-sm font-extrabold"><ShoppingBag className="size-4" /> Ver pedido <span className="rounded-full bg-white/18 px-2 py-0.5 text-[11px]">{itemCount}</span></span><strong className="text-sm">{formatCurrency(summary.total)}</strong></button></div>;
}
