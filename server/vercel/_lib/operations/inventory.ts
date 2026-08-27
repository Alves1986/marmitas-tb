import { z } from "zod";
import { ApiAuthError, createSupabaseAuthGuards, type AuthenticatedProfile } from "../auth.js";
import { json, jsonError, methodNotAllowed } from "../http.js";
import { getInventoryLevel, validateMovement } from "../inventory.js";
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

type InventoryBalanceRow = {
  item_id: string;
  name: string;
  unit: InventoryUnit;
  minimum_stock: number | string;
  balance_quantity: number | string;
  is_active: boolean;
};

type InventoryMovementRow = {
  id: string;
  inventory_item_id: string;
  movement_type: InventoryMovementType;
  quantity_delta: number | string;
  reason: string | null;
  note: string | null;
  created_at: string;
  profiles: Array<{ display_name: string | null }> | null;
};

type InventoryMovementRpcRow = {
  movement_id: string;
  balance_after: number | string;
};

function toInventoryItemRecord(row: InventoryBalanceRow): InventoryItemRecord {
  const minimumStock = Number(row.minimum_stock);
  const balanceQuantity = Number(row.balance_quantity);
  return {
    id: row.item_id,
    name: row.name,
    unit: row.unit,
    minimumStock,
    balanceQuantity,
    level: getInventoryLevel(balanceQuantity, minimumStock),
    isActive: row.is_active,
  };
}

function toInventoryMovementRecord(row: InventoryMovementRow, balanceAfter: number): InventoryMovementRecord {
  return {
    id: row.id,
    inventoryItemId: row.inventory_item_id,
    type: row.movement_type,
    quantityDelta: Number(row.quantity_delta),
    reason: row.reason,
    note: row.note,
    actorDisplayName: row.profiles?.[0]?.display_name ?? null,
    balanceAfter,
    createdAt: row.created_at,
  };
}

function firstRpcRow<T>(data: unknown): T {
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error("A operação de estoque não retornou resultado.");
  return row as T;
}

export function createSupabaseInventoryRepository(client = createSupabaseAdmin()) {
  const getItem = async (inventoryItemId: string): Promise<InventoryItemRecord> => {
    const { data, error } = await client
      .from("inventory_item_balances")
      .select("item_id, name, unit, minimum_stock, balance_quantity, is_active")
      .eq("item_id", inventoryItemId)
      .single();
    if (error) throw error;
    return toInventoryItemRecord(data as InventoryBalanceRow);
  };

  return {
    async listItems(): Promise<InventoryItemRecord[]> {
      const { data, error } = await client
        .from("inventory_item_balances")
        .select("item_id, name, unit, minimum_stock, balance_quantity, is_active")
        .order("is_active", { ascending: false })
        .order("name", { ascending: true });
      if (error) throw error;
      return (data as InventoryBalanceRow[] ?? []).map(toInventoryItemRecord);
    },

    async listHistory(input: { inventoryItemId: string; limit: number }): Promise<InventoryMovementRecord[]> {
      const currentItem = await getItem(input.inventoryItemId);
      const { data, error } = await client
        .from("inventory_movements")
        .select("id, inventory_item_id, movement_type, quantity_delta, reason, note, created_at, profiles!inventory_movements_actor_user_id_fkey(display_name)")
        .eq("inventory_item_id", input.inventoryItemId)
        .order("created_at", { ascending: false })
        .limit(input.limit);
      if (error) throw error;

      let newerMovementsDelta = 0;
      return (data as InventoryMovementRow[] ?? []).map((row) => {
        const balanceAfter = currentItem.balanceQuantity - newerMovementsDelta;
        newerMovementsDelta += Number(row.quantity_delta);
        return toInventoryMovementRecord(row, balanceAfter);
      });
    },

    async createItem(input: { name: string; unit: InventoryUnit; minimumStock: number; actorUserId: string }): Promise<InventoryItemRecord> {
      const { data, error } = await client.rpc("create_inventory_item", {
        p_name: input.name,
        p_unit: input.unit,
        p_minimum_stock: input.minimumStock,
        p_actor_user_id: input.actorUserId,
      });
      if (error) throw error;
      return getItem(firstRpcRow<{ id: string }>(data).id);
    },

    async updateItem(input: { inventoryItemId: string; name: string; minimumStock: number; actorUserId: string }): Promise<InventoryItemRecord> {
      const { error } = await client.rpc("update_inventory_item", {
        p_item_id: input.inventoryItemId,
        p_name: input.name,
        p_minimum_stock: input.minimumStock,
        p_actor_user_id: input.actorUserId,
      });
      if (error) throw error;
      return getItem(input.inventoryItemId);
    },

    async setItemActive(input: { inventoryItemId: string; isActive: boolean; actorUserId: string }) {
      const { data, error } = await client.rpc("set_inventory_item_active", {
        p_item_id: input.inventoryItemId,
        p_is_active: input.isActive,
        p_actor_user_id: input.actorUserId,
      });
      if (error) throw error;
      const row = firstRpcRow<{ id: string; is_active: boolean }>(data);
      return { id: row.id, isActive: row.is_active };
    },

    async createMovement(input: {
      inventoryItemId: string;
      type: InventoryMovementType;
      quantityDelta: number;
      reason: string | null;
      note: string | null;
      idempotencyKey: string;
      actorUserId: string;
    }): Promise<InventoryMovementRecord> {
      const { data: rpcData, error: rpcError } = await client.rpc("create_inventory_movement", {
        p_inventory_item_id: input.inventoryItemId,
        p_movement_type: input.type,
        p_quantity_delta: input.quantityDelta,
        p_reason: input.reason,
        p_note: input.note,
        p_idempotency_key: input.idempotencyKey,
        p_actor_user_id: input.actorUserId,
      });
      if (rpcError) throw rpcError;
      const rpcRow = firstRpcRow<InventoryMovementRpcRow>(rpcData);
      const { data, error } = await client
        .from("inventory_movements")
        .select("id, inventory_item_id, movement_type, quantity_delta, reason, note, created_at, profiles!inventory_movements_actor_user_id_fkey(display_name)")
        .eq("id", rpcRow.movement_id)
        .single();
      if (error) throw error;
      return toInventoryMovementRecord(data as InventoryMovementRow, Number(rpcRow.balance_after));
    },
  };
}

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

export function createDefaultInventoryHandler() {
  const client = createSupabaseAdmin();
  const guards = createSupabaseAuthGuards(client);
  return createInventoryHandler({ requireStaff: guards.requireStaff, ...createSupabaseInventoryRepository(client) });
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
        const { action: _action, ...movement } = command.data;
        return json(201, await dependencies.createMovement({
          ...movement,
          reason: command.data.reason?.trim() || null,
          note: command.data.note?.trim() || null,
          actorUserId: actor.id,
        }));
      }

      const adminError = requireAdmin(actor);
      if (adminError) return adminError;

      if (command.data.action === "create-item") {
        const { action: _action, ...item } = command.data;
        return json(201, await dependencies.createItem({ ...item, actorUserId: actor.id }));
      }
      if (command.data.action === "update-item") {
        const { action: _action, ...item } = command.data;
        return json(200, await dependencies.updateItem({ ...item, actorUserId: actor.id }));
      }
      const { action: _action, ...item } = command.data;
      return json(200, await dependencies.setItemActive({ ...item, actorUserId: actor.id }));
    } catch (error) {
      return toErrorResponse(error);
    }
  };
}
