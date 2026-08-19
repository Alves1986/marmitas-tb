import { describe, expect, it, vi } from "vitest";

const admin = {
  id: "f8a1240b-5d57-4c98-9a3d-45d94f6ddc5e",
  role: "admin" as const,
  displayName: "Gestora",
  email: "gestora@marmitastb.test",
};

const staff = {
  id: "5e5c2f2c-344a-4978-a7cb-252740ddcc0c",
  role: "staff" as const,
  displayName: "Operação",
  email: "operacao@marmitastb.test",
};

describe("/api/admin/finance", () => {
  it("expõe decisões financeiras auditadas somente para administradores", async () => {
    const financeModule = await import("../../../api/admin/finance");
    const listAuditLogs = vi.fn().mockResolvedValue([
      {
        id: "audit-1",
        action: "expense.approved",
        entityId: "expense-1",
        actorName: "Gestora",
        createdAt: "2026-08-19T14:00:00.000Z",
      },
    ]);
    const handler = financeModule.createAdminFinanceHandler({
      requireAdmin: vi.fn().mockResolvedValue(admin),
      requireStaff: vi.fn(),
      getSnapshot: vi.fn(),
      createExpense: vi.fn(),
      reviewExpense: vi.fn(),
      writeAuditLog: vi.fn(),
      listAuditLogs,
    });

    const response = await handler(new Request("https://marmitas-tb.vercel.app/api/admin/finance?view=audit"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ auditLogs: [{
      id: "audit-1",
      action: "expense.approved",
      entityId: "expense-1",
      actorName: "Gestora",
      createdAt: "2026-08-19T14:00:00.000Z",
    }] });
    expect(listAuditLogs).toHaveBeenCalledTimes(1);
  });

  it("lista somente despesas em rascunho para revisão administrativa", async () => {
    const financeModule = await import("../../../api/admin/finance");
    const handler = financeModule.createAdminFinanceHandler({
      requireAdmin: vi.fn().mockResolvedValue(admin),
      requireStaff: vi.fn(),
      getSnapshot: vi.fn().mockResolvedValue({
        orders: [],
        expenses: [
          { id: "draft-1", description: "Gás", category: "Insumos", amountInCents: 11500, status: "draft", incurredOn: "2026-08-19", submittedByName: "Operação" },
          { id: "approved-1", description: "Embalagens", category: "Insumos", amountInCents: 8900, status: "approved", incurredOn: "2026-08-19", submittedByName: "Operação" },
        ],
      }),
      createExpense: vi.fn(),
      reviewExpense: vi.fn(),
      writeAuditLog: vi.fn(),
    });

    const response = await handler(new Request("https://marmitas-tb.vercel.app/api/admin/finance?view=review"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      expenses: [{ id: "draft-1", description: "Gás", category: "Insumos", amountInCents: 11500, status: "draft", incurredOn: "2026-08-19", submittedByName: "Operação" }],
    });
  });

  it("considera apenas receitas confirmadas e despesas aprovadas no fluxo de caixa", async () => {
    const financeModule = await import("../../../api/admin/finance").catch(() => null);

    expect(financeModule).not.toBeNull();
    const handler = financeModule!.createAdminFinanceHandler({
      requireAdmin: vi.fn().mockResolvedValue(admin),
      requireStaff: vi.fn(),
      getSnapshot: vi.fn().mockResolvedValue({
        orders: [
          { id: "order-confirmed", totalInCents: 4500, paymentMethod: "pix", paymentStatus: "confirmed", createdAt: "2026-08-19T12:00:00.000Z" },
          { id: "order-pending", totalInCents: 7000, paymentMethod: "credit_card", paymentStatus: "pending", createdAt: "2026-08-19T13:00:00.000Z" },
          { id: "order-cancelled", totalInCents: 3900, paymentMethod: "cash", paymentStatus: "confirmed", status: "cancelado", createdAt: "2026-08-19T14:00:00.000Z" },
        ],
        expenses: [
          { id: "expense-approved", amountInCents: 1200, status: "approved", incurredOn: "2026-08-19" },
          { id: "expense-draft", amountInCents: 800, status: "draft", incurredOn: "2026-08-19" },
        ],
      }),
      createExpense: vi.fn(),
      reviewExpense: vi.fn(),
      writeAuditLog: vi.fn(),
    });

    const response = await handler(new Request("https://marmitas-tb.vercel.app/api/admin/finance?from=2026-08-01&to=2026-08-31"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(expect.objectContaining({
      revenueInCents: 4500,
      expenseInCents: 1200,
      netCashInCents: 3300,
      confirmedOrderCount: 1,
      averageTicketInCents: 4500,
      paymentBreakdown: [{ paymentMethod: "pix", amountInCents: 4500, orderCount: 1 }],
    }));
  });

  it("registra uma despesa da equipe sempre como rascunho", async () => {
    const financeModule = await import("../../../api/admin/finance");
    const createExpense = vi.fn().mockResolvedValue({ id: "expense-draft", status: "draft" });
    const handler = (financeModule as unknown as { createAdminFinanceHandler(dependencies: unknown): (request: Request) => Promise<Response> }).createAdminFinanceHandler({
      requireAdmin: vi.fn(),
      requireStaff: vi.fn().mockResolvedValue(staff),
      getSnapshot: vi.fn(),
      createExpense,
    });

    const response = await handler(new Request("https://marmitas-tb.vercel.app/api/admin/finance", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        description: "Compra de embalagens",
        category: "Embalagens",
        amountInCents: 2890,
        incurredOn: "2026-08-19",
        status: "approved",
      }),
    }));

    expect(response.status).toBe(201);
    expect(createExpense).toHaveBeenCalledWith(expect.objectContaining({
      submittedByUserId: staff.id,
      status: "draft",
      description: "Compra de embalagens",
      amountInCents: 2890,
    }));
  });

  it("exige revisão administrativa e audita a aprovação da despesa", async () => {
    const financeModule = await import("../../../api/admin/finance");
    const reviewExpense = vi.fn().mockResolvedValue({ id: "expense-draft", status: "approved" });
    const writeAuditLog = vi.fn().mockResolvedValue(undefined);
    const handler = (financeModule as unknown as { createAdminFinanceHandler(dependencies: unknown): (request: Request) => Promise<Response> }).createAdminFinanceHandler({
      requireAdmin: vi.fn().mockResolvedValue(admin),
      requireStaff: vi.fn(),
      getSnapshot: vi.fn(),
      createExpense: vi.fn(),
      reviewExpense,
      writeAuditLog,
    });

    const response = await handler(new Request("https://marmitas-tb.vercel.app/api/admin/finance", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ expenseId: "f3dc7fb8-680e-477c-a2b7-ca78d79f05a2", decision: "approved" }),
    }));

    expect(response.status).toBe(200);
    expect(reviewExpense).toHaveBeenCalledWith(expect.objectContaining({
      expenseId: "f3dc7fb8-680e-477c-a2b7-ca78d79f05a2",
      decision: "approved",
      reviewedByUserId: admin.id,
    }));
    expect(writeAuditLog).toHaveBeenCalledWith(expect.objectContaining({
      actorUserId: admin.id,
      action: "expense.approved",
      entityId: "f3dc7fb8-680e-477c-a2b7-ca78d79f05a2",
    }));
  });
});
