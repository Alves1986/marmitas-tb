import { z } from "zod";
import { ApiAuthError, createSupabaseAuthGuards, type AuthenticatedProfile } from "../../server/vercel/_lib/auth.js";
import { asVercelNodeHandler, json, jsonError, methodNotAllowed } from "../../server/vercel/_lib/http.js";
import { createSupabaseAdmin } from "../../server/vercel/_lib/supabaseAdmin.js";

const acknowledgeInput = z.object({
  orderId: z.string().uuid(),
});

export type OperationsAlertsDependencies = {
  requireStaff(request: Request): Promise<AuthenticatedProfile>;
  acknowledgeAlert(input: { orderId: string; actorUserId: string }): Promise<{ orderId: string }>;
};

export function createOperationsAlertsHandler(dependencies: OperationsAlertsDependencies) {
  return async function operationsAlertsHandler(request: Request): Promise<Response> {
    try {
      const actor = await dependencies.requireStaff(request);
      if (request.method !== "POST") return methodNotAllowed(["POST"]);

      const input = acknowledgeInput.safeParse(await request.json());
      if (!input.success) return jsonError(400, "Dados de reconhecimento inválidos.");

      return json(200, await dependencies.acknowledgeAlert({
        orderId: input.data.orderId,
        actorUserId: actor.id,
      }));
    } catch (error) {
      if (error instanceof ApiAuthError) return jsonError(error.statusCode, error.message);
      return jsonError(500, error);
    }
  };
}

async function acknowledgeSupabaseAlert(input: { orderId: string; actorUserId: string }) {
  const client = createSupabaseAdmin();
  const { data: order, error: orderError } = await client
    .from("orders")
    .select("id, status")
    .eq("id", input.orderId)
    .maybeSingle();
  if (orderError || !order) throw new Error("Pedido não encontrado.");

  const { error } = await client.from("order_events").insert({
    order_id: order.id,
    actor_user_id: input.actorUserId,
    event_type: "alert_acknowledged",
    from_status: order.status,
    to_status: order.status,
    message: "Alerta reconhecido pela operação.",
  });
  if (error) throw new Error("Não foi possível registrar o reconhecimento do alerta.");
  return { orderId: order.id };
}

function defaultOperationsAlertsHandler(request: Request): Promise<Response> {
  const client = createSupabaseAdmin();
  const guards = createSupabaseAuthGuards(client);
  return createOperationsAlertsHandler({
    requireStaff: guards.requireStaff,
    acknowledgeAlert: acknowledgeSupabaseAlert,
  })(request);
}

export default asVercelNodeHandler(defaultOperationsAlertsHandler);
