import { z } from "zod";
import { ApiAuthError, createSupabaseAuthGuards } from "../auth.js";
import { json, jsonError, methodNotAllowed } from "../http.js";
import { getInventoryLevel, validateMovement } from "../inventory.js";
import { createSupabaseAdmin } from "../supabaseAdmin.js";
function toInventoryItemRecord(row) {
  const minimumStock = Number(row.minimum_stock);
  const balanceQuantity = Number(row.balance_quantity);
  return {
    id: row.item_id,
    name: row.name,
    unit: row.unit,
    minimumStock,
    balanceQuantity,
    level: getInventoryLevel(balanceQuantity, minimumStock),
    isActive: row.is_active
  };
}
function toInventoryMovementRecord(row, balanceAfter) {
  return {
    id: row.id,
    inventoryItemId: row.inventory_item_id,
    type: row.movement_type,
    quantityDelta: Number(row.quantity_delta),
    reason: row.reason,
    note: row.note,
    actorDisplayName: row.profiles?.[0]?.display_name ?? null,
    balanceAfter,
    createdAt: row.created_at
  };
}
function firstRpcRow(data) {
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error("A opera\xE7\xE3o de estoque n\xE3o retornou resultado.");
  return row;
}
function createSupabaseInventoryRepository(client = createSupabaseAdmin()) {
  const getItem = async (inventoryItemId) => {
    const { data, error } = await client.from("inventory_item_balances").select("item_id, name, unit, minimum_stock, balance_quantity, is_active").eq("item_id", inventoryItemId).single();
    if (error) throw error;
    return toInventoryItemRecord(data);
  };
  return {
    async listItems() {
      const { data, error } = await client.from("inventory_item_balances").select("item_id, name, unit, minimum_stock, balance_quantity, is_active").order("is_active", { ascending: false }).order("name", { ascending: true });
      if (error) throw error;
      return (data ?? []).map(toInventoryItemRecord);
    },
    async listHistory(input) {
      const currentItem = await getItem(input.inventoryItemId);
      const { data, error } = await client.from("inventory_movements").select("id, inventory_item_id, movement_type, quantity_delta, reason, note, created_at, profiles!inventory_movements_actor_user_id_fkey(display_name)").eq("inventory_item_id", input.inventoryItemId).order("created_at", { ascending: false }).limit(input.limit);
      if (error) throw error;
      let newerMovementsDelta = 0;
      return (data ?? []).map((row) => {
        const balanceAfter = currentItem.balanceQuantity - newerMovementsDelta;
        newerMovementsDelta += Number(row.quantity_delta);
        return toInventoryMovementRecord(row, balanceAfter);
      });
    },
    async createItem(input) {
      const { data, error } = await client.rpc("create_inventory_item", {
        p_name: input.name,
        p_unit: input.unit,
        p_minimum_stock: input.minimumStock,
        p_actor_user_id: input.actorUserId
      });
      if (error) throw error;
      return getItem(firstRpcRow(data).id);
    },
    async updateItem(input) {
      const { error } = await client.rpc("update_inventory_item", {
        p_item_id: input.inventoryItemId,
        p_name: input.name,
        p_minimum_stock: input.minimumStock,
        p_actor_user_id: input.actorUserId
      });
      if (error) throw error;
      return getItem(input.inventoryItemId);
    },
    async setItemActive(input) {
      const { data, error } = await client.rpc("set_inventory_item_active", {
        p_item_id: input.inventoryItemId,
        p_is_active: input.isActive,
        p_actor_user_id: input.actorUserId
      });
      if (error) throw error;
      const row = firstRpcRow(data);
      return { id: row.id, isActive: row.is_active };
    },
    async createMovement(input) {
      const { data: rpcData, error: rpcError } = await client.rpc("create_inventory_movement", {
        p_inventory_item_id: input.inventoryItemId,
        p_movement_type: input.type,
        p_quantity_delta: input.quantityDelta,
        p_reason: input.reason,
        p_note: input.note,
        p_idempotency_key: input.idempotencyKey,
        p_actor_user_id: input.actorUserId
      });
      if (rpcError) throw rpcError;
      const rpcRow = firstRpcRow(rpcData);
      const { data, error } = await client.from("inventory_movements").select("id, inventory_item_id, movement_type, quantity_delta, reason, note, created_at, profiles!inventory_movements_actor_user_id_fkey(display_name)").eq("id", rpcRow.movement_id).single();
      if (error) throw error;
      return toInventoryMovementRecord(data, Number(rpcRow.balance_after));
    }
  };
}
const inventoryUnitInput = z.enum(["kg", "g", "L", "mL", "unidade"]);
const inventoryMovementTypeInput = z.enum(["ENTRY", "INTERNAL_CONSUMPTION", "LOSS", "ADJUSTMENT"]);
const itemIdInput = z.string().uuid();
const createItemInput = z.object({
  action: z.literal("create-item"),
  name: z.string().trim().min(1).max(160),
  unit: inventoryUnitInput,
  minimumStock: z.number().finite().min(0)
});
const createMovementInput = z.object({
  action: z.literal("create-movement"),
  inventoryItemId: itemIdInput,
  type: inventoryMovementTypeInput,
  quantityDelta: z.number().finite(),
  reason: z.string().trim().max(500).optional().nullable(),
  note: z.string().trim().max(1e3).optional().nullable(),
  idempotencyKey: z.string().uuid()
});
const updateItemInput = z.object({
  action: z.literal("update-item"),
  inventoryItemId: itemIdInput,
  name: z.string().trim().min(1).max(160),
  minimumStock: z.number().finite().min(0)
});
const setItemActiveInput = z.object({
  action: z.literal("set-item-active"),
  inventoryItemId: itemIdInput,
  isActive: z.boolean()
});
const commandInput = z.discriminatedUnion("action", [
  createItemInput,
  createMovementInput,
  updateItemInput,
  setItemActiveInput
]);
function requireAdmin(actor) {
  return actor.role === "admin" ? null : jsonError(403, "Acesso restrito \xE0 administra\xE7\xE3o.");
}
function toErrorResponse(error) {
  if (error instanceof ApiAuthError) return jsonError(error.statusCode, error.message);
  return jsonError(500, error);
}
function createInventoryUnavailableHandler(requireStaff) {
  return async function inventoryUnavailableHandler(request) {
    try {
      await requireStaff(request);
      return json(503, { error: "O estoque est\xE1 preparado e aguarda ativa\xE7\xE3o da base de dados." });
    } catch (error) {
      return toErrorResponse(error);
    }
  };
}
function createDefaultInventoryUnavailableHandler() {
  const guards = createSupabaseAuthGuards(createSupabaseAdmin());
  return createInventoryUnavailableHandler(guards.requireStaff);
}
function createDefaultInventoryHandler() {
  const client = createSupabaseAdmin();
  const guards = createSupabaseAuthGuards(client);
  return createInventoryHandler({ requireStaff: guards.requireStaff, ...createSupabaseInventoryRepository(client) });
}
function createInventoryHandler(dependencies) {
  return async function inventoryHandler(request) {
    try {
      const actor = await dependencies.requireStaff(request);
      const url = new URL(request.url);
      if (request.method === "GET") {
        const historyItemId = url.searchParams.get("historyItemId");
        if (!historyItemId) return json(200, await dependencies.listItems());
        const parsedItemId = itemIdInput.safeParse(historyItemId);
        const parsedLimit = z.coerce.number().int().min(1).max(100).safeParse(url.searchParams.get("limit") ?? "20");
        if (!parsedItemId.success || !parsedLimit.success) return jsonError(400, "Consulta de hist\xF3rico inv\xE1lida.");
        return json(200, await dependencies.listHistory({ inventoryItemId: parsedItemId.data, limit: parsedLimit.data }));
      }
      if (request.method !== "POST" && request.method !== "PATCH") return methodNotAllowed(["GET", "POST", "PATCH"]);
      const command = commandInput.safeParse(await request.json());
      if (!command.success) return jsonError(400, "Dados de movimenta\xE7\xE3o inv\xE1lidos.");
      if (command.data.action === "create-movement") {
        const validation = validateMovement(command.data);
        if (!validation.ok) return jsonError(400, "Dados de movimenta\xE7\xE3o inv\xE1lidos.");
        if ((command.data.type === "LOSS" || command.data.type === "ADJUSTMENT") && actor.role !== "admin") {
          return jsonError(403, "Acesso restrito \xE0 administra\xE7\xE3o.");
        }
        const { action: _action2, ...movement } = command.data;
        return json(201, await dependencies.createMovement({
          ...movement,
          reason: command.data.reason?.trim() || null,
          note: command.data.note?.trim() || null,
          actorUserId: actor.id
        }));
      }
      const adminError = requireAdmin(actor);
      if (adminError) return adminError;
      if (command.data.action === "create-item") {
        const { action: _action2, ...item2 } = command.data;
        return json(201, await dependencies.createItem({ ...item2, actorUserId: actor.id }));
      }
      if (command.data.action === "update-item") {
        const { action: _action2, ...item2 } = command.data;
        return json(200, await dependencies.updateItem({ ...item2, actorUserId: actor.id }));
      }
      const { action: _action, ...item } = command.data;
      return json(200, await dependencies.setItemActive({ ...item, actorUserId: actor.id }));
    } catch (error) {
      return toErrorResponse(error);
    }
  };
}
export {
  createDefaultInventoryHandler,
  createDefaultInventoryUnavailableHandler,
  createInventoryHandler,
  createInventoryUnavailableHandler,
  createSupabaseInventoryRepository
};
