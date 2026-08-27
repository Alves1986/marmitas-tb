import { z } from "zod";
import { invokeLLM } from "../../../_core/llm";
import {
  buildHelpSystemPrompt,
  getHelpProfile,
  type HelpAudience,
  type HelpRole,
  type HelpSurface,
} from "../../../../shared/helpContent";
import { ApiAuthError, createSupabaseAuthGuards, type AuthenticatedProfile } from "../auth";
import { json, jsonError, methodNotAllowed } from "../http";
import { createSupabaseAdmin } from "../supabaseAdmin";

const supportedSurfaces = ["storefront", "tracking", "admin", "operations", "counter", "kitchen", "inventory"] as const;

const helpMessage = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(600),
});

const helpRequest = z.object({
  surface: z.enum(supportedSurfaces),
  messages: z.array(helpMessage).min(1).max(8),
});

export type HelpMessage = z.infer<typeof helpMessage>;

export type HelpDependencies = {
  requireStaff(request: Request): Promise<AuthenticatedProfile>;
  ask(input: {
    audience: HelpAudience;
    role: HelpRole;
    surface: HelpSurface;
    question: string;
    history: HelpMessage[];
  }): Promise<string>;
};

const sensitivePatterns = [
  /\b[\w.+-]+@[\w-]+\.[\w.-]+\b/i,
  /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/,
  /(?:\+?55\s*)?(?:\(?\d{2}\)?\s*)?\d{4,5}[-\s]?\d{4}\b/,
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i,
];

function containsSensitiveHelpContent(content: string) {
  return sensitivePatterns.some(pattern => pattern.test(content));
}

function isPublicHelpSurface(surface: HelpSurface) {
  return surface === "storefront" || surface === "tracking";
}

function textFromModelResponse(content: unknown) {
  if (typeof content === "string") return content.trim();
  if (!Array.isArray(content)) return "";
  return content
    .map(part => typeof part === "object" && part && "text" in part && typeof part.text === "string" ? part.text : "")
    .join("")
    .trim();
}

export async function askHelpModel(input: {
  audience: HelpAudience;
  role: HelpRole;
  surface: HelpSurface;
  question: string;
  history: HelpMessage[];
}) {
  const result = await invokeLLM({
    model: "claude-haiku-4-5",
    maxTokens: 500,
    messages: [
      { role: "system", content: buildHelpSystemPrompt(input) },
      ...input.history,
      { role: "user", content: input.question },
    ],
  });
  const answer = textFromModelResponse(result.choices[0]?.message.content).slice(0, 1_200);
  if (!answer) throw new Error("O modelo não retornou uma orientação válida.");
  return answer;
}

export function createHelpHandler(dependencies: HelpDependencies) {
  return async function helpHandler(request: Request): Promise<Response> {
    try {
      if (request.method !== "POST") return methodNotAllowed(["POST"]);

      const parsed = helpRequest.safeParse(await request.json());
      if (!parsed.success) return jsonError(400, "Dados de ajuda inválidos.");

      const messages = parsed.data.messages;
      const lastMessage = messages.at(-1);
      if (!lastMessage || lastMessage.role !== "user") return jsonError(400, "Envie uma pergunta para receber orientação.");
      if (messages.some(message => containsSensitiveHelpContent(message.content))) {
        return jsonError(400, "Não envie dados pessoais ou identificadores de pedido pelo assistente.");
      }

      const surface = parsed.data.surface;
      const profile = getHelpProfile(surface);
      if (!profile) return jsonError(400, "A ajuda não está disponível nesta tela.");

      const actor = isPublicHelpSurface(surface) ? null : await dependencies.requireStaff(request);
      const role: HelpRole = actor?.role === "admin" ? "admin" : actor?.role === "staff" ? "staff" : "customer";
      const answer = await dependencies.ask({
        audience: profile.audience,
        role,
        surface,
        question: lastMessage.content,
        history: messages.slice(0, -1),
      });

      return json(200, { answer: answer.slice(0, 1_200) });
    } catch (error) {
      if (error instanceof ApiAuthError) return jsonError(error.statusCode, error.message);
      return json(503, { error: "A ajuda está indisponível no momento. Consulte o tutorial desta página." });
    }
  };
}

export function createDefaultHelpHandler() {
  const client = createSupabaseAdmin();
  const guards = createSupabaseAuthGuards(client);
  return createHelpHandler({ requireStaff: guards.requireStaff, ask: askHelpModel });
}
