import type { Express, Request, Response } from "express";
import { processAsaasWebhookEvent } from "../db";
import { isValidAsaasWebhook } from "../services/asaasPaymentAdapter";

export type AsaasWebhookEvent = {
  id: string;
  event?: string;
  payment?: { id?: string };
};

type WebhookProcessor = (event: AsaasWebhookEvent) => Promise<"processed" | "duplicate">;

type WebhookDependencies = {
  expectedToken?: string;
  processEvent: WebhookProcessor;
};

export function createAsaasWebhookHandler({
  expectedToken,
  processEvent,
}: WebhookDependencies) {
  return async (req: Pick<Request, "headers" | "body">, res: Pick<Response, "status" | "send">): Promise<void> => {
    const receivedToken = req.headers["asaas-access-token"];
    const token = Array.isArray(receivedToken) ? receivedToken[0] : receivedToken;
    if (!isValidAsaasWebhook({ received: token, expected: expectedToken })) {
      res.status(401).send();
      return;
    }

    const event = req.body as Partial<AsaasWebhookEvent>;
    if (!event || typeof event.id !== "string" || event.id.length === 0) {
      res.status(400).send();
      return;
    }

    try {
      await processEvent(event as AsaasWebhookEvent);
      res.status(204).send();
    } catch (error) {
      console.error("[Asaas Webhook] Failed to process event", error);
      res.status(500).send();
    }
  };
}

export function registerAsaasWebhook(app: Pick<Express, "post">, dependencies?: WebhookDependencies) {
  app.post("/api/asaas/webhook", createAsaasWebhookHandler(
    dependencies ?? {
      expectedToken: process.env.ASAAS_WEBHOOK_TOKEN,
      processEvent: processAsaasWebhookEvent,
    },
  ));
}
