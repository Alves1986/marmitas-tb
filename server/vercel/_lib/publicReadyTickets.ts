import { createSupabaseAdmin } from "./supabaseAdmin.js";
import { json, jsonError, methodNotAllowed } from "./http.js";

export type PublicReadyTicket = {
  ticket: string;
  readyAt: string;
};

type ReadyTicketRow = {
  counter_ticket_number: number;
  updated_at: string;
};

export type PublicReadyTicketsDependencies = {
  listReadyTickets(): Promise<PublicReadyTicket[]>;
};

export function toPublicReadyTickets(rows: ReadyTicketRow[]): PublicReadyTicket[] {
  return rows.slice(0, 6).map((row) => ({
    ticket: `MTB-${String(row.counter_ticket_number).padStart(3, "0")}`,
    readyAt: row.updated_at,
  }));
}

export async function listSupabasePublicReadyTickets(): Promise<PublicReadyTicket[]> {
  const client = createSupabaseAdmin();
  const { data, error } = await client
    .from("orders")
    .select("counter_ticket_number, updated_at")
    .eq("source_channel", "COUNTER")
    .eq("status", "pronto_para_retirada")
    .not("counter_ticket_number", "is", null)
    .order("updated_at", { ascending: false })
    .limit(6);

  if (error) throw error;
  return toPublicReadyTickets((data ?? []) as ReadyTicketRow[]);
}

export function createPublicReadyTicketsHandler(dependencies: PublicReadyTicketsDependencies) {
  return async function publicReadyTicketsHandler(request: Request): Promise<Response> {
    if (request.method !== "GET") return methodNotAllowed(["GET"]);

    try {
      return json(200, await dependencies.listReadyTickets());
    } catch {
      return jsonError(500, "Não foi possível carregar as chamadas agora.");
    }
  };
}

export function createDefaultPublicReadyTicketsHandler() {
  return createPublicReadyTicketsHandler({ listReadyTickets: listSupabasePublicReadyTickets });
}
