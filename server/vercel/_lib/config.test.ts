import { describe, expect, it } from "vitest";
import { readPublicSupabaseConfig, readServerConfig } from "./config";

describe("readServerConfig", () => {
  it("aceita uma configuração server-side completa", () => {
    expect(readServerConfig({
      SUPABASE_URL: "https://marmitas-tb.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "service-role-test-key",
      APP_URL: "https://marmitas-tb.vercel.app",
    })).toMatchObject({
      appUrl: "https://marmitas-tb.vercel.app",
      supabaseUrl: "https://marmitas-tb.supabase.co",
    });
  });

  it("aceita a URL pública do Supabase e o hostname injetado pela Vercel", () => {
    expect(readServerConfig({
      VITE_SUPABASE_URL: "https://marmitas-tb.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "service-role-test-key",
      VERCEL_URL: "marmitastb.vercel.app",
    })).toMatchObject({
      appUrl: "https://marmitastb.vercel.app",
      supabaseUrl: "https://marmitas-tb.supabase.co",
    });
  });

  it("aceita a configuração publicável do Supabase sem exigir uma chave administrativa", () => {
    expect(readPublicSupabaseConfig({
      VITE_SUPABASE_URL: "https://marmitas-tb.supabase.co",
      VITE_SUPABASE_PUBLISHABLE_KEY: "publishable-test-key",
    })).toEqual({
      supabaseUrl: "https://marmitas-tb.supabase.co",
      supabasePublishableKey: "publishable-test-key",
    });
  });

  it("recusa a ausência da chave de serviço", () => {
    expect(() => readServerConfig({
      SUPABASE_URL: "https://marmitas-tb.supabase.co",
      APP_URL: "https://marmitas-tb.vercel.app",
    })).toThrow("SUPABASE_SERVICE_ROLE_KEY");
  });

  it("recusa URL que não pertence a um projeto Supabase", () => {
    expect(() => readServerConfig({
      SUPABASE_URL: "https://example.com",
      SUPABASE_SERVICE_ROLE_KEY: "service-role-test-key",
      APP_URL: "https://marmitas-tb.vercel.app",
    })).toThrow("SUPABASE_URL inválida");
  });
});
