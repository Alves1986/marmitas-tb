import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const migrationPath = path.join(projectRoot, "supabase/migrations/20260819143000_admin_finance_and_audit.sql");

describe("schema financeiro administrativo", () => {
  it("prevê despesas em rascunho, aprovação administrativa e registro de auditoria", async () => {
    const migration = await readFile(migrationPath, "utf8").catch(() => null);

    expect(migration).not.toBeNull();
    expect(migration).toContain("create type public.expense_entry_status as enum ('draft', 'approved', 'rejected')");
    expect(migration).toContain("create table public.expense_entries");
    expect(migration).toContain("approved_by_user_id uuid references public.profiles(id) on delete set null");
    expect(migration).toContain("create table public.admin_audit_logs");
    expect(migration).toContain("create policy \"equipe cria rascunhos de despesas\"");
    expect(migration).toContain("create policy \"administradores gerenciam despesas\"");
    expect(migration).toContain("create policy \"administradores leem auditoria\"");
  });
});
