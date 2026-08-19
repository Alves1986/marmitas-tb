import { z } from "zod";
import { ApiAuthError, createSupabaseAuthGuards, type AuthenticatedProfile } from "../../server/vercel/_lib/auth.js";
import { asVercelNodeHandler, json, jsonError, methodNotAllowed } from "../../server/vercel/_lib/http.js";
import { createSupabaseAdmin } from "../../server/vercel/_lib/supabaseAdmin.js";

type FinancialOrder = {
  id: string;
  totalInCents: number;
  paymentMethod: string;
  paymentStatus: string;
  status?: string;
  createdAt: string;
};

type FinancialExpense = {
  id: string;
  description?: string;
  category?: string;
  amountInCents: number;
  status: "draft" | "approved" | "rejected";
  incurredOn: string;
  submittedByName?: string | null;
};

type FinancialSnapshot = {
  orders: FinancialOrder[];
  expenses: FinancialExpense[];
};

type FinancialAuditLog = {
  id: string;
  action: "expense.approved" | "expense.rejected";
  entityId: string | null;
  actorName: string | null;
  createdAt: string;
};

export type AdminFinanceDependencies = {
  requireAdmin(request: Request): Promise<AuthenticatedProfile>;
  requireStaff(request: Request): Promise<AuthenticatedProfile>;
  getSnapshot(period: { from: string; to: string }): Promise<FinancialSnapshot>;
  createExpense(input: ExpenseDraftInput): Promise<{ id: string; status: "draft" }>;
  reviewExpense(input: ExpenseReviewInput): Promise<{ id: string; status: "approved" | "rejected" }>;
  writeAuditLog(input: AuditLogInput): Promise<void>;
  listAuditLogs?(): Promise<FinancialAuditLog[]>;
};

const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const expenseInput = z.object({
  description: z.string().trim().min(2).max(240),
  category: z.string().trim().min(2).max(120),
  amountInCents: z.number().int().positive().max(10_000_000),
  incurredOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  receiptPath: z.string().trim().max(1_000).optional(),
  notes: z.string().trim().max(2_000).optional(),
});

type ExpenseDraftInput = z.infer<typeof expenseInput> & {
  submittedByUserId: string;
  status: "draft";
};

const expenseReviewInput = z.object({
  expenseId: z.string().uuid(),
  decision: z.enum(["approved", "rejected"]),
  rejectionReason: z.string().trim().min(2).max(1_000).optional(),
}).superRefine((value, context) => {
  if (value.decision === "rejected" && !value.rejectionReason) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "Informe o motivo da rejeição." });
  }
});

type ExpenseReviewInput = z.infer<typeof expenseReviewInput> & {
  reviewedByUserId: string;
};

type AuditLogInput = {
  actorUserId: string;
  action: "expense.approved" | "expense.rejected";
  entityId: string;
  metadata: { decision: "approved" | "rejected" };
};

function monthToDate(): { from: string; to: string } {
  const now = new Date();
  const first = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  return {
    from: first.toISOString().slice(0, 10),
    to: now.toISOString().slice(0, 10),
  };
}

function getPeriod(request: Request): { from: string; to: string } | null {
  const url = new URL(request.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  if (!from && !to) return monthToDate();
  if (!from || !to || !datePattern.test(from) || !datePattern.test(to) || from > to) return null;
  return { from, to };
}

export function summarizeFinance(snapshot: FinancialSnapshot) {
  const confirmedOrders = snapshot.orders.filter((order) => order.paymentStatus === "confirmed" && order.status !== "cancelado");
  const approvedExpenses = snapshot.expenses.filter((expense) => expense.status === "approved");
  const revenueInCents = confirmedOrders.reduce((total, order) => total + order.totalInCents, 0);
  const expenseInCents = approvedExpenses.reduce((total, expense) => total + expense.amountInCents, 0);
  const paymentSummary = new Map<string, { amountInCents: number; orderCount: number }>();

  for (const order of confirmedOrders) {
    const current = paymentSummary.get(order.paymentMethod) ?? { amountInCents: 0, orderCount: 0 };
    current.amountInCents += order.totalInCents;
    current.orderCount += 1;
    paymentSummary.set(order.paymentMethod, current);
  }

  return {
    revenueInCents,
    expenseInCents,
    netCashInCents: revenueInCents - expenseInCents,
    confirmedOrderCount: confirmedOrders.length,
    averageTicketInCents: confirmedOrders.length ? Math.round(revenueInCents / confirmedOrders.length) : 0,
    paymentBreakdown: Array.from(paymentSummary.entries())
      .map(([paymentMethod, values]) => ({ paymentMethod, ...values }))
      .sort((left, right) => right.amountInCents - left.amountInCents || left.paymentMethod.localeCompare(right.paymentMethod)),
  };
}

export function createAdminFinanceHandler(dependencies: AdminFinanceDependencies) {
  return async function adminFinanceHandler(request: Request): Promise<Response> {
    try {
      if (request.method === "GET") {
        await dependencies.requireAdmin(request);
        const view = new URL(request.url).searchParams.get("view");
        if (view === "audit") return json(200, { auditLogs: await dependencies.listAuditLogs?.() ?? [] });
        const period = getPeriod(request);
        if (!period) return jsonError(400, "Período financeiro inválido.");
        const snapshot = await dependencies.getSnapshot(period);
        if (view === "review") {
          return json(200, { expenses: snapshot.expenses.filter((expense) => expense.status === "draft") });
        }
        return json(200, { period, ...summarizeFinance(snapshot) });
      }

      if (request.method === "POST") {
        const actor = await dependencies.requireStaff(request);
        const input = expenseInput.safeParse(await request.json());
        if (!input.success) return jsonError(400, "Despesa inválida.");
        return json(201, await dependencies.createExpense({ ...input.data, submittedByUserId: actor.id, status: "draft" }));
      }

      if (request.method === "PATCH") {
        const actor = await dependencies.requireAdmin(request);
        const input = expenseReviewInput.safeParse(await request.json());
        if (!input.success) return jsonError(400, "Revisão da despesa inválida.");
        const reviewedExpense = await dependencies.reviewExpense({ ...input.data, reviewedByUserId: actor.id });
        await dependencies.writeAuditLog({
          actorUserId: actor.id,
          action: `expense.${input.data.decision}` as AuditLogInput["action"],
          entityId: input.data.expenseId,
          metadata: { decision: input.data.decision },
        });
        return json(200, reviewedExpense);
      }

      return methodNotAllowed(["GET", "POST", "PATCH"]);
    } catch (error) {
      if (error instanceof ApiAuthError) return jsonError(error.statusCode, error.message);
      return jsonError(500, error);
    }
  };
}

async function getSupabaseSnapshot(period: { from: string; to: string }): Promise<FinancialSnapshot> {
  const client = createSupabaseAdmin();
  const [ordersResult, expensesResult] = await Promise.all([
    client
      .from("orders")
      .select("id, total_in_cents, payment_method, payment_status, status, created_at")
      .gte("created_at", `${period.from}T00:00:00.000Z`)
      .lte("created_at", `${period.to}T23:59:59.999Z`),
    client
      .from("expense_entries")
      .select("id, description, category, amount_in_cents, status, incurred_on")
      .gte("incurred_on", period.from)
      .lte("incurred_on", period.to),
  ]);

  if (ordersResult.error || expensesResult.error) throw new Error("Não foi possível carregar os dados financeiros.");
  return {
    orders: (ordersResult.data ?? []).map((order) => ({
      id: order.id,
      totalInCents: order.total_in_cents,
      paymentMethod: order.payment_method,
      paymentStatus: order.payment_status,
      status: order.status,
      createdAt: order.created_at,
    })),
      expenses: (expensesResult.data ?? []).map((expense) => ({
        id: expense.id,
        description: expense.description,
        category: expense.category,
        amountInCents: expense.amount_in_cents,
        status: expense.status as FinancialExpense["status"],
        incurredOn: expense.incurred_on,
    })),
  };
}

async function createSupabaseExpense(input: ExpenseDraftInput): Promise<{ id: string; status: "draft" }> {
  const client = createSupabaseAdmin();
  const { data, error } = await client
    .from("expense_entries")
    .insert({
      description: input.description,
      category: input.category,
      amount_in_cents: input.amountInCents,
      incurred_on: input.incurredOn,
      receipt_path: input.receiptPath || null,
      notes: input.notes || null,
      status: "draft",
      submitted_by_user_id: input.submittedByUserId,
    })
    .select("id, status")
    .single();

  if (error || !data || data.status !== "draft") throw new Error("Não foi possível registrar a despesa.");
  return { id: data.id, status: "draft" };
}

async function reviewSupabaseExpense(input: ExpenseReviewInput): Promise<{ id: string; status: "approved" | "rejected" }> {
  const client = createSupabaseAdmin();
  const { data, error } = await client
    .from("expense_entries")
    .update({
      status: input.decision,
      approved_by_user_id: input.reviewedByUserId,
      approved_at: new Date().toISOString(),
      rejection_reason: input.decision === "rejected" ? input.rejectionReason : null,
    })
    .eq("id", input.expenseId)
    .eq("status", "draft")
    .select("id, status")
    .maybeSingle();

  if (error || !data || (data.status !== "approved" && data.status !== "rejected")) {
    throw new Error("A despesa não está disponível para revisão.");
  }
  return { id: data.id, status: data.status };
}

async function writeSupabaseAuditLog(input: AuditLogInput): Promise<void> {
  const client = createSupabaseAdmin();
  const { error } = await client.from("admin_audit_logs").insert({
    actor_user_id: input.actorUserId,
    action: input.action,
    entity_type: "expense_entry",
    entity_id: input.entityId,
    metadata: input.metadata,
  });
  if (error) throw new Error("Não foi possível registrar a auditoria administrativa.");
}

async function listSupabaseAuditLogs(): Promise<FinancialAuditLog[]> {
  const client = createSupabaseAdmin();
  const { data: auditRows, error: auditError } = await client
    .from("admin_audit_logs")
    .select("id, action, entity_id, actor_user_id, created_at")
    .in("action", ["expense.approved", "expense.rejected"])
    .order("created_at", { ascending: false })
    .limit(50);
  if (auditError) throw new Error("Não foi possível carregar a auditoria administrativa.");

  const actorIds = Array.from(new Set((auditRows ?? []).map((row) => row.actor_user_id).filter((id): id is string => Boolean(id))));
  const { data: profiles, error: profilesError } = actorIds.length
    ? await client.from("profiles").select("id, display_name").in("id", actorIds)
    : { data: [], error: null };
  if (profilesError) throw new Error("Não foi possível identificar os responsáveis pela auditoria.");
  const namesById = new Map((profiles ?? []).map((profile) => [profile.id, profile.display_name]));

  return (auditRows ?? []).map((row) => ({
    id: row.id,
    action: row.action as FinancialAuditLog["action"],
    entityId: row.entity_id,
    actorName: row.actor_user_id ? namesById.get(row.actor_user_id) ?? null : null,
    createdAt: row.created_at,
  }));
}

function defaultAdminFinanceHandler(request: Request): Promise<Response> {
  const client = createSupabaseAdmin();
  const guards = createSupabaseAuthGuards(client);
  return createAdminFinanceHandler({
    requireAdmin: guards.requireAdmin,
    requireStaff: guards.requireStaff,
    getSnapshot: getSupabaseSnapshot,
    createExpense: createSupabaseExpense,
    reviewExpense: reviewSupabaseExpense,
    writeAuditLog: writeSupabaseAuditLog,
    listAuditLogs: listSupabaseAuditLogs,
  })(request);
}

export default asVercelNodeHandler(defaultAdminFinanceHandler);
