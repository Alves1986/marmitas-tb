import { z } from "zod";
import { ApiAuthError, createSupabaseAuthGuards, type AuthenticatedProfile } from "../../server/vercel/_lib/auth.js";
import { createSupabaseCounterOrder, type CounterOrderConfirmation, type CreateCounterOrderInput } from "../../server/vercel/_lib/ordersRepository.js";
import { asVercelNodeHandler, json, jsonError, methodNotAllowed } from "../../server/vercel/_lib/http.js";
import { createSupabaseAdmin } from "../../server/vercel/_lib/supabaseAdmin.js";

const counterOrderInput = z.object({
  idempotencyKey: z.string().uuid(),
  displayName: z.string().trim().min(1).max(80).optional(),
  paymentMethod: z.enum(["cash", "pix", "debit_card", "credit_card", "voucher"]),
  items: z.array(z.object({
    productId: z.string().uuid(),
    quantity: z.number().int().min(1).max(50),
    optionIds: z.array(z.string().uuid()).max(30),
    note: z.string().trim().max(500),
  })).min(1).max(50),
});

export type CounterOrdersDependencies = {
  requireOperator(request: Request): Promise<AuthenticatedProfile>;
  createCounterOrder(input: CreateCounterOrderInput): Promise<CounterOrderConfirmation>;
};

function toErrorResponse(error: unknown): Response {
  if (error instanceof ApiAuthError) return jsonError(error.statusCode, error.message);
  return jsonError(500, error);
}

export function createCounterOrdersHandler(dependencies: CounterOrdersDependencies) {
  return async function counterOrdersHandler(request: Request): Promise<Response> {
    try {
      if (request.method !== "POST") return methodNotAllowed(["POST"]);
      const actor = await dependencies.requireOperator(request);
      const input = counterOrderInput.safeParse(await request.json());
      if (!input.success) return jsonError(400, "Dados do pedido de balcão inválidos.");

      const confirmation = await dependencies.createCounterOrder({
        ...input.data,
        sourceChannel: "COUNTER",
        actorUserId: actor.id,
      });
      return json(201, confirmation);
    } catch (error) {
      return toErrorResponse(error);
    }
  };
}

function defaultCounterOrdersHandler(request: Request): Promise<Response> {
  const client = createSupabaseAdmin();
  const guards = createSupabaseAuthGuards(client);
  return createCounterOrdersHandler({
    requireOperator: guards.requireStaff,
    createCounterOrder: createSupabaseCounterOrder,
  })(request);
}

export default asVercelNodeHandler(defaultCounterOrdersHandler);
