import { describe, expect, it, vi } from "vitest";

const createClient = vi.hoisted(() => vi.fn(() => ({ marker: "supabase-admin" })));

vi.mock("@supabase/supabase-js", () => ({ createClient }));

import { createSupabaseAdmin } from "./supabaseAdmin";

describe("cliente administrativo do Supabase", () => {
  it("usa a chave de serviço somente com sessão e renovação desabilitadas", () => {
    const client = createSupabaseAdmin({
      supabaseUrl: "https://hwkgplnzvcaobjozfmqx.supabase.co",
      supabaseServiceRoleKey: "service-role-secret",
      appUrl: "https://marmitas-tb.vercel.app",
    });

    expect(client).toEqual({ marker: "supabase-admin" });
    expect(createClient).toHaveBeenCalledWith(
      "https://hwkgplnzvcaobjozfmqx.supabase.co",
      "service-role-secret",
      { auth: { autoRefreshToken: false, persistSession: false } },
    );
  });
});
