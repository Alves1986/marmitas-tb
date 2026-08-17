export type TestPaymentMethod = "pix" | "credit_card" | "voucher";
export type TestPaymentStatus = "pending" | "confirmed";

export type TestPayment = {
  provider: "asaas_test";
  reference: string;
  orderCode: string;
  amountInCents: number;
  method: TestPaymentMethod;
  status: TestPaymentStatus;
  createdAt: number;
  confirmedAt?: number;
};

export function createTestPayment(input: {
  orderCode: string;
  amountInCents: number;
  method: TestPaymentMethod;
}): TestPayment {
  const createdAt = Date.now();

  return {
    provider: "asaas_test",
    reference: `test_${input.orderCode}_${createdAt}`,
    orderCode: input.orderCode,
    amountInCents: input.amountInCents,
    method: input.method,
    status: "pending",
    createdAt,
  };
}

export function confirmTestPayment(payment: TestPayment): TestPayment {
  return {
    ...payment,
    status: "confirmed",
    confirmedAt: Date.now(),
  };
}
