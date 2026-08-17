import { useState } from "react";
import { ChevronRight, Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import type { CartItem, CartSummary, DeliveryMode, OrderConfirmation } from "@shared/order";
import { useOrder } from "@/contexts/OrderContext";
import { formatCurrency } from "@/lib/order";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { CheckoutFlow } from "./CheckoutFlow";
import { CheckoutSuccess } from "./CheckoutSuccess";

type ConfirmationState = { confirmation: OrderConfirmation; items: CartItem[]; summary: CartSummary; deliveryMode: DeliveryMode };

export function CartPanel() {
  const { items, deliveryMode, summary, isCartOpen, setCartOpen, updateQuantity, removeItem, setDeliveryMode, clearCart } = useOrder();
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [confirmation, setConfirmation] = useState<ConfirmationState | null>(null);

  function closePanel() {
    setCartOpen(false);
    setIsCheckingOut(false);
    setConfirmation(null);
  }

  function handleConfirmation(result: OrderConfirmation, snapshot: Omit<ConfirmationState, "confirmation">) {
    setConfirmation({ confirmation: result, ...snapshot });
    clearCart();
  }

  return <Sheet open={isCartOpen} onOpenChange={(open) => !open && closePanel()}><SheetContent side="right" className="w-full overflow-y-auto border-l-[#ead8c0] bg-[#fffaf1] p-0 sm:max-w-xl"><SheetTitle className="sr-only">Sacola e pedido da Marmitas TB</SheetTitle><SheetDescription className="sr-only">Revise seus itens e avance para concluir o pedido.</SheetDescription>{confirmation ? <CheckoutSuccess {...confirmation} onClose={closePanel} /> : isCheckingOut ? <CheckoutFlow onBack={() => setIsCheckingOut(false)} onSuccess={handleConfirmation} /> : <div className="flex min-h-full flex-col bg-[#fffaf1] p-5 sm:p-7"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-extrabold uppercase tracking-[0.15em] text-[#a82926]">Sua sacola</p><h2 className="font-display mt-1 text-3xl tracking-[-0.04em] text-[#481e1f]">Seu pedido.</h2></div><button type="button" onClick={closePanel} className="grid size-9 place-items-center rounded-full text-[#806859] transition hover:bg-[#f1e4cc]" aria-label="Fechar sacola"><X className="size-5" /></button></div>{items.length === 0 ? <EmptyCart onBrowse={closePanel} /> : <><div className="mt-6 space-y-4">{items.map((item) => <CartLine key={item.id} item={item} onQuantity={updateQuantity} onRemove={removeItem} />)}</div><div className="mt-6 border-y border-[#ead8c0] py-5"><p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#806859]">Como deseja receber?</p><div className="mt-3 grid grid-cols-2 gap-2"><DeliveryModeButton mode="delivery" active={deliveryMode === "delivery"} onClick={setDeliveryMode} /><DeliveryModeButton mode="pickup" active={deliveryMode === "pickup"} onClick={setDeliveryMode} /></div><p className="mt-3 text-xs leading-relaxed text-[#765f50]">{deliveryMode === "delivery" ? `Taxa estimada de ${formatCurrency(summary.deliveryFee)}. O endereço será informado no checkout.` : "Você receberá a estimativa de preparo e as instruções de retirada no final."}</p></div><div className="mt-5 space-y-2 text-sm text-[#765f50]"><div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(summary.subtotal)}</span></div>{summary.savings > 0 && <div className="flex justify-between text-[#68703d]"><span>Você economiza</span><span>- {formatCurrency(summary.savings)}</span></div>}<div className="flex justify-between"><span>{deliveryMode === "delivery" ? "Entrega estimada" : "Retirada"}</span><span>{formatCurrency(summary.deliveryFee)}</span></div><div className="mt-3 flex justify-between border-t border-[#ead8c0] pt-4 text-lg font-black text-[#481e1f]"><span>Total</span><span className="text-[#a82926]">{formatCurrency(summary.total)}</span></div></div><Button type="button" onClick={() => setIsCheckingOut(true)} className="mt-auto h-13 rounded-xl bg-[#a82926] text-sm font-extrabold text-white shadow-sm hover:bg-[#8e1718]">Continuar pedido <ChevronRight className="ml-1 size-4" /></Button></>}</div>}</SheetContent></Sheet>;
}

function CartLine({ item, onQuantity, onRemove }: { item: CartItem; onQuantity: (id: string, quantity: number) => void; onRemove: (id: string) => void }) {
  return <div className="flex gap-3"><div className="grid size-13 shrink-0 place-items-center rounded-2xl bg-[#f3ead8] text-2xl">🍱</div><div className="min-w-0 flex-1"><div className="flex justify-between gap-3"><h3 className="text-sm font-extrabold leading-snug text-[#481e1f]">{item.name}</h3><button type="button" onClick={() => onRemove(item.id)} className="text-[#a58f7a] transition hover:text-[#a82926]" aria-label={`Remover ${item.name}`}><Trash2 className="size-4" /></button></div>{item.selections.length > 0 && <p className="mt-1 line-clamp-1 text-[11px] text-[#806859]">{item.selections.map((selection) => selection.optionLabel).join(" · ")}</p>}{item.note && <p className="mt-1 line-clamp-1 text-[11px] italic text-[#806859]">Obs.: {item.note}</p>}<div className="mt-2 flex items-center justify-between"><div className="inline-flex items-center rounded-lg border border-[#ead8c0] bg-white p-0.5"><button type="button" onClick={() => onQuantity(item.id, item.quantity - 1)} className="grid size-7 place-items-center rounded-md text-[#664b3d] hover:bg-[#f3ead8]" aria-label="Diminuir quantidade"><Minus className="size-3.5" /></button><span className="w-7 text-center text-xs font-black text-[#481e1f]">{item.quantity}</span><button type="button" onClick={() => onQuantity(item.id, item.quantity + 1)} className="grid size-7 place-items-center rounded-md text-[#664b3d] hover:bg-[#f3ead8]" aria-label="Aumentar quantidade"><Plus className="size-3.5" /></button></div><strong className="text-sm text-[#a82926]">{formatCurrency(item.unitPrice * item.quantity)}</strong></div></div></div>;
}

function DeliveryModeButton({ mode, active, onClick }: { mode: DeliveryMode; active: boolean; onClick: (mode: DeliveryMode) => void }) {
  return <button type="button" onClick={() => onClick(mode)} className={`rounded-xl border p-3 text-left transition ${active ? "border-[#a82926] bg-[#fff0df]" : "border-[#ead8c0] bg-white hover:border-[#d5b793]"}`}><span className="block text-sm font-extrabold text-[#481e1f]">{mode === "delivery" ? "Entrega" : "Retirada"}</span><span className="mt-1 block text-[11px] leading-relaxed text-[#806859]">{mode === "delivery" ? "Levar até você" : "Buscar na loja"}</span></button>;
}

function EmptyCart({ onBrowse }: { onBrowse: () => void }) {
  return <div className="mx-auto flex max-w-sm flex-1 flex-col items-center justify-center py-15 text-center"><span className="grid size-17 place-items-center rounded-full bg-[#f3ead8] text-[#a82926]"><ShoppingBag className="size-8" /></span><h3 className="font-display mt-5 text-3xl tracking-[-0.03em] text-[#481e1f]">Sua sacola está vazia.</h3><p className="mt-3 text-sm leading-relaxed text-[#765f50]">Escolha uma marmita ou um acompanhamento para começar o pedido.</p><Button type="button" onClick={onBrowse} className="mt-6 rounded-xl bg-[#a82926] text-white hover:bg-[#8e1718]">Ver cardápio</Button></div>;
}
