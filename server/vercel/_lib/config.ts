export type ServerConfig = {
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  appUrl: string;
};

type Environment = Readonly<Record<string, string | undefined>>;

export function readServerConfig(environment: Environment = process.env): ServerConfig {
  const supabaseUrl = (environment.SUPABASE_URL ?? environment.VITE_SUPABASE_URL)?.trim();
  const appUrl = (environment.APP_URL ?? (environment.VERCEL_URL ? `https://${environment.VERCEL_URL}` : undefined))?.trim();
  const supabaseServiceRoleKey = environment.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!supabaseUrl) throw new Error("Variável obrigatória ausente: SUPABASE_URL");
  if (!supabaseServiceRoleKey) throw new Error("Variável obrigatória ausente: SUPABASE_SERVICE_ROLE_KEY");
  if (!appUrl) throw new Error("Variável obrigatória ausente: APP_URL");

  if (!supabaseUrl.startsWith("https://") || !supabaseUrl.endsWith(".supabase.co")) {
    throw new Error("SUPABASE_URL inválida.");
  }

  return {
    supabaseUrl,
    supabaseServiceRoleKey,
    appUrl,
  };
}
