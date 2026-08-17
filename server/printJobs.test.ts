import { describe, expect, it } from "vitest";
import { buildQueuedPrintJob } from "./db";

describe("buildQueuedPrintJob", () => {
  it("cria um trabalho pendente para o pedido confirmado", () => {
    expect(buildQueuedPrintJob(21)).toEqual({ orderId: 21, status: "queued" });
  });
});
