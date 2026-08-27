import { describe, expect, it, vi } from "vitest";
import { ApiAuthError, type AuthenticatedProfile } from "./vercel/_lib/auth.js";
import { createInventoryHandler, createInventoryUnavailableHandler, type InventoryDependencies } from "./vercel/_lib/operations/inventory.js";

const staff = {
  id: "5acb1c7d-1630-4b06-9f1e-9496bb3be555",
  role: "staff",
  email: "staff@marmitastb.test",
  displayName: "Equipe",
} satisfies AuthenticatedProfile;

const admin = { ...staff, role: "admin", email: "admin@marmitastb.test", displayName: "Admin" } satisfies AuthenticatedProfile;
const itemId = "090811f6-0535-483d-b2f3-a764d839aaa1";

function createDependencies(actor: AuthenticatedProfile): InventoryDependencies {
  return {
    requireStaff: vi.fn().mockResolvedValue(actor),
    listItems: vi.fn().mockResolvedValue([]),
    listHistory: vi.fn().mockResolvedValue([]),
    createItem: vi.fn().mockResolvedValue({ id: itemId, name: "Arroz", unit: "kg", minimumStock: 2, balanceQuantity: 0, level: "critical", isActive: true }),
    updateItem: vi.fn().mockResolvedValue({ id: itemId, name: "Arroz", unit: "kg", minimumStock: 2, balanceQuantity: 0, level: "critical", isActive: true }),
    setItemActive: vi.fn().mockResolvedValue({ id: itemId, isActive: false }),
    createMovement: vi.fn().mockResolvedValue({ id: "f58bd94f-98a9-4246-b6b5-75436419e425", inventoryItemId: itemId, type: "ENTRY", quantityDelta: 1, reason: null, note: null, actorDisplayName: "Equipe", balanceAfter: 1, createdAt: "2026-08-27T00:00:00.000Z" }),
  };
}

describe("contrato HTTP de estoque", () => {
  it("mantém o recurso protegido enquanto a persistência de estoque não foi ativada", async () => {
    const requireStaff = vi.fn().mockResolvedValue(staff);
    const handler = createInventoryUnavailableHandler(requireStaff);

    const response = await handler(new Request("https://app.test/api/operations/inventory"));

    expect(requireStaff).toHaveBeenCalledOnce();
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ error: "O estoque está preparado e aguarda ativação da base de dados." });
  });

  it("permite que staff registre uma entrada e atribui a autoria no servidor", async () => {
    const dependencies = createDependencies(staff);
    const handler = createInventoryHandler(dependencies);

    const response = await handler(new Request("https://app.test/api/operations/inventory", {
      method: "POST",
      body: JSON.stringify({
        action: "create-movement",
        inventoryItemId: itemId,
        type: "ENTRY",
        quantityDelta: 1,
        idempotencyKey: "d94890f7-9f80-4cb6-9d14-f81e3d9ca0be",
      }),
    }));

    expect(response.status).toBe(201);
    expect(dependencies.createMovement).toHaveBeenCalledWith(expect.objectContaining({
      inventoryItemId: itemId,
      actorUserId: staff.id,
      type: "ENTRY",
      quantityDelta: 1,
    }));
  });

  it("bloqueia perda para staff sem delegar a escrita", async () => {
    const dependencies = createDependencies(staff);
    const handler = createInventoryHandler(dependencies);

    const response = await handler(new Request("https://app.test/api/operations/inventory", {
      method: "POST",
      body: JSON.stringify({
        action: "create-movement",
        inventoryItemId: itemId,
        type: "LOSS",
        quantityDelta: -1,
        reason: "Produto vencido",
        idempotencyKey: "d94890f7-9f80-4cb6-9d14-f81e3d9ca0be",
      }),
    }));

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "Acesso restrito à administração." });
    expect(dependencies.createMovement).not.toHaveBeenCalled();
  });

  it("recusa perda sem motivo antes de registrar a movimentação", async () => {
    const dependencies = createDependencies(admin);
    const handler = createInventoryHandler(dependencies);

    const response = await handler(new Request("https://app.test/api/operations/inventory", {
      method: "POST",
      body: JSON.stringify({
        action: "create-movement",
        inventoryItemId: itemId,
        type: "LOSS",
        quantityDelta: -1,
        idempotencyKey: "d94890f7-9f80-4cb6-9d14-f81e3d9ca0be",
      }),
    }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Dados de movimentação inválidos." });
    expect(dependencies.createMovement).not.toHaveBeenCalled();
  });

  it("bloqueia comandos cadastrais para staff no servidor", async () => {
    const dependencies = createDependencies(staff);
    const handler = createInventoryHandler(dependencies);

    const response = await handler(new Request("https://app.test/api/operations/inventory", {
      method: "POST",
      body: JSON.stringify({ action: "create-item", name: "Arroz", unit: "kg", minimumStock: 2 }),
    }));

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "Acesso restrito à administração." });
    expect(dependencies.createItem).not.toHaveBeenCalled();
  });

  it("preserva respostas de autenticação do guarda operacional", async () => {
    const dependencies = createDependencies(staff);
    dependencies.requireStaff = vi.fn().mockRejectedValue(new ApiAuthError(401, "Sessão não autenticada."));
    const handler = createInventoryHandler(dependencies);

    const response = await handler(new Request("https://app.test/api/operations/inventory"));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Sessão não autenticada." });
  });
});
