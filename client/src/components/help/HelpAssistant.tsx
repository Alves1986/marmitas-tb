import { useState } from "react";
import { CircleHelp, ExternalLink } from "lucide-react";
import { AIChatBox, type Message } from "@/components/AIChatBox";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { getHelpProfile, type HelpSurface } from "@shared/helpContent";
import { helpService, type HelpRequest } from "@/services/helpService";
import { canDisplayHelpLauncher, getHelpSurface } from "@/lib/helpRouting";

type HelpAssistantContentProps = {
  surface: Exclude<HelpSurface, "totem" | "calls">;
  ask?: (input: HelpRequest) => Promise<string>;
};

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Não foi possível obter ajuda agora. Consulte o tutorial desta página.";
}

export function HelpAssistantContent({ surface, ask = helpService.ask }: HelpAssistantContentProps) {
  const profile = getHelpProfile(surface);
  if (!profile) return null;

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = async (content: string) => {
    if (loading) return;
    const nextMessages: Message[] = [...messages, { role: "user", content }];
    setMessages(nextMessages);
    setError(null);
    setLoading(true);
    try {
      const answer = await ask({
        surface,
        messages: nextMessages.map(message => ({ role: message.role as "user" | "assistant", content: message.content })),
      });
      setMessages(current => [...current, { role: "assistant", content: answer }]);
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setLoading(false);
    }
  };

  return <Sheet open={open} onOpenChange={setOpen}>
    <Button type="button" onClick={() => setOpen(true)} className="fixed bottom-24 right-4 z-45 min-h-12 rounded-full bg-[#a82926] px-4 text-sm font-bold text-white shadow-[0_12px_28px_rgba(72,30,31,0.25)] hover:bg-[#8c2522] sm:bottom-6" aria-label={`Abrir ${profile.title.toLowerCase()}`}>
      <CircleHelp className="mr-2 size-5" aria-hidden="true" />Ajuda
    </Button>
    <SheetContent side="right" className="w-full border-[#ead9c0] bg-[#fffaf1] p-0 sm:max-w-md">
      <SheetHeader className="border-b border-[#ead9c0] bg-white pr-12">
        <SheetTitle className="font-display text-2xl text-[#481e1f]">{profile.title}</SheetTitle>
        <SheetDescription className="leading-5 text-[#765f50]">{profile.greeting}</SheetDescription>
      </SheetHeader>
      <div className="flex min-h-0 flex-1 flex-col p-4">
        <a href={profile.guidePath} className="mb-3 inline-flex min-h-10 items-center justify-center rounded-xl border border-[#c9b28f] bg-white px-3 text-sm font-bold text-[#664b3d] transition hover:bg-[#fff5df] hover:text-[#a82926]">
          {profile.guideLabel}<ExternalLink className="ml-2 size-4" aria-hidden="true" />
        </a>
        {error ? <p role="alert" className="mb-3 rounded-xl border border-[#f2b4a2] bg-[#fff1eb] p-3 text-sm font-semibold leading-5 text-[#8c2522]">{error}</p> : null}
        <AIChatBox
          messages={messages}
          onSendMessage={(content) => { void sendMessage(content); }}
          isLoading={loading}
          placeholder="Escreva sua dúvida sobre o sistema"
          height="100%"
          className="min-h-0 flex-1 border-[#ead9c0] bg-white"
          emptyStateMessage="Escolha uma dúvida rápida ou escreva sua pergunta."
          suggestedPrompts={profile.prompts}
        />
      </div>
    </SheetContent>
  </Sheet>;
}

export function HelpAssistant({ path }: { path: string }) {
  const surface = getHelpSurface(path);
  const { user, loading } = useAuth();
  if (!surface || (surface !== "storefront" && surface !== "tracking" && (loading || !canDisplayHelpLauncher(surface, user?.role ?? null)))) return null;
  return <HelpAssistantContent surface={surface} />;
}
