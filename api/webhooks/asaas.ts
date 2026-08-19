import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { processAsaasWebhookEvent, type AsaasWebhookRpcClient } from "../../server/vercel/_lib/asaasWebhookProcessor.js";
import { jsonError, methodNotAllowed } from "../../server/vercel/_lib/http.js";
import { createSupabaseAdmin } from "../../server/vercel/_lib/supabaseAdmin.js";

const asaasEventSchema = z.object({
  id: z.string().trim().min(1).max(160),
  event: z.string().trim().min(1).max(120).optional(),
  payment: z.object({
    id: z.string().trim().min(1).max(160).optional(),
  }).optional(),
});

export type AsaasWebhookEvent = z.infer<typeof asaasEventSchema>;

export type AsaasWebhookDependencies = {
  expectedToken?: string;
  processEvent(event: AsaasWebhookEvent): Promise<"processed" | "duplicate">;
};

type Environment = Readonly<Record<string, string | undefined>>;

export type ConfiguredAsaasWebhookDependencies = {
  environment: Environment;
  processEvent(event: AsaasWebhookEvent): Promise<"processed" | "duplicate">;
};

function tokensMatch(received: string | null, expected: string | undefined): boolean {
  if (!received || !expected) return false;
  const receivedBuffer = Buffer.from(received);
  const expectedBuffer = Buffer.from(expected);
  return receivedBuffer.length === expectedBuffer.length
    && timingSafeEqual(receivedBuffer, expectedBuffer);
}

export function createAsaasWebhookHandler(dependencies: AsaasWebhookDependencies) {
  return async function asaasWebhookHandler(request: Request): Promise<Response> {
    if (request.method !== "POST") return methodNotAllowed(["POST"]);
    if (!dependencies.expectedToken) return jsonError(503, "Integração de pagamento indisponível.");
    if (!tokensMatch(request.headers.get("asaas-access-token"), dependencies.expectedToken)) {
      return jsonError(401, "Webhook não autorizado.");
    }

    const parsed = asaasEventSchema.safeParse(await request.json().catch(() => undefined));
    if (!parsed.success) return jsonError(400, "Evento Asaas inválido.");

    try {
      await dependencies.processEvent(parsed.data);
      return new Response(null, { status: 204 });
    } catch (error) {
      return jsonError(500, error);
    }
  };
}

export function createConfiguredAsaasWebhookHandler(dependencies: ConfiguredAsaasWebhookDependencies) {
  const isSandboxReady = dependencies.environment.ASAAS_ENVIRONMENT === "sandbox"
    && Boolean(dependencies.environment.ASAAS_API_KEY?.trim())
    && Boolean(dependencies.environment.ASAAS_WEBHOOK_TOKEN?.trim());

  return createAsaasWebhookHandler({
    expectedToken: isSandboxReady ? dependencies.environment.ASAAS_WEBHOOK_TOKEN : undefined,
    processEvent: dependencies.processEvent,
  });
}

export default function defaultAsaasWebhookHandler(request: Request): Promise<Response> {
  const client = createSupabaseAdmin() as unknown as AsaasWebhookRpcClient;
  return createConfiguredAsaasWebhookHandler({
    environment: process.env,
    processEvent: event => processAsaasWebhookEvent(client, event),
  })(request);
}
