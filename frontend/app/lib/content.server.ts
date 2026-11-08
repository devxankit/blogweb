/**
 * Content access layer. Every public page reads data through these functions,
 * which call the Node API (backend/). Responses are cached in memory for a
 * short time so busy pages do not hit the database on every request; any
 * change made in the admin panel clears the cache immediately.
 *
 * The .server suffix keeps this module out of the browser bundle.
 */
import { api, ApiError } from "./api.server";
import type { Article, ArticleSummary, Author, SearchEntry, Section } from "./types";

export const PAGE_SIZE = 9;
/** Fresh for a minute; after that, served from memory while a refresh runs in the background. */
const FRESH_MS = 60_000;
/** Never serve anything older than this, even when the API is slow. */
const STALE_MS = 15 * 60_000;
const MAX_ENTRIES = 500;

export interface Page<T> {
  items: T[];
  page: number;
  totalPages: number;
  total: number;
}

interface Entry {
  at: number;
  value: Promise<unknown>;
  refreshing?: boolean;
}

const cache = new Map<string, Entry>();

/**
 * Called after every admin change so readers see it on their next page load.
 * The most recently used pages are re-fetched straight away, so the next
 * reader gets fresh content without waiting on the database.
 */
export function clearContentCache() {
  const recent = [...cache.keys()].slice(-40);
  cache.clear();
  // This instance already knows about the change; don't clear again on the next version check.
  seenVersion = null;
  for (const path of recent) void load(path).catch(() => undefined);
}

/*
 * On Vercel the site runs as several instances, each with its own cache, and
 * an admin change reaches only one of them. Every few seconds each instance
 * asks the API for its content version and starts fresh when it moved. The
 * check runs in the background, so no reader waits for it.
 */
const VERSION_CHECK_MS = 5000;
let seenVersion: number | null = null;
let versionCheckedAt = 0;
let checkingVersion = false;

function checkVersion() {
  if (checkingVersion || Date.now() - versionCheckedAt < VERSION_CHECK_MS) return;
  checkingVersion = true;
  api<{ version: number }>("/version", { timeoutMs: 3000 })
    .then(({ version }) => {
      if (seenVersion !== null && version !== seenVersion) cache.clear();
      seenVersion = version;
    })
    .catch(() => undefined)
    .finally(() => {
      checkingVersion = false;
      versionCheckedAt = Date.now();
    });
}

function load<T>(path: string) {
  const value = api<T>(path);
  const entry: Entry = { at: Date.now(), value };
  cache.set(path, entry);
  // Failures are never cached.
  value.catch(() => cache.get(path) === entry && cache.delete(path));
  if (cache.size > MAX_ENTRIES) cache.delete(cache.keys().next().value!);
  return value;
}

/**
 * Stale-while-revalidate: readers always get an answer from memory when one
 * exists, so pages render without waiting on the database.
 */
function cached<T>(path: string): Promise<T> {
  checkVersion();
  const hit = cache.get(path);
  const age = hit ? Date.now() - hit.at : Infinity;
  if (hit && age < FRESH_MS) return hit.value as Promise<T>;
  if (hit && age < STALE_MS) {
    if (!hit.refreshing) {
      hit.refreshing = true;
      // Swap in the new value only once it has arrived.
      api<T>(path)
        .then((fresh) => cache.get(path) === hit && cache.set(path, { at: Date.now(), value: Promise.resolve(fresh) }))
        .catch(() => {
          hit.refreshing = false;
        });
    }
    return hit.value as Promise<T>;
  }
  return load<T>(path);
}

/** Like cached(), but a 404 from the API becomes null. */
async function maybe<T>(path: string): Promise<T | null> {
  try {
    return await cached<T>(path);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

// In production, fetch what every front-page visit needs as soon as the server
// starts, so the first reader after a deploy does not wait on the database.
if (process.env.NODE_ENV === "production") {
  setTimeout(() => {
    for (const path of ["/site", "/home", "/most-read?limit=5", "/section-leads?per=3"]) void load(path).catch(() => undefined);
  }, 0);
}

export function parsePage(raw: string | undefined) {
  if (raw === undefined) return 1;
  return /^[1-9]\d*$/.test(raw) ? Number(raw) : NaN;
}

const qs = (params: Record<string, string | number | undefined>) =>
  new URLSearchParams(Object.entries(params).flatMap(([k, v]) => (v === undefined ? [] : [[k, String(v)]]))).toString();

/* Site chrome */

export interface SiteData {
  sections: Section[];
  picksTitle: string;
  picksIntro: string;
}

export function getSiteData() {
  return cached<SiteData>("/site");
}

export async function getSections() {
  return (await getSiteData()).sections;
}

export async function findSection(slug: string | undefined) {
  if (!slug) return null;
  return (await getSections()).find((s) => s.slug === slug) ?? null;
}

/* Articles */

export interface HomeData {
  cover: ArticleSummary | null;
  coverLines: ArticleSummary[];
  latest: ArticleSummary[];
  picks: ArticleSummary[];
  picksTitle: string;
  picksIntro: string;
}

export function getHome() {
  return cached<HomeData>("/home");
}

export async function getLatest(limit = 10) {
  return (await cached<Page<ArticleSummary>>(`/articles?${qs({ limit })}`)).items;
}

export function getArchive(page: number) {
  if (!Number.isInteger(page) || page < 1) return Promise.resolve(null);
  return maybe<Page<ArticleSummary>>(`/articles?${qs({ page, limit: PAGE_SIZE })}`);
}

export interface ArticleData {
  article: Article;
  summary: ArticleSummary;
  author: Author;
  section: Section;
  related: ArticleSummary[];
  newer: ArticleSummary | null;
  older: ArticleSummary | null;
}

export function getArticle(slug: string) {
  if (!/^[a-z0-9-]+$/.test(slug)) return Promise.resolve(null);
  return maybe<ArticleData>(`/articles/${slug}`);
}

export function getMostRead(limit = 5) {
  return cached<ArticleSummary[]>(`/most-read?${qs({ limit })}`);
}

export function getSearchIndex() {
  return cached<SearchEntry[]>("/search-index");
}

/* Sections */

export function getSectionArticles(slug: string, page: number) {
  if (!Number.isInteger(page) || page < 1) return Promise.resolve(null);
  return maybe<Page<ArticleSummary>>(`/articles?${qs({ section: slug, page, limit: PAGE_SIZE })}`);
}

export function getSectionLeads(perSection = 4) {
  return cached<{ section: Section; articles: ArticleSummary[] }[]>(`/section-leads?${qs({ per: perSection })}`);
}

/* Authors */

export function getAuthors() {
  return cached<(Author & { articleCount: number })[]>("/authors");
}

export function getAuthor(slug: string) {
  if (!/^[a-z0-9-]+$/.test(slug)) return Promise.resolve(null);
  return maybe<{ author: Author; articles: ArticleSummary[] }>(`/authors/${slug}`);
}

/* Tags */

export function getTag(slug: string) {
  if (!/^[a-z0-9-]+$/.test(slug)) return Promise.resolve(null);
  return maybe<{ name: string; articles: ArticleSummary[] }>(`/tags/${slug}`);
}

export function getTags() {
  return cached<{ slug: string; name: string; count: number }[]>("/tags");
}

/* Sitemap */

export function getSitemapEntries() {
  return cached<{
    latest: string;
    articles: { path: string; lastmod: string; cover: ArticleSummary["cover"] }[];
    sections: { path: string; lastmod: string }[];
    authors: { path: string; lastmod: string }[];
    tags: { path: string; lastmod: string }[];
  }>("/sitemap");
}
