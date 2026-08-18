import { createClient } from "@supabase/supabase-js";

export type SupabaseSessionUser = {
  id: string;
  email: string;
  name: string;
  role: "user" | "staff" | "admin";
};

export function getBearerToken(authorization?: string): string | null {
  const match = authorization?.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

type SupabaseServerConfig = {
  url: string;
  publishableKey: string;
};

const validRoles = new Set<SupabaseSessionUser["role"]>(["user", "staff", "admin"]);

export async function authenticateSupabaseRequest(
  authorization: string | undefined,
  config: SupabaseServerConfig,
): Promise<SupabaseSessionUser | null> {
  const token = getBearerToken(authorization);
  if (!token || !config.url || !config.publishableKey) return null;

  const client = createClient(config.url, config.publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: userData, error: userError } = await client.auth.getUser(token);
  if (userError || !userData.user) return null;

  const { data: profile, error: profileError } = await client
    .from("profiles")
    .select("id, display_name, role")
    .eq("id", userData.user.id)
    .maybeSingle();

  if (profileError || !profile || !validRoles.has(profile.role as SupabaseSessionUser["role"])) {
    return null;
  }

  return {
    id: profile.id,
    email: userData.user.email || "",
    name: profile.display_name?.trim() || userData.user.email || "Equipe Marmitas TB",
    role: profile.role as SupabaseSessionUser["role"],
  };
}
