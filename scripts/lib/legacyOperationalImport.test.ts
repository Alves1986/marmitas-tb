import { describe, expect, it } from "vitest";
import type { LegacyOperationalSnapshot } from "./legacyOperationalExport";
import { planLegacyOperationalImport } from "./legacyOperationalImport";

const snapshot: LegacyOperationalSnapshot = {
  formatVersion: 2,
  exportedAt: "2026-08-19T04:00:00.000Z",
  orders: [{ id: 41, code: "TB-0041", customerPhone: "(42) 99999-0000" }],
  orderItems: [{ id: 7, orderId: 41, productId: 18 }],
  orderEvents: [{ id: 9, orderId: 41, actorUserId: 3 }],
  paymentEvents: [{ id: 2, orderId: 41, provider: "asaas_test", externalEventId: "evt_1" }],
  printJobs: [{ id: 4, orderId: 41 }],
  storeSettings: [{ id: 1, settingKey: "store" }],
};

describe("planLegacyOperationalImport", () => {
  it("reconhece registros já mapeados e planeja somente registros pendentes sem executar escrita", () => {
    const plan = planLegacyOperationalImport(snapshot, {
      legacyMaps: [{ legacyEntity: "orders", legacyId: 41 }],
      productIdMap: new Map([[18, "74b5a5ac-5fd7-4e69-a1b8-49af1b6fe193"]]),
      userIdMap: new Map([[3, "58e6ea60-e467-45b3-b5c7-176163de5275"]]),
    });

    expect(plan.mode).toBe("dry-run");
    expect(plan.summary).toEqual({
      orders: { toCreate: 0, alreadyMapped: 1 },
      orderItems: { toCreate: 1, alreadyMapped: 0 },
      orderEvents: { toCreate: 1, alreadyMapped: 0 },
      paymentEvents: { toCreate: 1, alreadyMapped: 0 },
      printJobs: { toCreate: 1, alreadyMapped: 0 },
      storeSettings: { toCreate: 1, alreadyMapped: 0 },
    });
    expect(plan.conflicts).toEqual([]);
    expect(plan.unresolvedReferences).toEqual([]);
  });

  it("bloqueia colisão de código de pedido sem mapa legado para evitar duplicação silenciosa", () => {
    const plan = planLegacyOperationalImport(snapshot, {
      legacyMaps: [],
      existingOrderCodes: new Set(["TB-0041"]),
      productIdMap: new Map([[18, "74b5a5ac-5fd7-4e69-a1b8-49af1b6fe193"]]),
      userIdMap: new Map([[3, "58e6ea60-e467-45b3-b5c7-176163de5275"]]),
    });

    expect(plan.summary.orders).toEqual({ toCreate: 0, alreadyMapped: 0 });
    expect(plan.conflicts).toEqual([
      { legacyEntity: "orders", legacyId: 41, reason: "order_code_already_exists_without_legacy_map" },
    ]);
  });

  it("não planeja item cujo produto legado ainda não possui UUID de destino", () => {
    const plan = planLegacyOperationalImport(snapshot, { legacyMaps: [] });

    expect(plan.summary.orderItems).toEqual({ toCreate: 0, alreadyMapped: 0 });
    expect(plan.unresolvedReferences).toContainEqual({
      legacyEntity: "orderItems",
      legacyId: 7,
      reference: "product_id",
    });
  });
});
