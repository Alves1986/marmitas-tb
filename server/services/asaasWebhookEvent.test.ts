import { describe, expect, it } from "vitest";
import { buildAsaasPaymentEventRecord, getAsaasWebhookPaymentUpdate } from "./asaasWebhookEvent";

describe("mapeamento de eventos oficiais do Asaas", () => {
  it("libera o pedido somente para eventos de pagamento efetivamente recebido ou confirmado", () => {
    expect(getAsaasWebhookPaymentUpdate({
      id: "evt_1",
      event: "PAYMENT_RECEIVED",
      payment: { id: "pay_1" },
    })).toEqual({
      paymentReference: "pay_1",
      paymentStatus: "confirmed",
      orderStatus: "confirmado",
      eventType: "asaas_payment_received",
    });
  });

  it("não altera o pedido diante de evento sem confirmação de recebimento", () => {
    expect(getAsaasWebhookPaymentUpdate({
      id: "evt_2",
      event: "PAYMENT_CREATED",
      payment: { id: "pay_1" },
    })).toBeUndefined();
  });

  it("preserva o identificador externo como chave de idempotência do evento", () => {
    expect(buildAsaasPaymentEventRecord({
      id: "evt_3",
      event: "PAYMENT_RECEIVED",
      payment: { id: "pay_3" },
    })).toEqual({
      provider: "asaas",
      externalEventId: "evt_3",
      eventType: "PAYMENT_RECEIVED",
      payloadJson: JSON.stringify({
        id: "evt_3",
        event: "PAYMENT_RECEIVED",
        payment: { id: "pay_3" },
      }),
    });
  });
});
