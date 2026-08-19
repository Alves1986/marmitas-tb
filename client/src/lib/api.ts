import { supabase } from "./supabaseClient";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type ApiErrorPayload = { error?: unknown };

const API_REQUEST_TIMEOUT_MS = 15_000;
const API_REQUEST_TIMEOUT_MESSAGE = "A solicitação demorou mais do que o esperado. Verifique sua conexão e tente novamente.";

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const abortFromCaller = () => controller.abort(init.signal?.reason);
  if (init.signal?.aborted) abortFromCaller();
  else init.signal?.addEventListener("abort", abortFromCaller, { once: true });

  const timeoutError = new Error(API_REQUEST_TIMEOUT_MESSAGE);
  const request = async () => {
    const { data } = await supabase.auth.getSession();
    if (controller.signal.aborted) throw controller.signal.reason;

    const headers = new Headers(init.headers);
    const accessToken = data.session?.access_token;

    if (accessToken) {
      headers.set("authorization", `Bearer ${accessToken}`);
    }

    const response = await fetch(path, {
      ...init,
      headers,
      credentials: "same-origin",
      signal: controller.signal,
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({})) as ApiErrorPayload;
      const message = typeof payload.error === "string" ? payload.error : "Não foi possível concluir a solicitação.";
      throw new ApiError(response.status, message);
    }

    return response.json() as Promise<T>;
  };

  try {
    return await new Promise<T>((resolve, reject) => {
      let settled = false;
      const settle = (callback: (value: T | Error) => void, value: T | Error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutId);
        callback(value);
      };
      const timeoutId = setTimeout(() => {
        controller.abort(timeoutError);
        settle((error) => reject(error), timeoutError);
      }, API_REQUEST_TIMEOUT_MS);

      void request().then(
        (data) => settle((value) => resolve(value as T), data),
        (error: unknown) => settle((reason) => reject(reason), error instanceof Error ? error : new Error("Não foi possível concluir a solicitação.")),
      );
    });
  } finally {
    init.signal?.removeEventListener("abort", abortFromCaller);
  }
}
