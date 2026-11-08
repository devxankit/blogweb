import { createCookieSessionStorage, data, redirect } from "react-router";
import { api, ApiError, type ApiOptions } from "./api.server";
import { clearContentCache } from "./content.server";
import { env } from "./env.server";

/**
 * Admin panel plumbing. The browser never sees the API token: it lives in an
 * httpOnly, signed cookie, and admin pages call the API from this server.
 */

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: "admin" | "editor";
}

const sessions = createCookieSessionStorage<{ token: string; user: AdminUser }, { flash: string }>({
  cookie: {
    name: "__df_admin",
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: env.isProduction,
    secrets: [env.sessionSecret],
    maxAge: 60 * 60 * 24 * 7,
  },
});

export async function getSession(request: Request) {
  return sessions.getSession(request.headers.get("cookie"));
}

export async function startSession(request: Request, token: string, user: AdminUser, to: string) {
  const session = await getSession(request);
  session.set("token", token);
  session.set("user", user);
  return redirect(to, { headers: { "Set-Cookie": await sessions.commitSession(session) } });
}

export async function endSession(request: Request, to = "/admin/login") {
  const session = await getSession(request);
  return redirect(to, { headers: { "Set-Cookie": await sessions.destroySession(session) } });
}

/** Replaces the stored token, e.g. after a password change signs out other sessions. */
export async function refreshSession(request: Request, token: string, user: AdminUser) {
  const session = await getSession(request);
  session.set("token", token);
  session.set("user", user);
  return sessions.commitSession(session);
}

function loginRedirect(request: Request) {
  const url = new URL(request.url);
  const next = url.pathname + url.search;
  return `/admin/login${next && next !== "/admin" ? `?next=${encodeURIComponent(next)}` : ""}`;
}

/** The signed-in account, verified against the API. Redirects to the login page otherwise. */
export async function requireUser(request: Request) {
  const session = await getSession(request);
  const token = session.get("token");
  if (!token) throw redirect(loginRedirect(request));
  try {
    const { user } = await api<{ user: AdminUser }>("/auth/me", { token });
    return { user, token };
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) throw await endSession(request, loginRedirect(request));
    throw err;
  }
}

/**
 * Calls an admin API endpoint as the signed-in account. Sends the reader to
 * the login page when the session has expired, and clears the public
 * content cache after every change so the site updates at once.
 */
export async function adminApi<T>(request: Request, path: string, options: ApiOptions = {}): Promise<T> {
  const session = await getSession(request);
  const token = session.get("token");
  if (!token) throw redirect(loginRedirect(request));
  try {
    // "/auth/…" endpoints (password change) live outside /admin; everything else is an admin endpoint.
    const result = await api<T>(path.startsWith("/auth/") ? path : `/admin${path}`, { ...options, token });
    if (options.method && options.method !== "GET") clearContentCache();
    return result;
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) throw await endSession(request, loginRedirect(request));
    throw err;
  }
}

export type ActionResult = { ok: true; message?: string; id?: string } | { ok: false; error: string; fields: Record<string, string> };

/**
 * Runs an admin change and turns API validation errors into form errors
 * instead of error pages.
 */
export async function attempt<T extends ActionResult | Response | (ActionResult & Record<string, unknown>)>(work: () => Promise<T>) {
  try {
    return await work();
  } catch (err) {
    if (err instanceof ApiError && err.status < 500 && err.status !== 401) {
      return data<ActionResult>({ ok: false, error: err.message, fields: err.fields }, { status: err.status === 404 ? 404 : 400 });
    }
    throw err;
  }
}

/** Reads a form field as a trimmed string. */
export function field(form: FormData, name: string) {
  const value = form.get(name);
  return typeof value === "string" ? value.trim() : "";
}

/** Splits a textarea into non-empty lines. */
export function lines(form: FormData, name: string) {
  return field(form, name)
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
}
