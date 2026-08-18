export const ASAAS_SANDBOX_API_URL = "https://api-sandbox.asaas.com/v3" as const;

export type AsaasEnvironment = Readonly<Record<string, string | undefined>>;

export type AsaasSandboxConfig = {
  environment: "sandbox";
  baseUrl: typeof ASAAS_SANDBOX_API_URL;
  apiKey: string;
  webhookToken: string;
};

export type AsaasSandboxConfigResult =
  | { ready: true; config: AsaasSandboxConfig }
  | {
      ready: false;
      reason:
        | "invalid_environment"
        | "invalid_url"
        | "missing_api_key"
        | "invalid_api_key"
        | "invalid_webhook_token";
    };

function normalizeUrl(value?: string): string {
  return (value ?? ASAAS_SANDBOX_API_URL).replace(/\/+$/, "");
}

function isSandboxApiKey(value: string): boolean {
  return /^\$?aact_hmlg_/.test(value);
}

function isSafeWebhookToken(token: string | undefined, apiKey: string | undefined): token is string {
  return Boolean(token && apiKey && token !== apiKey && token.length >= 32 && token.length <= 255 && !/\s/.test(token));
}

export function getAsaasSandboxConfig(env: AsaasEnvironment): AsaasSandboxConfigResult {
  if (env.ASAAS_ENVIRONMENT !== "sandbox") return { ready: false, reason: "invalid_environment" };
  if (normalizeUrl(env.ASAAS_API_URL) !== ASAAS_SANDBOX_API_URL) return { ready: false, reason: "invalid_url" };
  if (!env.ASAAS_API_KEY) return { ready: false, reason: "missing_api_key" };
  if (!isSandboxApiKey(env.ASAAS_API_KEY)) return { ready: false, reason: "invalid_api_key" };
  if (!isSafeWebhookToken(env.ASAAS_WEBHOOK_TOKEN, env.ASAAS_API_KEY)) {
    return { ready: false, reason: "invalid_webhook_token" };
  }

  return {
    ready: true,
    config: {
      environment: "sandbox",
      baseUrl: ASAAS_SANDBOX_API_URL,
      apiKey: env.ASAAS_API_KEY,
      webhookToken: env.ASAAS_WEBHOOK_TOKEN,
    },
  };
}
