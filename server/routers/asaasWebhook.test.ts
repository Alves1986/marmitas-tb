import { describe, expect, it, vi } from "vitest";
import { createAsaasWebhookHandler, registerAsaasWebhook } from "./asaasWebhook";

function createResponse() {
  const response = {
    status: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
  };
  return response;
}

describe("webhook oficial do Asaas", () => {
  it("registra somente a rota POST oficial sob o prefixo de API", () => {
    const app = { post: vi.fn() };

    registerAsaasWebhook(app as never, {
      expectedToken: "segredo-local",
      processEvent: vi.fn().mockResolvedValue("processed"),
    });

    expect(app.post).toHaveBeenCalledWith("/api/asaas/webhook", expect.any(Function));
  });

  it("rejeita eventos cujo token não coincide com o segredo configurado", async () => {
    const processEvent = vi.fn();
    const handler = createAsaasWebhookHandler({ expectedToken: "segredo-local", processEvent });
    const response = createResponse();

    await handler({ headers: { "asaas-access-token": "origem-errada" }, body: { id: "evt_1" } } as never, response as never);

    expect(response.status).toHaveBeenCalledWith(401);
    expect(processEvent).not.toHaveBeenCalled();
  });

  it("aceita um evento autenticado e responde sem corpo após processá-lo", async () => {
    const processEvent = vi.fn().mockResolvedValue("processed");
    const handler = createAsaasWebhookHandler({ expectedToken: "segredo-local", processEvent });
    const response = createResponse();
    const event = { id: "evt_asaas_1", event: "PAYMENT_RECEIVED", payment: { id: "pay_1" } };

    await handler({ headers: { "asaas-access-token": "segredo-local" }, body: event } as never, response as never);

    expect(processEvent).toHaveBeenCalledWith(event);
    expect(response.status).toHaveBeenCalledWith(204);
    expect(response.send).toHaveBeenCalledWith();
  });

  it("responde sem corpo também quando a persistência identifica uma repetição", async () => {
    const processEvent = vi.fn().mockResolvedValue("duplicate");
    const handler = createAsaasWebhookHandler({ expectedToken: "segredo-local", processEvent });
    const response = createResponse();

    await handler({ headers: { "asaas-access-token": "segredo-local" }, body: { id: "evt_repetido" } } as never, response as never);

    expect(response.status).toHaveBeenCalledWith(204);
    expect(processEvent).toHaveBeenCalledTimes(1);
  });
});
