export type SupabaseProfile = {
  id: string;
  email: string;
  fullName: string | null;
  role: string;
};

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: "user" | "staff" | "admin";
};

export type SessionLookupClient = {
  auth: {
    getUser: () => Promise<{
      data: { user: { id: string; email?: string | null } | null };
      error: unknown;
    }>;
  };
  from?: (table: "profiles") => {
    select: (columns: string) => {
      eq: (column: "id", value: string) => {
        maybeSingle: () => Promise<{
          data: {
            id: string;
            email: string;
            full_name: string | null;
            role: string;
          } | null;
          error: unknown;
        }>;
      };
    };
  };
};

type OtpClient = {
  auth: {
    signInWithOtp: (request: {
      email: string;
      options: { shouldCreateUser: false };
    }) => Promise<{ error: { message: string } | null }>;
  };
};

const validRoles = new Set<SessionUser["role"]>(["user", "staff", "admin"]);

export function toSessionUser(profile: SupabaseProfile): SessionUser {
  if (!validRoles.has(profile.role as SessionUser["role"])) {
    throw new Error("Papel de acesso inválido");
  }

  return {
    id: profile.id,
    email: profile.email,
    name: profile.fullName?.trim() || profile.email,
    role: profile.role as SessionUser["role"],
  };
}

export async function loadSessionUser(
  client: SessionLookupClient,
): Promise<SessionUser | null> {
  const { data, error } = await client.auth.getUser();

  if (error || !data.user) return null;
  if (!client.from) throw new Error("Cliente Supabase sem acesso a perfis");

  const profileResult = await client
    .from("profiles")
    .select("id, email, full_name, role")
    .eq("id", data.user.id)
    .maybeSingle();

  if (profileResult.error || !profileResult.data) return null;

  return toSessionUser({
    id: profileResult.data.id,
    email: profileResult.data.email || data.user.email || "",
    fullName: profileResult.data.full_name,
    role: profileResult.data.role,
  });
}

export async function requestTeamOtp(client: OtpClient, email: string): Promise<void> {
  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail) throw new Error("Informe o e-mail da equipe");

  const { error } = await client.auth.signInWithOtp({
    email: normalizedEmail,
    options: { shouldCreateUser: false },
  });

  if (error) throw new Error(error.message);
}
