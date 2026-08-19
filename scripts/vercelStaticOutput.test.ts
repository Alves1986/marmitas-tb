import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("saída estática para Vercel", () => {
  it("publica o index.html diretamente no diretório dist configurado para a Vercel", async () => {
    const viteConfig = await readFile(path.join(projectRoot, "vite.config.ts"), "utf8");

    expect(viteConfig).toContain('outDir: path.resolve(import.meta.dirname, "dist")');
  });
});
