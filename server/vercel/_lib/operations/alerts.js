import { z } from "zod";
import { ApiAuthError, createSupabaseAuthGuards } from "../auth.js";
import { json, jsonError, methodNotAllowed } from "../http.js";
import { createSupabaseAdmin } from "../supabaseAdmin.js";
const acknowledgeInput = z.object({
  orderId: z.string().uuid()
});
function createOperationsAlertsHandler(dependencies) {
  return async function operationsAlertsHandler(request) {
    try {
      const actor = await dependencies.requireStaff(request);
      if (request.method !== "POST") return methodNotAllowed(["POST"]);
      const input = acknowledgeInput.safeParse(await request.json());
      if (!input.success) return jsonError(400, "Dados de reconhecimento inv\xE1lidos.");
      return json(200, await dependencies.acknowledgeAlert({
        orderId: input.data.orderId,
        actorUserId: actor.id
      }));
    } catch (error) {
      if (error instanceof ApiAuthError) return jsonError(error.statusCode, error.message);
      return jsonError(500, error);
    }
  };
}
async function acknowledgeSupabaseAlert(input) {
  const client = createSupabaseAdmin();
  const { data: order, error: orderError } = await client.from("orders").select("id, status").eq("id", input.orderId).maybeSingle();
  if (orderError || !order) throw new Error("Pedido n\xE3o encontrado.");
  const { error } = await client.from("order_events").insert({
    order_id: order.id,
    actor_user_id: input.actorUserId,
    event_type: "alert_acknowledged",
    from_status: order.status,
    to_status: order.status,
    message: "Alerta reconhecido pela opera\xE7\xE3o."
  });
  if (error) throw new Error("N\xE3o foi poss\xEDvel registrar o reconhecimento do alerta.");
  return { orderId: order.id };
}
function createDefaultOperationsAlertsHandler() {
  const client = createSupabaseAdmin();
  const guards = createSupabaseAuthGuards(client);
  return createOperationsAlertsHandler({
    requireStaff: guards.requireStaff,
    acknowledgeAlert: acknowledgeSupabaseAlert
  });
}
export {
  acknowledgeSupabaseAlert,
  createDefaultOperationsAlertsHandler,
  createOperationsAlertsHandler
};
