import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const pagePath = path.join(path.dirname(fileURLToPath(import.meta.url)), "TrackOrder.tsx");

describe("runtime do acompanhamento público", () => {
  it("reutiliza o seletor Vercel resiliente em vez de depender diretamente da variável de build", async () => {
    const source = await readFile(pagePath, "utf8");

    expect(source).toContain('import { isVercelRuntime } from "@/lib/runtimeConfig";');
    expect(source).toContain("const useVercelApi = isVercelRuntime();");
    expect(source).not.toContain('import.meta.env.VITE_API_RUNTIME === "vercel"');
  });
});
