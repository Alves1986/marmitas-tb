import { z } from "zod";
import { ApiAuthError, createSupabaseAuthGuards, type AuthenticatedProfile } from "../../server/vercel/_lib/auth";
import { json, jsonError, methodNotAllowed } from "../../server/vercel/_lib/http";
import { createSupabaseAdmin } from "../../server/vercel/_lib/supabaseAdmin";

const roleInput = z.object({ userId: z.string().uuid(), role: z.enum(["customer", "staff", "admin"]) });

export type AdminStaffDependencies = {
  requireAdmin(request: Request): Promise<AuthenticatedProfile>;
  listStaff(): Promise<unknown>;
  setRole(input: { userId: string; role: "customer" | "staff" | "admin" }): Promise<unknown>;
};

export function createAdminStaffHandler(dependencies: AdminStaffDependencies) {
  return async function adminStaffHandler(request: Request): Promise<Response> {
    try {
      await dependencies.requireAdmin(request);
      if (request.method === "GET") return json(200, await dependencies.listStaff());
      if (request.method !== "PATCH") return methodNotAllowed(["GET", "PATCH"]);
      const input = roleInput.safeParse(await request.json());
      if (!input.success) return jsonError(400, "Dados de equipe inválidos.");
      return json(200, await dependencies.setRole(input.data));
    } catch (error) {
      if (error instanceof ApiAuthError) return jsonError(error.statusCode, error.message);
      return jsonError(500, error);
    }
  };
}

async function listSupabaseStaff() {
  const { data, error } = await createSupabaseAdmin().from("profiles").select("id, display_name, role, created_at").order("created_at");
  if (error) throw new Error("Não foi possível carregar a equipe.");
  return data ?? [];
}

async function setSupabaseRole(input: { userId: string; role: "customer" | "staff" | "admin" }) {
  const { data, error } = await createSupabaseAdmin().from("profiles").update({ role: input.role }).eq("id", input.userId).select("id, role").single();
  if (error || !data) throw new Error("Não foi possível atualizar o papel do membro.");
  return data;
}

export default function defaultAdminStaffHandler(request: Request): Promise<Response> {
  const client = createSupabaseAdmin();
  return createAdminStaffHandler({ requireAdmin: createSupabaseAuthGuards(client).requireAdmin, listStaff: listSupabaseStaff, setRole: setSupabaseRole })(request);
}
