import { readdir } from "node:fs/promises";
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
  it("mantém somente os nove handlers HTTP em api", async () => {
    await expect(listTypeScriptFiles(apiRoot)).resolves.toEqual([
      "admin/catalog.ts",
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
});
