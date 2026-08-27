import { z } from "zod";
import { ApiAuthError, createSupabaseAuthGuards } from "../auth.js";
import { json, jsonError, methodNotAllowed } from "../http.js";
import { createSupabaseAdmin } from "../supabaseAdmin.js";
const requeueInput = z.object({
  orderId: z.string().uuid(),
  reason: z.string().trim().min(3).max(500)
});
const markInput = z.object({
  printJobId: z.string().uuid(),
  status: z.enum(["printed", "failed"]),
  printerName: z.string().trim().max(160).optional()
});
function toErrorResponse(error) {
  if (error instanceof ApiAuthError) return jsonError(error.statusCode, error.message);
  return jsonError(500, error);
}
function createPrintJobsHandler(dependencies) {
  return async function printJobsHandler(request) {
    try {
      const actor = await dependencies.requireOperator(request);
      if (request.method === "GET") return json(200, await dependencies.list());
      if (request.method === "POST") {
        const input = requeueInput.safeParse(await request.json());
        if (!input.success) return jsonError(400, "Dados de reimpress\xE3o inv\xE1lidos.");
        return json(201, await dependencies.requeue({ ...input.data, actorUserId: actor.id }));
      }
      if (request.method === "PATCH") {
        const input = markInput.safeParse(await request.json());
        if (!input.success) return jsonError(400, "Dados de impress\xE3o inv\xE1lidos.");
        return json(200, await dependencies.mark(input.data));
      }
      return methodNotAllowed(["GET", "POST", "PATCH"]);
    } catch (error) {
      return toErrorResponse(error);
    }
  };
}
async function listPrintJobs() {
  const client = createSupabaseAdmin();
  const { data, error } = await client.from("print_jobs").select("id, order_id, station_code, document_type, priority, status, attempts, printer_name, printed_at, created_at, orders(code, source_channel)").eq("status", "queued").order("priority", { ascending: false }).order("created_at", { ascending: true });
  if (error) throw new Error("N\xE3o foi poss\xEDvel carregar a fila de impress\xE3o.");
  return data ?? [];
}
async function requeueSupabasePrintJob(client, input) {
  const { data, error } = await client.rpc("requeue_print_job", {
    p_order_id: input.orderId,
    p_actor_user_id: input.actorUserId,
    p_reason: input.reason,
    p_station_code: "COZINHA"
  });
  if (error || !data?.[0]) throw new Error(`N\xE3o foi poss\xEDvel solicitar a reimpress\xE3o: ${error?.message ?? "sem confirma\xE7\xE3o"}`);
  const job = data[0];
  return {
    id: job.print_job_id,
    status: job.print_job_status,
    priority: job.print_job_priority,
    created_at: job.print_job_created_at
  };
}
async function requeuePrintJob(input) {
  return requeueSupabasePrintJob(createSupabaseAdmin(), input);
}
async function markPrintJob(input) {
  const client = createSupabaseAdmin();
  const { data, error } = await client.from("print_jobs").update({
    status: input.status,
    printer_name: input.printerName ?? null,
    printed_at: input.status === "printed" ? (/* @__PURE__ */ new Date()).toISOString() : null,
    attempts: input.status === "failed" ? 1 : 0
  }).eq("id", input.printJobId).select("id, status, printer_name, printed_at").single();
  if (error) throw new Error("N\xE3o foi poss\xEDvel registrar o resultado da impress\xE3o.");
  return data;
}
function createDefaultPrintJobsHandler() {
  const client = createSupabaseAdmin();
  const guards = createSupabaseAuthGuards(client);
  return createPrintJobsHandler({ requireOperator: guards.requireStaff, list: listPrintJobs, requeue: requeuePrintJob, mark: markPrintJob });
}
export {
  createDefaultPrintJobsHandler,
  createPrintJobsHandler,
  listPrintJobs,
  markPrintJob,
  requeuePrintJob,
  requeueSupabasePrintJob
};
