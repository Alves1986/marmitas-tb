import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  queueManualPrintJob: vi.fn(),
  listQueuedPrintJobs: vi.fn(),
  markPrintJobResult: vi.fn(),
}));

vi.mock("./db", () => dbMocks);

import { appRouter } from "./routers";

const staffContext = {
  req: {} as never,
  res: {} as never,
  user: {
    id: 9,
    openId: "staff-print-test",
    name: "Equipe da cozinha",
    email: null,
    loginMethod: null,
    role: "staff" as const,
    createdAt: new Date("2026-08-17T12:00:00.000Z"),
    updatedAt: new Date("2026-08-17T12:00:00.000Z"),
    lastSignedIn: new Date("2026-08-17T12:00:00.000Z"),
  },
};

describe("ciclo integrado de print_jobs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("enfileira, consulta, baixa o resultado e permite reimpressão auditável", async () => {
    const caller = appRouter.createCaller(staffContext);
    const firstJob = { id: 101, orderId: 31, status: "queued" };
    const reprintJob = { id: 102, orderId: 31, status: "queued" };
    dbMocks.queueManualPrintJob.mockResolvedValueOnce(firstJob).mockResolvedValueOnce(reprintJob);
    dbMocks.listQueuedPrintJobs.mockResolvedValue([{ job: firstJob, order: { id: 31, code: "TB-20260817-0031" } }]);

    await caller.operations.queuePrint({ orderId: 31 });
    expect(dbMocks.queueManualPrintJob).toHaveBeenLastCalledWith({ orderId: 31, actorUserId: 9 });

    await expect(caller.operations.printJobs()).resolves.toEqual([
      { job: firstJob, order: { id: 31, code: "TB-20260817-0031" } },
    ]);

    await caller.operations.markPrintJob({ printJobId: 101, status: "printed", printerName: "Posto da cozinha" });
    expect(dbMocks.markPrintJobResult).toHaveBeenCalledWith({ printJobId: 101, status: "printed", printerName: "Posto da cozinha" });

    await caller.operations.queuePrint({ orderId: 31 });
    expect(dbMocks.queueManualPrintJob).toHaveBeenLastCalledWith({ orderId: 31, actorUserId: 9 });
    expect(dbMocks.queueManualPrintJob).toHaveBeenCalledTimes(2);
  });
});
