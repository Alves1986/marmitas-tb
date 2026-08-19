import { z } from "zod";
import { ApiAuthError, createSupabaseAuthGuards, type AuthenticatedProfile } from "../../server/vercel/_lib/auth";
import { json, jsonError, methodNotAllowed } from "../../server/vercel/_lib/http";
import { createSupabaseAdmin } from "../../server/vercel/_lib/supabaseAdmin";

const requeueInput = z.object({ orderId: z.string().uuid() });
const markInput = z.object({
  printJobId: z.string().uuid(),
  status: z.enum(["printed", "failed"]),
  printerName: z.string().trim().max(160).optional(),
});

export type PrintJobsDependencies = {
  requireOperator(request: Request): Promise<AuthenticatedProfile>;
  list(): Promise<unknown[]>;
  requeue(input: { orderId: string; actorUserId: string }): Promise<unknown>;
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
    .select("id, order_id, status, attempts, printer_name, printed_at, created_at, orders(code)")
    .eq("status", "queued")
    .order("created_at", { ascending: true });
  if (error) throw new Error("Não foi possível carregar a fila de impressão.");
  return data ?? [];
}

async function requeuePrintJob(input: { orderId: string; actorUserId: string }) {
  const client = createSupabaseAdmin();
  const { data: job, error: jobError } = await client.from("print_jobs")
    .insert({ order_id: input.orderId, status: "queued" })
    .select("id, order_id, status, created_at")
    .single();
  if (jobError) throw new Error("Não foi possível solicitar a reimpressão.");
  const { error: eventError } = await client.from("order_events").insert({
    order_id: input.orderId,
    actor_user_id: input.actorUserId,
    event_type: "print_queued",
    message: "Reimpressão de comanda solicitada pela equipe.",
  });
  if (eventError) throw new Error("Não foi possível registrar a auditoria da reimpressão.");
  return job;
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

export default function defaultPrintJobsHandler(request: Request): Promise<Response> {
  const client = createSupabaseAdmin();
  const guards = createSupabaseAuthGuards(client);
  return createPrintJobsHandler({ requireOperator: guards.requireStaff, list: listPrintJobs, requeue: requeuePrintJob, mark: markPrintJob })(request);
}
