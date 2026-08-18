import { FormEvent, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { isVercelRuntime } from "@/lib/runtimeConfig";
import { createVercelAdminService, type AdminProductOptionInput } from "@/services/adminService";

type FormOption = { groupName: string; label: string; priceDelta: string; isRequired: boolean };
type ProductForm = { id?: string; categoryId: string; name: string; description: string; imagePath: string; price: string; originalPrice: string; isActive: boolean; requiresConfiguration: boolean; options: FormOption[] };
export type MenuCategory = { id: string | number; name: string; slug: string; sortOrder: number; isActive: boolean };
type MenuProduct = { id: string; categoryId: string; name: string; description: string | null; imagePath: string | null; priceInCents: number; originalPriceInCents: number | null; isActive: boolean; requiresConfiguration: boolean; options: Array<{ groupName: string; label: string; priceDeltaInCents: number; isRequired: boolean; sortOrder: number; isActive: boolean }> };
type CatalogSection = { category: MenuCategory; products: MenuProduct[] };
type RawVercelCatalog = {
  categories: Array<{ id: string; name: string; slug: string; sort_order: number; is_active: boolean }>;
  products: Array<{ id: string; category_id: string; name: string; description: string | null; image_path: string | null; price_in_cents: number; original_price_in_cents: number | null; is_active: boolean; requires_configuration: boolean }>;
  options: Array<{ product_id: string; group_name: string; label: string; price_delta_in_cents: number; is_required: boolean; sort_order: number; is_active: boolean }>;
};

const emptyProductForm: ProductForm = { categoryId: "", name: "", description: "", imagePath: "", price: "", originalPrice: "", isActive: true, requiresConfiguration: false, options: [] };
const adminService = createVercelAdminService();

export function formatPriceForEditor(cents: number | null | undefined) { return cents == null ? "" : (cents / 100).toFixed(2).replace(".", ","); }
export function parsePriceFromEditor(value: string) { const parsed = Number(value.trim().replace(/[R$\s.]/g, "").replace(",", ".")); return Number.isFinite(parsed) ? Math.round(parsed * 100) : 0; }

function toSlug(value: string) { return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""); }
function publicImageUrl(imagePath: string) {
  if (!imagePath || imagePath.startsWith("http") || imagePath.startsWith("/")) return imagePath;
  const projectUrl = import.meta.env.VITE_SUPABASE_URL;
  return projectUrl ? `${projectUrl}/storage/v1/object/public/marmitas-tb-assets/${imagePath}` : imagePath;
}

export function ProductImagePreview({ productName, imagePath, imageUrl }: { productName: string; imagePath?: string; imageUrl?: string }) {
  const source = publicImageUrl((imagePath ?? imageUrl ?? "").trim());
  if (!source) return <p className="rounded-xl border border-dashed border-[#dbc5a9] bg-[#fffaf1] px-3 py-4 text-sm text-[#765f50]">Informe o caminho ou URL da foto armazenada para conferir a imagem do produto.</p>;
  return <figure className="overflow-hidden rounded-xl border border-[#ead8c0] bg-[#fffaf1]"><img src={source} alt={`Prévia da foto de ${productName || "produto"}`} className="h-40 w-full object-cover" /><figcaption className="px-3 py-2 text-xs text-[#765f50]">Prévia da imagem que será exibida no cardápio.</figcaption></figure>;
}

function normalizeVercelCatalog(raw: RawVercelCatalog): CatalogSection[] {
  const optionsByProduct = new Map<string, MenuProduct["options"]>();
  raw.options.forEach((option) => {
    const options = optionsByProduct.get(option.product_id) ?? [];
    options.push({ groupName: option.group_name, label: option.label, priceDeltaInCents: option.price_delta_in_cents, isRequired: option.is_required, sortOrder: option.sort_order, isActive: option.is_active });
    optionsByProduct.set(option.product_id, options);
  });
  const productsByCategory = new Map<string, MenuProduct[]>();
  raw.products.forEach((product) => {
    const products = productsByCategory.get(product.category_id) ?? [];
    products.push({ id: product.id, categoryId: product.category_id, name: product.name, description: product.description, imagePath: product.image_path, priceInCents: product.price_in_cents, originalPriceInCents: product.original_price_in_cents, isActive: product.is_active, requiresConfiguration: product.requires_configuration, options: optionsByProduct.get(product.id) ?? [] });
    productsByCategory.set(product.category_id, products);
  });
  return raw.categories.map((category) => ({ category: { id: category.id, name: category.name, slug: category.slug, sortOrder: category.sort_order, isActive: category.is_active }, products: productsByCategory.get(category.id) ?? [] }));
}

export function CategoryManagerList({ categories, onSaveCategory, pending = false }: { categories: MenuCategory[]; onSaveCategory: (category: MenuCategory) => void; pending?: boolean }) {
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [draft, setDraft] = useState({ name: "", sortOrder: "0" });
  return <section aria-label="Gerenciar categorias" className="rounded-2xl border border-[#ead7bc] bg-white p-4"><h3 className="font-display text-lg font-semibold">Categorias existentes</h3><ul className="mt-3 divide-y divide-[#f0e4d1]">{categories.map((category) => {
    const isEditing = editingId === category.id;
    return <li key={category.id} className="py-3">{isEditing ? <div className="grid gap-2 sm:grid-cols-[1fr_5rem_auto_auto]"><Input aria-label={`Nome da categoria ${category.name}`} value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} /><Input aria-label={`Ordem da categoria ${category.name}`} inputMode="numeric" value={draft.sortOrder} onChange={(event) => setDraft((current) => ({ ...current, sortOrder: event.target.value }))} /><Button type="button" size="sm" disabled={pending} onClick={() => { const name = draft.name.trim(); if (!name) return; onSaveCategory({ ...category, name, slug: toSlug(name), sortOrder: Number(draft.sortOrder) || 0 }); setEditingId(null); }}>Salvar categoria</Button><Button type="button" variant="ghost" size="sm" onClick={() => setEditingId(null)}>Cancelar</Button></div> : <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-semibold">{category.name}</p><p className="text-xs text-[#6b4c42]">Ordem {category.sortOrder} · {category.isActive ? "Visível" : "Oculta"}</p></div><div className="flex gap-2"><Button type="button" size="sm" variant="outline" onClick={() => { setEditingId(category.id); setDraft({ name: category.name, sortOrder: String(category.sortOrder) }); }}>Editar categoria</Button><Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => onSaveCategory({ ...category, isActive: !category.isActive })}>{category.isActive ? "Ocultar categoria" : "Ativar categoria"}</Button></div></div>}</li>;
  })}{categories.length === 0 && <li className="py-3 text-sm text-[#6b4c42]">Crie a primeira categoria para começar o cardápio.</li>}</ul></section>;
}

export function MenuManager() {
  const vercelRuntime = isVercelRuntime();
  const utils = trpc.useUtils();
  const legacyQuery = trpc.catalog.listAdmin.useQuery(undefined, { enabled: !vercelRuntime });
  const legacySaveProduct = trpc.catalog.upsertProduct.useMutation();
  const legacySaveCategory = trpc.catalog.upsertCategory.useMutation();
  const legacySetAvailability = trpc.catalog.setAvailability.useMutation();
  const [vercelCatalog, setVercelCatalog] = useState<CatalogSection[]>([]);
  const [vercelLoading, setVercelLoading] = useState(vercelRuntime);
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyProductForm);
  const [categoryName, setCategoryName] = useState("");
  const [categorySortOrder, setCategorySortOrder] = useState("0");
  const [saving, setSaving] = useState(false);

  const loadVercelCatalog = async () => {
    setVercelLoading(true);
    try { setVercelCatalog(normalizeVercelCatalog(await adminService.getCatalog() as RawVercelCatalog)); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível carregar o cardápio."); }
    finally { setVercelLoading(false); }
  };
  useEffect(() => { if (vercelRuntime) void loadVercelCatalog(); }, [vercelRuntime]);

  const legacyCatalog = useMemo<CatalogSection[]>(() => (legacyQuery.data ?? []).map(({ category, products }) => ({
    category: { id: String(category.id), name: category.name, slug: category.slug, sortOrder: category.sortOrder, isActive: category.isActive },
    products: products.map((product) => ({ id: String(product.id), categoryId: String(product.categoryId), name: product.name, description: product.description, imagePath: product.imageUrl, priceInCents: product.priceInCents, originalPriceInCents: product.originalPriceInCents, isActive: product.isActive, requiresConfiguration: product.requiresConfiguration, options: product.options.map((option) => ({ groupName: option.groupName, label: option.label, priceDeltaInCents: option.priceDeltaInCents, isRequired: option.isRequired, sortOrder: option.sortOrder, isActive: option.isActive })) }))
  })), [legacyQuery.data]);
  const catalog = vercelRuntime ? vercelCatalog : legacyCatalog;
  const categories = useMemo(() => catalog.map(({ category }) => category), [catalog]);
  const isLoading = vercelRuntime ? vercelLoading : legacyQuery.isLoading;

  const refresh = async () => { if (vercelRuntime) await loadVercelCatalog(); else await utils.catalog.listAdmin.invalidate(); };
  const execute = async (work: () => Promise<unknown>, success: string) => { setSaving(true); setMessage(null); try { await work(); await refresh(); setMessage(success); } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível salvar a alteração."); } finally { setSaving(false); } };
  const saveCategory = (category: MenuCategory, success = "Categoria salva no cardápio.") => execute(async () => {
    if (vercelRuntime) {
      const { id, ...categoryInput } = category;
      return adminService.upsertCategory({ ...categoryInput, ...(id ? { id: String(id) } : {}) });
    }
    return legacySaveCategory.mutateAsync({ id: Number(category.id) || undefined, name: category.name, slug: category.slug, sortOrder: category.sortOrder, isActive: category.isActive });
  }, success);
  const updateForm = <K extends keyof ProductForm>(key: K, value: ProductForm[K]) => setForm((current) => ({ ...current, [key]: value }));
  const submitCategory = (event: FormEvent) => { event.preventDefault(); const name = categoryName.trim(); if (!name) return; void saveCategory({ id: "", name, slug: toSlug(name), sortOrder: Number(categorySortOrder) || 0, isActive: true }, "Categoria adicionada ao cardápio.").then(() => { setCategoryName(""); setCategorySortOrder("0"); }); };
  const submitProduct = (event: FormEvent) => {
    event.preventDefault(); const priceInCents = parsePriceFromEditor(form.price);
    if (!form.categoryId || !form.name.trim() || priceInCents <= 0) { setMessage("Informe categoria, nome e preço do produto."); return; }
    const options: AdminProductOptionInput[] = form.options.filter((option) => option.groupName.trim() && option.label.trim()).map((option, index) => ({ groupName: option.groupName.trim(), label: option.label.trim(), priceDeltaInCents: parsePriceFromEditor(option.priceDelta), isRequired: option.isRequired, sortOrder: index, isActive: true }));
    void execute(async () => {
      if (vercelRuntime) return adminService.upsertProduct({ ...(form.id ? { id: form.id } : {}), categoryId: form.categoryId, name: form.name.trim(), description: form.description.trim() || null, imagePath: form.imagePath.trim() || null, priceInCents, originalPriceInCents: form.originalPrice.trim() ? parsePriceFromEditor(form.originalPrice) : null, isActive: form.isActive, requiresConfiguration: form.requiresConfiguration, options });
      return legacySaveProduct.mutateAsync({ ...(form.id ? { id: Number(form.id) } : {}), categoryId: Number(form.categoryId), name: form.name.trim(), description: form.description.trim() || null, imageUrl: form.imagePath.trim() || null, priceInCents, originalPriceInCents: form.originalPrice.trim() ? parsePriceFromEditor(form.originalPrice) : null, isActive: form.isActive, requiresConfiguration: form.requiresConfiguration, options });
    }, "Produto salvo no cardápio.").then(() => setForm(emptyProductForm));
  };

  return <section aria-labelledby="menu-manager-title" className="rounded-3xl border border-[#ead7bc] bg-[#fffaf1] p-5 shadow-sm md:p-6"><div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#68703d]">Cardápio</p><h2 id="menu-manager-title" className="mt-1 font-display text-2xl font-semibold">Produtos e disponibilidade</h2></div><Button type="button" onClick={() => { setForm(emptyProductForm); setMessage(null); }} className="bg-[#a82926] hover:bg-[#8c211f]">Novo produto</Button></div>
    {message && <p role="status" className="mt-4 rounded-xl bg-[#f8e9cf] px-4 py-3 text-sm text-[#5d331f]">{message}</p>}
    {legacyQuery.error && !vercelRuntime && <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">Não foi possível carregar o cardápio.</p>}
    <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_1.15fr]"><div className="space-y-5"><form onSubmit={submitCategory} className="rounded-2xl border border-[#ead7bc] bg-white p-4"><h3 className="font-display text-lg font-semibold">Nova categoria</h3><div className="mt-3 grid gap-3 sm:grid-cols-[1fr_7rem]"><div className="space-y-1.5"><Label htmlFor="category-name">Nome</Label><Input id="category-name" value={categoryName} onChange={(event) => setCategoryName(event.target.value)} placeholder="Ex.: Marmitas especiais" /></div><div className="space-y-1.5"><Label htmlFor="category-sort">Ordem</Label><Input id="category-sort" inputMode="numeric" value={categorySortOrder} onChange={(event) => setCategorySortOrder(event.target.value)} /></div></div><Button type="submit" size="sm" disabled={saving} className="mt-3 bg-[#68703d] hover:bg-[#566031]">Adicionar categoria</Button></form>
      <CategoryManagerList categories={categories} pending={saving} onSaveCategory={(category) => void saveCategory(category)} />
      <div className="space-y-3">{isLoading && <p className="text-sm text-[#6b4c42]">Carregando cardápio…</p>}{catalog.map(({ category, products }) => <article key={category.id} className="rounded-2xl border border-[#ead7bc] bg-white p-4"><div className="flex items-start justify-between gap-4"><div><h3 className="font-display text-lg font-semibold">{category.name}</h3><p className="mt-1 text-xs text-[#6b4c42]">{products.length} produto(s) · ordem {category.sortOrder}</p></div><span className={category.isActive ? "rounded-full bg-[#e7eddb] px-2 py-1 text-xs font-bold text-[#506027]" : "rounded-full bg-stone-100 px-2 py-1 text-xs font-bold text-stone-600"}>{category.isActive ? "Ativa" : "Oculta"}</span></div><ul className="mt-3 divide-y divide-[#f0e4d1]">{products.map((product) => <li key={product.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><p className="font-semibold">{product.name}</p><p className="text-sm text-[#6b4c42]">R$ {formatPriceForEditor(product.priceInCents)}{product.originalPriceInCents ? ` · de R$ ${formatPriceForEditor(product.originalPriceInCents)}` : ""}</p></div><div className="flex items-center gap-2"><Button type="button" variant="outline" size="sm" onClick={() => setForm({ id: product.id, categoryId: product.categoryId, name: product.name, description: product.description ?? "", imagePath: product.imagePath ?? "", price: formatPriceForEditor(product.priceInCents), originalPrice: formatPriceForEditor(product.originalPriceInCents), isActive: product.isActive, requiresConfiguration: product.requiresConfiguration, options: product.options.map((option) => ({ groupName: option.groupName, label: option.label, priceDelta: formatPriceForEditor(option.priceDeltaInCents), isRequired: option.isRequired })) })}>Editar</Button><Button type="button" variant="outline" size="sm" disabled={saving} onClick={() => void execute(async () => { if (vercelRuntime) return adminService.setProductAvailability(product.id, !product.isActive); return legacySetAvailability.mutateAsync({ productId: Number(product.id), available: !product.isActive }); }, product.isActive ? "Produto pausado." : "Produto ativado.")}>{product.isActive ? "Pausar" : "Ativar"}</Button></div></li>)}{products.length === 0 && <li className="py-3 text-sm text-[#6b4c42]">Nenhum produto nesta categoria.</li>}</ul></article>)}</div></div>
      <form onSubmit={submitProduct} className="rounded-2xl border border-[#ead7bc] bg-white p-4 md:p-5"><h3 className="font-display text-xl font-semibold">{form.id ? "Editar produto" : "Cadastrar produto"}</h3><div className="mt-4 grid gap-4 sm:grid-cols-2"><div className="space-y-1.5"><Label htmlFor="product-category">Categoria</Label><select id="product-category" value={form.categoryId} onChange={(event) => updateForm("categoryId", event.target.value)} className="h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm"><option value="">Selecione</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></div><div className="space-y-1.5"><Label htmlFor="product-name">Nome</Label><Input id="product-name" value={form.name} onChange={(event) => updateForm("name", event.target.value)} /></div><div className="space-y-1.5"><Label htmlFor="product-price">Preço (R$)</Label><Input id="product-price" inputMode="decimal" placeholder="25,00" value={form.price} onChange={(event) => updateForm("price", event.target.value)} /></div><div className="space-y-1.5"><Label htmlFor="product-original-price">Preço promocional anterior (R$)</Label><Input id="product-original-price" inputMode="decimal" placeholder="Opcional" value={form.originalPrice} onChange={(event) => updateForm("originalPrice", event.target.value)} /></div></div><div className="mt-4 space-y-1.5"><Label htmlFor="product-description">Descrição</Label><Textarea id="product-description" value={form.description} onChange={(event) => updateForm("description", event.target.value)} /></div><div className="mt-4 space-y-2"><Label htmlFor="product-image">Caminho ou URL da foto</Label><Input id="product-image" value={form.imagePath} onChange={(event) => updateForm("imagePath", event.target.value)} placeholder="produtos/marmita.jpg" /><ProductImagePreview productName={form.name} imagePath={form.imagePath} /></div><div className="mt-4 flex flex-wrap gap-6"><label className="flex items-center gap-2 text-sm font-medium"><Switch checked={form.isActive} onCheckedChange={(checked) => updateForm("isActive", checked)} /> Disponível no cardápio</label><label className="flex items-center gap-2 text-sm font-medium"><Switch checked={form.requiresConfiguration} onCheckedChange={(checked) => updateForm("requiresConfiguration", checked)} /> Requer configuração</label></div><div className="mt-5 rounded-xl bg-[#fffaf1] p-3"><div className="flex items-center justify-between gap-3"><h4 className="font-semibold">Opções configuráveis</h4><Button type="button" size="sm" variant="outline" onClick={() => updateForm("options", [...form.options, { groupName: "", label: "", priceDelta: "0,00", isRequired: false }])}>Adicionar opção</Button></div><div className="mt-3 space-y-3">{form.options.map((option, index) => <div key={`${index}-${option.label}`} className="grid gap-2 rounded-lg border border-[#ead7bc] p-3 sm:grid-cols-[1fr_1fr_8rem_auto_auto]"><Input aria-label={`Grupo da opção ${index + 1}`} value={option.groupName} onChange={(event) => updateForm("options", form.options.map((current, itemIndex) => itemIndex === index ? { ...current, groupName: event.target.value } : current))} placeholder="Ex.: Tamanho" /><Input aria-label={`Nome da opção ${index + 1}`} value={option.label} onChange={(event) => updateForm("options", form.options.map((current, itemIndex) => itemIndex === index ? { ...current, label: event.target.value } : current))} placeholder="Ex.: Grande" /><Input aria-label={`Preço adicional da opção ${index + 1}`} inputMode="decimal" value={option.priceDelta} onChange={(event) => updateForm("options", form.options.map((current, itemIndex) => itemIndex === index ? { ...current, priceDelta: event.target.value } : current))} /><label className="flex items-center gap-2 text-xs"><Switch checked={option.isRequired} onCheckedChange={(checked) => updateForm("options", form.options.map((current, itemIndex) => itemIndex === index ? { ...current, isRequired: checked } : current))} /> Obrigatória</label><Button type="button" size="sm" variant="ghost" onClick={() => updateForm("options", form.options.filter((_, itemIndex) => itemIndex !== index))}>Remover</Button></div>)}{form.options.length === 0 && <p className="text-sm text-[#6b4c42]">Adicione opções para permitir personalização no pedido.</p>}</div></div><Button type="submit" disabled={saving} className="mt-5 bg-[#a82926] hover:bg-[#8c211f]">{saving ? "Salvando…" : "Salvar produto"}</Button></form></div></section>;
}
