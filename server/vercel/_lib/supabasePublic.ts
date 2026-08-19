import { createClient } from "@supabase/supabase-js";
import { readPublicSupabaseConfig, type PublicSupabaseConfig } from "./config";

export function createSupabasePublic(config: PublicSupabaseConfig = readPublicSupabaseConfig()) {
  return createClient(config.supabaseUrl, config.supabasePublishableKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
