import type { SupabaseClient } from "@supabase/supabase-js";

export type AppRole = "customer" | "staff" | "admin";

export type AuthUser = {
  id: string;
  email: string;
  displayName: string;
};

export type AuthProfile = {
  id: string;
  role: AppRole;
  displayName?: string;
};

export type AuthenticatedProfile = AuthUser & AuthProfile;

export type AuthDependencies = {
  getUser(accessToken: string): Promise<AuthUser | null>;
  getProfile(userId: string): Promise<AuthProfile | null>;
};

export class ApiAuthError extends Error {
  constructor(
    public readonly statusCode: 401 | 403,
    message: string,
  ) {
    super(message);
    this.name = "ApiAuthError";
  }
}

function getBearerToken(request: Request): string | null {
  const authorization = request.headers.get("authorization");
  const match = authorization?.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

export function createAuthGuards(dependencies: AuthDependencies) {
  async function requireUser(request: Request): Promise<AuthenticatedProfile> {
    const token = getBearerToken(request);
    if (!token) {
      throw new ApiAuthError(401, "Sessão não autenticada.");
    }

    const user = await dependencies.getUser(token);
    if (!user) {
      throw new ApiAuthError(401, "Sessão não autenticada.");
    }

    const profile = await dependencies.getProfile(user.id);
    if (!profile || profile.id !== user.id) {
      throw new ApiAuthError(403, "Perfil sem acesso ao sistema.");
    }

    return { ...user, ...profile };
  }

  async function requireStaff(request: Request): Promise<AuthenticatedProfile> {
    const profile = await requireUser(request);
    if (profile.role !== "staff" && profile.role !== "admin") {
      throw new ApiAuthError(403, "Acesso restrito à equipe.");
    }
    return profile;
  }

  async function requireAdmin(request: Request): Promise<AuthenticatedProfile> {
    const profile = await requireUser(request);
    if (profile.role !== "admin") {
      throw new ApiAuthError(403, "Acesso restrito à administração.");
    }
    return profile;
  }

  return { requireUser, requireStaff, requireAdmin };
}

function isAppRole(value: unknown): value is AppRole {
  return value === "customer" || value === "staff" || value === "admin";
}

export function createSupabaseAuthGuards(client: Pick<SupabaseClient, "auth" | "from">) {
  return createAuthGuards({
    async getUser(accessToken) {
      const { data, error } = await client.auth.getUser(accessToken);
      if (error || !data.user?.email) return null;

      return {
        id: data.user.id,
        email: data.user.email,
        displayName: data.user.user_metadata?.name?.trim() || data.user.email,
      };
    },
    async getProfile(userId) {
      const { data, error } = await client
        .from("profiles")
        .select("id, display_name, role")
        .eq("id", userId)
        .maybeSingle();

      if (error || !data || !isAppRole(data.role)) return null;

      const displayName = data.display_name?.trim();
      return displayName
        ? { id: data.id, role: data.role, displayName }
        : { id: data.id, role: data.role };
    },
  });
}
