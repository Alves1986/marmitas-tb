import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const apiRoot = path.join(projectRoot, "api");

async function listTypeScriptFiles(directory: string, relativeDirectory = ""): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async entry => {
      const relativePath = path.join(relativeDirectory, entry.name);
      const absolutePath = path.join(directory, entry.name);

      if (entry.isDirectory()) return listTypeScriptFiles(absolutePath, relativePath);
      return entry.isFile() && entry.name.endsWith(".ts") ? [relativePath] : [];
    }),
  );

  return files.flat().sort();
}

describe("fronteira de funções Vercel", () => {
  it("mantém os dez handlers HTTP necessários em api, abaixo do limite Hobby", async () => {
    await expect(listTypeScriptFiles(apiRoot)).resolves.toEqual([
      "admin/catalog.ts",
      "admin/finance.ts",
      "admin/settings.ts",
      "admin/staff.ts",
      "operations/alerts.ts",
      "operations/orders.ts",
      "operations/printJobs.ts",
      "public/menu.ts",
      "public/orders.ts",
      "webhooks/asaas.ts",
    ]);
  });

  it("inclui os módulos JavaScript compartilhados no bundle de cada função", async () => {
    const [vercelConfigText, packageJsonText] = await Promise.all([
      readFile(path.join(projectRoot, "vercel.json"), "utf8"),
      readFile(path.join(projectRoot, "package.json"), "utf8"),
    ]);

    const vercelConfig = JSON.parse(vercelConfigText) as {
      functions?: Record<string, { includeFiles?: string[] }>;
    };
    const packageJson = JSON.parse(packageJsonText) as { scripts?: Record<string, string> };

    expect(vercelConfig.functions?.["api/**/*.ts"]?.includeFiles).toBe(
      "{server/vercel/_lib/**/*.js,shared/operations.js}",
    );
    expect(packageJson.scripts?.build).toContain("build:vercel-runtime");
  });

  it("preserva as funções /api fora do fallback da aplicação de página única", async () => {
    const vercelConfigText = await readFile(path.join(projectRoot, "vercel.json"), "utf8");
    const vercelConfig = JSON.parse(vercelConfigText) as {
      rewrites?: Array<{ source?: string; destination?: string }>;
    };

    expect(vercelConfig.rewrites).toEqual([
      {
        source: "/:path((?!api/).*)",
        destination: "/index.html",
      },
    ]);
  });
});
