import { describe, expect, it } from "vitest";
import { createTestPayment, confirmTestPayment } from "./testPayment";

describe("test payment adapter", () => {
  it("cria uma cobrança de teste pendente com referência rastreável", () => {
    const payment = createTestPayment({ orderCode: "TB-20260817-0042", amountInCents: 3590, method: "pix" });

    expect(payment).toMatchObject({
      provider: "asaas_test",
      status: "pending",
      amountInCents: 3590,
      method: "pix",
      orderCode: "TB-20260817-0042",
    });
    expect(payment.reference).toMatch(/^test_TB-20260817-0042_/);
  });

  it("confirma uma cobrança pendente sem alterar a referência", () => {
    const pendingPayment = createTestPayment({ orderCode: "TB-20260817-0043", amountInCents: 4290, method: "credit_card" });
    const confirmedPayment = confirmTestPayment(pendingPayment);

    expect(confirmedPayment.status).toBe("confirmed");
    expect(confirmedPayment.reference).toBe(pendingPayment.reference);
    expect(confirmedPayment.confirmedAt).toBeTypeOf("number");
  });

  it.each(["pix", "credit_card", "voucher"] as const)("preserva o método %s no contrato simulado", (method) => {
    const payment = createTestPayment({ orderCode: "TB-20260817-0044", amountInCents: 1890, method });

    expect(payment).toMatchObject({ provider: "asaas_test", method, status: "pending" });
  });
});
