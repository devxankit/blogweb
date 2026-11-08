import jwt from "jsonwebtoken";
import { config } from "../config";

/**
 * Reads Google Search Console through a service account: a robot Google account
 * that the site owner adds as a user of the property. Access is read-only.
 */

const SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const API_URL = "https://www.googleapis.com/webmasters/v3";
const INSPECT_URL = "https://searchconsole.googleapis.com/v1/urlInspection/index:inspect";

// Google's numbers change a few times a day, and URL inspection has a daily quota.
const REPORT_TTL = 30 * 60 * 1000;
const INDEX_TTL = 6 * 60 * 60 * 1000;

export const SEARCH_TYPES = ["web", "image", "video", "news", "discover"] as const;
export type SearchType = (typeof SEARCH_TYPES)[number];

/** A problem worth showing to the admin, as opposed to a bug. */
export class SearchConsoleError extends Error {
  status: number;
  constructor(message: string, status = 0) {
    super(message);
    this.status = status;
  }
}

interface ServiceAccount {
  client_email: string;
  private_key: string;
}

function serviceAccount(): ServiceAccount | null {
  const raw = config.searchConsole.serviceAccount.trim();
  if (!raw) return null;
  const hint = "Paste the entire JSON key file into the GSC_SERVICE_ACCOUNT_JSON setting.";
  let parsed: Partial<ServiceAccount>;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new SearchConsoleError(`The service account key is not valid JSON. ${hint}`);
  }
  if (!parsed.client_email || !parsed.private_key) throw new SearchConsoleError(`The service account key is incomplete. ${hint}`);
  return parsed as ServiceAccount;
}

function explain(status: number, detail: string, email: string) {
  if (/has not been used|is disabled|accessNotConfigured/i.test(detail)) {
    return "The Google Search Console API is not turned on in your Google Cloud project. Enable it there, wait a few minutes, then reload this page.";
  }
  if (status === 401 || status === 403) {
    return `Google refused access. In Search Console, open Settings, then Users and permissions, and add ${email} as a user of ${config.searchConsole.siteUrl}.`;
  }
  if (status === 429) return "Google is limiting requests for the moment. Try again in a few minutes.";
  return `Google returned an error: ${detail}`;
}

let token: { value: string; expires: number } | null = null;
let pendingToken: Promise<string> | null = null;

// A report makes many calls at once, and they all share one token request.
function accessToken(account: ServiceAccount) {
  if (token && token.expires > Date.now() + 60_000) return Promise.resolve(token.value);
  pendingToken ??= requestToken(account).finally(() => {
    pendingToken = null;
  });
  return pendingToken;
}

async function requestToken(account: ServiceAccount) {
  const assertion = jwt.sign({ scope: SCOPE }, account.private_key, {
    algorithm: "RS256",
    issuer: account.client_email,
    audience: TOKEN_URL,
    expiresIn: 3600,
  });
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
    signal: AbortSignal.timeout(15_000),
  });
  const body = (await res.json().catch(() => ({}))) as { access_token?: string; expires_in?: number; error_description?: string };
  if (!res.ok || !body.access_token) {
    throw new SearchConsoleError(`Google did not accept the service account key: ${body.error_description ?? res.status}`, res.status);
  }
  token = { value: body.access_token, expires: Date.now() + (body.expires_in ?? 3600) * 1000 };
  return token.value;
}

async function call<T>(account: ServiceAccount, url: string, body?: object): Promise<T> {
  const res = await fetch(url, {
    method: body ? "POST" : "GET",
    headers: { Authorization: `Bearer ${await accessToken(account)}`, ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(20_000),
  });
  const result = (await res.json().catch(() => ({}))) as T & { error?: { message?: string } };
  if (!res.ok) throw new SearchConsoleError(explain(res.status, result.error?.message ?? String(res.status), account.client_email), res.status);
  return result;
}

const store = new Map<string, { expires: number; value: unknown }>();

/** Only successes are kept, so a fixed problem shows as fixed on the next load. */
async function cached<T>(key: string, ttl: number, work: () => Promise<T>): Promise<T> {
  const hit = store.get(key);
  if (hit && hit.expires > Date.now()) return hit.value as T;
  const value = await work();
  store.set(key, { expires: Date.now() + ttl, value });
  return value;
}

/* Performance: clicks, impressions, CTR and position */

interface Row {
  keys?: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

const metrics = (r?: Row) => ({ clicks: r?.clicks ?? 0, impressions: r?.impressions ?? 0, ctr: r?.ctr ?? 0, position: r?.position ?? 0 });

// Search Console dates are in Pacific time.
const pacificToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles" }).format(new Date());
const shiftDay = (day: string, by: number) => new Date(Date.parse(`${day}T00:00:00Z`) + by * 86400000).toISOString().slice(0, 10);

/** Discover and similar reports reject some breakdowns (no search terms, for one). */
const whenSupported = (work: Promise<Row[]>) =>
  work.catch((err) => {
    if (err instanceof SearchConsoleError && err.status === 400) return [] as Row[];
    throw err;
  });

interface SitemapEntry {
  path: string;
  lastSubmitted?: string;
  lastDownloaded?: string;
  isPending?: boolean;
  errors?: string | number;
  warnings?: string | number;
  contents?: { type?: string; submitted?: string | number }[];
}

export async function searchReport(days: number, type: SearchType) {
  const account = serviceAccount();
  if (!account) return { status: "not_configured" as const };
  const site = config.searchConsole.siteUrl;
  const base = `${API_URL}/sites/${encodeURIComponent(site)}`;

  return cached(`report:${days}:${type}`, REPORT_TTL, async () => {
    // The last two days are still incomplete in Google's data.
    const end = shiftDay(pacificToday(), -2);
    const start = shiftDay(end, -(days - 1));
    const previousEnd = shiftDay(start, -1);
    const previousStart = shiftDay(previousEnd, -(days - 1));

    const query = async (from: string, to: string, dimensions: string[], rowLimit = 25) =>
      (
        await call<{ rows?: Row[] }>(account, `${base}/searchAnalytics/query`, {
          startDate: from,
          endDate: to,
          dimensions,
          type,
          rowLimit,
          dataState: "all",
        })
      ).rows ?? [];

    const [totals, previous, daily, queries, pages, countries, devices, appearances, sitemaps] = await Promise.all([
      query(start, end, []),
      query(previousStart, previousEnd, []),
      query(start, end, ["date"], 1000),
      whenSupported(query(start, end, ["query"])),
      whenSupported(query(start, end, ["page"])),
      whenSupported(query(start, end, ["country"])),
      whenSupported(query(start, end, ["device"])),
      whenSupported(query(start, end, ["searchAppearance"])),
      call<{ sitemap?: SitemapEntry[] }>(account, `${base}/sitemaps`),
    ]);

    const byDay = new Map(daily.map((r) => [r.keys?.[0], r]));
    const breakdown = (rows: Row[]) => rows.map((r) => ({ key: r.keys?.[0] ?? "", ...metrics(r) }));

    return {
      status: "ok" as const,
      site,
      type,
      days,
      start,
      end,
      totals: metrics(totals[0]),
      previous: metrics(previous[0]),
      daily: Array.from({ length: days }, (_, i) => {
        const day = shiftDay(start, i);
        return { day, ...metrics(byDay.get(day)) };
      }),
      queries: breakdown(queries),
      pages: breakdown(pages),
      countries: breakdown(countries),
      devices: breakdown(devices),
      appearances: breakdown(appearances),
      sitemaps: (sitemaps.sitemap ?? []).map((s) => ({
        path: s.path,
        lastSubmitted: s.lastSubmitted ?? null,
        lastDownloaded: s.lastDownloaded ?? null,
        pending: Boolean(s.isPending),
        errors: Number(s.errors ?? 0),
        warnings: Number(s.warnings ?? 0),
        // Web pages only: "image" entries count the pictures listed on those pages.
        submitted: (s.contents ?? []).filter((c) => c.type === "web").reduce((sum, c) => sum + Number(c.submitted ?? 0), 0),
      })),
    };
  });
}

/* Index status: whether each page is on Google */

interface Inspection {
  inspectionResult?: {
    inspectionResultLink?: string;
    indexStatusResult?: { verdict?: string; coverageState?: string; lastCrawlTime?: string };
  };
}

async function mapLimit<T, R>(items: T[], limit: number, work: (item: T) => Promise<R>) {
  const out = new Array<R>(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await work(items[i]);
      }
    }),
  );
  return out;
}

export async function indexStatus(loadPages: () => Promise<{ path: string; title: string }[]>) {
  const account = serviceAccount();
  if (!account) return { status: "not_configured" as const };
  const site = config.searchConsole.siteUrl;

  return cached("index", INDEX_TTL, async () => {
    // Each answer takes several seconds, and the quota allows 600 calls a minute.
    const pages = await mapLimit(await loadPages(), 20, async (page) => {
      try {
        const { inspectionResult: result } = await call<Inspection>(account, INSPECT_URL, {
          inspectionUrl: new URL(page.path, site).href,
          siteUrl: site,
        });
        const index = result?.indexStatusResult;
        return {
          ...page,
          verdict: index?.verdict ?? "UNKNOWN",
          coverage: index?.coverageState ?? "",
          lastCrawl: index?.lastCrawlTime ?? null,
          link: result?.inspectionResultLink ?? null,
        };
      } catch (err) {
        // A refused key fails the whole report; one page's hiccup doesn't.
        if (err instanceof SearchConsoleError && (err.status === 401 || err.status === 403)) throw err;
        return { ...page, verdict: "UNKNOWN", coverage: "", lastCrawl: null, link: null };
      }
    });
    return { status: "ok" as const, checkedAt: new Date().toISOString(), pages };
  });
}
