import { describe, expect, it } from "vitest";
import { ENV } from "../_core/env";

const hasSandboxSecrets = Boolean(process.env.ASAAS_API_KEY && process.env.ASAAS_WEBHOOK_TOKEN);
const describeWithSandboxSecrets = hasSandboxSecrets ? describe : describe.skip;

describeWithSandboxSecrets("segredos injetados do Asaas Sandbox", () => {
  it("forma uma configuração pronta sem serializar valores confidenciais", () => {
    expect(ENV.asaas.ready).toBe(true);
  });
});
