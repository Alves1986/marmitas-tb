import { timingSafeEqual } from "node:crypto";
import { createTestPayment, type TestPaymentMethod } from "./testPayment";

export type PaymentAdapterInput = {
  orderCode: string;
  amountInCents: number;
  method: TestPaymentMethod;
};

export type PaymentAdapter = {
  provider: "asaas_test" | "asaas";
  createPayment(input: PaymentAdapterInput): Promise<{
    provider: "asaas_test" | "asaas";
    reference: string;
    status: "pending";
  }>;
};

export class AsaasNotConfiguredError extends Error {
  code = "ASAAS_NOT_CONFIGURED" as const;

  constructor() {
    super("A integração oficial do Asaas ainda não foi configurada.");
    this.name = "AsaasNotConfiguredError";
  }
}

export const testPaymentAdapter: PaymentAdapter = {
  provider: "asaas_test",
  async createPayment(input) {
    const payment = createTestPayment(input);
    return { provider: payment.provider, reference: payment.reference, status: "pending" as const };
  },
};

export const asaasPaymentAdapter: PaymentAdapter = {
  provider: "asaas",
  async createPayment() {
    throw new AsaasNotConfiguredError();
  },
};

export function selectPaymentAdapter(mode: "test" | "asaas"): PaymentAdapter {
  return mode === "test" ? testPaymentAdapter : asaasPaymentAdapter;
}

export function isValidAsaasWebhook({ received, expected }: { received?: string; expected?: string }): boolean {
  if (!received || !expected || received.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(received), Buffer.from(expected));
}
