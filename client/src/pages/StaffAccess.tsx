import { loadSessionUser, requestPasswordReset, signInWithPassword, type SessionLookupClient } from "@/lib/supabaseAuth";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, LockKeyhole } from "lucide-react";
import { FormEvent, useState } from "react";
import { useLocation } from "wouter";

export default function StaffAccess() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [recoveryPending, setRecoveryPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (password.length < 12) {
      setError("A senha precisa ter pelo menos 12 caracteres.");
      return;
    }

    setPending(true);

    try {
      await signInWithPassword(supabase, email, password);
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
      setError("Não foi possível entrar com essas credenciais.");
    } finally {
      setPending(false);
    }
  }

  async function recoverPassword() {
    setError(null);
    setMessage(null);
    setRecoveryPending(true);

    try {
      await requestPasswordReset(supabase, email);
      setMessage("Se houver uma conta interna vinculada a este e-mail, enviaremos as instruções para definir uma nova senha.");
    } catch {
      setError("Não foi possível enviar as instruções de recuperação agora. Tente novamente mais tarde.");
    } finally {
      setRecoveryPending(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#fffaf1] p-6 text-[#481e1f]">
      <section className="w-full max-w-md rounded-3xl border border-[#ead9c0] bg-white p-7 shadow-[0_18px_50px_rgba(72,30,31,0.10)] md:p-9">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <a href="/admin" className="inline-flex items-center gap-2 text-sm font-semibold text-[#a82926] hover:text-[#7e1f1d]">
            <ArrowLeft aria-hidden="true" className="size-4" /> Ir para gestão
          </a>
          <a href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-[#68703d] hover:text-[#4e5729]">
            Voltar ao cardápio
          </a>
        </div>
        <div className="mt-7 flex size-12 items-center justify-center rounded-2xl bg-[#f7ead7] text-[#a82926]">
          <LockKeyhole aria-hidden="true" className="size-6" />
        </div>
        <p className="mt-5 text-xs font-extrabold uppercase tracking-[0.15em] text-[#68703d]">Marmitas TB · equipe</p>
        <h1 className="mt-2 font-display text-3xl font-bold">Acesse sua área interna</h1>
        <p className="mt-3 text-sm leading-6 text-[#765f50]">
          Use seu e-mail corporativo e sua senha individual. O acesso é liberado somente para membros convidados pela gestão.
        </p>

        {message && <p className="mt-5 rounded-xl bg-[#edf1df] px-4 py-3 text-sm text-[#4e5729]" role="status">{message}</p>}
        {error && <p className="mt-5 rounded-xl bg-[#fff0ee] px-4 py-3 text-sm text-[#a82926]" role="alert">{error}</p>}

        <form className="mt-6 space-y-4" onSubmit={signIn}>
          <div className="space-y-2">
            <Label htmlFor="staff-email">E-mail autorizado</Label>
            <Input id="staff-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="equipe@empresa.com" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="staff-password">Senha</Label>
            <Input id="staff-password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Sua senha individual" />
          </div>
          <div className="flex justify-end">
            <button type="button" onClick={recoverPassword} disabled={pending || recoveryPending} className="text-sm font-semibold text-[#a82926] underline-offset-4 hover:underline disabled:cursor-not-allowed disabled:opacity-60">
              {recoveryPending ? "Enviando instruções..." : "Esqueci minha senha"}
            </button>
          </div>
          <Button className="w-full bg-[#a82926] text-white hover:bg-[#7e1f1d]" type="submit" disabled={pending || recoveryPending}>
            {pending ? "Entrando..." : "Entrar na operação"}
          </Button>
        </form>
      </section>
    </main>
  );
}
