export type AsaasPaymentWebhookEvent = {
  id: string;
  event?: string;
  payment?: { id?: string };
};

export function buildAsaasPaymentEventRecord(event: AsaasPaymentWebhookEvent) {
  return {
    provider: "asaas" as const,
    externalEventId: event.id,
    eventType: event.event ?? "UNKNOWN",
    payloadJson: JSON.stringify(event),
  };
}

export function getAsaasWebhookPaymentUpdate(event: AsaasPaymentWebhookEvent) {
  if (!event.payment?.id) return undefined;
  if (event.event !== "PAYMENT_RECEIVED" && event.event !== "PAYMENT_CONFIRMED") return undefined;

  return {
    paymentReference: event.payment.id,
    paymentStatus: "confirmed" as const,
    orderStatus: "confirmado" as const,
    eventType: "asaas_payment_received" as const,
  };
}
