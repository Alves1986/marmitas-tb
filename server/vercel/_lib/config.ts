export type ServerConfig = {
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  appUrl: string;
};

type Environment = Readonly<Record<string, string | undefined>>;

export function readServerConfig(environment: Environment = process.env): ServerConfig {
  const requiredVariables = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "APP_URL"] as const;

  for (const variableName of requiredVariables) {
    if (!environment[variableName]?.trim()) {
      throw new Error(`Variável obrigatória ausente: ${variableName}`);
    }
  }

  const supabaseUrl = environment.SUPABASE_URL!.trim();
  if (!supabaseUrl.startsWith("https://") || !supabaseUrl.endsWith(".supabase.co")) {
    throw new Error("SUPABASE_URL inválida.");
  }

  return {
    supabaseUrl,
    supabaseServiceRoleKey: environment.SUPABASE_SERVICE_ROLE_KEY!.trim(),
    appUrl: environment.APP_URL!.trim(),
  };
}
