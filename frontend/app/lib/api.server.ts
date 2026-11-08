import { env } from "./env.server";

/** An error response from the API, with its status and any per-field messages. */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public fields: Record<string, string> = {},
  ) {
    super(message);
  }
}

export interface ApiOptions extends Omit<RequestInit, "body"> {
  /** JSON-serialized unless it is FormData. */
  body?: unknown;
  token?: string;
  /** The reader's IP, forwarded so the API can rate-limit forms per person. */
  clientIp?: string;
  timeoutMs?: number;
}

/** Calls the Node API from the server. Throws ApiError on any non-2xx response. */
export async function api<T>(path: string, { body, token, clientIp, timeoutMs = 10000, headers, ...init }: ApiOptions = {}): Promise<T> {
  const h = new Headers(headers);
  h.set("accept", "application/json");
  if (token) h.set("authorization", `Bearer ${token}`);
  if (env.internalKey) h.set("x-internal-key", env.internalKey);
  if (clientIp) h.set("x-client-ip", clientIp);

  let payload: BodyInit | undefined;
  if (body instanceof FormData) payload = body;
  else if (body !== undefined) {
    h.set("content-type", "application/json");
    payload = JSON.stringify(body);
  }

  let res: Response;
  try {
    res = await fetch(`${env.apiUrl}/api${path}`, { ...init, headers: h, body: payload, signal: AbortSignal.timeout(timeoutMs) });
  } catch (cause) {
    console.error(`API unreachable: ${init.method ?? "GET"} ${path}`, cause);
    throw new ApiError(503, "The content service is not responding. Try again in a moment.");
  }

  if (res.status === 204) return undefined as T;
  const type = res.headers.get("content-type") ?? "";
  if (!res.ok) {
    const data = type.includes("json") ? ((await res.json().catch(() => ({}))) as { error?: string; fields?: Record<string, string> }) : {};
    throw new ApiError(res.status, data.error ?? `Request failed (${res.status}).`, data.fields ?? {});
  }
  return (type.includes("json") ? res.json() : res.text()) as Promise<T>;
}

/** Raw response, for streaming files such as CSV exports. */
export async function apiRaw(path: string, token: string) {
  const res = await fetch(`${env.apiUrl}/api${path}`, { headers: { authorization: `Bearer ${token}` } });
  if (!res.ok) throw new ApiError(res.status, "Request failed.");
  return res;
}

/** The reader's IP as seen by this server (or the proxy in front of it). */
export function clientIpOf(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "";
}
