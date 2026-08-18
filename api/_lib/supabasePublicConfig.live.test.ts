import { describe, expect, it } from "vitest";

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const publishableKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const describeIfConfigured = supabaseUrl && publishableKey ? describe : describe.skip;

describeIfConfigured("configuração pública do Supabase", () => {
  it("autentica uma leitura vazia e não mutável no endpoint de categorias", async () => {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/categories?select=id&limit=1`,
      {
        headers: {
          apikey: publishableKey,
          Authorization: `Bearer ${publishableKey}`,
        },
      },
    );

    expect(response.status).toBe(200);
  });
});
