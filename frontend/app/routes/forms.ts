import { isbot } from "isbot";
import { data } from "react-router";
import { api, ApiError, clientIpOf } from "~/lib/api.server";
import type { Route } from "./+types/forms";

/**
 * POST /forms/*. Passes reader forms, page views and consented analytics to
 * the API, adding the reader's IP for rate limits.
 */
const TARGETS: Record<string, string> = {
  subscribe: "/subscribe",
  contact: "/contact",
  comment: "/comment",
  track: "/track",
  analytics: "/analytics",
  "analytics-forget": "/analytics/forget",
  consent: "/consent",
};

// Fire-and-forget measurements, as opposed to forms a reader waits on.
const MEASUREMENTS = new Set(["track", "analytics", "analytics-forget", "consent"]);

/** Broad device facts only; the raw user agent is never passed on or stored. */
function describeDevice(ua: string) {
  const device = /iPad|Tablet|PlayBook|Silk|Android(?!.*Mobile)/i.test(ua) ? "Tablet" : /Mobi|iPhone|Android/i.test(ua) ? "Mobile" : "Desktop";
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /OPR\//.test(ua)
      ? "Opera"
      : /SamsungBrowser/.test(ua)
        ? "Samsung Internet"
        : /Firefox|FxiOS/.test(ua)
          ? "Firefox"
          : /Chrome|CriOS/.test(ua)
            ? "Chrome"
            : /Safari/.test(ua)
              ? "Safari"
              : "Other";
  const os = /Windows/.test(ua)
    ? "Windows"
    : /Android/.test(ua)
      ? "Android"
      : /iPhone|iPad/.test(ua)
        ? "iOS"
        : /Mac OS X/.test(ua)
          ? "macOS"
          : /CrOS/.test(ua)
            ? "ChromeOS"
            : /Linux/.test(ua)
              ? "Linux"
              : "Other";
  return { device, browser, os };
}

export async function action({ request, params }: Route.ActionArgs) {
  const target = TARGETS[params.form];
  if (!target || request.method !== "POST") throw data({ error: "Not found" }, { status: 404 });

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return data({ error: "The request could not be read." }, { status: 400 });

  if (MEASUREMENTS.has(params.form)) {
    // Bots, prefetches and signed-in staff are not readers. A withdrawal is always honored.
    const ua = request.headers.get("user-agent") ?? "";
    const staff = (request.headers.get("cookie") ?? "").includes("__df_admin=");
    if (params.form !== "analytics-forget" && (isbot(ua) || staff || request.headers.get("purpose") === "prefetch")) {
      return new Response(null, { status: 204 });
    }
    const payload =
      params.form === "analytics" ? { ...body, ...describeDevice(ua), country: request.headers.get("x-vercel-ip-country") ?? "" } : body;
    // Awaited: serverless functions can be frozen as soon as they respond.
    // The browser sends this as a beacon, so nobody waits on it.
    await api(target, { method: "POST", body: payload, clientIp: clientIpOf(request), timeoutMs: 3000 }).catch(() => undefined);
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
