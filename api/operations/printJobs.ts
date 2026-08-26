import { z } from "zod";
import { ApiAuthError, createSupabaseAuthGuards, type AuthenticatedProfile } from "../../server/vercel/_lib/auth.js";
import { asVercelNodeHandler, json, jsonError, methodNotAllowed } from "../../server/vercel/_lib/http.js";
import { createSupabaseAdmin } from "../../server/vercel/_lib/supabaseAdmin.js";

const requeueInput = z.object({
  orderId: z.string().uuid(),
  reason: z.string().trim().min(3).max(500),
});
const markInput = z.object({
  printJobId: z.string().uuid(),
  status: z.enum(["printed", "failed"]),
  printerName: z.string().trim().max(160).optional(),
});

export type PrintJobsDependencies = {
  requireOperator(request: Request): Promise<AuthenticatedProfile>;
  list(): Promise<unknown[]>;
  requeue(input: { orderId: string; actorUserId: string; reason: string }): Promise<unknown>;
  mark(input: z.infer<typeof markInput>): Promise<unknown>;
};

function toErrorResponse(error: unknown): Response {
  if (error instanceof ApiAuthError) return jsonError(error.statusCode, error.message);
  return jsonError(500, error);
}

export function createPrintJobsHandler(dependencies: PrintJobsDependencies) {
  return async function printJobsHandler(request: Request): Promise<Response> {
    try {
      const actor = await dependencies.requireOperator(request);
      if (request.method === "GET") return json(200, await dependencies.list());
      if (request.method === "POST") {
        const input = requeueInput.safeParse(await request.json());
        if (!input.success) return jsonError(400, "Dados de reimpressão inválidos.");
        return json(201, await dependencies.requeue({ ...input.data, actorUserId: actor.id }));
      }
      if (request.method === "PATCH") {
        const input = markInput.safeParse(await request.json());
        if (!input.success) return jsonError(400, "Dados de impressão inválidos.");
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
  const { data, error } = await client.from("print_jobs")
    .select("id, order_id, station_code, document_type, priority, status, attempts, printer_name, printed_at, created_at, orders(code, source_channel)")
    .eq("status", "queued")
    .order("priority", { ascending: false })
    .order("created_at", { ascending: true });
  if (error) throw new Error("Não foi possível carregar a fila de impressão.");
  return data ?? [];
}

type RequeuePrintRpcClient = {
  rpc: (name: "requeue_print_job", parameters: Record<string, unknown>) => PromiseLike<{
    data: Array<{ print_job_id: string; print_job_status: "queued" | "printed" | "failed"; print_job_priority: number; print_job_created_at: string }> | null;
    error: { message: string } | null;
  }>;
};

export async function requeueSupabasePrintJob(client: RequeuePrintRpcClient, input: { orderId: string; actorUserId: string; reason: string }) {
  const { data, error } = await client.rpc("requeue_print_job", {
    p_order_id: input.orderId,
    p_actor_user_id: input.actorUserId,
    p_reason: input.reason,
    p_station_code: "COZINHA",
  });
  if (error || !data?.[0]) throw new Error(`Não foi possível solicitar a reimpressão: ${error?.message ?? "sem confirmação"}`);

  const job = data[0];
  return {
    id: job.print_job_id,
    status: job.print_job_status,
    priority: job.print_job_priority,
    created_at: job.print_job_created_at,
  };
}

async function requeuePrintJob(input: { orderId: string; actorUserId: string; reason: string }) {
  return requeueSupabasePrintJob(createSupabaseAdmin(), input);
}

async function markPrintJob(input: z.infer<typeof markInput>) {
  const client = createSupabaseAdmin();
  const { data, error } = await client.from("print_jobs")
    .update({
      status: input.status,
      printer_name: input.printerName ?? null,
      printed_at: input.status === "printed" ? new Date().toISOString() : null,
      attempts: input.status === "failed" ? 1 : 0,
    })
    .eq("id", input.printJobId)
    .select("id, status, printer_name, printed_at")
    .single();
  if (error) throw new Error("Não foi possível registrar o resultado da impressão.");
  return data;
}

function defaultPrintJobsHandler(request: Request): Promise<Response> {
  const client = createSupabaseAdmin();
  const guards = createSupabaseAuthGuards(client);
  return createPrintJobsHandler({ requireOperator: guards.requireStaff, list: listPrintJobs, requeue: requeuePrintJob, mark: markPrintJob })(request);
}

export default asVercelNodeHandler(defaultPrintJobsHandler);
