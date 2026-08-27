import { describe, expect, it, vi } from "vitest";
import { createSupabaseInventoryRepository } from "./vercel/_lib/operations/inventory.js";

const itemId = "090811f6-0535-483d-b2f3-a764d839aaa1";

describe("repositório Supabase de estoque", () => {
  it("calcula o saldo imediatamente posterior de cada evento histórico ordenado do mais recente", async () => {
    const balancesQuery = {
      select: vi.fn(),
      eq: vi.fn(),
      single: vi.fn().mockResolvedValue({
        data: { item_id: itemId, name: "Arroz", unit: "kg", minimum_stock: "2", balance_quantity: "5", is_active: true },
        error: null,
      }),
    };
    balancesQuery.select.mockReturnValue(balancesQuery);
    balancesQuery.eq.mockReturnValue(balancesQuery);

    const movementsQuery = {
      select: vi.fn(),
      eq: vi.fn(),
      order: vi.fn(),
      limit: vi.fn().mockResolvedValue({
        data: [
          { id: "loss", inventory_item_id: itemId, movement_type: "LOSS", quantity_delta: "-5", reason: "Perda", note: null, created_at: "2026-08-27T12:00:00.000Z", profiles: [{ display_name: "Admin" }] },
          { id: "entry", inventory_item_id: itemId, movement_type: "ENTRY", quantity_delta: "10", reason: null, note: null, created_at: "2026-08-27T10:00:00.000Z", profiles: [{ display_name: "Admin" }] },
        ],
        error: null,
      }),
    };
    movementsQuery.select.mockReturnValue(movementsQuery);
    movementsQuery.eq.mockReturnValue(movementsQuery);
    movementsQuery.order.mockReturnValue(movementsQuery);

    const client = {
      from: vi.fn((table: string) => table === "inventory_item_balances" ? balancesQuery : movementsQuery),
    };

    const history = await createSupabaseInventoryRepository(client as never).listHistory({ inventoryItemId: itemId, limit: 20 });

    expect(history.map((movement) => ({ id: movement.id, balanceAfter: movement.balanceAfter }))).toEqual([
      { id: "loss", balanceAfter: 5 },
      { id: "entry", balanceAfter: 10 },
    ]);
    expect(balancesQuery.select).toHaveBeenCalledWith("item_id, name, unit, minimum_stock, balance_quantity, is_active");
    expect(movementsQuery.select).toHaveBeenCalledWith("id, inventory_item_id, movement_type, quantity_delta, reason, note, created_at, profiles!inventory_movements_actor_user_id_fkey(display_name)");
  });
});
