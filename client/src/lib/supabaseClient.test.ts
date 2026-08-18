import { describe, expect, it } from "vitest";
import { createBrowserSupabaseClient } from "./supabaseClient";

describe("createBrowserSupabaseClient", () => {
  it("cria um cliente somente com URL e chave publicável", () => {
    const client = createBrowserSupabaseClient({
      url: "https://marmitas-tb.supabase.co",
      publishableKey: "sb_publishable_test",
    });

    expect(client.auth).toBeDefined();
  });

  it("recusa uma URL que não pertence ao Supabase", () => {
    expect(() =>
      createBrowserSupabaseClient({
        url: "https://example.com",
        publishableKey: "sb_publishable_test",
      }),
    ).toThrow("URL do Supabase inválida");
  });
});
