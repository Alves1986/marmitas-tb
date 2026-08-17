import { describe, expect, it } from "vitest";
import { operationProcedure, router } from "./_core/trpc";
import type { TrpcContext } from "./_core/context";

const operationRouter = router({
  queue: operationProcedure.query(() => "allowed"),
});

function contextWithRole(role: "user" | "admin" | "staff"): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "operation-test",
      name: "Operation Test",
      email: "operation@example.com",
      loginMethod: "manus",
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {} as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("operationProcedure", () => {
  it("permite que a equipe consulte a fila operacional", async () => {
    const caller = operationRouter.createCaller(contextWithRole("staff"));

    await expect(caller.queue()).resolves.toBe("allowed");
  });

  it("bloqueia clientes comuns da fila operacional", async () => {
    const caller = operationRouter.createCaller(contextWithRole("user"));

    await expect(caller.queue()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
