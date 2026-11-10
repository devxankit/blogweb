// Keyword research from free sources, for choosing and framing stories.
//
//   npm run keywords -- "solar eclipse 2027" "gaganyaan"
//   npm run keywords -- "solar eclipse 2027" --json      (machine-readable)
//
// Sources, each skipped quietly when it is not set up:
// - Google autocomplete, India and US: what people actually type.
// - Wikipedia page views: how much interest a topic draws (English Wikipedia, last 3 full months).
// - Bing Webmaster keyword data: real Bing search counts. Needs BING_WEBMASTER_API_KEY.
// - Google Search Console: searches this site already appears for. Needs GSC_SERVICE_ACCOUNT_JSON
//   (the key itself) or GSC_KEY_FILE (a path to the key file).
import { createSign } from "node:crypto";
import { readFileSync } from "node:fs";

const UA = { "User-Agent": "CosmosLens-keyword-research/1.0" };
const args = process.argv.slice(2);
const asJson = args.includes("--json");
const seeds = args.filter((a) => !a.startsWith("--")).map((s) => s.trim().toLowerCase()).filter(Boolean);

if (!seeds.length) {
  console.log('Usage: npm run keywords -- "topic one" "topic two" [--json]');
  process.exit(1);
}

const day = (d: Date) => d.toISOString().slice(0, 10);
const monthsBack = (n: number) => {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - n, 1));
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function getJson<T>(url: string, init?: RequestInit, attempt = 0): Promise<T> {
  const r = await fetch(url, { ...init, headers: { ...UA, ...init?.headers }, signal: AbortSignal.timeout(20_000) });
  // Wikipedia rate-limits bursts; back off and try again a few times.
  if (r.status === 429 && attempt < 4) {
    await wait(2_000 * 2 ** attempt);
    return getJson<T>(url, init, attempt + 1);
  }
  if (!r.ok) throw new Error(`${r.status} ${(await r.text()).slice(0, 200)}`);
  return (await r.json()) as T;
}

// ---- Google autocomplete -------------------------------------------------

const PROMPTS = ["{s}", "{s} in india", "{s} in hindi", "what is {s}", "how {s}", "why {s}", "when {s}", "{s} kab", "{s} date", "{s} vs"];

async function suggest(q: string, gl: string): Promise<string[]> {
  const r = await fetch(`https://suggestqueries.google.com/complete/search?client=firefox&hl=en&gl=${gl}&q=${encodeURIComponent(q)}`, {
    headers: UA,
    signal: AbortSignal.timeout(15_000),
  });
  if (!r.ok) return [];
  const body = JSON.parse(new TextDecoder("latin1").decode(await r.arrayBuffer())) as [string, string[]];
  return body[1] ?? [];
}

async function autocomplete(seed: string) {
  const seen = new Map<string, { india: number; us: number }>();
  for (const prompt of PROMPTS) {
    const q = prompt.replace("{s}", seed);
    const [india, us] = await Promise.all([suggest(q, "in"), suggest(q, "us")]);
    for (const [list, where] of [[india, "india"], [us, "us"]] as const) {
      for (const s of list) {
        const row = seen.get(s) ?? { india: 0, us: 0 };
        row[where]++;
        seen.set(s, row);
      }
    }
  }
  // A phrase Google offers for several prompts, or in both countries, is a stronger signal.
  return [...seen.entries()]
    .map(([query, n]) => ({ query, india: n.india, us: n.us }))
    .sort((a, b) => b.india - a.india || b.us - a.us || a.query.length - b.query.length);
}

// ---- Wikipedia -----------------------------------------------------------

async function wikipedia(seed: string) {
  // Full-text search returns real articles, not the near-empty redirect pages that title search finds.
  const found = await getJson<{ query: { search: { title: string }[] } }>(
    `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(seed)}&srlimit=3&srnamespace=0&format=json`,
  );
  const titles = found.query.search.map((s) => s.title);
  const start = monthsBack(3);
  const end = new Date(monthsBack(0).getTime() - 86_400_000);
  const ymd = (d: Date) => day(d).replaceAll("-", "");
  const out: { title: string; monthlyViews: number | null }[] = [];
  for (const title of titles) {
    try {
      const { items } = await getJson<{ items: { views: number }[] }>(
        `https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia/all-access/user/${encodeURIComponent(title.replaceAll(" ", "_"))}/monthly/${ymd(start)}/${ymd(end)}`,
      );
      out.push({ title, monthlyViews: Math.round(items.reduce((s, i) => s + i.views, 0) / Math.max(items.length, 1)) });
    } catch {
      out.push({ title, monthlyViews: null });
    }
  }
  return out;
}

// ---- Bing Webmaster ------------------------------------------------------

interface BingKeyword {
  Query: string;
  Impressions: number;
  BroadImpressions: number;
}

async function bing(seed: string) {
  const key = process.env.BING_WEBMASTER_API_KEY;
  if (!key) return { status: "not set up: add BING_WEBMASTER_API_KEY to backend/.env" };
  const startDate = day(monthsBack(3));
  const endDate = day(new Date(monthsBack(0).getTime() - 86_400_000));
  const base = "https://ssl.bing.com/webmaster/api.svc/json";
  const results: Record<string, unknown> = { period: `${startDate} to ${endDate}` };
  for (const [country, language] of [
    ["in", "en-IN"],
    ["us", "en-US"],
  ]) {
    const qs = `q=${encodeURIComponent(seed)}&country=${country}&language=${language}&startDate=${startDate}&endDate=${endDate}&apikey=${key}`;
    try {
      const exact = await getJson<{ d: BingKeyword | null }>(`${base}/GetKeyword?${qs}`);
      const related = await getJson<{ d: BingKeyword[] | null }>(`${base}/GetRelatedKeywords?${qs}`);
      // Bing's related list can wander far off topic (electricity bills for "light year"),
      // so keep only searches that share a word with the topic.
      const words = seed.split(/\s+/).filter((w) => w.length > 2);
      results[country] = {
        exact: exact.d,
        related: (related.d ?? [])
          .filter((k) => words.some((w) => k.Query.toLowerCase().includes(w)))
          .sort((a, b) => b.Impressions - a.Impressions)
          .slice(0, 25),
      };
    } catch (e) {
      results[country] = { error: e instanceof Error ? e.message.replace(key, "***") : String(e) };
    }
  }
  return results;
}

// ---- Google Search Console -----------------------------------------------

let gscToken: Promise<string> | null = null;

function gscKey(): { client_email: string; private_key: string } | null {
  const raw = process.env.GSC_SERVICE_ACCOUNT_JSON || (process.env.GSC_KEY_FILE ? readFileSync(process.env.GSC_KEY_FILE, "utf8") : "");
  return raw ? JSON.parse(raw) : null;
}

function token(key: { client_email: string; private_key: string }) {
  gscToken ??= (async () => {
    const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
    const now = Math.floor(Date.now() / 1000);
    const unsigned = `${b64({ alg: "RS256", typ: "JWT" })}.${b64({
      iss: key.client_email,
      scope: "https://www.googleapis.com/auth/webmasters.readonly",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    })}`;
    const sig = createSign("RSA-SHA256").update(unsigned).sign(key.private_key).toString("base64url");
    const t = await getJson<{ access_token: string }>("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${unsigned}.${sig}` }),
    });
    return t.access_token;
  })();
  return gscToken;
}

async function searchConsole(seed: string) {
  const key = gscKey();
  if (!key) return { status: "not set up: add GSC_KEY_FILE to backend/.env" };
  const site = encodeURIComponent(process.env.GSC_SITE_URL ?? "https://www.cosmoslens.com/");
  const words = seed.split(/\s+/).filter((w) => w.length > 2);
  const body = await getJson<{ rows?: { keys: string[]; clicks: number; impressions: number; position: number }[] }>(
    `https://www.googleapis.com/webmasters/v3/sites/${site}/searchAnalytics/query`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${await token(key)}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        startDate: day(new Date(Date.now() - 90 * 86_400_000)),
        endDate: day(new Date()),
        dataState: "all",
        dimensions: ["query", "page"],
        rowLimit: 100,
        // Any one word of the topic, so "solar eclipse 2027" also finds "eclipse india".
        dimensionFilterGroups: [
          { filters: [{ dimension: "query", operator: "includingRegex", expression: words.map((w) => w.replace(/[^\p{L}\p{N}]/gu, "")).join("|") }] },
        ],
      }),
    },
  );
  return (body.rows ?? []).map((r) => ({
    query: r.keys[0],
    page: r.keys[1].replace(/^https:\/\/www\.cosmoslens\.com/, ""),
    clicks: r.clicks,
    impressions: r.impressions,
    position: Math.round(r.position * 10) / 10,
  }));
}

// ---- Run -----------------------------------------------------------------

const settle = async <T>(p: Promise<T>) => p.catch((e: unknown) => ({ error: e instanceof Error ? e.message : String(e) }));

const report = [];
for (const seed of seeds) {
  const [suggestions, wiki, bingData, gsc] = await Promise.all([
    settle(autocomplete(seed)),
    settle(wikipedia(seed)),
    settle(bing(seed)),
    settle(searchConsole(seed)),
  ]);
  report.push({ seed, suggestions, wikipedia: wiki, bing: bingData, searchConsole: gsc });
}

if (asJson) {
  console.log(JSON.stringify(report, null, 2));
} else {
  for (const r of report) {
    console.log(`\n# ${r.seed}\n`);
    console.log("## Google autocomplete (how often Google offered it: India / US)");
    if (Array.isArray(r.suggestions)) for (const s of r.suggestions.slice(0, 40)) console.log(`  ${String(s.india).padStart(2)} / ${String(s.us).padEnd(2)}  ${s.query}`);
    else console.log("  ", r.suggestions);
    console.log("\n## Wikipedia interest (average monthly views, last 3 months)");
    if (Array.isArray(r.wikipedia)) for (const w of r.wikipedia) console.log(`  ${String(w.monthlyViews ?? "n/a").padStart(9)}  ${w.title}`);
    else console.log("  ", r.wikipedia);
    console.log("\n## Bing searches (exact phrase / including longer phrases, total over the period)");
    const b = r.bing as { status?: string; error?: string; period?: string } & Record<string, { exact?: BingKeyword | null; related?: BingKeyword[]; error?: string }>;
    if (b.status || b.error) console.log("  ", b.status ?? b.error);
    else {
      console.log(`  ${b.period}`);
      for (const [country, label] of [["in", "India"], ["us", "US"]]) {
        const c = b[country];
        if (!c) continue;
        if (c.error) {
          console.log(`  ${label}: ${c.error}`);
          continue;
        }
        console.log(`  ${label}:`);
        for (const k of [...(c.exact ? [c.exact] : []), ...(c.related ?? []).slice(0, 15)])
          console.log(`    ${String(k.Impressions).padStart(9)} / ${String(k.BroadImpressions).padEnd(9)} ${k.Query}`);
      }
    }
    console.log("\n## Already appearing in Google (Search Console, last 90 days)");
    if (Array.isArray(r.searchConsole)) {
      if (!r.searchConsole.length) console.log("  none yet");
      for (const g of r.searchConsole) console.log(`  pos ${String(g.position).padEnd(5)} impr ${String(g.impressions).padEnd(5)} clicks ${g.clicks}  ${g.query}  ->  ${g.page}`);
    } else console.log("  ", r.searchConsole);
  }
}
