import { z } from "zod";
import { ApiAuthError, createSupabaseAuthGuards, type AuthenticatedProfile } from "../auth.js";
import { json, jsonError, methodNotAllowed } from "../http.js";
import { validateMovement } from "../inventory.js";
import { createSupabaseAdmin } from "../supabaseAdmin.js";
import type { InventoryLevel, InventoryMovementType, InventoryUnit } from "../../../../shared/inventory.js";

export type InventoryItemRecord = {
  id: string;
  name: string;
  unit: InventoryUnit;
  minimumStock: number;
  balanceQuantity: number;
  level: InventoryLevel;
  isActive: boolean;
};

export type InventoryMovementRecord = {
  id: string;
  inventoryItemId: string;
  type: InventoryMovementType;
  quantityDelta: number;
  reason: string | null;
  note: string | null;
  actorDisplayName: string | null;
  balanceAfter: number;
  createdAt: string;
};

export type InventoryDependencies = {
  requireStaff(request: Request): Promise<AuthenticatedProfile>;
  listItems(): Promise<InventoryItemRecord[]>;
  listHistory(input: { inventoryItemId: string; limit: number }): Promise<InventoryMovementRecord[]>;
  createItem(input: { name: string; unit: InventoryUnit; minimumStock: number; actorUserId: string }): Promise<InventoryItemRecord>;
  updateItem(input: { inventoryItemId: string; name: string; minimumStock: number; actorUserId: string }): Promise<InventoryItemRecord>;
  setItemActive(input: { inventoryItemId: string; isActive: boolean; actorUserId: string }): Promise<{ id: string; isActive: boolean }>;
  createMovement(input: {
    inventoryItemId: string;
    type: InventoryMovementType;
    quantityDelta: number;
    reason: string | null;
    note: string | null;
    idempotencyKey: string;
    actorUserId: string;
  }): Promise<InventoryMovementRecord>;
};

const inventoryUnitInput = z.enum(["kg", "g", "L", "mL", "unidade"]);
const inventoryMovementTypeInput = z.enum(["ENTRY", "INTERNAL_CONSUMPTION", "LOSS", "ADJUSTMENT"]);
const itemIdInput = z.string().uuid();

const createItemInput = z.object({
  action: z.literal("create-item"),
  name: z.string().trim().min(1).max(160),
  unit: inventoryUnitInput,
  minimumStock: z.number().finite().min(0),
});
const createMovementInput = z.object({
  action: z.literal("create-movement"),
  inventoryItemId: itemIdInput,
  type: inventoryMovementTypeInput,
  quantityDelta: z.number().finite(),
  reason: z.string().trim().max(500).optional().nullable(),
  note: z.string().trim().max(1000).optional().nullable(),
  idempotencyKey: z.string().uuid(),
});
const updateItemInput = z.object({
  action: z.literal("update-item"),
  inventoryItemId: itemIdInput,
  name: z.string().trim().min(1).max(160),
  minimumStock: z.number().finite().min(0),
});
const setItemActiveInput = z.object({
  action: z.literal("set-item-active"),
  inventoryItemId: itemIdInput,
  isActive: z.boolean(),
});

const commandInput = z.discriminatedUnion("action", [
  createItemInput,
  createMovementInput,
  updateItemInput,
  setItemActiveInput,
]);

function requireAdmin(actor: AuthenticatedProfile): Response | null {
  return actor.role === "admin" ? null : jsonError(403, "Acesso restrito à administração.");
}

function toErrorResponse(error: unknown): Response {
  if (error instanceof ApiAuthError) return jsonError(error.statusCode, error.message);
  return jsonError(500, error);
}

export function createInventoryUnavailableHandler(
  requireStaff: (request: Request) => Promise<AuthenticatedProfile>,
) {
  return async function inventoryUnavailableHandler(request: Request): Promise<Response> {
    try {
      await requireStaff(request);
      return json(503, { error: "O estoque está preparado e aguarda ativação da base de dados." });
    } catch (error) {
      return toErrorResponse(error);
    }
  };
}

export function createDefaultInventoryUnavailableHandler() {
  const guards = createSupabaseAuthGuards(createSupabaseAdmin());
  return createInventoryUnavailableHandler(guards.requireStaff);
}

export function createInventoryHandler(dependencies: InventoryDependencies) {
  return async function inventoryHandler(request: Request): Promise<Response> {
    try {
      const actor = await dependencies.requireStaff(request);
      const url = new URL(request.url);

      if (request.method === "GET") {
        const historyItemId = url.searchParams.get("historyItemId");
        if (!historyItemId) return json(200, await dependencies.listItems());

        const parsedItemId = itemIdInput.safeParse(historyItemId);
        const parsedLimit = z.coerce.number().int().min(1).max(100).safeParse(url.searchParams.get("limit") ?? "20");
        if (!parsedItemId.success || !parsedLimit.success) return jsonError(400, "Consulta de histórico inválida.");
        return json(200, await dependencies.listHistory({ inventoryItemId: parsedItemId.data, limit: parsedLimit.data }));
      }

      if (request.method !== "POST" && request.method !== "PATCH") return methodNotAllowed(["GET", "POST", "PATCH"]);

      const command = commandInput.safeParse(await request.json());
      if (!command.success) return jsonError(400, "Dados de movimentação inválidos.");

      if (command.data.action === "create-movement") {
        const validation = validateMovement(command.data);
        if (!validation.ok) return jsonError(400, "Dados de movimentação inválidos.");
        if ((command.data.type === "LOSS" || command.data.type === "ADJUSTMENT") && actor.role !== "admin") {
          return jsonError(403, "Acesso restrito à administração.");
        }
        return json(201, await dependencies.createMovement({
          ...command.data,
          reason: command.data.reason?.trim() || null,
          note: command.data.note?.trim() || null,
          actorUserId: actor.id,
        }));
      }

      const adminError = requireAdmin(actor);
      if (adminError) return adminError;

      if (command.data.action === "create-item") {
        return json(201, await dependencies.createItem({ ...command.data, actorUserId: actor.id }));
      }
      if (command.data.action === "update-item") {
        return json(200, await dependencies.updateItem({ ...command.data, actorUserId: actor.id }));
      }
      return json(200, await dependencies.setItemActive({ ...command.data, actorUserId: actor.id }));
    } catch (error) {
      return toErrorResponse(error);
    }
  };
}
