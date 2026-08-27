import { z } from "zod";
import { invokeLLM } from "../../../_core/llm";
import {
  buildHelpSystemPrompt,
  getHelpProfile
} from "../../../../shared/helpContent";
import { ApiAuthError, createSupabaseAuthGuards } from "../auth";
import { json, jsonError, methodNotAllowed } from "../http";
import { createSupabaseAdmin } from "../supabaseAdmin";
const supportedSurfaces = ["storefront", "tracking", "admin", "operations", "counter", "kitchen", "inventory"];
const helpMessage = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(600)
});
const helpRequest = z.object({
  surface: z.enum(supportedSurfaces),
  messages: z.array(helpMessage).min(1).max(8)
});
const sensitivePatterns = [
  /\b[\w.+-]+@[\w-]+\.[\w.-]+\b/i,
  /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/,
  /(?:\+?55\s*)?(?:\(?\d{2}\)?\s*)?\d{4,5}[-\s]?\d{4}\b/,
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i
];
function containsSensitiveHelpContent(content) {
  return sensitivePatterns.some((pattern) => pattern.test(content));
}
function isPublicHelpSurface(surface) {
  return surface === "storefront" || surface === "tracking";
}
function textFromModelResponse(content) {
  if (typeof content === "string") return content.trim();
  if (!Array.isArray(content)) return "";
  return content.map((part) => typeof part === "object" && part && "text" in part && typeof part.text === "string" ? part.text : "").join("").trim();
}
async function askHelpModel(input) {
  const result = await invokeLLM({
    model: "claude-haiku-4-5",
    maxTokens: 500,
    messages: [
      { role: "system", content: buildHelpSystemPrompt(input) },
      ...input.history,
      { role: "user", content: input.question }
    ]
  });
  const answer = textFromModelResponse(result.choices[0]?.message.content).slice(0, 1200);
  if (!answer) throw new Error("O modelo n\xE3o retornou uma orienta\xE7\xE3o v\xE1lida.");
  return answer;
}
function createHelpHandler(dependencies) {
  return async function helpHandler(request) {
    try {
      if (request.method !== "POST") return methodNotAllowed(["POST"]);
      const parsed = helpRequest.safeParse(await request.json());
      if (!parsed.success) return jsonError(400, "Dados de ajuda inv\xE1lidos.");
      const messages = parsed.data.messages;
      const lastMessage = messages.at(-1);
      if (!lastMessage || lastMessage.role !== "user") return jsonError(400, "Envie uma pergunta para receber orienta\xE7\xE3o.");
      if (messages.some((message) => containsSensitiveHelpContent(message.content))) {
        return jsonError(400, "N\xE3o envie dados pessoais ou identificadores de pedido pelo assistente.");
      }
      const surface = parsed.data.surface;
      const profile = getHelpProfile(surface);
      if (!profile) return jsonError(400, "A ajuda n\xE3o est\xE1 dispon\xEDvel nesta tela.");
      const actor = isPublicHelpSurface(surface) ? null : await dependencies.requireStaff(request);
      const role = actor?.role === "admin" ? "admin" : actor?.role === "staff" ? "staff" : "customer";
      const answer = await dependencies.ask({
        audience: profile.audience,
        role,
        surface,
        question: lastMessage.content,
        history: messages.slice(0, -1)
      });
      return json(200, { answer: answer.slice(0, 1200) });
    } catch (error) {
      if (error instanceof ApiAuthError) return jsonError(error.statusCode, error.message);
      return json(503, { error: "A ajuda est\xE1 indispon\xEDvel no momento. Consulte o tutorial desta p\xE1gina." });
    }
  };
}
function createDefaultHelpHandler() {
  const client = createSupabaseAdmin();
  const guards = createSupabaseAuthGuards(client);
  return createHelpHandler({ requireStaff: guards.requireStaff, ask: askHelpModel });
}
export {
  askHelpModel,
  createDefaultHelpHandler,
  createHelpHandler
};
