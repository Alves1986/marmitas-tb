import { describe, expect, it } from "vitest";
import { ENV } from "../_core/env";
import { ASAAS_SANDBOX_API_URL, getAsaasSandboxConfig } from "./asaasSandboxConfig";

describe("getAsaasSandboxConfig", () => {
  const validEnv = {
    ASAAS_ENVIRONMENT: "sandbox",
    ASAAS_API_KEY: "$aact_hmlg_example_key",
    ASAAS_WEBHOOK_TOKEN: "whsec_0123456789abcdef0123456789abcdef",
  };

  it("aceita exclusivamente a configuração completa do Sandbox", () => {
    expect(getAsaasSandboxConfig(validEnv)).toEqual({
      ready: true,
      config: {
        environment: "sandbox",
        baseUrl: ASAAS_SANDBOX_API_URL,
        apiKey: validEnv.ASAAS_API_KEY,
        webhookToken: validEnv.ASAAS_WEBHOOK_TOKEN,
      },
    });
  });

  it.each([
    [{ ...validEnv, ASAAS_ENVIRONMENT: "production" }, "invalid_environment"],
    [{ ...validEnv, ASAAS_API_URL: "https://api.asaas.com/v3" }, "invalid_url"],
    [{ ...validEnv, ASAAS_API_KEY: "" }, "missing_api_key"],
    [{ ...validEnv, ASAAS_API_KEY: "$aact_prod_example_key" }, "invalid_api_key"],
    [{ ...validEnv, ASAAS_WEBHOOK_TOKEN: validEnv.ASAAS_API_KEY }, "invalid_webhook_token"],
    [{ ...validEnv, ASAAS_WEBHOOK_TOKEN: "curto" }, "invalid_webhook_token"],
  ] as const)("bloqueia configuração insegura", (env, reason) => {
    expect(getAsaasSandboxConfig(env)).toEqual({ ready: false, reason });
  });

  it("reconhece o Sandbox injetado e permanece bloqueado sem chave privada", () => {
    expect(ENV.asaas).toEqual({ ready: false, reason: "missing_api_key" });
  });
});
