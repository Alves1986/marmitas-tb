import { describe, expect, it, vi } from "vitest";
import * as printJobsApi from "./vercel/_lib/operations/printJobs.js";

const { createPrintJobsHandler } = printJobsApi;

const actor = { id: "5acb1c7d-1630-4b06-9f1e-9496bb3be555", role: "staff" };
const orderId = "090811f6-0535-483d-b2f3-a764d839aaa1";

describe("endpoint de fila de impressão", () => {
  it("recusa reimpressão sem motivo auditável", async () => {
    const handler = createPrintJobsHandler({
      requireOperator: vi.fn().mockResolvedValue(actor),
      list: vi.fn(),
      requeue: vi.fn(),
      mark: vi.fn(),
    });

    const response = await handler(new Request("https://example.test/api/operations/printJobs", {
      method: "POST",
      body: JSON.stringify({ orderId }),
    }));

    expect(response.status).toBe(400);
  });

  it("repassa o motivo e a autoria para a reimpressão", async () => {
    const requeue = vi.fn().mockResolvedValue({ id: "f58bd94f-98a9-4246-b6b5-75436419e425" });
    const handler = createPrintJobsHandler({
      requireOperator: vi.fn().mockResolvedValue(actor),
      list: vi.fn(),
      requeue,
      mark: vi.fn(),
    });

    const response = await handler(new Request("https://example.test/api/operations/printJobs", {
      method: "POST",
      body: JSON.stringify({ orderId, reason: "Via anterior ilegível" }),
    }));

    expect(response.status).toBe(201);
    expect(requeue).toHaveBeenCalledWith({ orderId, actorUserId: actor.id, reason: "Via anterior ilegível" });
  });

  it("usa a RPC transacional para criar a reimpressão", async () => {
    const requeueSupabasePrintJob = Reflect.get(printJobsApi, "requeueSupabasePrintJob") as undefined | ((client: { rpc: ReturnType<typeof vi.fn> }, input: { orderId: string; actorUserId: string; reason: string }) => Promise<unknown>);
    expect(requeueSupabasePrintJob).toBeTypeOf("function");
    if (!requeueSupabasePrintJob) return;

    const rpc = vi.fn().mockResolvedValue({
      data: [{ print_job_id: "f58bd94f-98a9-4246-b6b5-75436419e425", print_job_status: "queued", print_job_priority: 100, print_job_created_at: "2026-08-26T23:50:00.000Z" }],
      error: null,
    });
    await requeueSupabasePrintJob({ rpc }, { orderId, actorUserId: actor.id, reason: "Via anterior ilegível" });

    expect(rpc).toHaveBeenCalledWith("requeue_print_job", expect.objectContaining({
      p_order_id: orderId,
      p_actor_user_id: actor.id,
      p_reason: "Via anterior ilegível",
    }));
  });
});
