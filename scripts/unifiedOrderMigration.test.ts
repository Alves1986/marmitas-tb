import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migrationPath = "supabase/migrations/20260826100000_unified_order_core.sql";

describe("migração do núcleo unificado de pedidos", () => {
  it("preserva pedidos existentes e acrescenta origem, idempotência, auditoria, outbox e prioridade", () => {
    const sql = readFileSync(migrationPath, "utf8");

    expect(sql).toContain("add column if not exists source_channel");
    expect(sql).toContain("update public.orders set source_channel = 'OWN_APP'");
    expect(sql).toContain("create table if not exists public.audit_logs");
    expect(sql).toContain("create table if not exists public.outbox_events");
    expect(sql).toContain("add column if not exists priority integer not null default 50");
    expect(sql).toContain("create or replace function public.create_unified_order");
    expect(sql).toContain("on conflict (source_channel, idempotency_key) where idempotency_key is not null do nothing");
    expect(sql).toContain("private.is_operator()");
    expect(sql).toContain("private.is_admin()");
  });
});
