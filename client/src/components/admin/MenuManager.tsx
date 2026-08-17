import { FormEvent, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";

type FormOption = {
  groupName: string;
  label: string;
  priceDelta: string;
  isRequired: boolean;
};

type ProductForm = {
  id?: number;
  categoryId: string;
  name: string;
  description: string;
  imageUrl: string;
  price: string;
  originalPrice: string;
  isActive: boolean;
  requiresConfiguration: boolean;
  options: FormOption[];
};

export type MenuCategory = {
  id: number;
  name: string;
  slug: string;
  sortOrder: number;
  isActive: boolean;
};

const emptyProductForm: ProductForm = {
  categoryId: "",
  name: "",
  description: "",
  imageUrl: "",
  price: "",
  originalPrice: "",
  isActive: true,
  requiresConfiguration: false,
  options: [],
};

export function formatPriceForEditor(cents: number | null | undefined) {
  if (cents == null) return "";
  return (cents / 100).toFixed(2).replace(".", ",");
}

export function parsePriceFromEditor(value: string) {
  const normalized = value.trim().replace(/[R$\s.]/g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : 0;
}

export function ProductImagePreview({ productName, imageUrl }: { productName: string; imageUrl: string }) {
  const source = imageUrl.trim();
  if (!source) return <p className="rounded-xl border border-dashed border-[#dbc5a9] bg-[#fffaf1] px-3 py-4 text-sm text-[#765f50]">Informe a URL de uma foto já armazenada para conferir a imagem do produto.</p>;
  return <figure className="overflow-hidden rounded-xl border border-[#ead8c0] bg-[#fffaf1]"><img src={source} alt={`Prévia da foto de ${productName || "produto"}`} className="h-40 w-full object-cover" /><figcaption className="px-3 py-2 text-xs text-[#765f50]">Prévia da imagem que será exibida no cardápio.</figcaption></figure>;
}

function toSlug(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function CategoryManagerList({ categories, onSaveCategory, pending = false }: {
  categories: MenuCategory[];
  onSaveCategory: (category: MenuCategory) => void;
  pending?: boolean;
}) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<{ name: string; sortOrder: string }>({ name: "", sortOrder: "0" });

  return (
    <section aria-label="Gerenciar categorias" className="rounded-2xl border border-[#ead7bc] bg-white p-4">
      <h3 className="font-display text-lg font-semibold">Categorias existentes</h3>
      <ul className="mt-3 divide-y divide-[#f0e4d1]">
        {categories.map((category) => {
          const isEditing = editingId === category.id;
          return <li key={category.id} className="py-3">{isEditing ? <div className="grid gap-2 sm:grid-cols-[1fr_5rem_auto_auto]"><Input aria-label={`Nome da categoria ${category.name}`} value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} /><Input aria-label={`Ordem da categoria ${category.name}`} inputMode="numeric" value={draft.sortOrder} onChange={(event) => setDraft((current) => ({ ...current, sortOrder: event.target.value }))} /><Button type="button" size="sm" disabled={pending} onClick={() => { const name = draft.name.trim(); if (!name) return; onSaveCategory({ ...category, name, slug: toSlug(name), sortOrder: Number(draft.sortOrder) || 0 }); setEditingId(null); }}>Salvar categoria</Button><Button type="button" variant="ghost" size="sm" onClick={() => setEditingId(null)}>Cancelar</Button></div> : <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-semibold">{category.name}</p><p className="text-xs text-[#6b4c42]">Ordem {category.sortOrder} · {category.isActive ? "Visível" : "Oculta"}</p></div><div className="flex gap-2"><Button type="button" size="sm" variant="outline" onClick={() => { setEditingId(category.id); setDraft({ name: category.name, sortOrder: String(category.sortOrder) }); }}>Editar categoria</Button><Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => onSaveCategory({ ...category, isActive: !category.isActive })}>{category.isActive ? "Ocultar categoria" : "Ativar categoria"}</Button></div></div>}</li>;
        })}
        {categories.length === 0 && <li className="py-3 text-sm text-[#6b4c42]">Crie a primeira categoria para começar o cardápio.</li>}
      </ul>
    </section>
  );
}

export function MenuManager() {
  const utils = trpc.useUtils();
  const { data: catalog = [], isLoading, error } = trpc.catalog.listAdmin.useQuery();
  const [form, setForm] = useState<ProductForm>(emptyProductForm);
  const [categoryName, setCategoryName] = useState("");
  const [categorySortOrder, setCategorySortOrder] = useState("0");
  const [message, setMessage] = useState<string | null>(null);

  const categoryOptions = useMemo(() => catalog.map(({ category }) => category), [catalog]);
  const saveProduct = trpc.catalog.upsertProduct.useMutation({
    onSuccess: async () => {
      await utils.catalog.listAdmin.invalidate();
      setForm(emptyProductForm);
      setMessage("Produto salvo no cardápio.");
    },
    onError: (mutationError) => setMessage(mutationError.message),
  });
  const saveCategory = trpc.catalog.upsertCategory.useMutation({
    onSuccess: async () => {
      await utils.catalog.listAdmin.invalidate();
      setCategoryName("");
      setCategorySortOrder("0");
      setMessage("Categoria adicionada ao cardápio.");
    },
    onError: (mutationError) => setMessage(mutationError.message),
  });
  const setAvailability = trpc.catalog.setAvailability.useMutation({
    onSuccess: () => utils.catalog.listAdmin.invalidate(),
    onError: (mutationError) => setMessage(mutationError.message),
  });

  const updateForm = <K extends keyof ProductForm>(key: K, value: ProductForm[K]) => setForm((current) => ({ ...current, [key]: value }));

  const submitCategory = (event: FormEvent) => {
    event.preventDefault();
    const name = categoryName.trim();
    if (!name) return;
    saveCategory.mutate({ name, slug: toSlug(name), sortOrder: Number(categorySortOrder) || 0, isActive: true });
  };

  const submitProduct = (event: FormEvent) => {
    event.preventDefault();
    const categoryId = Number(form.categoryId);
    const priceInCents = parsePriceFromEditor(form.price);
    if (!categoryId || !form.name.trim() || priceInCents <= 0) {
      setMessage("Informe categoria, nome e preço do produto.");
      return;
    }
    saveProduct.mutate({
      ...(form.id ? { id: form.id } : {}),
      categoryId,
      name: form.name.trim(),
      description: form.description.trim() || null,
      imageUrl: form.imageUrl.trim() || null,
      priceInCents,
      originalPriceInCents: form.originalPrice.trim() ? parsePriceFromEditor(form.originalPrice) : null,
      isActive: form.isActive,
      requiresConfiguration: form.requiresConfiguration,
      options: form.options.filter((option) => option.groupName.trim() && option.label.trim()).map((option, index) => ({
        groupName: option.groupName.trim(),
        label: option.label.trim(),
        priceDeltaInCents: parsePriceFromEditor(option.priceDelta),
        isRequired: option.isRequired,
        sortOrder: index,
        isActive: true,
      })),
    });
  };

  return (
    <section aria-labelledby="menu-manager-title" className="rounded-3xl border border-[#ead7bc] bg-[#fffaf1] p-5 shadow-sm md:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#68703d]">Cardápio</p>
          <h2 id="menu-manager-title" className="mt-1 font-display text-2xl font-semibold">Produtos e disponibilidade</h2>
        </div>
        <Button type="button" onClick={() => { setForm(emptyProductForm); setMessage(null); }} className="bg-[#a82926] hover:bg-[#8c211f]">Novo produto</Button>
      </div>

      {message && <p role="status" className="mt-4 rounded-xl bg-[#f8e9cf] px-4 py-3 text-sm text-[#5d331f]">{message}</p>}
      {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">Não foi possível carregar o cardápio.</p>}

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_1.15fr]">
        <div className="space-y-5">
          <form onSubmit={submitCategory} className="rounded-2xl border border-[#ead7bc] bg-white p-4">
            <h3 className="font-display text-lg font-semibold">Nova categoria</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_7rem]">
              <div className="space-y-1.5"><Label htmlFor="category-name">Nome</Label><Input id="category-name" value={categoryName} onChange={(event) => setCategoryName(event.target.value)} placeholder="Ex.: Marmitas especiais" /></div>
              <div className="space-y-1.5"><Label htmlFor="category-sort">Ordem</Label><Input id="category-sort" inputMode="numeric" value={categorySortOrder} onChange={(event) => setCategorySortOrder(event.target.value)} /></div>
            </div>
            <Button type="submit" size="sm" disabled={saveCategory.isPending} className="mt-3 bg-[#68703d] hover:bg-[#566031]">Adicionar categoria</Button>
          </form>

          <CategoryManagerList categories={categoryOptions} pending={saveCategory.isPending} onSaveCategory={(category) => saveCategory.mutate(category)} />

          <div className="space-y-3">
            {isLoading && <p className="text-sm text-[#6b4c42]">Carregando cardápio…</p>}
            {catalog.map(({ category, products }) => (
              <article key={category.id} className="rounded-2xl border border-[#ead7bc] bg-white p-4">
                <div className="flex items-start justify-between gap-4"><div><h3 className="font-display text-lg font-semibold">{category.name}</h3><p className="mt-1 text-xs text-[#6b4c42]">{products.length} produto(s) · ordem {category.sortOrder}</p></div><span className={category.isActive ? "rounded-full bg-[#e7eddb] px-2 py-1 text-xs font-bold text-[#506027]" : "rounded-full bg-stone-100 px-2 py-1 text-xs font-bold text-stone-600"}>{category.isActive ? "Ativa" : "Oculta"}</span></div>
                <ul className="mt-3 divide-y divide-[#f0e4d1]">
                  {products.map((product) => (
                    <li key={product.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                      <div><p className="font-semibold">{product.name}</p><p className="text-sm text-[#6b4c42]">R$ {formatPriceForEditor(product.priceInCents)}{product.originalPriceInCents ? ` · de R$ ${formatPriceForEditor(product.originalPriceInCents)}` : ""}</p></div>
                      <div className="flex items-center gap-2"><Button type="button" variant="outline" size="sm" onClick={() => setForm({ id: product.id, categoryId: String(product.categoryId), name: product.name, description: product.description ?? "", imageUrl: product.imageUrl ?? "", price: formatPriceForEditor(product.priceInCents), originalPrice: formatPriceForEditor(product.originalPriceInCents), isActive: product.isActive, requiresConfiguration: product.requiresConfiguration, options: product.options.map((option) => ({ groupName: option.groupName, label: option.label, priceDelta: formatPriceForEditor(option.priceDeltaInCents), isRequired: option.isRequired })) })}>Editar</Button><Button type="button" variant="outline" size="sm" disabled={setAvailability.isPending} onClick={() => setAvailability.mutate({ productId: product.id, available: !product.isActive })}>{product.isActive ? "Pausar" : "Ativar"}</Button></div>
                    </li>
                  ))}
                  {products.length === 0 && <li className="py-3 text-sm text-[#6b4c42]">Nenhum produto nesta categoria.</li>}
                </ul>
              </article>
            ))}
          </div>
        </div>

        <form onSubmit={submitProduct} className="rounded-2xl border border-[#ead7bc] bg-white p-4 md:p-5">
          <h3 className="font-display text-xl font-semibold">{form.id ? "Editar produto" : "Cadastrar produto"}</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5"><Label htmlFor="product-category">Categoria</Label><select id="product-category" value={form.categoryId} onChange={(event) => updateForm("categoryId", event.target.value)} className="h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm"><option value="">Selecione</option>{categoryOptions.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></div>
            <div className="space-y-1.5"><Label htmlFor="product-name">Nome</Label><Input id="product-name" value={form.name} onChange={(event) => updateForm("name", event.target.value)} /></div>
            <div className="space-y-1.5"><Label htmlFor="product-price">Preço (R$)</Label><Input id="product-price" inputMode="decimal" placeholder="25,00" value={form.price} onChange={(event) => updateForm("price", event.target.value)} /></div>
            <div className="space-y-1.5"><Label htmlFor="product-original-price">Preço promocional anterior (R$)</Label><Input id="product-original-price" inputMode="decimal" placeholder="Opcional" value={form.originalPrice} onChange={(event) => updateForm("originalPrice", event.target.value)} /></div>
          </div>
          <div className="mt-4 space-y-1.5"><Label htmlFor="product-description">Descrição</Label><Textarea id="product-description" value={form.description} onChange={(event) => updateForm("description", event.target.value)} /></div>
          <div className="mt-4 space-y-2"><Label htmlFor="product-image">URL da foto armazenada</Label><Input id="product-image" value={form.imageUrl} onChange={(event) => updateForm("imageUrl", event.target.value)} placeholder="/manus-storage/foto.jpg" /><ProductImagePreview productName={form.name} imageUrl={form.imageUrl} /></div>
          <div className="mt-4 flex flex-wrap gap-6"><label className="flex items-center gap-2 text-sm font-medium"><Switch checked={form.isActive} onCheckedChange={(checked) => updateForm("isActive", checked)} /> Disponível no cardápio</label><label className="flex items-center gap-2 text-sm font-medium"><Switch checked={form.requiresConfiguration} onCheckedChange={(checked) => updateForm("requiresConfiguration", checked)} /> Requer configuração</label></div>
          <div className="mt-5 rounded-xl bg-[#fffaf1] p-3"><div className="flex items-center justify-between gap-3"><h4 className="font-semibold">Opções configuráveis</h4><Button type="button" size="sm" variant="outline" onClick={() => updateForm("options", [...form.options, { groupName: "", label: "", priceDelta: "0,00", isRequired: false }])}>Adicionar opção</Button></div><div className="mt-3 space-y-3">{form.options.map((option, index) => <div key={`${index}-${option.label}`} className="grid gap-2 rounded-lg border border-[#ead7bc] p-3 sm:grid-cols-[1fr_1fr_8rem_auto_auto]"><Input aria-label={`Grupo da opção ${index + 1}`} value={option.groupName} onChange={(event) => updateForm("options", form.options.map((item, itemIndex) => itemIndex === index ? { ...item, groupName: event.target.value } : item))} placeholder="Grupo" /><Input aria-label={`Rótulo da opção ${index + 1}`} value={option.label} onChange={(event) => updateForm("options", form.options.map((item, itemIndex) => itemIndex === index ? { ...item, label: event.target.value } : item))} placeholder="Opção" /><Input aria-label={`Preço da opção ${index + 1}`} inputMode="decimal" value={option.priceDelta} onChange={(event) => updateForm("options", form.options.map((item, itemIndex) => itemIndex === index ? { ...item, priceDelta: event.target.value } : item))} placeholder="R$ 0,00" /><label className="flex items-center gap-2 text-xs"><Switch checked={option.isRequired} onCheckedChange={(checked) => updateForm("options", form.options.map((item, itemIndex) => itemIndex === index ? { ...item, isRequired: checked } : item))} />Obrigatória</label><Button type="button" variant="ghost" size="sm" onClick={() => updateForm("options", form.options.filter((_, itemIndex) => itemIndex !== index))}>Remover</Button></div>)}</div></div>
          <Button type="submit" disabled={saveProduct.isPending} className="mt-5 bg-[#a82926] hover:bg-[#8c211f]">{saveProduct.isPending ? "Salvando…" : "Salvar produto"}</Button>
        </form>
      </div>
    </section>
  );
}
