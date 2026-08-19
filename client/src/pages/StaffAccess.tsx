import { requestTeamOtp } from "@/lib/supabaseAuth";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, MailCheck, ShieldCheck } from "lucide-react";
import { FormEvent, useState } from "react";

export default function StaffAccess() {
  const [email, setEmail] = useState("");
  const [linkRequested, setLinkRequested] = useState(false);
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
      setLinkRequested(true);
      setMessage("Enviamos um link de acesso para o seu e-mail autorizado.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível enviar o link agora.");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#fffaf1] p-6 text-[#481e1f]">
      <section className="w-full max-w-md rounded-3xl border border-[#ead9c0] bg-white p-7 shadow-[0_18px_50px_rgba(72,30,31,0.10)] md:p-9">
        <a href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-[#68703d] hover:text-[#4e5729]">
          <ArrowLeft aria-hidden="true" className="size-4" /> Voltar ao cardápio
        </a>
        <div className="mt-7 flex size-12 items-center justify-center rounded-2xl bg-[#f7ead7] text-[#a82926]">
          {linkRequested ? <ShieldCheck aria-hidden="true" className="size-6" /> : <MailCheck aria-hidden="true" className="size-6" />}
        </div>
        <p className="mt-5 text-xs font-extrabold uppercase tracking-[0.15em] text-[#68703d]">Marmitas TB · equipe</p>
        <h1 className="mt-2 font-display text-3xl font-bold">{linkRequested ? "Confira seu e-mail" : "Acesse com seu e-mail"}</h1>
        <p className="mt-3 text-sm leading-6 text-[#765f50]">
          {linkRequested
            ? `Abra o e-mail e toque no link para entrar na operação. O link foi enviado para ${email}. Se não aparecer, verifique a caixa de spam ou reenvie o link.`
            : "Somente e-mails previamente autorizados podem receber um link de acesso."}
        </p>

        {message && <p className="mt-5 rounded-xl bg-[#edf1df] px-4 py-3 text-sm text-[#4e5729]" role="status">{message}</p>}
        {error && <p className="mt-5 rounded-xl bg-[#fff0ee] px-4 py-3 text-sm text-[#a82926]" role="alert">{error}</p>}

        <form className="mt-6 space-y-4" onSubmit={sendCode}>
          <div className="space-y-2">
            <Label htmlFor="staff-email">E-mail autorizado</Label>
            <Input id="staff-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="equipe@empresa.com" />
          </div>
          <Button className="w-full bg-[#a82926] text-white hover:bg-[#7e1f1d]" type="submit" disabled={pending}>
            {pending ? "Enviando link..." : linkRequested ? "Reenviar link de acesso" : "Enviar link de acesso"}
          </Button>
        </form>
      </section>
    </main>
  );
}
