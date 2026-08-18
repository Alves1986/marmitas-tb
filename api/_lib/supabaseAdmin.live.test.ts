import { describe, expect, it } from "vitest";
import { createSupabaseAdmin } from "./supabaseAdmin";

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

describe.runIf(Boolean(supabaseUrl && serviceRoleKey))("validação integrada da chave de serviço Supabase", () => {
  it("executa uma leitura mínima da tabela categories", async () => {
    const client = createSupabaseAdmin({
      supabaseUrl: supabaseUrl!,
      supabaseServiceRoleKey: serviceRoleKey!,
      appUrl: "https://marmitas-tb.vercel.app",
    });

    const { error } = await client.from("categories").select("id", { head: true, count: "exact" }).limit(1);

    expect(error).toBeNull();
  });
});
