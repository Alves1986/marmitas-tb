import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migrationPath = "supabase/migrations/20260826200000_unified_print_queue.sql";

describe("migração da fila de impressão unificada", () => {
  it("cria reimpressão atômica, auditável e com prioridade máxima para o balcão", () => {
    const sql = existsSync(migrationPath) ? readFileSync(migrationPath, "utf8") : "";

    expect(sql).toContain("create or replace function public.requeue_print_job");
    expect(sql).toContain("p_reason text");
    expect(sql).toContain("case when v_order.source_channel = 'COUNTER' then 100 else 50 end");
    expect(sql).toContain("'print.requeued'");
    expect(sql).toContain("'PrintJobCreated'");
  });
});
