import { describe, expect, it, vi } from "vitest";
import { getAsaasSandboxConfig } from "./asaasSandboxConfig";
import { probeAsaasSandbox } from "./asaasSandboxProbe";

describe("probeAsaasSandbox", () => {
  const configuration = getAsaasSandboxConfig({
    ASAAS_ENVIRONMENT: "sandbox",
    ASAAS_API_KEY: "$aact_hmlg_example_key",
    ASAAS_WEBHOOK_TOKEN: "whsec_0123456789abcdef0123456789abcdef",
  });

  it("consulta somente o status da conta usando cabeçalhos server-side", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, status: 200 });

    await expect(probeAsaasSandbox(configuration, fetchImpl)).resolves.toEqual({ ok: true, status: 200 });
    expect(fetchImpl).toHaveBeenCalledWith("https://api-sandbox.asaas.com/v3/myAccount/status", {
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "marmitas-tb-delivery",
        access_token: "$aact_hmlg_example_key",
      },
      method: "GET",
    });
  });

  it("retorna falha de autenticação sem incluir a chave da API", async () => {
    const result = await probeAsaasSandbox(configuration, vi.fn().mockResolvedValue({ ok: false, status: 401 }));

    expect(result).toEqual({ ok: false, reason: "authentication_failed", status: 401 });
    expect(JSON.stringify(result)).not.toContain("$aact_hmlg_example_key");
  });

  it("não chama a rede quando a configuração não está pronta", async () => {
    const fetchImpl = vi.fn();

    await expect(probeAsaasSandbox({ ready: false, reason: "missing_api_key" }, fetchImpl)).resolves.toEqual({
      ok: false,
      reason: "configuration_not_ready",
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
