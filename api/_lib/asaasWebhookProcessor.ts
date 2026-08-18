export type AsaasWebhookRpcClient = {
  rpc(
    functionName: "process_asaas_webhook_event",
    parameters: {
      p_event_id: string;
      p_event_type?: string;
      p_payment_id?: string;
      p_payload: unknown;
    },
  ): Promise<{ data: "processed" | "duplicate" | null; error: unknown }>;
};

export type AsaasWebhookEventInput = {
  id: string;
  event?: string;
  payment?: { id?: string };
};

export async function processAsaasWebhookEvent(
  client: AsaasWebhookRpcClient,
  event: AsaasWebhookEventInput,
): Promise<"processed" | "duplicate"> {
  const { data, error } = await client.rpc("process_asaas_webhook_event", {
    p_event_id: event.id,
    p_event_type: event.event,
    p_payment_id: event.payment?.id,
    p_payload: event,
  });

  if (error || (data !== "processed" && data !== "duplicate")) {
    throw new Error("Não foi possível processar o evento Asaas.");
  }

  return data;
}
