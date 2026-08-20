import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loadSessionUser, setNewPassword, type SessionLookupClient } from "@/lib/supabaseAuth";
import { supabase } from "@/lib/supabaseClient";
import { ArrowLeft, KeyRound } from "lucide-react";
import { FormEvent, useState } from "react";
import { useLocation } from "wouter";

export default function SetPassword() {
  const [, setLocation] = useLocation();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (password.length < 12) {
      setError("A senha precisa ter pelo menos 12 caracteres.");
      return;
    }
    if (password !== confirmation) {
      setError("As senhas não coincidem.");
      return;
    }

    setPending(true);
    try {
      await setNewPassword(supabase, password);
      const user = await loadSessionUser(supabase as unknown as SessionLookupClient);
      if (user?.role === "admin") {
        setLocation("/admin");
        return;
      }
      if (user?.role === "staff") {
        setLocation("/operacao");
        return;
      }
      throw new Error("Acesso interno não autorizado");
    } catch {
      setError("Não foi possível definir a senha. Solicite um novo link à gestão, se necessário.");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#fffaf1] p-6 text-[#481e1f]">
      <section className="w-full max-w-md rounded-3xl border border-[#ead9c0] bg-white p-7 shadow-[0_18px_50px_rgba(72,30,31,0.10)] md:p-9">
        <a href="/acesso" className="inline-flex items-center gap-2 text-sm font-semibold text-[#a82926] hover:text-[#7e1f1d]">
          <ArrowLeft aria-hidden="true" className="size-4" /> Voltar ao acesso
        </a>
        <div className="mt-7 flex size-12 items-center justify-center rounded-2xl bg-[#f7ead7] text-[#a82926]">
          <KeyRound aria-hidden="true" className="size-6" />
        </div>
        <p className="mt-5 text-xs font-extrabold uppercase tracking-[0.15em] text-[#68703d]">Marmitas TB · equipe</p>
        <h1 className="mt-2 font-display text-3xl font-bold">Definir senha</h1>
        <p className="mt-3 text-sm leading-6 text-[#765f50]">
          Crie sua senha individual para concluir o convite ou a recuperação de acesso. Depois, use-a no login diário da equipe.
        </p>

        {error && <p className="mt-5 rounded-xl bg-[#fff0ee] px-4 py-3 text-sm text-[#a82926]" role="alert">{error}</p>}

        <form className="mt-6 space-y-4" onSubmit={submit}>
          <div className="space-y-2">
            <Label htmlFor="new-password">Nova senha</Label>
            <Input id="new-password" type="password" autoComplete="new-password" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Mínimo de 12 caracteres" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirmar nova senha</Label>
            <Input id="confirm-password" type="password" autoComplete="new-password" required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder="Repita a senha" />
          </div>
          <Button className="w-full bg-[#a82926] text-white hover:bg-[#7e1f1d]" type="submit" disabled={pending}>
            {pending ? "Salvando..." : "Salvar senha"}
          </Button>
        </form>
      </section>
    </main>
  );
}
