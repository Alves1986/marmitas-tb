export function json(status: number, body: unknown, headers: HeadersInit = {}): Response {
  const responseHeaders = new Headers(headers);
  responseHeaders.set("content-type", "application/json; charset=utf-8");
  responseHeaders.set("cache-control", "no-store");

  return new Response(JSON.stringify(body), { status, headers: responseHeaders });
}

export function jsonError(status: number, error: unknown): Response {
  const message = typeof error === "string" && status < 500 ? error : "Erro interno.";
  return json(status, { error: message });
}

export function methodNotAllowed(allowedMethods: readonly string[]): Response {
  return json(405, { error: "Método não permitido." }, { allow: allowedMethods.join(", ") });
}
