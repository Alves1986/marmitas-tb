import { ArrowLeft, Boxes, CircleAlert, History, LoaderCircle, PackagePlus, Pencil, Search, TriangleAlert, Warehouse, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  filterInventoryItems,
  formatInventoryQuantity,
  getInventoryLevelLabel,
  sortInventoryItems,
  type InventoryBoardItem,
} from "@/lib/inventoryBoard";
import {
  inventoryService,
  type CreateInventoryItemInput,
  type CreateInventoryMovementInput,
  type InventoryMovement,
  type SetInventoryItemActiveInput,
  type UpdateInventoryItemInput,
} from "@/services/inventoryService";
import type { InventoryMovementType, InventoryUnit } from "../../../shared/inventory";
import { OperationsAccessGate } from "@/pages/Operations";

type InventoryContentProps = {
  role?: "user" | "staff" | "admin" | null;
  loadInventory?: () => Promise<InventoryBoardItem[]>;
  loadHistory?: (inventoryItemId: string) => Promise<InventoryMovement[]>;
  createMovement?: (input: CreateInventoryMovementInput) => Promise<unknown>;
  createItem?: (input: CreateInventoryItemInput) => Promise<unknown>;
  updateItem?: (input: UpdateInventoryItemInput) => Promise<unknown>;
  setItemActive?: (input: SetInventoryItemActiveInput) => Promise<unknown>;
  createIdempotencyKey?: () => string;
};

const actionLabels: Record<InventoryMovementType, string> = {
  ENTRY: "entrada",
  INTERNAL_CONSUMPTION: "consumo",
  LOSS: "perda",
  ADJUSTMENT: "ajuste",
};

function InventoryLevelBadge({ item }: { item: InventoryBoardItem }) {
  const className = item.level === "critical"
    ? "border-[#eab4a6] bg-[#fff0eb] text-[#8c2522]"
    : item.level === "attention"
      ? "border-[#e6ca7b] bg-[#fff8df] text-[#8a5b12]"
      : "border-[#cdd7ae] bg-[#f2f6e7] text-[#53602c]";
  return <span className={`rounded-full border px-2.5 py-1 text-xs font-extrabold ${className}`}>{getInventoryLevelLabel(item.level)}</span>;
}

function InventoryItemCard({
  item,
  onHistory,
  onEdit,
  onDeactivate,
}: {
  item: InventoryBoardItem;
  onHistory: () => void;
  onEdit?: () => void;
  onDeactivate?: () => void;
}) {
  return <article className="rounded-2xl border border-[#e4d7c4] bg-white p-4 shadow-sm">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h3 className="font-display text-xl font-bold text-[#481e1f]">{item.name}</h3>
        <p className="mt-1 text-sm text-[#765f50]">Mínimo: {formatInventoryQuantity(item.minimumStock, item.unit)}</p>
        {!item.isActive ? <p className="mt-2 text-xs font-bold uppercase tracking-wide text-[#8c2522]">Insumo inativo</p> : null}
      </div>
      <InventoryLevelBadge item={item} />
    </div>
    <div className="mt-4 flex flex-wrap items-end justify-between gap-3 border-t border-[#ead9c0] pt-3">
      <div>
        <p className="text-xs font-extrabold uppercase tracking-[.13em] text-[#765f50]">Saldo calculado</p>
        <p className="mt-1 font-display text-2xl font-bold text-[#481e1f]">{formatInventoryQuantity(item.balanceQuantity, item.unit)}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={onHistory} className="inline-flex min-h-10 items-center rounded-lg border border-[#c9b28f] bg-white px-3 text-sm font-bold text-[#481e1f] transition hover:bg-[#fff5df]">
          <History className="mr-1.5 size-4" />Histórico
        </button>
        {onEdit ? <button type="button" aria-label={`Editar insumo ${item.name}`} onClick={onEdit} className="inline-flex min-h-10 items-center rounded-lg border border-[#c9b28f] bg-white px-3 text-sm font-bold text-[#481e1f] transition hover:bg-[#fff5df]">
          <Pencil className="mr-1.5 size-4" />Editar
        </button> : null}
        {onDeactivate ? <button type="button" aria-label={`Inativar insumo ${item.name}`} onClick={onDeactivate} className="inline-flex min-h-10 items-center rounded-lg border border-[#d9ad8e] bg-[#fff4ec] px-3 text-sm font-bold text-[#8c2522] transition hover:bg-[#ffebe1]">
          Inativar
        </button> : null}
      </div>
    </div>
  </article>;
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return <div role="dialog" aria-modal="true" aria-labelledby="inventory-dialog-title" className="fixed inset-0 z-50 grid place-items-center bg-[#481e1f]/45 p-4">
    <section className="w-full max-w-lg rounded-3xl bg-[#fffaf1] p-5 shadow-2xl">
      <div className="flex items-start justify-between gap-4">
        <h2 id="inventory-dialog-title" className="font-display text-2xl font-bold text-[#481e1f]">{title}</h2>
        <button type="button" aria-label="Fechar" onClick={onClose} className="rounded-lg p-2 text-[#765f50] hover:bg-[#f2e8d7]"><X className="size-5" /></button>
      </div>
      {children}
    </section>
  </div>;
}

export function InventoryContent({
  role,
  loadInventory = inventoryService.listItems,
  loadHistory = inventoryService.listHistory,
  createMovement = inventoryService.createMovement,
  createItem = inventoryService.createItem,
  updateItem = inventoryService.updateItem,
  setItemActive = inventoryService.setItemActive,
  createIdempotencyKey = () => crypto.randomUUID(),
}: InventoryContentProps) {
  const [items, setItems] = useState<InventoryBoardItem[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [movementType, setMovementType] = useState<InventoryMovementType | null>(null);
  const [selectedItemId, setSelectedItemId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [commandError, setCommandError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showCreateItem, setShowCreateItem] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [newItemUnit, setNewItemUnit] = useState<InventoryUnit>("kg");
  const [newItemMinimum, setNewItemMinimum] = useState("0");
  const [editItem, setEditItem] = useState<InventoryBoardItem | null>(null);
  const [editItemName, setEditItemName] = useState("");
  const [editItemMinimum, setEditItemMinimum] = useState("0");
  const [itemPendingDeactivation, setItemPendingDeactivation] = useState<InventoryBoardItem | null>(null);
  const [historyItem, setHistoryItem] = useState<InventoryBoardItem | null>(null);
  const [history, setHistory] = useState<InventoryMovement[]>([]);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const canAccessInventory = role === "staff" || role === "admin";
  const isAdmin = role === "admin";

  const refreshItems = useCallback(async () => {
    const response = await loadInventory();
    setItems(response);
  }, [loadInventory]);

  useEffect(() => {
    if (!canAccessInventory) { setLoading(false); return; }
    let active = true;
    void refreshItems()
      .then(() => { if (active) setError(null); })
      .catch(() => { if (active) setError("Não foi possível carregar estoque."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [canAccessInventory, refreshItems]);

  const visibleItems = useMemo(() => sortInventoryItems(filterInventoryItems(items, query)), [items, query]);
  const criticalCount = items.filter((item) => item.level === "critical").length;
  const attentionCount = items.filter((item) => item.level === "attention").length;
  const selectedItem = items.find((item) => item.id === selectedItemId) ?? null;

  const openMovement = (type: InventoryMovementType) => {
    setMovementType(type);
    setSelectedItemId(items.find((item) => item.isActive)?.id ?? "");
    setQuantity("");
    setReason("");
    setNote("");
    setCommandError(null);
  };

  const submitMovement = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!movementType || !selectedItem) return;
    const rawQuantity = Number(quantity);
    const signedQuantity = movementType === "ENTRY"
      ? Math.abs(rawQuantity)
      : movementType === "ADJUSTMENT"
        ? rawQuantity
        : -Math.abs(rawQuantity);
    if (!Number.isFinite(signedQuantity) || signedQuantity === 0) { setCommandError("Informe uma quantidade diferente de zero."); return; }
    if ((movementType === "LOSS" || movementType === "ADJUSTMENT") && reason.trim().length < 3) { setCommandError("Informe o motivo da perda ou do ajuste."); return; }
    setSubmitting(true);
    setCommandError(null);
    try {
      await createMovement({
        inventoryItemId: selectedItem.id,
        type: movementType,
        quantityDelta: signedQuantity,
        reason: reason.trim() || undefined,
        note: note.trim() || undefined,
        idempotencyKey: createIdempotencyKey(),
      });
      await refreshItems();
      setMovementType(null);
    } catch (cause) {
      setCommandError(cause instanceof Error ? cause.message : "Não foi possível registrar a movimentação.");
    } finally {
      setSubmitting(false);
    }
  };

  const submitCreateItem = async (event: React.FormEvent) => {
    event.preventDefault();
    const minimumStock = Number(newItemMinimum);
    if (!newItemName.trim() || !Number.isFinite(minimumStock) || minimumStock < 0) { setCommandError("Informe nome e estoque mínimo válidos."); return; }
    setSubmitting(true);
    setCommandError(null);
    try {
      await createItem({ name: newItemName.trim(), unit: newItemUnit, minimumStock });
      await refreshItems();
      setShowCreateItem(false);
      setNewItemName("");
      setNewItemMinimum("0");
    } catch (cause) {
      setCommandError(cause instanceof Error ? cause.message : "Não foi possível cadastrar o insumo.");
    } finally {
      setSubmitting(false);
    }
  };

  const openEditItem = (item: InventoryBoardItem) => {
    setEditItem(item);
    setEditItemName(item.name);
    setEditItemMinimum(String(item.minimumStock));
    setCommandError(null);
  };

  const submitUpdateItem = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editItem) return;
    const minimumStock = Number(editItemMinimum);
    if (!editItemName.trim() || !Number.isFinite(minimumStock) || minimumStock < 0) { setCommandError("Informe nome e estoque mínimo válidos."); return; }
    setSubmitting(true);
    setCommandError(null);
    try {
      await updateItem({ inventoryItemId: editItem.id, name: editItemName.trim(), minimumStock });
      await refreshItems();
      setEditItem(null);
    } catch (cause) {
      setCommandError(cause instanceof Error ? cause.message : "Não foi possível atualizar o insumo.");
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDeactivation = async () => {
    if (!itemPendingDeactivation) return;
    setSubmitting(true);
    setCommandError(null);
    try {
      await setItemActive({ inventoryItemId: itemPendingDeactivation.id, isActive: false });
      await refreshItems();
      setItemPendingDeactivation(null);
    } catch (cause) {
      setCommandError(cause instanceof Error ? cause.message : "Não foi possível inativar o insumo.");
    } finally {
      setSubmitting(false);
    }
  };

  const openHistory = async (item: InventoryBoardItem) => {
    setHistoryItem(item);
    setHistory([]);
    setHistoryError(null);
    setHistoryLoading(true);
    try {
      setHistory(await loadHistory(item.id));
    } catch {
      setHistoryError("Não foi possível carregar o histórico deste insumo.");
    } finally {
      setHistoryLoading(false);
    }
  };

  return <OperationsAccessGate role={role}>
    <main className="min-h-screen bg-[#fffaf1] text-[#481e1f]">
      <header className="border-b border-[#ead9c0] bg-white/90 backdrop-blur">
        <div className="container flex min-h-20 flex-wrap items-center justify-between gap-4 py-4">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[.15em] text-[#68703d]">Marmitas TB · operação</p>
            <h1 className="mt-1 flex items-center gap-2 font-display text-3xl font-bold"><Warehouse className="size-7 text-[#a82926]" />Estoque</h1>
          </div>
          <a href="/operacao" className="inline-flex min-h-11 items-center rounded-xl border border-[#c9b28f] px-4 text-sm font-bold transition hover:bg-[#fff5df]"><ArrowLeft className="mr-2 size-4" />Fila operacional</a>
        </div>
      </header>

      <div className="container py-6">
        <p className="rounded-2xl border border-[#dfe5c5] bg-[#f3f5e8] px-4 py-3 text-sm text-[#53602c]">O saldo é calculado por entradas, consumos, perdas e ajustes auditáveis. Nenhum pedido baixa estoque automaticamente nesta etapa.</p>
        {loading ? <div className="grid min-h-64 place-items-center"><div className="text-center text-[#765f50]"><LoaderCircle className="mx-auto size-8 animate-spin text-[#a82926]" /><p className="mt-3 text-sm">Carregando posição de estoque…</p></div></div> : null}
        {!loading && error ? <div role="alert" className="mt-5 rounded-2xl border border-[#f2b4a2] bg-[#fff1eb] p-5 text-[#8c2522]"><CircleAlert className="mb-2 size-5" /><p className="font-bold">Não foi possível carregar estoque.</p><p className="mt-1 text-sm leading-6">Verifique sua conexão e tente novamente.</p></div> : null}
        {!loading && !error ? <>
          <section aria-label="Resumo do estoque" className="mt-5 grid gap-3 sm:grid-cols-3">
            <article className="rounded-2xl border border-[#e4d7c4] bg-white p-4"><p className="text-sm font-bold text-[#765f50]">Insumos ativos</p><p className="mt-1 font-display text-3xl font-bold">{items.filter((item) => item.isActive).length}</p></article>
            <article className="rounded-2xl border border-[#eab4a6] bg-[#fff4ee] p-4"><p className="flex items-center gap-2 text-sm font-bold text-[#8c2522]"><TriangleAlert className="size-4" />{criticalCount} {criticalCount === 1 ? "item crítico" : "itens críticos"}</p><p className="mt-1 text-sm text-[#765f50]">No mínimo ou abaixo dele.</p></article>
            <article className="rounded-2xl border border-[#e6ca7b] bg-[#fff8df] p-4"><p className="text-sm font-bold text-[#8a5b12]">{attentionCount} {attentionCount === 1 ? "item em atenção" : "itens em atenção"}</p><p className="mt-1 text-sm text-[#765f50]">Margem próxima do mínimo.</p></article>
          </section>

          <section className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div><p className="text-xs font-extrabold uppercase tracking-[.15em] text-[#68703d]">Posição atual</p><h2 className="mt-1 font-display text-2xl font-bold">Insumos</h2></div>
                {isAdmin ? <button type="button" onClick={() => { setShowCreateItem(true); setCommandError(null); }} className="inline-flex min-h-11 items-center rounded-xl bg-[#a82926] px-4 text-sm font-bold text-white transition hover:bg-[#7e1f1d]"><PackagePlus className="mr-2 size-4" />Cadastrar insumo</button> : null}
              </div>
              <label className="relative mt-4 block"><Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#765f50]" /><input aria-label="Buscar insumo" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nome" className="min-h-11 w-full rounded-xl border border-[#cdbb9f] bg-white pl-10 pr-3 text-sm outline-none transition focus:border-[#68703d] focus:ring-2 focus:ring-[#dce5bd]" /></label>
              <div className="mt-4 grid gap-3 md:grid-cols-2">{visibleItems.map((item) => <InventoryItemCard key={item.id} item={item} onHistory={() => void openHistory(item)} onEdit={isAdmin ? () => openEditItem(item) : undefined} onDeactivate={isAdmin && item.isActive ? () => { setItemPendingDeactivation(item); setCommandError(null); } : undefined} />)}</div>
              {items.length === 0 ? <div className="mt-4 rounded-2xl border border-dashed border-[#cdbb9f] bg-white/65 p-7 text-center"><Boxes className="mx-auto size-7 text-[#68703d]" /><p className="mt-3 text-sm font-bold text-[#765f50]">Nenhum insumo cadastrado nesta etapa.</p></div> : null}
              {items.length > 0 && visibleItems.length === 0 ? <p className="mt-4 rounded-2xl border border-dashed border-[#cdbb9f] bg-white/65 p-5 text-center text-sm text-[#765f50]">Nenhum insumo encontrado para a busca informada.</p> : null}
            </div>
            <section aria-labelledby="inventory-movements-title" className="rounded-3xl border border-[#dfd0b8] bg-[#f8f1e5] p-5">
              <p className="text-xs font-extrabold uppercase tracking-[.15em] text-[#68703d]">Lançamentos controlados</p>
              <h2 id="inventory-movements-title" className="mt-1 font-display text-2xl font-bold text-[#481e1f]">Movimentações</h2>
              <p className="mt-2 text-sm leading-6 text-[#765f50]">Todo lançamento informa ator, tipo e horário. Perdas e ajustes exigem justificativa administrativa.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" disabled={!items.some((item) => item.isActive)} onClick={() => openMovement("ENTRY")} className="min-h-11 rounded-xl bg-[#68703d] px-4 text-sm font-bold text-white transition hover:bg-[#4e5729] disabled:cursor-not-allowed disabled:opacity-50">Registrar entrada</button>
                <button type="button" disabled={!items.some((item) => item.isActive)} onClick={() => openMovement("INTERNAL_CONSUMPTION")} className="min-h-11 rounded-xl border border-[#c9b28f] bg-white px-4 text-sm font-bold text-[#481e1f] transition hover:bg-[#fff5df] disabled:cursor-not-allowed disabled:opacity-50">Registrar consumo</button>
                {isAdmin ? <><button type="button" disabled={!items.some((item) => item.isActive)} onClick={() => openMovement("LOSS")} className="min-h-11 rounded-xl border border-[#d9ad8e] bg-[#fff4ec] px-4 text-sm font-bold text-[#8c2522] transition hover:bg-[#ffebe1] disabled:cursor-not-allowed disabled:opacity-50">Registrar perda</button><button type="button" disabled={!items.some((item) => item.isActive)} onClick={() => openMovement("ADJUSTMENT")} className="min-h-11 rounded-xl border border-[#c9b28f] bg-white px-4 text-sm font-bold text-[#481e1f] transition hover:bg-[#fff5df] disabled:cursor-not-allowed disabled:opacity-50">Registrar ajuste</button></> : null}
              </div>
            </section>
          </section>
        </> : null}
      </div>

      {movementType ? <Modal title={`Registrar ${actionLabels[movementType]}`} onClose={() => !submitting && setMovementType(null)}><form onSubmit={submitMovement} className="mt-5 space-y-4"><label className="block text-sm font-bold text-[#481e1f]">Insumo<select aria-label="Insumo" value={selectedItemId} onChange={(event) => setSelectedItemId(event.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-[#cdbb9f] bg-white px-3 text-sm font-medium"><option value="">Selecione</option>{items.filter((item) => item.isActive).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="block text-sm font-bold text-[#481e1f]">Quantidade<input aria-label="Quantidade" inputMode="decimal" type="number" step="0.001" value={quantity} onChange={(event) => setQuantity(event.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-[#cdbb9f] bg-white px-3 text-sm" placeholder={movementType === "ADJUSTMENT" ? "Use sinal + ou −" : "0"} /></label>{(movementType === "LOSS" || movementType === "ADJUSTMENT") ? <label className="block text-sm font-bold text-[#481e1f]">Motivo<input aria-label="Motivo" value={reason} onChange={(event) => setReason(event.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-[#cdbb9f] bg-white px-3 text-sm" /></label> : null}<label className="block text-sm font-bold text-[#481e1f]">Observação <span className="font-normal text-[#765f50]">(opcional)</span><textarea aria-label="Observação" value={note} onChange={(event) => setNote(event.target.value)} className="mt-1 min-h-20 w-full rounded-xl border border-[#cdbb9f] bg-white p-3 text-sm" /></label>{commandError ? <p role="alert" className="rounded-xl bg-[#fff1eb] p-3 text-sm font-bold text-[#8c2522]">{commandError}</p> : null}<div className="flex justify-end gap-3"><button type="button" onClick={() => setMovementType(null)} className="min-h-11 rounded-xl border border-[#c9b28f] px-4 text-sm font-bold">Cancelar</button><button type="submit" disabled={submitting || !selectedItemId} className="min-h-11 rounded-xl bg-[#68703d] px-4 text-sm font-bold text-white disabled:opacity-50">{submitting ? "Registrando…" : `Confirmar ${actionLabels[movementType]}`}</button></div></form></Modal> : null}
      {showCreateItem ? <Modal title="Cadastrar insumo" onClose={() => !submitting && setShowCreateItem(false)}><form onSubmit={submitCreateItem} className="mt-5 space-y-4"><label className="block text-sm font-bold">Nome<input aria-label="Nome do insumo" value={newItemName} onChange={(event) => setNewItemName(event.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-[#cdbb9f] bg-white px-3 text-sm" /></label><label className="block text-sm font-bold">Unidade<select aria-label="Unidade" value={newItemUnit} onChange={(event) => setNewItemUnit(event.target.value as InventoryUnit)} className="mt-1 min-h-11 w-full rounded-xl border border-[#cdbb9f] bg-white px-3 text-sm">{(["kg", "g", "L", "mL", "unidade"] as const).map((unit) => <option key={unit}>{unit}</option>)}</select></label><label className="block text-sm font-bold">Estoque mínimo<input aria-label="Estoque mínimo" inputMode="decimal" type="number" min="0" step="0.001" value={newItemMinimum} onChange={(event) => setNewItemMinimum(event.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-[#cdbb9f] bg-white px-3 text-sm" /></label>{commandError ? <p role="alert" className="rounded-xl bg-[#fff1eb] p-3 text-sm font-bold text-[#8c2522]">{commandError}</p> : null}<div className="flex justify-end gap-3"><button type="button" onClick={() => setShowCreateItem(false)} className="min-h-11 rounded-xl border border-[#c9b28f] px-4 text-sm font-bold">Cancelar</button><button type="submit" disabled={submitting} className="min-h-11 rounded-xl bg-[#a82926] px-4 text-sm font-bold text-white disabled:opacity-50">{submitting ? "Cadastrando…" : "Cadastrar insumo"}</button></div></form></Modal> : null}
      {editItem ? <Modal title="Editar insumo" onClose={() => !submitting && setEditItem(null)}><form onSubmit={submitUpdateItem} className="mt-5 space-y-4"><label className="block text-sm font-bold">Nome<input aria-label="Nome do insumo" value={editItemName} onChange={(event) => setEditItemName(event.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-[#cdbb9f] bg-white px-3 text-sm" /></label><p className="rounded-xl border border-[#dfe5c5] bg-[#f3f5e8] p-3 text-sm text-[#53602c]">Unidade: <strong>{editItem.unit}</strong>. A unidade não pode ser alterada após o cadastro.</p><label className="block text-sm font-bold">Estoque mínimo<input aria-label="Estoque mínimo" inputMode="decimal" type="number" min="0" step="0.001" value={editItemMinimum} onChange={(event) => setEditItemMinimum(event.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-[#cdbb9f] bg-white px-3 text-sm" /></label>{commandError ? <p role="alert" className="rounded-xl bg-[#fff1eb] p-3 text-sm font-bold text-[#8c2522]">{commandError}</p> : null}<div className="flex justify-end gap-3"><button type="button" onClick={() => setEditItem(null)} className="min-h-11 rounded-xl border border-[#c9b28f] px-4 text-sm font-bold">Cancelar</button><button type="submit" disabled={submitting} className="min-h-11 rounded-xl bg-[#a82926] px-4 text-sm font-bold text-white disabled:opacity-50">{submitting ? "Salvando…" : "Salvar alterações"}</button></div></form></Modal> : null}
      {itemPendingDeactivation ? <Modal title="Inativar insumo" onClose={() => !submitting && setItemPendingDeactivation(null)}><div className="mt-5 space-y-4"><p className="text-sm leading-6 text-[#765f50]">O histórico será preservado, mas novos lançamentos serão bloqueados.</p>{commandError ? <p role="alert" className="rounded-xl bg-[#fff1eb] p-3 text-sm font-bold text-[#8c2522]">{commandError}</p> : null}<div className="flex justify-end gap-3"><button type="button" onClick={() => setItemPendingDeactivation(null)} className="min-h-11 rounded-xl border border-[#c9b28f] px-4 text-sm font-bold">Cancelar</button><button type="button" onClick={() => void confirmDeactivation()} disabled={submitting} className="min-h-11 rounded-xl bg-[#8c2522] px-4 text-sm font-bold text-white disabled:opacity-50">{submitting ? "Inativando…" : "Confirmar inativação"}</button></div></div></Modal> : null}
      {historyItem ? <Modal title={`Histórico · ${historyItem.name}`} onClose={() => setHistoryItem(null)}><div className="mt-5">{historyLoading ? <p className="text-sm text-[#765f50]">Carregando histórico…</p> : null}{historyError ? <p role="alert" className="rounded-xl bg-[#fff1eb] p-3 text-sm font-bold text-[#8c2522]">{historyError}</p> : null}{!historyLoading && !historyError && !history.length ? <p className="rounded-xl border border-dashed border-[#cdbb9f] p-4 text-sm text-[#765f50]">Nenhuma movimentação registrada para este insumo.</p> : null}{history.map((movement) => <article key={movement.id} className="border-b border-[#ead9c0] py-3 last:border-0"><p className="font-bold text-[#481e1f]">{actionLabels[movement.type]} · {formatInventoryQuantity(movement.quantityDelta, historyItem.unit)}</p><p className="mt-1 text-xs text-[#765f50]">{movement.actorDisplayName ?? "Equipe"} · {new Date(movement.createdAt).toLocaleString("pt-BR")}</p>{movement.reason ? <p className="mt-1 text-sm text-[#765f50]">{movement.reason}</p> : null}</article>)}</div></Modal> : null}
    </main>
  </OperationsAccessGate>;
}

export default function Inventory() {
  const { user, loading } = useAuth();
  if (loading) return <main className="grid min-h-screen place-items-center bg-[#fffaf1]"><LoaderCircle className="size-8 animate-spin text-[#a82926]" /></main>;
  return <InventoryContent role={user?.role ?? null} />;
}
