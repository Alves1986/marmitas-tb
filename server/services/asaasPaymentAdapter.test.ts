import { describe, expect, it } from "vitest";
import { asaasPaymentAdapter, isValidAsaasWebhook, selectPaymentAdapter } from "./asaasPaymentAdapter";

describe("preparação segura do Asaas", () => {
  it("seleciona o adaptador de teste enquanto a loja está no modo de teste", () => {
    expect(selectPaymentAdapter("test").provider).toBe("asaas_test");
  });

  it("bloqueia de modo explícito a cobrança oficial enquanto não houver configuração", async () => {
    await expect(asaasPaymentAdapter.createPayment({
      orderCode: "TB-20260817-0001",
      amountInCents: 2590,
      method: "pix",
    })).rejects.toMatchObject({ code: "ASAAS_NOT_CONFIGURED" });
  });

  it("valida o token de webhook somente quando os dois valores coincidem", () => {
    expect(isValidAsaasWebhook({ received: "segredo-local", expected: "segredo-local" })).toBe(true);
    expect(isValidAsaasWebhook({ received: "origem-errada", expected: "segredo-local" })).toBe(false);
    expect(isValidAsaasWebhook({ expected: "segredo-local" })).toBe(false);
  });
});
