import { describe, expect, it, vi } from "vitest";
import { processAsaasWebhookEvent } from "./asaasWebhookProcessor";

describe("processAsaasWebhookEvent", () => {
  it("envia o evento integral ao RPC transacional sem confiar em dados derivados do navegador", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: "processed", error: null });
    const event = {
      id: "evt_asaas_20260818_001",
      event: "PAYMENT_CONFIRMED",
      payment: { id: "pay_asaas_001" },
    };

    await expect(processAsaasWebhookEvent({ rpc }, event)).resolves.toBe("processed");

    expect(rpc).toHaveBeenCalledWith("process_asaas_webhook_event", {
      p_event_id: event.id,
      p_event_type: event.event,
      p_payment_id: event.payment.id,
      p_payload: event,
    });
  });

  it("falha de modo explícito quando a transação Supabase recusa o evento", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: { message: "violação de integridade" } });

    await expect(processAsaasWebhookEvent({ rpc }, {
      id: "evt_asaas_20260818_002",
    })).rejects.toThrow("Não foi possível processar o evento Asaas.");
  });
});
