import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  listStaffMembers: vi.fn(),
  upsertStaffMember: vi.fn(),
}));

vi.mock("./db", () => dbMocks);

import { appRouter } from "./routers";

const adminContext = {
  req: {} as never,
  res: {} as never,
  user: {
    id: 1,
    openId: "admin-staff-test",
    name: "Gestora",
    email: null,
    loginMethod: null,
    role: "admin" as const,
    createdAt: new Date("2026-08-17T12:00:00.000Z"),
    updatedAt: new Date("2026-08-17T12:00:00.000Z"),
    lastSignedIn: new Date("2026-08-17T12:00:00.000Z"),
  },
};

describe("procedimentos administrativos de equipe", () => {
  beforeEach(() => vi.clearAllMocks());

  it("atribui papel operacional a um usuário autenticado", async () => {
    const caller = appRouter.createCaller(adminContext);
    dbMocks.listStaffMembers.mockResolvedValue([{ id: 7, name: "Joana", role: "user" }]);
    dbMocks.upsertStaffMember.mockResolvedValue({ id: 7, name: "Joana", role: "staff" });

    await expect(caller.admin.listStaff()).resolves.toHaveLength(1);
    await expect(caller.admin.upsertStaff({ userId: 7, role: "staff" })).resolves.toMatchObject({ id: 7, role: "staff" });
    expect(dbMocks.upsertStaffMember).toHaveBeenCalledWith({ userId: 7, role: "staff", actorUserId: 1 });
  });
});
