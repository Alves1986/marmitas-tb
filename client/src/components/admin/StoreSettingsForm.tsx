import { FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";
import { formatPriceForEditor, parsePriceFromEditor } from "./MenuManager";

export type StoreSettings = {
  storeName: string;
  deliveryFeeInCents: number;
  openingHours: string;
  paymentMode: "test" | "asaas";
  autoPrint: boolean;
};

export function StoreSettingsFormView({ settings, onSave, pending = false }: {
  settings: StoreSettings;
  onSave: (settings: StoreSettings) => void;
  pending?: boolean;
}) {
  const [draft, setDraft] = useState({ ...settings, deliveryFee: formatPriceForEditor(settings.deliveryFeeInCents) });
  useEffect(() => setDraft({ ...settings, deliveryFee: formatPriceForEditor(settings.deliveryFeeInCents) }), [settings]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSave({
      storeName: draft.storeName.trim(),
      deliveryFeeInCents: parsePriceFromEditor(draft.deliveryFee),
      openingHours: draft.openingHours.trim(),
      paymentMode: draft.paymentMode,
      autoPrint: draft.autoPrint,
    });
  };

  return (
    <section aria-labelledby="store-settings-title" className="rounded-3xl border border-[#ead7bc] bg-[#fffaf1] p-5 shadow-sm md:p-6">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#68703d]">Operação</p>
      <h2 id="store-settings-title" className="mt-1 font-display text-2xl font-semibold text-[#481e1f]">Configurações da loja</h2>
      <form onSubmit={submit} className="mt-5 grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5"><Label htmlFor="store-name">Nome da loja</Label><Input id="store-name" value={draft.storeName} onChange={(event) => setDraft((current) => ({ ...current, storeName: event.target.value }))} /></div>
        <div className="space-y-1.5"><Label htmlFor="delivery-fee">Taxa de entrega (R$)</Label><Input id="delivery-fee" inputMode="decimal" value={draft.deliveryFee} onChange={(event) => setDraft((current) => ({ ...current, deliveryFee: event.target.value }))} /></div>
        <div className="space-y-1.5 md:col-span-2"><Label htmlFor="opening-hours">Horários de atendimento</Label><Input id="opening-hours" value={draft.openingHours} onChange={(event) => setDraft((current) => ({ ...current, openingHours: event.target.value }))} /></div>
        <div className="space-y-1.5"><Label htmlFor="payment-mode">Modo de pagamento</Label><select id="payment-mode" value={draft.paymentMode} onChange={(event) => setDraft((current) => ({ ...current, paymentMode: event.target.value as StoreSettings["paymentMode"] }))} className="h-10 w-full rounded-md border border-input bg-white px-3 text-sm"><option value="test">Teste — sem cobrança real</option><option value="asaas">Asaas oficial — requer ativação</option></select><p className="text-xs leading-5 text-[#6b4c42]">O modo oficial ficará indisponível até a ativação segura das credenciais do Asaas.</p></div>
        <div className="flex items-center pt-6"><label className="flex items-center gap-3 text-sm font-medium text-[#481e1f]"><Switch checked={draft.autoPrint} onCheckedChange={(autoPrint) => setDraft((current) => ({ ...current, autoPrint }))} />Imprimir comandas automaticamente</label></div>
        <div className="md:col-span-2"><Button type="submit" disabled={pending} className="bg-[#a82926] hover:bg-[#8c211f]">{pending ? "Salvando…" : "Salvar configurações"}</Button></div>
      </form>
    </section>
  );
}

export function StoreSettingsForm() {
  const utils = trpc.useUtils();
  const { data, isLoading, error } = trpc.admin.getSettings.useQuery();
  const updateSettings = trpc.admin.updateSettings.useMutation({
    onSuccess: () => utils.admin.getSettings.invalidate(),
  });

  if (isLoading) return <section className="rounded-3xl border border-[#ead7bc] bg-[#fffaf1] p-5 text-sm text-[#6b4c42]">Carregando configurações…</section>;
  if (error || !data) return <section role="alert" className="rounded-3xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">Não foi possível carregar as configurações da loja.</section>;
  return <StoreSettingsFormView settings={data} pending={updateSettings.isPending} onSave={(settings) => updateSettings.mutate(settings)} />;
}
