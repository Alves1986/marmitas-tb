import { describe, expect, it, vi } from "vitest";
import { assertPublicOrderSource, getPrintPriority, normalizeOrderSource, persistUnifiedOrder } from "./unifiedOrders.js";

describe("núcleo unificado de pedidos", () => {
  it("aceita apenas canais conhecidos", () => {
    expect(normalizeOrderSource("KIOSK")).toBe("KIOSK");
    expect(() => normalizeOrderSource("UNKNOWN")).toThrow("Canal de origem inválido.");
  });

  it("atribui prioridade máxima à impressão do balcão", () => {
    expect(getPrintPriority("COUNTER")).toBe(100);
    expect(getPrintPriority("KIOSK")).toBe(50);
    expect(getPrintPriority("OWN_APP")).toBe(50);
  });

  it("bloqueia canais internos na entrada pública", () => {
    expect(assertPublicOrderSource()).toBe("OWN_APP");
    expect(() => assertPublicOrderSource("COUNTER")).toThrow("Canal não permitido.");
  });

  it("persiste o pedido pelo procedimento transacional com preço e origem congelados", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [{ order_id: "71f81a1b-8839-4bda-a587-35ab7acb96cc", order_code: "TB-20260826-CORE", order_created_at: "2026-08-26T23:17:00.000Z", reused: false }],
      error: null,
    });

    const result = await persistUnifiedOrder({ rpc } as never, {
      code: "TB-20260826-CORE",
      sourceChannel: "KIOSK",
      idempotencyKey: "b2a5f4d8-9a4d-4d66-b1a9-9aa5f93c9241",
      customer: { name: "Ana", phone: "42999991234", phoneLookup: "42999991234" },
      fulfillmentMethod: "pickup",
      subtotalInCents: 2000,
      deliveryFeeInCents: 0,
      totalInCents: 2000,
      status: "confirmado",
      paymentMethod: "pix",
      paymentProvider: "asaas_test",
      paymentStatus: "confirmed",
      paymentReference: "test-kiosk",
      items: [{ productId: "19c4f23b-1e6d-4ca1-8e62-c44876fc65f2", productName: "Marmita", unitPriceInCents: 2000, quantity: 1, configuration: [], note: "" }],
    });

    expect(result).toMatchObject({ code: "TB-20260826-CORE", reused: false });
    expect(rpc).toHaveBeenCalledWith("create_unified_order", expect.objectContaining({
      p_source_channel: "KIOSK",
      p_idempotency_key: "b2a5f4d8-9a4d-4d66-b1a9-9aa5f93c9241",
      p_total_in_cents: 2000,
      p_items: [expect.objectContaining({ productName: "Marmita", unitPriceInCents: 2000 })],
    }));
  });
});
