import { isbot } from "isbot";
import { data } from "react-router";
import { api, ApiError, clientIpOf } from "~/lib/api.server";
import type { Route } from "./+types/forms";

/**
 * POST /forms/subscribe, /forms/contact and /forms/track. Passes reader form
 * submissions and page views to the API, adding the reader's IP for rate limits.
 */
const TARGETS: Record<string, string> = {
  subscribe: "/subscribe",
  contact: "/contact",
  track: "/track",
};

export async function action({ request, params }: Route.ActionArgs) {
  const target = TARGETS[params.form];
  if (!target || request.method !== "POST") throw data({ error: "Not found" }, { status: 404 });

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return data({ error: "The request could not be read." }, { status: 400 });

  if (params.form === "track") {
    // Bots, prefetches and admin pages are not readers.
    const ua = request.headers.get("user-agent") ?? "";
    if (isbot(ua) || request.headers.get("purpose") === "prefetch") return new Response(null, { status: 204 });
    void api(target, { method: "POST", body, clientIp: clientIpOf(request), timeoutMs: 3000 }).catch(() => undefined);
    return new Response(null, { status: 204 });
  }

  try {
    await api(target, { method: "POST", body, clientIp: clientIpOf(request) });
    return data({ ok: true });
  } catch (err) {
    if (err instanceof ApiError) return data({ error: err.message, fields: err.fields }, { status: err.status });
    throw err;
  }
}

export function loader() {
  throw data(null, { status: 404 });
}
