import { createClient } from "@supabase/supabase-js";
import { readServerConfig, type ServerConfig } from "./config";

export function createSupabaseAdmin(config: ServerConfig = readServerConfig()) {
  return createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
