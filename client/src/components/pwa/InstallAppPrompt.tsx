import { Download, Share } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export type DeferredInstallPrompt = {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type InstallAppPromptProps = {
  deferredPrompt?: DeferredInstallPrompt | null;
  isIos?: boolean;
  isStandalone?: boolean;
};

function detectIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function detectStandalone() {
  return window.matchMedia?.("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

export function InstallAppPrompt({ deferredPrompt, isIos = detectIos(), isStandalone = detectStandalone() }: InstallAppPromptProps) {
  const [capturedPrompt, setCapturedPrompt] = useState<DeferredInstallPrompt | null>(deferredPrompt ?? null);

  useEffect(() => {
    if (deferredPrompt !== undefined) {
      setCapturedPrompt(deferredPrompt);
      return;
    }

    const handleBeforeInstall = (event: Event) => {
      event.preventDefault();
      setCapturedPrompt(event as unknown as DeferredInstallPrompt);
    };
    const handleInstalled = () => setCapturedPrompt(null);
    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, [deferredPrompt]);

  if (isStandalone) return null;

  if (isIos) {
    return <aside className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md rounded-2xl border border-[#ead8c0] bg-white p-4 shadow-[0_16px_40px_rgba(72,30,31,0.16)]" aria-label="Instalar aplicativo"><div className="flex gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#f3ead8] text-[#a82926]"><Share className="size-5" /></span><p className="text-sm leading-relaxed text-[#664b3d]"><strong className="block text-[#481e1f]">Adicione a Marmitas TB</strong> Toque em <strong>Compartilhar</strong> e escolha <strong>Adicionar à Tela de Início</strong>.</p></div></aside>;
  }

  if (!capturedPrompt) return null;

  return <aside className="fixed bottom-4 left-4 right-4 z-50 mx-auto flex max-w-md items-center justify-between gap-3 rounded-2xl border border-[#ead8c0] bg-white p-4 shadow-[0_16px_40px_rgba(72,30,31,0.16)]" aria-label="Instalar aplicativo"><div><p className="text-sm font-extrabold text-[#481e1f]">Tenha a Marmitas TB no celular</p><p className="mt-0.5 text-xs leading-relaxed text-[#765f50]">Instale o aplicativo para acessar o cardápio com mais rapidez.</p></div><Button type="button" onClick={async () => { await capturedPrompt.prompt(); setCapturedPrompt(null); }} className="shrink-0 rounded-xl bg-[#a82926] font-extrabold hover:bg-[#8e1718]"><Download className="mr-2 size-4" /> Instalar aplicativo</Button></aside>;
}
