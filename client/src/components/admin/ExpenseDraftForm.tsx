import { useState } from "react";
import type { AdminExpenseInput } from "@/services/adminService";

function parseCurrencyInCents(value: string): number | null {
  const normalized = value.trim().replace(/\./g, "").replace(",", ".");
  const numeric = Number(normalized);
  if (!Number.isFinite(numeric) || numeric <= 0) return null;
  return Math.round(numeric * 100);
}

type ExpenseDraftFormProps = {
  onSubmit: (expense: AdminExpenseInput) => void;
  pending?: boolean;
  errorMessage?: string;
  successMessage?: string;
};

export function ExpenseDraftForm({ onSubmit, pending = false, errorMessage, successMessage }: ExpenseDraftFormProps) {
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [incurredOn, setIncurredOn] = useState("");
  const [notes, setNotes] = useState("");
  const [validationMessage, setValidationMessage] = useState<string>();

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amountInCents = parseCurrencyInCents(amount);
    if (!description.trim() || !category.trim() || !incurredOn || amountInCents === null) {
      setValidationMessage("Informe descrição, categoria, valor maior que zero e data da despesa.");
      return;
    }
    setValidationMessage(undefined);
    onSubmit({
      description: description.trim(),
      category: category.trim(),
      amountInCents,
      incurredOn,
      notes: notes.trim() || undefined,
    });
  }

  return (
    <section className="rounded-3xl border border-[#ead7bc] bg-[#fffaf1] p-5 shadow-sm md:p-6" aria-labelledby="expense-draft-heading">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#7d8738]">Fluxo de caixa</p>
          <h2 id="expense-draft-heading" className="mt-1 font-display text-2xl font-semibold text-[#481e1f]">Registrar despesa</h2>
          <p className="mt-1 text-sm leading-6 text-[#6b4c42]">O lançamento ficará como rascunho até a revisão de um administrador.</p>
        </div>
        <span className="w-fit rounded-full bg-[#f4eadb] px-3 py-1 text-xs font-bold text-[#6b4c42]">Requer aprovação</span>
      </div>

      <form className="mt-5 grid gap-4 sm:grid-cols-2" onSubmit={submit}>
        <label className="grid gap-1.5 text-sm font-semibold text-[#481e1f] sm:col-span-2">
          Descrição da despesa
          <input value={description} onChange={(event) => setDescription(event.target.value)} maxLength={240} placeholder="Ex.: Gás da cozinha" className="rounded-xl border border-[#dccdaf] bg-white px-3 py-2.5 text-base font-normal outline-none transition focus:border-[#b52a25] focus:ring-2 focus:ring-[#b52a25]/20" />
        </label>
        <label className="grid gap-1.5 text-sm font-semibold text-[#481e1f]">
          Categoria da despesa
          <input value={category} onChange={(event) => setCategory(event.target.value)} maxLength={120} placeholder="Ex.: Insumos" className="rounded-xl border border-[#dccdaf] bg-white px-3 py-2.5 text-base font-normal outline-none transition focus:border-[#b52a25] focus:ring-2 focus:ring-[#b52a25]/20" />
        </label>
        <label className="grid gap-1.5 text-sm font-semibold text-[#481e1f]">
          Valor da despesa
          <input value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="decimal" placeholder="0,00" className="rounded-xl border border-[#dccdaf] bg-white px-3 py-2.5 text-base font-normal outline-none transition focus:border-[#b52a25] focus:ring-2 focus:ring-[#b52a25]/20" />
        </label>
        <label className="grid gap-1.5 text-sm font-semibold text-[#481e1f]">
          Data da despesa
          <input type="date" value={incurredOn} onChange={(event) => setIncurredOn(event.target.value)} className="rounded-xl border border-[#dccdaf] bg-white px-3 py-2.5 text-base font-normal outline-none transition focus:border-[#b52a25] focus:ring-2 focus:ring-[#b52a25]/20" />
        </label>
        <label className="grid gap-1.5 text-sm font-semibold text-[#481e1f] sm:col-span-2">
          Observação <span className="font-normal text-[#846d62]">(opcional)</span>
          <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={2} placeholder="Detalhes para quem fará a aprovação" className="resize-y rounded-xl border border-[#dccdaf] bg-white px-3 py-2.5 text-base font-normal outline-none transition focus:border-[#b52a25] focus:ring-2 focus:ring-[#b52a25]/20" />
        </label>
        {validationMessage ? <p role="alert" className="sm:col-span-2 rounded-xl bg-[#fff0ed] px-3 py-2 text-sm text-[#8e2522]">{validationMessage}</p> : null}
        {errorMessage ? <p role="alert" className="sm:col-span-2 rounded-xl bg-[#fff0ed] px-3 py-2 text-sm text-[#8e2522]">{errorMessage}</p> : null}
        {successMessage ? <p role="status" className="sm:col-span-2 rounded-xl bg-[#edf5d6] px-3 py-2 text-sm text-[#53611f]">{successMessage}</p> : null}
        <div className="sm:col-span-2">
          <button type="submit" disabled={pending} className="rounded-xl bg-[#b52a25] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#98231f] active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60">
            {pending ? "Enviando rascunho..." : "Enviar para aprovação"}
          </button>
        </div>
      </form>
    </section>
  );
}
