import { requestTeamOtp } from "@/lib/supabaseAuth";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, MailCheck, ShieldCheck } from "lucide-react";
import { FormEvent, useState } from "react";
import { useLocation } from "wouter";

export default function StaffAccess() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [step, setStep] = useState<"email" | "token">("email");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function sendCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    try {
      await requestTeamOtp(supabase, email);
      setEmail(email.trim().toLowerCase());
      setStep("token");
      setMessage("Enviamos um código de acesso para o seu e-mail autorizado.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível enviar o código agora.");
    } finally {
      setPending(false);
    }
  }

  async function verifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const { error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token: token.trim(),
      type: "email",
    });

    if (verifyError) {
      setError("Código inválido ou expirado. Solicite um novo código para tentar novamente.");
      setPending(false);
      return;
    }

    setLocation("/operacao");
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#fffaf1] p-6 text-[#481e1f]">
      <section className="w-full max-w-md rounded-3xl border border-[#ead9c0] bg-white p-7 shadow-[0_18px_50px_rgba(72,30,31,0.10)] md:p-9">
        <a href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-[#68703d] hover:text-[#4e5729]">
          <ArrowLeft aria-hidden="true" className="size-4" /> Voltar ao cardápio
        </a>
        <div className="mt-7 flex size-12 items-center justify-center rounded-2xl bg-[#f7ead7] text-[#a82926]">
          {step === "email" ? <MailCheck aria-hidden="true" className="size-6" /> : <ShieldCheck aria-hidden="true" className="size-6" />}
        </div>
        <p className="mt-5 text-xs font-extrabold uppercase tracking-[0.15em] text-[#68703d]">Marmitas TB · equipe</p>
        <h1 className="mt-2 font-display text-3xl font-bold">{step === "email" ? "Acesse com seu e-mail" : "Digite o código"}</h1>
        <p className="mt-3 text-sm leading-6 text-[#765f50]">
          {step === "email"
            ? "Somente e-mails previamente autorizados podem receber um código de acesso."
            : `Enviamos um código temporário para ${email}.`}
        </p>

        {message && <p className="mt-5 rounded-xl bg-[#edf1df] px-4 py-3 text-sm text-[#4e5729]" role="status">{message}</p>}
        {error && <p className="mt-5 rounded-xl bg-[#fff0ee] px-4 py-3 text-sm text-[#a82926]" role="alert">{error}</p>}

        {step === "email" ? (
          <form className="mt-6 space-y-4" onSubmit={sendCode}>
            <div className="space-y-2">
              <Label htmlFor="staff-email">E-mail autorizado</Label>
              <Input id="staff-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="equipe@empresa.com" />
            </div>
            <Button className="w-full bg-[#a82926] text-white hover:bg-[#7e1f1d]" type="submit" disabled={pending}>
              {pending ? "Enviando código..." : "Enviar código"}
            </Button>
          </form>
        ) : (
          <form className="mt-6 space-y-4" onSubmit={verifyCode}>
            <div className="space-y-2">
              <Label htmlFor="staff-token">Código de acesso</Label>
              <Input id="staff-token" inputMode="numeric" autoComplete="one-time-code" required value={token} onChange={(event) => setToken(event.target.value)} placeholder="000000" />
            </div>
            <Button className="w-full bg-[#a82926] text-white hover:bg-[#7e1f1d]" type="submit" disabled={pending}>
              {pending ? "Validando..." : "Entrar na operação"}
            </Button>
            <button type="button" onClick={() => { setStep("email"); setToken(""); setMessage(null); setError(null); }} className="w-full text-sm font-semibold text-[#68703d] hover:text-[#4e5729]">
              Usar outro e-mail ou reenviar código
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
