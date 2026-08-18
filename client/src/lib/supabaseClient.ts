import { createClient } from "@supabase/supabase-js";

type BrowserSupabaseConfig = {
  url: string;
  publishableKey: string;
};

export function createBrowserSupabaseClient({
  url,
  publishableKey,
}: BrowserSupabaseConfig) {
  const parsedUrl = new URL(url);

  if (!parsedUrl.hostname.endsWith(".supabase.co")) {
    throw new Error("URL do Supabase inválida");
  }

  if (!publishableKey.trim()) {
    throw new Error("Chave publicável do Supabase ausente");
  }

  return createClient(url, publishableKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const supabase = createBrowserSupabaseClient({
  url: supabaseUrl,
  publishableKey: supabasePublishableKey,
});
