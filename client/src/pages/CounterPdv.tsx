import { ArrowLeft, Banknote, CheckCircle2, CreditCard, LoaderCircle, Plus, Search, ShoppingBag, Ticket, Trash2, UtensilsCrossed, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { OperationsAccessGate } from "@/pages/Operations";
import { brandAsset } from "@/data/assets";
import { formatCurrency } from "@/lib/order";
import { counterOrderService, type CounterOrderConfirmation, type CounterOrderPayload, type CounterPaymentMethod } from "@/services/counterOrderService";

type PublicMenu = {
  categories: Array<{ id: string; name: string; slug: string; sortOrder: number }>;
  products: Array<{
    id: string;
    categoryId: string;
    name: string;
    description: string | null;
    imagePath: string | null;
    priceInCents: number;
    originalPriceInCents: number | null;
    requiresConfiguration: boolean;
    options: Array<{ id: string; groupName: string; label: string; priceDeltaInCents: number; isRequired: boolean; sortOrder: number }>;
  }>;
};

type CounterCartItem = {
  key: string;
  productId: string;
  name: string;
  quantity: number;
  optionIds: string[];
  optionLabels: string[];
  note: string;
  unitPriceInCents: number;
};

type CounterPdvContentProps = {
  role?: "user" | "staff" | "admin" | null;
  initialCatalog?: PublicMenu;
  submitOrder?: (payload: CounterOrderPayload) => Promise<CounterOrderConfirmation>;
};

const PAYMENT_OPTIONS: Array<{ value: CounterPaymentMethod; label: string; detail: string; icon: typeof Banknote }> = [
  { value: "cash", label: "Dinheiro", detail: "Valor recebido no balcão", icon: Banknote },
  { value: "pix", label: "PIX", detail: "Confirmado pelo operador", icon: Ticket },
  { value: "debit_card", label: "Débito", detail: "Aprovado no terminal externo", icon: CreditCard },
  { value: "credit_card", label: "Crédito", detail: "Aprovado no terminal externo", icon: CreditCard },
  { value: "voucher", label: "Voucher", detail: "Aceito pelo operador", icon: Ticket },
];

function ticketPrice(product: PublicMenu["products"][number], optionIds: string[]) {
  const selected = new Set(optionIds);
  return product.priceInCents + product.options.filter((option) => selected.has(option.id)).reduce((total, option) => total + option.priceDeltaInCents, 0);
}

function defaultOptionIds(product: PublicMenu["products"][number]) {
  const byGroup = new Map<string, PublicMenu["products"][number]["options"]>();
  for (const option of product.options) {
    const group = byGroup.get(option.groupName) ?? [];
    group.push(option);
    byGroup.set(option.groupName, group);
  }
  return Array.from(byGroup.values()).flatMap((group) => {
    const firstRequired = [...group].sort((left, right) => left.sortOrder - right.sortOrder).find((option) => option.isRequired);
    return firstRequired ? [firstRequired.id] : [];
  });
}

function isConfigurationComplete(product: PublicMenu["products"][number], optionIds: string[]) {
  const selected = new Set(optionIds);
  return Array.from(new Set(product.options.filter((option) => option.isRequired).map((option) => option.groupName)))
    .every((groupName) => product.options.some((option) => option.groupName === groupName && selected.has(option.id)));
}

export function CounterPdvContent({ role, initialCatalog, submitOrder = counterOrderService.submit }: CounterPdvContentProps) {
  const [catalog, setCatalog] = useState<PublicMenu | null>(initialCatalog ?? null);
  const [activeCategory, setActiveCategory] = useState(initialCatalog?.categories[0]?.id ?? "");
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<CounterCartItem[]>([]);
  const [configuring, setConfiguring] = useState<PublicMenu["products"][number] | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [itemNote, setItemNote] = useState("");
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [processing, setProcessing] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<CounterOrderConfirmation | null>(null);
  const [attemptId, setAttemptId] = useState(() => crypto.randomUUID());

  useEffect(() => {
    if (initialCatalog) return;
    let active = true;
    void fetch("/api/public/menu")
      .then((response) => response.ok ? response.json() as Promise<PublicMenu> : Promise.reject(new Error("cardápio indisponível")))
      .then((menu) => {
        if (!active) return;
        setCatalog(menu);
        setActiveCategory(menu.categories[0]?.id ?? "");
      })
      .catch(() => { if (active) setSubmissionError("Não foi possível carregar o cardápio do PDV."); });
    return () => { active = false; };
  }, [initialCatalog]);

  const visibleProducts = useMemo(() => (catalog?.products ?? []).filter((product) => {
    const matchesCategory = !activeCategory || product.categoryId === activeCategory;
    const matchesQuery = !query.trim() || `${product.name} ${product.description ?? ""}`.toLocaleLowerCase("pt-BR").includes(query.trim().toLocaleLowerCase("pt-BR"));
    return matchesCategory && matchesQuery;
  }), [activeCategory, catalog, query]);
  const totalInCents = cart.reduce((total, item) => total + item.unitPriceInCents * item.quantity, 0);

  function addProduct(product: PublicMenu["products"][number], optionIds: string[], note: string) {
    const key = `${product.id}:${[...optionIds].sort().join(",")}:${note.trim()}`;
    const item: CounterCartItem = {
      key,
      productId: product.id,
      name: product.name,
      quantity: 1,
      optionIds,
      optionLabels: product.options.filter((option) => optionIds.includes(option.id)).map((option) => option.label),
      note: note.trim(),
      unitPriceInCents: ticketPrice(product, optionIds),
    };
    setCart((current) => {
      const existing = current.find((entry) => entry.key === key);
      return existing ? current.map((entry) => entry.key === key ? { ...entry, quantity: entry.quantity + 1 } : entry) : [...current, item];
    });
    setConfiguring(null);
    setSelectedOptions([]);
    setItemNote("");
  }

  function startProduct(product: PublicMenu["products"][number]) {
    if (!product.requiresConfiguration && product.options.length === 0) return addProduct(product, [], "");
    const defaults = defaultOptionIds(product);
    setConfiguring(product);
    setSelectedOptions(defaults);
    setItemNote("");
  }

  function chooseOption(groupName: string, optionId: string) {
    if (!configuring) return;
    const groupOptionIds = configuring.options.filter((option) => option.groupName === groupName).map((option) => option.id);
    setSelectedOptions((current) => [...current.filter((id) => !groupOptionIds.includes(id)), optionId]);
  }

  async function submit(paymentMethod: CounterPaymentMethod) {
    if (!cart.length) return;
    setProcessing(true);
    setSubmissionError(null);
    try {
      const nextConfirmation = await submitOrder({
        id: attemptId,
        displayName: displayName.trim() || undefined,
        paymentMethod,
        items: cart.map((item) => ({ productId: item.productId, quantity: item.quantity, optionIds: item.optionIds, note: item.note })),
      });
      setConfirmation(nextConfirmation);
      setPaymentOpen(false);
    } catch (error) {
      setSubmissionError(error instanceof Error ? error.message : "Não foi possível confirmar a venda de balcão.");
    } finally {
      setProcessing(false);
    }
  }

  function resetSale() {
    counterOrderService.reset(attemptId);
    setCart([]);
    setDisplayName("");
    setPaymentOpen(false);
    setSubmissionError(null);
    setConfirmation(null);
    setAttemptId(crypto.randomUUID());
  }

  if (confirmation) {
    return <main className="min-h-screen bg-[#fffaf1] p-5 text-[#481e1f] sm:p-8"><section className="mx-auto grid max-w-xl gap-6 rounded-[2rem] border border-[#dfe5c5] bg-white p-8 text-center shadow-[0_20px_60px_rgba(72,30,31,0.12)]"><div className="mx-auto grid size-16 place-items-center rounded-full bg-[#e9efd4] text-[#68703d]"><CheckCircle2 className="size-10" /></div><div><p className="text-xs font-extrabold uppercase tracking-[.16em] text-[#68703d]">Venda registrada</p><h1 className="mt-2 font-display text-4xl font-bold">Senha de retirada</h1><strong className="mt-5 block font-display text-6xl tracking-wide text-[#a82926]">{confirmation.ticket}</strong><p className="mt-4 text-sm text-[#765f50]">Pedido {confirmation.orderNumber} · {confirmation.estimatedTime}</p></div><div className="rounded-2xl bg-[#fff7e8] p-4 text-sm text-[#6b4c42]">Pagamento registrado presencialmente. Nenhuma cobrança foi processada pelo sistema.</div><button type="button" onClick={resetSale} className="min-h-12 rounded-xl bg-[#a82926] px-5 font-bold text-white transition hover:bg-[#7e1f1d] active:scale-[.98]">Iniciar nova venda</button></section></main>;
  }

  return <OperationsAccessGate role={role}>
    <main className="min-h-screen bg-[#fffaf1] text-[#481e1f]">
      <header className="border-b border-[#ead9c0] bg-white/90 backdrop-blur"><div className="container flex min-h-20 flex-wrap items-center justify-between gap-4 py-4"><div><p className="text-xs font-extrabold uppercase tracking-[.15em] text-[#68703d]">Marmitas TB · atendimento presencial</p><h1 className="mt-1 flex items-center gap-2 font-display text-3xl font-bold"><UtensilsCrossed className="size-7 text-[#a82926]" />PDV de balcão</h1></div><a href="/operacao" className="inline-flex min-h-11 items-center rounded-xl border border-[#c9b28f] px-4 text-sm font-bold transition hover:bg-[#fff5df]"><ArrowLeft className="mr-2 size-4" />Fila operacional</a></div></header>
      <div className="container grid gap-5 py-6 lg:grid-cols-[13rem_minmax(0,1fr)_22rem]">
        <aside className="rounded-2xl border border-[#ead9c0] bg-white p-3 shadow-sm"><p className="px-2 pb-2 text-xs font-extrabold uppercase tracking-[.14em] text-[#765f50]">Categorias</p><div className="flex gap-2 overflow-x-auto lg:flex-col">{catalog?.categories.map((category) => <button key={category.id} type="button" onClick={() => setActiveCategory(category.id)} className={`min-h-11 shrink-0 rounded-xl px-3 text-left text-sm font-bold transition ${activeCategory === category.id ? "bg-[#68703d] text-white" : "hover:bg-[#fff5df]"}`}>{category.name}</button>)}</div></aside>
        <section className="min-w-0"><label className="flex min-h-12 items-center gap-2 rounded-xl border border-[#c9b28f] bg-white px-3 shadow-sm"><Search className="size-5 text-[#765f50]" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar no cardápio" className="w-full bg-transparent text-sm outline-none" /></label>{submissionError && !paymentOpen ? <p role="alert" className="mt-4 rounded-xl border border-[#f2b4a2] bg-[#fff1eb] p-3 text-sm font-bold text-[#8c2522]">{submissionError}</p> : null}<div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{visibleProducts.map((product) => <article key={product.id} className="overflow-hidden rounded-2xl border border-[#ead9c0] bg-white shadow-sm"><img src={product.imagePath ?? brandAsset("logo-marmitastb.jpg")} alt="" className="h-28 w-full object-cover" /><div className="p-4"><h2 className="font-display text-xl font-bold">{product.name}</h2><p className="mt-1 min-h-10 text-sm leading-5 text-[#765f50]">{product.description}</p><div className="mt-4 flex items-end justify-between gap-2"><strong className="text-lg text-[#a82926]">{formatCurrency(product.priceInCents / 100)}</strong><button type="button" onClick={() => startProduct(product)} aria-label={`Adicionar ${product.name}`} className="inline-flex min-h-10 items-center rounded-lg bg-[#a82926] px-3 text-sm font-bold text-white transition hover:bg-[#7e1f1d]"><Plus className="mr-1 size-4" />Adicionar</button></div></div></article>)}</div>{catalog && !visibleProducts.length ? <p className="mt-8 text-sm text-[#765f50]">Nenhum produto encontrado nesta categoria.</p> : null}{!catalog ? <div className="mt-8 grid place-items-center rounded-2xl border border-dashed border-[#c9b28f] p-12 text-[#765f50]"><LoaderCircle className="size-7 animate-spin" /><p className="mt-3 text-sm">Carregando cardápio do PDV…</p></div> : null}</section>
        <aside className="rounded-2xl border border-[#ead9c0] bg-white p-4 shadow-[0_12px_35px_rgba(72,30,31,0.08)] lg:sticky lg:top-4 lg:h-fit"><div className="flex items-center justify-between"><h2 className="flex items-center gap-2 font-display text-2xl font-bold"><ShoppingBag className="size-5 text-[#a82926]" />Venda atual</h2><span className="rounded-full bg-[#fff1d7] px-2 py-1 text-xs font-extrabold text-[#765f50]">{cart.reduce((sum, item) => sum + item.quantity, 0)} itens</span></div><div className="mt-4 space-y-3">{cart.length ? cart.map((item) => <div key={item.key} className="rounded-xl bg-[#fffaf1] p-3"><div className="flex gap-2"><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{item.name}</p>{item.optionLabels.length ? <p className="mt-1 text-xs text-[#765f50]">{item.optionLabels.join(" · ")}</p> : null}{item.note ? <p className="mt-1 text-xs italic text-[#765f50]">{item.note}</p> : null}<p className="mt-2 text-sm font-bold text-[#a82926]">{formatCurrency(item.unitPriceInCents / 100)}</p></div><button type="button" aria-label={`Remover ${item.name}`} onClick={() => setCart((current) => current.filter((entry) => entry.key !== item.key))} className="size-9 rounded-lg text-[#8c2522] hover:bg-[#fff0ee]"><Trash2 className="mx-auto size-4" /></button></div><div className="mt-2 flex items-center gap-2"><button type="button" onClick={() => setCart((current) => current.map((entry) => entry.key === item.key && entry.quantity > 1 ? { ...entry, quantity: entry.quantity - 1 } : entry))} className="size-8 rounded-lg border border-[#c9b28f] font-bold">−</button><span className="min-w-6 text-center text-sm font-bold">{item.quantity}</span><button type="button" onClick={() => setCart((current) => current.map((entry) => entry.key === item.key ? { ...entry, quantity: entry.quantity + 1 } : entry))} className="size-8 rounded-lg border border-[#c9b28f] font-bold">+</button></div></div>) : <p className="rounded-xl border border-dashed border-[#c9b28f] p-4 text-center text-sm text-[#765f50]">Adicione itens para iniciar a venda.</p>}</div><div className="mt-5 border-t border-[#ead9c0] pt-4"><div className="flex items-center justify-between"><span className="font-bold">Total</span><strong className="font-display text-3xl text-[#a82926]">{formatCurrency(totalInCents / 100)}</strong></div><button type="button" disabled={!cart.length} onClick={() => { setPaymentOpen(true); setSubmissionError(null); }} className="mt-4 min-h-12 w-full rounded-xl bg-[#68703d] px-4 font-bold text-white transition hover:bg-[#4e5729] disabled:cursor-not-allowed disabled:opacity-50">Finalizar venda</button></div></aside>
      </div>
      {configuring ? <section role="dialog" aria-modal="true" aria-label="Configurar produto" className="fixed inset-0 z-40 bg-[#281313]/35 p-4"><div className="ml-auto flex h-full max-w-md flex-col overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-extrabold uppercase tracking-[.14em] text-[#68703d]">Personalizar</p><h2 className="mt-1 font-display text-3xl font-bold">{configuring.name}</h2></div><button type="button" onClick={() => setConfiguring(null)} aria-label="Fechar configuração" className="size-10 rounded-xl hover:bg-[#fff5df]"><X className="mx-auto size-5" /></button></div><div className="mt-6 space-y-6">{Array.from(new Set(configuring.options.map((option) => option.groupName))).map((groupName) => { const group = configuring.options.filter((option) => option.groupName === groupName).sort((left, right) => left.sortOrder - right.sortOrder); const required = group.some((option) => option.isRequired); return <fieldset key={groupName}><legend className="font-bold">{groupName}{required ? <span className="ml-1 text-[#a82926]">*</span> : null}</legend><div className="mt-2 grid gap-2">{group.map((option) => <button key={option.id} type="button" onClick={() => chooseOption(groupName, option.id)} className={`flex min-h-11 items-center justify-between rounded-xl border px-3 text-left text-sm transition ${selectedOptions.includes(option.id) ? "border-[#68703d] bg-[#f1f4e4]" : "border-[#ead9c0] hover:bg-[#fffaf1]"}`}><span>{option.label}</span><span className="font-bold text-[#765f50]">{option.priceDeltaInCents ? `+ ${formatCurrency(option.priceDeltaInCents / 100)}` : "Incluído"}</span></button>)}</div></fieldset>; })}<label className="grid gap-2 text-sm font-bold">Observação<textarea value={itemNote} onChange={(event) => setItemNote(event.target.value)} maxLength={500} placeholder="Ex.: sem cebola" className="min-h-24 rounded-xl border border-[#c9b28f] p-3 font-normal outline-none focus:border-[#68703d]" /></label></div><button type="button" disabled={!isConfigurationComplete(configuring, selectedOptions)} onClick={() => addProduct(configuring, selectedOptions, itemNote)} className="mt-6 min-h-12 rounded-xl bg-[#a82926] px-4 font-bold text-white disabled:opacity-50">Adicionar ao pedido · {formatCurrency(ticketPrice(configuring, selectedOptions) / 100)}</button></div></section> : null}
      {paymentOpen ? <section role="dialog" aria-modal="true" aria-label="Confirmar pagamento" className="fixed inset-0 z-40 grid place-items-center bg-[#281313]/35 p-4"><div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-extrabold uppercase tracking-[.14em] text-[#68703d]">Concluir venda</p><h2 className="mt-1 font-display text-3xl font-bold">Selecione a forma de pagamento</h2></div><button type="button" disabled={processing} onClick={() => setPaymentOpen(false)} aria-label="Fechar pagamento" className="size-10 rounded-xl hover:bg-[#fff5df]"><X className="mx-auto size-5" /></button></div><p className="mt-3 rounded-xl bg-[#fff7e8] p-3 text-sm text-[#6b4c42]">Pagamento registrado presencialmente — nenhuma cobrança será processada pelo sistema.</p><label className="mt-5 grid gap-2 text-sm font-bold">Nome do cliente <span className="font-normal text-[#765f50]">(opcional)</span><input value={displayName} onChange={(event) => setDisplayName(event.target.value)} maxLength={80} placeholder="Ex.: Anderson" className="min-h-11 rounded-xl border border-[#c9b28f] px-3 font-normal outline-none focus:border-[#68703d]" /></label><div className="mt-5 grid gap-2 sm:grid-cols-2">{PAYMENT_OPTIONS.map(({ value, label, detail, icon: Icon }) => <button key={value} type="button" disabled={processing} onClick={() => { void submit(value); }} className="min-h-20 rounded-xl border border-[#ead9c0] p-3 text-left transition hover:border-[#68703d] hover:bg-[#f1f4e4] disabled:opacity-60"><span className="flex items-center gap-2 font-bold"><Icon className="size-5 text-[#a82926]" />Registrar {label}</span><span className="mt-1 block text-xs text-[#765f50]">{detail}</span></button>)}</div>{processing ? <p className="mt-4 flex items-center gap-2 text-sm font-bold text-[#68703d]"><LoaderCircle className="size-4 animate-spin" />Registrando venda…</p> : null}{submissionError ? <p role="alert" className="mt-4 rounded-xl border border-[#f2b4a2] bg-[#fff1eb] p-3 text-sm font-bold text-[#8c2522]">{submissionError}</p> : null}</div></section> : null}
    </main>
  </OperationsAccessGate>;
}

export default function CounterPdv() {
  const { user, loading } = useAuth();
  if (loading) return <main className="grid min-h-screen place-items-center bg-[#fffaf1]"><LoaderCircle className="size-8 animate-spin text-[#a82926]" /></main>;
  return <CounterPdvContent role={user?.role ?? null} />;
}
