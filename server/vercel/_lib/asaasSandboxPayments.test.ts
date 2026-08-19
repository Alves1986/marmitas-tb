import { describe, expect, it, vi } from "vitest";
import { createAsaasSandboxPixPayment } from "./asaasSandboxPayments";

const sandboxEnvironment = {
  ASAAS_ENVIRONMENT: "sandbox",
  ASAAS_API_URL: "https://api-sandbox.asaas.com/v3",
  ASAAS_API_KEY: "$aact_hmlg_marmitas_tb_test",
  ASAAS_WEBHOOK_TOKEN: "token-seguro-de-webhook-com-mais-de-trinta-e-dois-caracteres",
};

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("createAsaasSandboxPixPayment", () => {
  it("reaproveita ou cria o pagador e emite uma cobrança PIX Sandbox vinculada ao pedido", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ data: [] }))
      .mockResolvedValueOnce(jsonResponse({ id: "cus_asaas_001" }, 200))
      .mockResolvedValueOnce(jsonResponse({ id: "pay_asaas_001", invoiceUrl: "https://sandbox.asaas.com/i/pay_asaas_001" }, 200));

    const result = await createAsaasSandboxPixPayment({
      environment: sandboxEnvironment,
      fetch,
      dueDate: () => "2026-08-19",
      input: {
        orderCode: "TB-20260819-A1B2C3",
        customer: { name: "Ana da Silva", phone: "42999991234" },
        totalInCents: 3290,
      },
    });

    expect(result).toEqual({
      available: true,
      paymentId: "pay_asaas_001",
      paymentUrl: "https://sandbox.asaas.com/i/pay_asaas_001",
    });
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(fetch).toHaveBeenNthCalledWith(
      1,
      "https://api-sandbox.asaas.com/v3/customers?externalReference=marmitas-tb%3A42999991234",
      expect.objectContaining({ headers: expect.objectContaining({ access_token: "$aact_hmlg_marmitas_tb_test" }) }),
    );
    expect(fetch).toHaveBeenNthCalledWith(
      2,
      "https://api-sandbox.asaas.com/v3/customers",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          name: "Ana da Silva",
          mobilePhone: "42999991234",
          externalReference: "marmitas-tb:42999991234",
          notificationDisabled: true,
        }),
      }),
    );
    expect(fetch).toHaveBeenNthCalledWith(
      3,
      "https://api-sandbox.asaas.com/v3/payments",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          customer: "cus_asaas_001",
          billingType: "PIX",
          value: 32.9,
          dueDate: "2026-08-19",
          description: "Pedido Marmitas TB TB-20260819-A1B2C3",
          externalReference: "TB-20260819-A1B2C3",
        }),
      }),
    );
  });

  it("mantém o checkout em modo de teste sem chamar o Asaas quando os segredos Sandbox não estão configurados", async () => {
    const fetch = vi.fn();

    const result = await createAsaasSandboxPixPayment({
      environment: { ASAAS_ENVIRONMENT: "sandbox" },
      fetch,
      input: {
        orderCode: "TB-20260819-A1B2C3",
        customer: { name: "Ana da Silva", phone: "42999991234" },
        totalInCents: 3290,
      },
    });

    expect(result).toEqual({ available: false });
    expect(fetch).not.toHaveBeenCalled();
  });
});
