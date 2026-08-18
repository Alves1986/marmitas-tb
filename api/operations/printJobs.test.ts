import { describe, expect, it, vi } from "vitest";
import { ApiAuthError } from "../_lib/auth";
import { createPrintJobsHandler } from "./printJobs";

describe("/api/operations/print-jobs", () => {
  it("exige papel operacional para consultar a fila", async () => {
    const handler = createPrintJobsHandler({ requireOperator: vi.fn().mockRejectedValue(new ApiAuthError(403, "Acesso restrito à operação.")), list: vi.fn(), requeue: vi.fn(), mark: vi.fn() });
    expect((await handler(new Request("https://marmitas-tb.vercel.app/api/operations/print-jobs"))).status).toBe(403);
  });

  it("atribui a reimpressão ao UUID do operador autenticado", async () => {
    const requeue = vi.fn().mockResolvedValue({ id: "b0c762d5-f5b7-4135-b7a4-9340ad4949a1", status: "queued" });
    const handler = createPrintJobsHandler({
      requireOperator: vi.fn().mockResolvedValue({ id: "3c6237a9-5b6f-4871-8da3-06f027bc4f15", role: "staff", email: "cozinha@marmitastb.com", name: "Cozinha" }),
      list: vi.fn(),
      requeue,
      mark: vi.fn(),
    });
    const response = await handler(new Request("https://marmitas-tb.vercel.app/api/operations/print-jobs", {
      method: "POST",
      body: JSON.stringify({ orderId: "d78a4b3c-86be-4909-8ef2-0c0b2f4fa6ed" }),
    }));
    expect(response.status).toBe(201);
    expect(requeue).toHaveBeenCalledWith({ orderId: "d78a4b3c-86be-4909-8ef2-0c0b2f4fa6ed", actorUserId: "3c6237a9-5b6f-4871-8da3-06f027bc4f15" });
  });
});
