import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, ChevronRight, CreditCard, Minus, Plus, Printer, QrCode, ShoppingBag, UtensilsCrossed } from "lucide-react";
import type { Product } from "@shared/order";
import { brandAsset } from "@/data/assets";
import { categories, products } from "@/data/catalog";
import { formatCurrency } from "@/lib/order";
import { createInitialTotemState, createTotemReceipt, expireTotemSession, type TotemItem, type TotemPaymentMethod, type TotemStep } from "@/lib/totem";

const STEPS: TotemStep[] = ["categories", "products", "drinks", "desserts", "review", "payment", "receipt"];
const STEP_LABELS: Record<TotemStep, string> = {
  categories: "Opções", products: "Marmitas", drinks: "Bebida", desserts: "Sobremesa", review: "Revisão", payment: "Pagamento", receipt: "Retirada",
};

function isDrink(product: Product) { return /bebida|suco|refrigerante/i.test(product.categoryLabel); }
function isDessert(product: Product) { return /sobremesa|doce/i.test(product.categoryLabel); }

export default function Totem() {
  const [state, setState] = useState(createInitialTotemState);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [payment, setPayment] = useState<TotemPaymentMethod | null>(null);
  const [sequence, setSequence] = useState(() => Number(sessionStorage.getItem("marmitas-tb-totem-sequence") ?? "0"));
  const [processing, setProcessing] = useState(false);

  const total = state.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const index = STEPS.indexOf(state.step);
  const reset = () => { setState(expireTotemSession(state)); setCategoryId(null); setPayment(null); setProcessing(false); };

  useEffect(() => {
    let timeout: number;
    const expire = () => { setState(createInitialTotemState()); setCategoryId(null); setPayment(null); setProcessing(false); };
    const restart = () => { window.clearTimeout(timeout); timeout = window.setTimeout(expire, 90_000); };
    restart();
    window.addEventListener("pointerdown", restart);
    window.addEventListener("keydown", restart);
    return () => { window.clearTimeout(timeout); window.removeEventListener("pointerdown", restart); window.removeEventListener("keydown", restart); };
  }, []);

  function move(step: TotemStep) { setState((current) => ({ ...current, step })); }
  function add(product: Product) {
    setState((current) => {
      const existing = current.items.find((item) => item.id === product.id);
      const items = existing
        ? current.items.map((item) => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item)
        : [...current.items, { id: product.id, name: product.name, price: product.price, quantity: 1 }];
      return { ...current, items };
    });
  }
  function chooseMarmita(product: Product) {
    add(product);
    move("drinks");
  }
  function chooseDrink(product: Product) {
    add(product);
    move("desserts");
  }
  function chooseDessert(product: Product) {
    add(product);
    move("review");
  }
  function update(id: string, delta: number) {
    setState((current) => ({ ...current, items: current.items.map((item) => item.id === id ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item).filter((item) => item.quantity > 0) }));
  }
  function approve(method: TotemPaymentMethod) {
    setPayment(method); setProcessing(true);
    window.setTimeout(() => {
      const next = sequence + 1; setSequence(next); sessionStorage.setItem("marmitas-tb-totem-sequence", String(next)); setProcessing(false); move("receipt");
    }, 1200);
  }
  const receipt = state.step === "receipt" && payment ? createTotemReceipt({ sequence, displayName: state.displayName, paymentMethod: payment, items: state.items }) : null;

  return (
    <main className="min-h-dvh bg-[#fff7ea] text-[#481e1f] touch-manipulation">
      <header className="sticky top-0 z-20 border-b border-[#e7d4b9] bg-[#fffaf1]/95 px-5 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-xl items-center justify-between gap-3">
          <div className="flex items-center gap-3"><img src={brandAsset("logo-marmitastb.jpg")} alt="Marmitas TB" className="size-12 rounded-2xl object-cover shadow-sm" /><div><p className="font-display text-xl leading-none">Marmitas TB</p><p className="mt-1 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#68703d]">Pedido rápido</p></div></div>
          <div className="rounded-full bg-[#f2e6d0] px-3 py-2 text-xs font-extrabold">{index + 1}/{STEPS.length}</div>
        </div>
      </header>
      <section className="mx-auto flex min-h-[calc(100dvh-81px)] max-w-xl flex-col px-5 pb-7 pt-6">
        <div className="mb-5 h-1.5 overflow-hidden rounded-full bg-[#ead9c1]"><div className="h-full rounded-full bg-[#a82926] transition-all duration-300" style={{ width: `${((index + 1) / STEPS.length) * 100}%` }} /></div>
        <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#a82926]">{STEP_LABELS[state.step]}</p>
        {state.step === "categories" && <CategoryStep onChoose={(id) => { setCategoryId(id); move("products"); }} />}
        {state.step === "products" && <ProductStep title="Escolha sua marmita" products={products.filter((product) => product.categoryId === categoryId)} items={state.items} onAdd={add} onChoose={chooseMarmita} onUpdate={update} />}
        {state.step === "drinks" && <ProductStep title="Quer uma bebida?" products={products.filter(isDrink)} items={state.items} onAdd={add} onChoose={chooseDrink} onUpdate={update} optional />}
        {state.step === "desserts" && <ProductStep title="E uma sobremesa?" products={products.filter(isDessert)} items={state.items} onAdd={add} onChoose={chooseDessert} onUpdate={update} optional />}
        {state.step === "review" && <ReviewStep items={state.items} total={total} name={state.displayName} onName={(displayName) => setState((current) => ({ ...current, displayName }))} />}
        {state.step === "payment" && <PaymentStep total={total} processing={processing} onPay={approve} />}
        {state.step === "receipt" && receipt && <ReceiptStep receipt={receipt} items={state.items} onPrint={() => window.print()} onFinish={reset} />}
        {state.step !== "receipt" && <nav className="mt-auto flex gap-3 pt-6">
          {index > 0 && <button type="button" onClick={() => move(STEPS[index - 1])} className="grid size-14 shrink-0 place-items-center rounded-2xl border border-[#d7bea0] bg-white" aria-label="Voltar"><ArrowLeft className="size-5" /></button>}
          <button type="button" disabled={state.step === "categories" || (state.step === "products" && state.items.length === 0)} onClick={() => move(STEPS[index + 1])} className="flex min-h-14 flex-1 items-center justify-center gap-2 rounded-2xl bg-[#481e1f] px-5 text-base font-extrabold text-white shadow-[0_10px_22px_rgba(72,30,31,.18)] transition active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-40">
            {state.step === "payment" ? "Escolha uma forma" : state.step === "review" ? "Ir para pagamento" : state.step === "desserts" ? "Não quero sobremesa" : "Continuar"}<ChevronRight className="size-5" />
          </button>
        </nav>}
      </section>
    </main>
  );
}

function CategoryStep({ onChoose }: { onChoose: (id: string) => void }) {
  return <><h1 className="mt-2 font-display text-4xl leading-tight">Escolha uma opção</h1><p className="mt-2 text-base text-[#765f50]">Comece pelo que você quer comer hoje.</p><div className="mt-7 grid gap-3">{categories.filter((category) => !/bebida|sobremesa/i.test(category.label)).map((category) => <button key={category.id} type="button" onClick={() => onChoose(category.id)} className="flex min-h-20 items-center justify-between rounded-3xl border border-[#ead9c1] bg-white px-5 text-left shadow-sm transition active:scale-[.99]"><span><strong className="block text-lg">{category.label}</strong><span className="mt-1 block text-sm text-[#806859]">{category.description}</span></span><ChevronRight className="size-6 text-[#a82926]" /></button>)}</div></>;
}

function ProductStep({ title, products: choices, items, onAdd, onChoose, onUpdate, optional = false }: { title: string; products: Product[]; items: TotemItem[]; onAdd: (product: Product) => void; onChoose?: (product: Product) => void; onUpdate: (id: string, delta: number) => void; optional?: boolean }) {
  return <><h1 className="mt-2 font-display text-4xl leading-tight">{title}</h1><p className="mt-2 text-base text-[#765f50]">{optional ? "Você pode pular esta etapa se quiser." : "Toque em uma marmita para adicionar e seguir para bebidas."}</p><div className="mt-6 grid gap-4">{choices.map((product) => { const item = items.find((current) => current.id === product.id); return <article key={product.id} className="overflow-hidden rounded-3xl border border-[#ead9c1] bg-white shadow-sm"><button type="button" onClick={() => onChoose ? onChoose(product) : onAdd(product)} className="flex w-full items-center gap-4 p-4 text-left"><img src={product.imageUrl} alt="" className="size-20 rounded-2xl object-cover" /><span className="min-w-0 flex-1"><strong className="block text-lg leading-tight">{product.name}</strong><span className="mt-1 line-clamp-2 block text-sm text-[#806859]">{product.description}</span><b className="mt-2 block text-base text-[#a82926]">{formatCurrency(product.price)}</b></span><Plus className="size-6 shrink-0 text-[#a82926]" /></button>{item && <div className="flex items-center justify-between border-t border-[#f0e3d0] bg-[#fffaf1] px-4 py-3"><span className="text-sm font-bold">No pedido</span><span className="flex items-center gap-3"><button type="button" onClick={() => onUpdate(product.id, -1)} className="grid size-11 place-items-center rounded-xl border border-[#d9bea0]" aria-label={`Remover ${product.name}`}><Minus className="size-4" /></button><b>{item.quantity}</b><button type="button" onClick={() => onAdd(product)} className="grid size-11 place-items-center rounded-xl bg-[#481e1f] text-white" aria-label={`Adicionar ${product.name}`}><Plus className="size-4" /></button></span></div>}</article>; })}</div></>;
}

function ReviewStep({ items, total, name, onName }: { items: TotemItem[]; total: number; name: string; onName: (value: string) => void }) { return <><h1 className="mt-2 font-display text-4xl leading-tight">Confira seu pedido</h1><div className="mt-6 space-y-3 rounded-3xl bg-white p-5 shadow-sm">{items.map((item) => <div key={item.id} className="flex justify-between gap-3 text-sm"><span>{item.quantity}× {item.name}</span><b>{formatCurrency(item.price * item.quantity)}</b></div>)}<div className="border-t border-[#ead9c1] pt-4 text-xl font-black">Total <span className="float-right text-[#a82926]">{formatCurrency(total)}</span></div></div><label className="mt-6 block"><span className="text-base font-bold">Seu nome é opcional</span><span className="mt-1 block text-sm text-[#806859]">Ele aparecerá junto da senha quando o pedido ficar pronto.</span><input value={name} onChange={(event) => onName(event.target.value)} maxLength={40} placeholder="Ex.: Anderson" className="mt-3 min-h-14 w-full rounded-2xl border border-[#d7bea0] bg-white px-4 text-lg outline-none focus:border-[#a82926] focus:ring-4 focus:ring-[#a82926]/10" /></label></> }

function PaymentStep({ total, processing, onPay }: { total: number; processing: boolean; onPay: (method: TotemPaymentMethod) => void }) { return <><h1 className="mt-2 font-display text-4xl leading-tight">Como deseja pagar?</h1><p className="mt-2 text-base text-[#765f50]">Demonstração segura: nenhuma cobrança será realizada.</p><div className="mt-7 grid gap-4"><button type="button" disabled={processing} onClick={() => onPay("pix")} className="min-h-28 rounded-3xl bg-[#68703d] px-6 text-left text-white shadow-lg transition active:scale-[.99]"><QrCode className="size-8" /><strong className="mt-2 block text-xl">PIX</strong><span className="text-sm opacity-90">Mostrar QR de demonstração · {formatCurrency(total)}</span></button><button type="button" disabled={processing} onClick={() => onPay("card")} className="min-h-28 rounded-3xl bg-[#481e1f] px-6 text-left text-white shadow-lg transition active:scale-[.99]"><CreditCard className="size-8" /><strong className="mt-2 block text-xl">Cartão</strong><span className="text-sm opacity-90">Aprovação simulada · {formatCurrency(total)}</span></button></div>{processing && <p className="mt-6 rounded-2xl bg-[#fff1d7] p-4 text-center font-bold text-[#765f50]">Processando pagamento de demonstração…</p>}</> }

function ReceiptStep({ receipt, items, onPrint, onFinish }: { receipt: ReturnType<typeof createTotemReceipt>; items: TotemItem[]; onPrint: () => void; onFinish: () => void }) { return <div id="totem-receipt" className="text-center"><CheckCircle2 className="mx-auto size-16 text-[#68703d]" /><p className="mt-5 text-xs font-extrabold uppercase tracking-[.16em] text-[#68703d]">Pedido confirmado</p><h1 className="mt-2 font-display text-4xl">Sua senha é</h1><p className="mt-4 rounded-3xl bg-[#481e1f] px-5 py-6 font-mono text-3xl font-black text-white">{receipt.tag}</p><p className="mt-5 text-base text-[#765f50]">Mostre esta senha ao retirar seu pedido no balcão.</p><div className="mt-6 rounded-3xl bg-white p-5 text-left shadow-sm">{items.map((item) => <p key={item.id} className="flex justify-between py-1 text-sm"><span>{item.quantity}× {item.name}</span><span>{formatCurrency(item.price * item.quantity)}</span></p>)}<p className="mt-3 border-t border-[#ead9c1] pt-3 text-sm font-bold">{receipt.paymentLabel} · Sem cobrança real</p></div><button type="button" onClick={onPrint} className="mt-6 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl border-2 border-[#481e1f] bg-white text-base font-extrabold"><Printer className="size-5" /> Imprimir recibo</button><button type="button" onClick={onFinish} className="mt-3 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#a82926] text-base font-extrabold text-white">Novo pedido <ShoppingBag className="size-5" /></button></div> }
