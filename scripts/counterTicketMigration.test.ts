import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migrationPath = "supabase/migrations/20260827090000_counter_ticket.sql";

describe("migração da senha de retirada do balcão", () => {
  it("atribui senha diária persistida somente aos pedidos COUNTER", () => {
    const sql = existsSync(migrationPath) ? readFileSync(migrationPath, "utf8") : "";

    expect(sql).toContain("add column if not exists counter_ticket_date date");
    expect(sql).toContain("add column if not exists counter_ticket_number integer");
    expect(sql).toContain("pg_advisory_xact_lock");
    expect(sql).toContain("create or replace function public.create_counter_order");
    expect(sql).toContain("p_source_channel => 'COUNTER'");
    expect(sql).toContain("counter_ticket_number");
    expect(sql).toContain("from public.orders as counter_orders");
    expect(sql).toContain("max(counter_orders.counter_ticket_number)");
  });
});
