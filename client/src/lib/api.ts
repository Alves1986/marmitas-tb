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

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const headers = new Headers(init.headers);
  const accessToken = data.session?.access_token;

  if (accessToken) {
    headers.set("authorization", `Bearer ${accessToken}`);
  }

  const response = await fetch(path, {
    ...init,
    headers,
    credentials: "same-origin",
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({})) as ApiErrorPayload;
    const message = typeof payload.error === "string" ? payload.error : "Não foi possível concluir a solicitação.";
    throw new ApiError(response.status, message);
  }

  return response.json() as Promise<T>;
}
