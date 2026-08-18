import type { AsaasSandboxConfigResult } from "./asaasSandboxConfig";

type FetchResponse = {
  ok: boolean;
  status: number;
};

export type AsaasFetch = (url: string, init: {
  method: "GET";
  headers: Record<string, string>;
}) => Promise<FetchResponse>;

export type AsaasSandboxProbeResult =
  | { ok: true; status: number }
  | { ok: false; reason: "configuration_not_ready" | "authentication_failed" | "request_failed"; status?: number };

export async function probeAsaasSandbox(
  configuration: AsaasSandboxConfigResult,
  fetchImpl: AsaasFetch = globalThis.fetch,
): Promise<AsaasSandboxProbeResult> {
  if (!configuration.ready) return { ok: false, reason: "configuration_not_ready" };

  try {
    const response = await fetchImpl(`${configuration.config.baseUrl}/myAccount/status`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "marmitas-tb-delivery",
        access_token: configuration.config.apiKey,
      },
    });

    return response.ok
      ? { ok: true, status: response.status }
      : { ok: false, reason: "authentication_failed", status: response.status };
  } catch {
    return { ok: false, reason: "request_failed" };
  }
}
