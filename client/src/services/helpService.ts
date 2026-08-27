import type { HelpSurface } from "@shared/helpContent";

export type HelpConversationMessage = {
  role: "user" | "assistant";
  content: string;
};

export type HelpRequest = {
  surface: Exclude<HelpSurface, "totem" | "calls">;
  messages: HelpConversationMessage[];
};

async function readError(response: Response) {
  const payload = await response.json().catch(() => null) as { error?: unknown } | null;
  return typeof payload?.error === "string" ? payload.error : "Não foi possível obter ajuda agora. Consulte o tutorial desta página.";
}

export const helpService = {
  async ask(input: HelpRequest) {
    const response = await fetch("/api/operations/help", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!response.ok) throw new Error(await readError(response));
    const payload = await response.json() as { answer?: unknown };
    if (typeof payload.answer !== "string" || !payload.answer.trim()) throw new Error("Não foi possível obter ajuda agora. Consulte o tutorial desta página.");
    return payload.answer;
  },
};
