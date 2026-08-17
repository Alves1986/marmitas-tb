import { useMemo, useState } from "react";
import { ArrowUpRight, Plus, Search, Sparkles } from "lucide-react";
import type { Product } from "@shared/order";
import { categories, products } from "@/data/catalog";
import { useOrder } from "@/contexts/OrderContext";
import { formatCurrency } from "@/lib/order";
import { toast } from "sonner";
import { ProductConfigurator } from "./ProductConfigurator";
import { DesktopOrderSummary } from "./OrderActions";

const accentStyles = {
  red: "from-[#a82926] via-[#c14b32] to-[#e6a050]",
  green: "from-[#68703d] via-[#8b984d] to-[#c9c46c]",
  gold: "from-[#bb6e2e] via-[#e2a34c] to-[#ffda7c]",
} as const;

function discountPercentage(product: Product) {
  if (!product.originalPrice) return null;
  return Math.round((1 - product.price / product.originalPrice) * 100);
}

export function ProductCatalog() {
  const { addProduct } = useOrder();
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState("all");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("pt-BR");
    return products.filter((product) => {
      const matchesCategory = categoryId === "all" || product.categoryId === categoryId;
      const matchesQuery = !normalizedQuery || [product.name, product.description, product.categoryLabel].some((value) => value.toLocaleLowerCase("pt-BR").includes(normalizedQuery));
      return matchesCategory && matchesQuery;
    });
  }, [categoryId, query]);

  function addItem(product: Product) {
    if (product.options?.length) {
      setSelectedProduct(product);
      return;
    }
    addProduct(product, [], "");
    toast.success(`${product.name} adicionado à sacola.`);
  }

  return (
    <section id="cardapio" className="scroll-mt-20 bg-[#fffaf1] py-13 sm:py-18">
      <div className="container">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.18em] text-[#a82926]"><Sparkles className="size-3.5" /> Cardápio da casa</p><h2 className="font-display mt-2 text-4xl tracking-[-0.045em] text-[#481e1f] sm:text-5xl">Hoje tem comida boa.</h2><p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#765f50] sm:text-base">Monte seu pedido com opções que combinam com a sua rotina. Os valores são atualizados a cada escolha.</p></div><span className="w-fit rounded-full bg-[#edf0d5] px-3 py-2 text-xs font-bold text-[#57622f]">{filteredProducts.length} opções encontradas</span></div>
        <div className="mt-8 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><label className="relative block max-w-lg flex-1"><Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[#8f7765]" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Busque por produto ou ingrediente" className="h-12 w-full rounded-2xl border border-[#e5d5bc] bg-white pl-11 pr-4 text-sm text-[#481e1f] outline-none transition placeholder:text-[#a58f7a] focus:border-[#a82926] focus:ring-4 focus:ring-[#a82926]/10" /></label><div className="flex gap-2 overflow-x-auto pb-1 lg:justify-end">{[{ id: "all", label: "Todos" }, ...categories].map((category) => <button key={category.id} type="button" onClick={() => setCategoryId(category.id)} className={`shrink-0 rounded-full px-3.5 py-2 text-xs font-extrabold transition ${categoryId === category.id ? "bg-[#481e1f] text-[#fff8e9] shadow-sm" : "bg-[#f2e6d0] text-[#664b3d] hover:bg-[#e9d9bf]"}`}>{category.label}</button>)}</div></div>
        <div className="mt-10 grid gap-7 xl:grid-cols-[minmax(0,1fr)_16rem]">
          <div className="space-y-13">
          {categories.map((category) => {
            const categoryProducts = filteredProducts.filter((product) => product.categoryId === category.id);
            if (!categoryProducts.length) return null;
            return <div key={category.id}><div className="mb-5 flex items-end justify-between gap-4"><div><h3 className="font-display text-3xl tracking-[-0.035em] text-[#481e1f]">{category.label}</h3><p className="mt-1 text-sm text-[#806859]">{category.description}</p></div><span className="hidden text-xs font-bold uppercase tracking-[0.12em] text-[#a58f7a] sm:block">{categoryProducts.length} itens</span></div><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{categoryProducts.map((product) => <ProductCard key={product.id} product={product} onAdd={() => addItem(product)} />)}</div></div>;
          })}
          {!filteredProducts.length && <div className="rounded-[1.8rem] border border-dashed border-[#d5bc9e] bg-[#fff6e8] px-6 py-15 text-center"><p className="font-display text-3xl text-[#481e1f]">Não encontramos essa opção.</p><p className="mt-2 text-sm text-[#765f50]">Tente outro nome, ingrediente ou categoria.</p><button type="button" onClick={() => { setQuery(""); setCategoryId("all"); }} className="mt-5 text-sm font-extrabold text-[#a82926] underline underline-offset-4">Limpar filtros</button></div>}
          </div>
          <DesktopOrderSummary />
        </div>
      </div>
      <ProductConfigurator product={selectedProduct} onOpenChange={(isOpen) => !isOpen && setSelectedProduct(null)} />
    </section>
  );
}

function ProductCard({ product, onAdd }: { product: Product; onAdd: () => void }) {
  const discount = discountPercentage(product);
  return (
    <article className="group relative flex min-h-67 flex-col overflow-hidden rounded-[1.55rem] border border-[#eadbc5] bg-white p-4 shadow-[0_8px_25px_rgba(72,30,31,0.045)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_17px_34px_rgba(72,30,31,0.11)]">
      <div className={`relative flex h-31 items-start justify-between overflow-hidden rounded-[1.1rem] bg-gradient-to-br ${accentStyles[product.accent ?? "red"]} p-3.5 text-white`}>
        {product.imageUrl ? <img src={product.imageUrl} alt={`Foto de ${product.name}`} loading="lazy" decoding="async" className="absolute inset-0 size-full object-cover" /> : null}
        <div className="absolute inset-0 bg-gradient-to-t from-[#481e1f]/55 via-transparent to-black/10" />
        <div className="absolute -bottom-7 -right-5 size-27 rounded-full border-[10px] border-white/15" />
        <span className="relative rounded-full bg-[#481e1f]/75 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em] backdrop-blur-sm">{product.badge ?? product.categoryLabel}</span>
      </div>
      <div className="flex flex-1 flex-col px-1 pt-4"><div className="flex items-start justify-between gap-3"><h4 className="text-[15px] font-extrabold leading-snug text-[#481e1f]">{product.name}</h4>{discount ? <span className="shrink-0 rounded-full bg-[#f9e0ce] px-2 py-1 text-[10px] font-black text-[#a82926]">-{discount}%</span> : null}</div><p className="mt-2 line-clamp-3 text-xs leading-relaxed text-[#806859]">{product.description}</p><div className="mt-auto flex items-end justify-between gap-3 pt-4"><div><div className="text-base font-black text-[#a82926]">{formatCurrency(product.price)}</div>{product.originalPrice ? <div className="mt-0.5 text-[11px] font-semibold text-[#a58f7a] line-through">{formatCurrency(product.originalPrice)}</div> : <div className="mt-0.5 text-[11px] font-semibold text-[#a58f7a]">{product.options?.length ? "Personalizável" : "Pronto para pedir"}</div>}</div><button type="button" onClick={onAdd} className="inline-flex size-10 items-center justify-center rounded-xl bg-[#481e1f] text-white shadow-sm transition hover:bg-[#a82926] active:scale-95" aria-label={`Adicionar ${product.name}`}><Plus className="size-5" /></button></div></div>
      <button type="button" onClick={onAdd} className="absolute inset-0 z-0 cursor-pointer opacity-0" tabIndex={-1} aria-hidden="true" />
      <ArrowUpRight className="pointer-events-none absolute right-5 top-5 size-4 text-white/75 opacity-0 transition group-hover:opacity-100" />
    </article>
  );
}
