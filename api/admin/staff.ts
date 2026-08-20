import { z } from "zod";
import { ApiAuthError, createSupabaseAuthGuards, type AuthenticatedProfile } from "../../server/vercel/_lib/auth.js";
import { readServerConfig } from "../../server/vercel/_lib/config.js";
import { asVercelNodeHandler, json, jsonError, methodNotAllowed } from "../../server/vercel/_lib/http.js";
import { createSupabaseAdmin } from "../../server/vercel/_lib/supabaseAdmin.js";

const roleInput = z.object({ userId: z.string().uuid(), role: z.enum(["customer", "staff", "admin"]) });
const createMemberInput = z.object({
  action: z.literal("create"),
  email: z.string().trim().email(),
  displayName: z.string().trim().min(2).max(100),
  role: z.enum(["staff", "admin"]),
});
const resendInviteInput = z.object({ action: z.literal("invite"), userId: z.string().uuid() });

type InternalMemberRole = "staff" | "admin";
type CreateMemberInput = { email: string; displayName: string; role: InternalMemberRole };

export type AdminStaffDependencies = {
  requireAdmin(request: Request): Promise<AuthenticatedProfile>;
  listStaff(): Promise<unknown>;
  setRole(input: { userId: string; role: "customer" | "staff" | "admin" }): Promise<unknown>;
  createStaff?(input: CreateMemberInput): Promise<unknown>;
  inviteStaff?(input: { userId: string }): Promise<unknown>;
};

export function createAdminStaffHandler(dependencies: AdminStaffDependencies) {
  return async function adminStaffHandler(request: Request): Promise<Response> {
    try {
      await dependencies.requireAdmin(request);
      if (request.method === "GET") return json(200, await dependencies.listStaff());
      if (request.method === "PATCH") {
        const input = roleInput.safeParse(await request.json());
        if (!input.success) return jsonError(400, "Dados de equipe inválidos.");
        return json(200, await dependencies.setRole(input.data));
      }
      if (request.method === "POST") {
        const body = await request.json();
        const creation = createMemberInput.safeParse(body);
        if (creation.success) {
          if (!dependencies.createStaff) return jsonError(500, "Serviço de convite indisponível.");
          const { action: _action, ...member } = creation.data;
          return json(201, await dependencies.createStaff({ ...member, email: member.email.trim().toLowerCase() }));
        }
        const invitation = resendInviteInput.safeParse(body);
        if (invitation.success) {
          if (!dependencies.inviteStaff) return jsonError(500, "Serviço de convite indisponível.");
          return json(200, await dependencies.inviteStaff({ userId: invitation.data.userId }));
        }
        return jsonError(400, "Dados de equipe inválidos.");
      }
      return methodNotAllowed(["GET", "PATCH", "POST"]);
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

async function createSupabaseStaff(input: CreateMemberInput) {
  const config = readServerConfig();
  const client = createSupabaseAdmin(config);
  const { data: invitation, error: invitationError } = await client.auth.admin.inviteUserByEmail(input.email, {
    redirectTo: `${config.appUrl}/definir-senha`,
    data: { display_name: input.displayName, role: input.role },
  });
  if (invitationError || !invitation.user) throw new Error("Não foi possível criar o convite do membro.");

  const { data, error } = await client
    .from("profiles")
    .upsert({ id: invitation.user.id, display_name: input.displayName, role: input.role }, { onConflict: "id" })
    .select("id, display_name, role, created_at")
    .single();
  if (error || !data) throw new Error("Não foi possível registrar o membro convidado.");

  return { ...data, invitation_status: "pending" };
}

async function inviteSupabaseStaff(input: { userId: string }) {
  const config = readServerConfig();
  const client = createSupabaseAdmin(config);
  const { data: userData, error: userError } = await client.auth.admin.getUserById(input.userId);
  const email = userData.user?.email;
  if (userError || !email) throw new Error("Não foi possível localizar o membro para reenvio.");

  const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo: `${config.appUrl}/definir-senha` });
  if (error) throw new Error("Não foi possível reenviar o convite do membro.");
  return { id: input.userId, invitation_status: "pending" };
}

function defaultAdminStaffHandler(request: Request): Promise<Response> {
  const client = createSupabaseAdmin();
  return createAdminStaffHandler({
    requireAdmin: createSupabaseAuthGuards(client).requireAdmin,
    listStaff: listSupabaseStaff,
    setRole: setSupabaseRole,
    createStaff: createSupabaseStaff,
    inviteStaff: inviteSupabaseStaff,
  })(request);
}

export default asVercelNodeHandler(defaultAdminStaffHandler);
