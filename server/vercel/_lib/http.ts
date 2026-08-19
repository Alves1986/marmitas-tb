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

type VercelNodeRequest = {
  method?: string;
  url?: string;
  headers?: Record<string, string | string[] | undefined>;
  body?: unknown;
};

type VercelNodeResponse = {
  status(statusCode: number): VercelNodeResponse;
  setHeader(name: string, value: string): void;
  send(body: string): void;
};

function toRequestHeaders(headers: VercelNodeRequest["headers"]): Headers {
  const requestHeaders = new Headers();
  for (const [name, value] of Object.entries(headers ?? {})) {
    if (typeof value === "string") requestHeaders.set(name, value);
    if (Array.isArray(value)) requestHeaders.set(name, value.join(", "));
  }
  return requestHeaders;
}

function toWebRequest(request: VercelNodeRequest): Request {
  const headers = toRequestHeaders(request.headers);
  const protocol = headers.get("x-forwarded-proto")?.split(",")[0]?.trim() || "https";
  const host = headers.get("host") || "localhost";
  const rawUrl = request.url || "/";
  const url = rawUrl.startsWith("http") ? rawUrl : `${protocol}://${host}${rawUrl}`;
  const method = request.method || "GET";
  const hasBody = method !== "GET" && method !== "HEAD" && request.body !== undefined;
  const body = hasBody
    ? typeof request.body === "string"
      ? request.body
      : JSON.stringify(request.body)
    : undefined;

  if (hasBody && !headers.has("content-type")) headers.set("content-type", "application/json");
  return new Request(url, { method, headers, body });
}

export function asVercelNodeHandler(handler: (request: Request) => Promise<Response>) {
  return async function vercelNodeHandler(request: VercelNodeRequest, response: VercelNodeResponse): Promise<void> {
    const webResponse = await handler(toWebRequest(request));
    webResponse.headers.forEach((value, name) => response.setHeader(name, value));
    response.status(webResponse.status).send(await webResponse.text());
  };
}
