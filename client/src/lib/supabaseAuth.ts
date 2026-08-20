export type SupabaseProfile = {
  id: string;
  displayName: string | null;
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
            display_name: string | null;
            role: string;
          } | null;
          error: unknown;
        }>;
      };
    };
  };
};

type PasswordSignInClient = {
  auth: {
    signInWithPassword: (request: {
      email: string;
      password: string;
    }) => Promise<{ error: { message: string } | null }>;
  };
};

type PasswordUpdateClient = {
  auth: {
    updateUser: (attributes: { password: string }) => Promise<{ error: { message: string } | null }>;
  };
};

type PasswordResetClient = {
  auth: {
    resetPasswordForEmail: (email: string, options: { redirectTo?: string }) => Promise<{ error: { message: string } | null }>;
  };
};

const validRoles = new Set<SessionUser["role"]>(["user", "staff", "admin"]);

export function toSessionUser(profile: SupabaseProfile, email: string): SessionUser {
  if (!validRoles.has(profile.role as SessionUser["role"])) {
    throw new Error("Papel de acesso inválido");
  }

  return {
    id: profile.id,
    email,
    name: profile.displayName?.trim() || email,
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
    .select("id, display_name, role")
    .eq("id", data.user.id)
    .maybeSingle();

  if (profileResult.error || !profileResult.data) return null;

  return toSessionUser({
    id: profileResult.data.id,
    displayName: profileResult.data.display_name,
    role: profileResult.data.role,
  }, data.user.email || "");
}

export async function signInWithPassword(
  client: PasswordSignInClient,
  email: string,
  password: string,
): Promise<void> {
  const normalizedEmail = email.trim().toLowerCase();
  const { error } = await client.auth.signInWithPassword({
    email: normalizedEmail,
    password,
  });

  if (error) throw new Error(error.message);
}

export async function setNewPassword(client: PasswordUpdateClient, password: string): Promise<void> {
  const { error } = await client.auth.updateUser({ password });
  if (error) throw new Error(error.message);
}

export async function requestPasswordReset(client: PasswordResetClient, email: string): Promise<void> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) throw new Error("Informe o e-mail da equipe");

  const origin = typeof window === "undefined" ? undefined : window.location?.origin;
  const { error } = await client.auth.resetPasswordForEmail(normalizedEmail, {
    ...(origin ? { redirectTo: `${origin}/definir-senha` } : {}),
  });
  if (error) throw new Error(error.message);
}
