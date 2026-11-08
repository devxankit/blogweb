import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";
import { config } from "../config";
import { clientIp, HttpError, intParam, notFound, parse } from "../lib/http";
import { authorMap, authorOut, fullArticle, imageMap, sectionList, summary, type ArticleLike } from "../lib/serialize";
import { dayKey, slugify } from "../lib/text";
import { Article, getSettings, Message, PageView, Subscriber, TOPICS } from "../models";

/**
 * Read-only content API for the public site, plus the reader forms
 * (newsletter, contact) and page-view tracking.
 */
export const publicRouter = Router();

const SUMMARY_FIELDS = "-body -imageKeys -createdBy -updatedBy";

/** Published and not scheduled for later. */
const live = () => ({ status: "published" as const, publishedAt: { $lte: new Date() } });

/** Story summaries, newest first. Authors and images come from memory, so this is one query. */
async function summaries(filter: object, opts: { skip?: number; limit?: number; sort?: Record<string, 1 | -1> } = {}) {
  const [docs, images, authors] = await Promise.all([
    Article.find({ ...live(), ...filter })
      .select(SUMMARY_FIELDS)
      .sort(opts.sort ?? { publishedAt: -1 })
      .skip(opts.skip ?? 0)
      .limit(opts.limit ?? 0)
      .lean(),
    imageMap(),
    authorMap(),
  ]);
  return docs.map((d) => summary({ ...d, author: authors.get(String(d.author)) ?? null } as unknown as ArticleLike, images));
}

async function paged(filter: object, page: number, size: number) {
  const [total, items] = await Promise.all([
    Article.countDocuments({ ...live(), ...filter }),
    summaries(filter, { skip: (page - 1) * size, limit: size }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / size));
  if (page > totalPages) return null;
  return { items, page, totalPages, total };
}

/* Site chrome: sections and home page settings */

publicRouter.get("/site", async (_req, res) => {
  const [sections, settings] = await Promise.all([sectionList(), getSettings()]);
  res.json({ sections, picksTitle: settings.picksTitle, picksIntro: settings.picksIntro });
});

/* Articles */

publicRouter.get("/articles", async (req, res) => {
  const page = intParam(req.query.page, 1, 10000);
  const size = intParam(req.query.limit, 9, 50);
  const filter: Record<string, unknown> = {};
  if (typeof req.query.section === "string") filter.section = req.query.section;
  if (typeof req.query.tag === "string") filter.tagSlugs = req.query.tag;
  if (typeof req.query.author === "string") {
    const author = [...(await authorMap()).values()].find((a) => a.slug === req.query.author);
    if (!author) throw notFound();
    filter.author = author._id;
  }
  const result = await paged(filter, page, size);
  if (!result) throw notFound("No such page.");
  res.json(result);
});

publicRouter.get("/home", async (_req, res) => {
  const settings = await getSettings();
  const [latest, pinned, picks] = await Promise.all([
    summaries({}, { limit: 11 }),
    settings.coverStory ? summaries({ _id: settings.coverStory }) : Promise.resolve([]),
    picksFor(settings.editorsPicks),
  ]);
  const cover = pinned[0] ?? latest[0] ?? null;
  const rest = latest.filter((s) => s.slug !== cover?.slug);
  res.json({
    cover,
    coverLines: rest.slice(0, 3),
    latest: rest.slice(3, 9),
    picks,
    picksTitle: settings.picksTitle,
    picksIntro: settings.picksIntro,
  });
});

/** Returns summaries in the order of `ids`. */
async function inOrder(ids: unknown[]) {
  if (!ids.length) return [];
  const order = new Map(ids.map((id, i) => [String(id), i]));
  const found = await summaries({ _id: { $in: ids } });
  return found.sort((a, b) => (order.get(a.id) ?? 99) - (order.get(b.id) ?? 99));
}

async function picksFor(ids: unknown[]) {
  const picks = await inOrder(ids);
  return picks.length ? picks : summaries({}, { limit: 3, sort: { wordCount: -1 } });
}

/** Most read over the last 30 days; falls back to all-time views, then to the newest stories. */
publicRouter.get("/most-read", async (req, res) => {
  const limit = intParam(req.query.limit, 5, 20);
  const since = dayKey(new Date(Date.now() - 30 * 86400000));
  const ranked = await PageView.aggregate<{ _id: unknown; views: number }>([
    { $match: { day: { $gte: since }, article: { $ne: null } } },
    { $group: { _id: "$article", views: { $sum: "$views" } } },
    { $sort: { views: -1 } },
    { $limit: limit * 2 },
  ]);
  const top = (await inOrder(ranked.map((r) => r._id))).slice(0, limit);
  if (top.length < limit) {
    const filler = await summaries(
      { slug: { $nin: top.map((s) => s.slug) } },
      { limit: limit - top.length, sort: { views: -1, publishedAt: -1 } },
    );
    top.push(...filler);
  }
  res.json(top.slice(0, limit));
});

publicRouter.get("/section-leads", async (req, res) => {
  const per = intParam(req.query.per, 3, 10);
  const sections = await sectionList();
  const blocks = await Promise.all(
    sections.map(async (section) => ({ section, articles: await summaries({ section: section.slug }, { limit: per }) })),
  );
  res.json(blocks.filter((b) => b.articles.length > 0));
});

publicRouter.get("/articles/:slug", async (req, res) => {
  const [doc, images, authors, sections] = await Promise.all([
    Article.findOne({ ...live(), slug: req.params.slug }).lean(),
    imageMap(),
    authorMap(),
    sectionList(),
  ]);
  if (!doc) throw notFound();
  const author = authors.get(String(doc.author)) ?? null;
  const section = sections.find((s) => s.slug === doc.section);
  const article = { ...doc, author } as unknown as ArticleLike;

  const [newer, older, related] = await Promise.all([
    summaries({ publishedAt: { $gt: doc.publishedAt, $lte: new Date() } }, { limit: 1, sort: { publishedAt: 1 } }),
    summaries({ publishedAt: { $lt: doc.publishedAt } }, { limit: 1 }),
    relatedTo(doc._id, doc.section, doc.tagSlugs),
  ]);

  res.json({
    article: fullArticle(article, images),
    summary: summary(article, images),
    author: author ? authorOut(author) : null,
    section: section ?? { slug: doc.section, name: doc.section, description: "", line: { label: "", nm: 0 }, color: "" },
    related,
    newer: newer[0] ?? null,
    older: older[0] ?? null,
  });
});

async function relatedTo(id: unknown, section: string, tagSlugs: string[], limit = 3) {
  const candidates = await summaries({ _id: { $ne: id }, $or: [{ section }, { tagSlugs: { $in: tagSlugs } }] }, { limit: 40 });
  const tags = new Set(tagSlugs);
  const score = (s: (typeof candidates)[number]) =>
    (s.section === section ? 2 : 0) + s.tags.filter((t) => tags.has(slugify(t))).length;
  const picked = candidates
    .map((s) => ({ s, score: score(s) }))
    .sort((a, b) => b.score - a.score || Date.parse(b.s.publishedAt) - Date.parse(a.s.publishedAt))
    .slice(0, limit)
    .map(({ s }) => s);
  if (picked.length < limit) {
    picked.push(...(await summaries({ _id: { $ne: id }, slug: { $nin: picked.map((p) => p.slug) } }, { limit: limit - picked.length })));
  }
  return picked;
}

/* Authors */

publicRouter.get("/authors", async (_req, res) => {
  const [authors, counts] = await Promise.all([
    authorMap(),
    Article.aggregate<{ _id: unknown; n: number }>([{ $match: live() }, { $group: { _id: "$author", n: { $sum: 1 } } }]),
  ]);
  const byId = new Map(counts.map((c) => [String(c._id), c.n]));
  res.json([...authors.values()].map((a) => ({ ...authorOut(a), articleCount: byId.get(String(a._id)) ?? 0 })));
});

publicRouter.get("/authors/:slug", async (req, res) => {
  const author = [...(await authorMap()).values()].find((a) => a.slug === req.params.slug);
  if (!author) throw notFound();
  res.json({ author: authorOut(author), articles: await summaries({ author: author._id }) });
});

/* Tags */

publicRouter.get("/tags", async (_req, res) => {
  const rows = await Article.aggregate<{ _id: string; name: string; count: number }>([
    { $match: live() },
    { $unwind: "$tags" },
    { $group: { _id: "$tags", count: { $sum: 1 } } },
  ]);
  const merged = new Map<string, { slug: string; name: string; count: number }>();
  for (const r of rows) {
    const slug = slugify(r._id);
    const entry = merged.get(slug) ?? { slug, name: r._id, count: 0 };
    entry.count += r.count;
    merged.set(slug, entry);
  }
  res.json([...merged.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)));
});

publicRouter.get("/tags/:slug", async (req, res) => {
  const articles = await summaries({ tagSlugs: req.params.slug });
  if (!articles.length) throw notFound();
  const name = articles[0].tags.find((t) => slugify(t) === req.params.slug) ?? req.params.slug;
  res.json({ name, articles });
});

/* Search index (titles, deks and tags of every live story) */

publicRouter.get("/search-index", async (_req, res) => {
  const all = await summaries({});
  res.json(
    all.map((s) => ({
      slug: s.slug,
      title: s.title,
      dek: s.dek,
      section: s.section,
      format: s.format,
      author: s.author.name,
      tags: s.tags,
      publishedAt: s.publishedAt,
      readingMinutes: s.readingMinutes,
      cover: s.cover,
    })),
  );
});

/* Sitemap data */

publicRouter.get("/sitemap", async (_req, res) => {
  const [all, sections, authorById] = await Promise.all([summaries({}), sectionList(), authorMap()]);
  const authors = [...authorById.values()];
  const latest = all[0]?.updatedAt ?? all[0]?.publishedAt ?? new Date().toISOString();
  const tagLatest = new Map<string, string>();
  for (const s of all) for (const t of s.tags) if (!tagLatest.has(slugify(t))) tagLatest.set(slugify(t), s.publishedAt);
  res.json({
    latest,
    articles: all.map((s) => ({ path: `/articles/${s.slug}`, lastmod: s.updatedAt ?? s.publishedAt, cover: s.cover })),
    sections: sections.map((sec) => ({
      path: `/${sec.slug}`,
      lastmod: all.find((s) => s.section === sec.slug)?.publishedAt ?? latest,
    })),
    authors: authors.map((a) => ({
      path: `/authors/${a.slug}`,
      lastmod: all.find((s) => s.author.slug === a.slug)?.publishedAt ?? latest,
    })),
    tags: [...tagLatest.entries()].map(([slug, lastmod]) => ({ path: `/tags/${slug}`, lastmod })),
  });
});

/* Reader forms */

const formLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 8,
  keyGenerator: (req) => clientIp(req),
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Too many attempts. Wait a few minutes and try again." },
});

const email = z.email({ error: "Enter a full email address, like name@example.com." }).trim().toLowerCase().max(200);

publicRouter.post("/subscribe", formLimiter, async (req, res) => {
  const input = parse(z.object({ email, source: z.string().max(60).optional() }), req.body);
  await Subscriber.updateOne(
    { email: input.email },
    { $set: { status: "active" }, $setOnInsert: { email: input.email, source: input.source ?? "" } },
    { upsert: true },
  );
  res.json({ ok: true });
});

publicRouter.post("/contact", formLimiter, async (req, res) => {
  const input = parse(
    z.object({
      name: z.string().trim().min(1, "Enter your name.").max(120),
      email,
      topic: z.enum(TOPICS).catch("other"),
      message: z.string().trim().min(10, "Write a little more so we can help.").max(8000),
    }),
    req.body,
  );
  await Message.create(input);
  res.json({ ok: true });
});

/* Page views, reported by the frontend server (which filters out bots). */

publicRouter.post("/track", async (req, res) => {
  if (!config.internalKey || req.get("x-internal-key") !== config.internalKey) throw new HttpError(403, "Forbidden");
  const input = parse(z.object({ path: z.string().startsWith("/").max(300) }), req.body);
  const path = input.path.split(/[?#]/)[0].replace(/\/+$/, "") || "/";
  if (path.startsWith("/admin")) {
    res.status(204).end();
    return;
  }
  const match = /^\/articles\/([a-z0-9-]+)$/.exec(path);
  const article = match ? await Article.findOne({ slug: match[1], ...live() }).select("_id").lean() : null;
  if (match && !article) {
    res.status(204).end();
    return;
  }
  await PageView.updateOne(
    { day: dayKey(), path },
    { $inc: { views: 1 }, $setOnInsert: article ? { article: article._id } : {} },
    { upsert: true },
  );
  // timestamps: false, so a read never counts as an edit.
  if (article) await Article.updateOne({ _id: article._id }, { $inc: { views: 1 } }, { timestamps: false });
  res.status(204).end();
});
