import { config } from "../config";
import { Author, Image, Section } from "../models";
import type { Block, Picture } from "./blocks";

/**
 * Shapes database documents into what the frontend renders. Image keys are
 * resolved to full image records here, so pages never need a separate lookup.
 */

/*
 * Authors and sections are small and read on every page, so they are kept in
 * memory and reloaded after any change made through the API. This saves a
 * database round trip per request.
 */
type AuthorRecord = Parameters<typeof authorOut>[0] & { _id: unknown };
let authorCache: Promise<Map<string, AuthorRecord>> | null = null;
let sectionCache: Promise<ReturnType<typeof sectionOut>[]> | null = null;

export function invalidateAuthors() {
  authorCache = null;
}

export function invalidateSections() {
  sectionCache = null;
}

export function authorMap() {
  authorCache ??= Author.find()
    .lean()
    .then((docs) => new Map(docs.map((d) => [String(d._id), d as AuthorRecord])));
  authorCache.catch(() => (authorCache = null));
  return authorCache;
}

export function sectionList() {
  sectionCache ??= Section.find()
    .sort({ order: 1, name: 1 })
    .lean()
    .then((docs) => docs.map(sectionOut));
  sectionCache.catch(() => (sectionCache = null));
  return sectionCache;
}

export interface ImageRef {
  key: string;
  aspect: number;
  widths: number[];
  credit: string;
  license: string;
  source: string;
  og: boolean;
  /** URL prefix for the files: `${base}/${key}-${width}.${format}`. */
  base: string;
}

const STATIC_BASE = "/images/stories";

// Images change rarely and every page needs them, so they are cached in memory
// and reloaded after any change made through the API.
let imageCache: Map<string, ImageRef> | null = null;

export function invalidateImages() {
  imageCache = null;
}

export async function imageMap() {
  if (imageCache) return imageCache;
  const docs = await Image.find().lean();
  imageCache = new Map(docs.map((d) => [d.key, toImageRef(d)]));
  return imageCache;
}

export function toImageRef(d: {
  key: string;
  aspect: number;
  widths: number[];
  credit: string;
  license: string;
  source?: string | null;
  og?: boolean | null;
  storage?: string | null;
  baseUrl?: string | null;
}): ImageRef {
  return {
    key: d.key,
    aspect: d.aspect,
    widths: [...d.widths].sort((a, b) => a - b),
    credit: d.credit,
    license: d.license,
    source: d.source ?? "",
    og: Boolean(d.og),
    base: d.baseUrl ? d.baseUrl : d.storage === "static" ? STATIC_BASE : `${config.mediaPublicUrl}/stories`,
  };
}

const MISSING: ImageRef = {
  key: "ultra-deep-field",
  aspect: 1.5,
  widths: [480, 800, 1200, 1600],
  credit: "NASA, ESA",
  license: "Public domain",
  source: "",
  og: true,
  base: STATIC_BASE,
};

function picture(p: Picture, images: Map<string, ImageRef>) {
  return { image: images.get(p.image) ?? images.get(MISSING.key) ?? MISSING, alt: p.alt, caption: p.caption || undefined };
}

const iso = (d: Date | string | null | undefined) => (d ? new Date(d).toISOString() : undefined);

type AuthorLite = { _id?: unknown; slug: string; name: string };

export interface ArticleLike {
  _id: unknown;
  slug: string;
  title: string;
  dek: string;
  seoTitle?: string | null;
  seoDescription?: string | null;
  section: string;
  format: string;
  author: unknown;
  publishedAt: Date;
  revisedAt?: Date | null;
  cover: Picture;
  tags: string[];
  body?: unknown[];
  wordCount: number;
  readingMinutes: number;
}

function authorOf(a: ArticleLike): AuthorLite {
  const author = a.author as AuthorLite | null;
  return author && typeof author === "object" && "slug" in author
    ? { slug: author.slug, name: author.name }
    : { slug: "staff", name: "CosmosLens staff" };
}

export function summary(a: ArticleLike, images: Map<string, ImageRef>) {
  return {
    id: String(a._id),
    slug: a.slug,
    title: a.title,
    dek: a.dek,
    seoTitle: a.seoTitle || undefined,
    seoDescription: a.seoDescription || undefined,
    section: a.section,
    format: a.format,
    publishedAt: iso(a.publishedAt)!,
    updatedAt: iso(a.revisedAt),
    cover: picture(a.cover, images),
    tags: a.tags,
    author: authorOf(a),
    readingMinutes: a.readingMinutes,
    wordCount: a.wordCount,
  };
}

export function fullArticle(a: ArticleLike, images: Map<string, ImageRef>) {
  const { author, readingMinutes: _r, wordCount: _w, id: _id, ...rest } = summary(a, images);
  const body = ((a.body ?? []) as Block[]).map((b) => (b.type === "figure" ? { ...b, picture: picture(b.picture, images) } : b));
  return { ...rest, author: author.slug, body };
}

export function authorOut(a: {
  slug: string;
  name: string;
  role: string;
  shortBio: string;
  bio: string[];
  location?: string | null;
  expertise: string[];
  links?: { label?: string | null; href?: string | null }[];
}) {
  return {
    slug: a.slug,
    name: a.name,
    role: a.role,
    shortBio: a.shortBio,
    bio: a.bio,
    location: a.location ?? "",
    expertise: a.expertise,
    links: (a.links ?? []).filter((l) => l.label && l.href).map((l) => ({ label: l.label!, href: l.href! })),
  };
}

export function sectionOut(s: {
  slug: string;
  name: string;
  description: string;
  line?: { label: string; nm: number } | null;
  color?: string | null;
}) {
  return { slug: s.slug, name: s.name, description: s.description, line: { label: s.line?.label ?? "", nm: s.line?.nm ?? 0 }, color: s.color || "" };
}
