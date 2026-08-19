import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

const publicLogoUrl =
  "https://hwkgplnzvcaobjozfmqx.supabase.co/storage/v1/object/public/marmitas-tb-assets/brand/logo-marmitastb.jpg";

describe("ativos PWA públicos", () => {
  it("declara um favicon público da Marmitas TB no HTML da vitrine", async () => {
    const html = await readFile(path.resolve(import.meta.dirname, "../index.html"), "utf8");

    expect(html).toContain(`<link rel="icon" href="${publicLogoUrl}" />`);
  });
});
