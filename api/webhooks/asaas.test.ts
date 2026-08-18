import { describe, expect, it, vi } from "vitest";
import { createAsaasWebhookHandler, createConfiguredAsaasWebhookHandler } from "./asaas";

const validEvent = {
  id: "evt_asaas_20260818_001",
  event: "PAYMENT_RECEIVED",
  payment: { id: "pay_asaas_001" },
};

describe("/api/webhooks/asaas", () => {
  it("recusa POST sem o token dedicado do webhook", async () => {
    const processEvent = vi.fn();
    const handler = createAsaasWebhookHandler({
      expectedToken: "token-dedicado-seguro",
      processEvent,
    });

    const response = await handler(new Request("https://marmitastb.vercel.app/api/webhooks/asaas", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(validEvent),
    }));

    expect(response.status).toBe(401);
    expect(processEvent).not.toHaveBeenCalled();
  });

  it("delega um evento Asaas autenticado ao processamento idempotente", async () => {
    const processEvent = vi.fn().mockResolvedValue("processed");
    const handler = createAsaasWebhookHandler({
      expectedToken: "token-dedicado-seguro",
      processEvent,
    });

    const response = await handler(new Request("https://marmitastb.vercel.app/api/webhooks/asaas", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "asaas-access-token": "token-dedicado-seguro",
      },
      body: JSON.stringify(validEvent),
    }));

    expect(response.status).toBe(204);
    expect(processEvent).toHaveBeenCalledWith(validEvent);
  });

  it("mantém a integração desabilitada sem a chave Sandbox, mesmo que haja token", async () => {
    const processEvent = vi.fn();
    const handler = createConfiguredAsaasWebhookHandler({
      environment: {
        ASAAS_ENVIRONMENT: "sandbox",
        ASAAS_WEBHOOK_TOKEN: "token-dedicado-seguro",
      },
      processEvent,
    });

    const response = await handler(new Request("https://marmitastb.vercel.app/api/webhooks/asaas", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "asaas-access-token": "token-dedicado-seguro",
      },
      body: JSON.stringify(validEvent),
    }));

    expect(response.status).toBe(503);
    expect(processEvent).not.toHaveBeenCalled();
  });
});
