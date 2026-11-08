import { Router } from "express";
import { z } from "zod";
import { blockSchema, pictureSchema, type Block } from "../../lib/blocks";
import { escapeRegex, HttpError, intParam, isId, notFound, parse } from "../../lib/http";
import { imageMap } from "../../lib/serialize";
import { countWords, readingMinutes, slugify } from "../../lib/text";
import { Article, Author, FORMATS, Image, PageView, Section, Settings } from "../../models";

export const articlesRouter = Router();

type Status = "draft" | "scheduled" | "published";

export function statusOf(a: { status: string; publishedAt?: Date | null }): Status {
  if (a.status !== "published") return "draft";
  return a.publishedAt && a.publishedAt.getTime() > Date.now() ? "scheduled" : "published";
}

function statusFilter(status: unknown) {
  const now = new Date();
  if (status === "draft") return { status: "draft" };
  if (status === "scheduled") return { status: "published", publishedAt: { $gt: now } };
  if (status === "published") return { status: "published", publishedAt: { $lte: now } };
  return {};
}

/* List */

articlesRouter.get("/", async (req, res) => {
  const page = intParam(req.query.page, 1, 10000);
  const size = intParam(req.query.limit, 20, 100);
  const filter: Record<string, unknown> = { ...statusFilter(req.query.status) };
  if (typeof req.query.section === "string" && req.query.section) filter.section = req.query.section;
  if (isId(req.query.author)) filter.author = req.query.author;
  if (typeof req.query.q === "string" && req.query.q.trim()) {
    const rx = new RegExp(escapeRegex(req.query.q.trim()), "i");
    filter.$or = [{ title: rx }, { dek: rx }, { slug: rx }, { tags: rx }];
  }

  const now = new Date();
  const [docs, total, images, all, drafts, scheduled] = await Promise.all([
    Article.find(filter)
      .select("slug title section format status publishedAt revisedAt updatedAt views cover author readingMinutes")
      .sort({ updatedAt: -1 })
      .skip((page - 1) * size)
      .limit(size)
      .populate("author", "name slug")
      .lean(),
    Article.countDocuments(filter),
    imageMap(),
    Article.countDocuments(),
    Article.countDocuments({ status: "draft" }),
    Article.countDocuments({ status: "published", publishedAt: { $gt: now } }),
  ]);

  res.json({
    items: docs.map((d) => ({
      id: String(d._id),
      slug: d.slug,
      title: d.title,
      section: d.section,
      format: d.format,
      status: statusOf(d),
      publishedAt: d.publishedAt,
      updatedAt: d.updatedAt,
      views: d.views,
      readingMinutes: d.readingMinutes,
      author: d.author ? { name: (d.author as unknown as { name: string }).name } : null,
      cover: (d.cover?.image && images.get(d.cover.image)) || null,
    })),
    page,
    total,
    totalPages: Math.max(1, Math.ceil(total / size)),
    counts: { all, draft: drafts, scheduled, published: all - drafts - scheduled },
  });
});

/** Every tag in use, for the editor's suggestions. */
articlesRouter.get("/tags", async (_req, res) => {
  const rows = await Article.aggregate<{ _id: string; count: number }>([
    { $unwind: "$tags" },
    { $group: { _id: "$tags", count: { $sum: 1 } } },
    { $sort: { count: -1, _id: 1 } },
  ]);
  res.json(rows.map((r) => ({ name: r._id, count: r.count })));
});

/* Read one */

articlesRouter.get("/:id", async (req, res) => {
  if (!isId(req.params.id)) throw notFound();
  const d = await Article.findById(req.params.id).lean();
  if (!d) throw notFound("That story no longer exists.");
  const images = await imageMap();
  res.json({
    article: {
      id: String(d._id),
      slug: d.slug,
      title: d.title,
      dek: d.dek,
      seoDescription: d.seoDescription ?? "",
      section: d.section,
      format: d.format,
      author: String(d.author),
      status: statusOf(d),
      publishedAt: d.publishedAt,
      revisedAt: d.revisedAt ?? null,
      cover: d.cover,
      tags: d.tags,
      body: d.body,
      views: d.views,
      wordCount: d.wordCount,
      readingMinutes: d.readingMinutes,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
    },
    images: Object.fromEntries(d.imageKeys.map((k) => [k, images.get(k) ?? null])),
  });
});

/* Create and update */

/**
 * A draft needs only a headline, so writers can save early and often.
 * Publishing (or scheduling) requires everything readers will see.
 */
const articleInput = z
  .object({
    title: z.string().trim().min(1, "Add a headline.").max(200, "Keep the headline under 200 characters."),
    slug: z.string().trim().max(120).optional(),
    dek: z.string().trim().max(600, "Keep the standfirst under 600 characters.").default(""),
    seoDescription: z.string().trim().max(200, "Keep the search description under 200 characters.").optional(),
    section: z.string().trim().min(1, "Choose a section."),
    format: z.enum(FORMATS, { error: "Choose a format." }),
    author: z.string().refine(isId, "Choose an author."),
    status: z.enum(["draft", "published"]),
    /** Empty means "now" when publishing. */
    publishedAt: z.union([z.literal(""), z.coerce.date({ error: "Enter a valid date." })]).optional(),
    /** "now" marks the story as updated today; "clear" removes the updated date. */
    revised: z.enum(["keep", "now", "clear"]).default("keep"),
    cover: z
      .object({
        image: z.string().trim().default(""),
        alt: z.string().trim().max(400, "Keep the alt text under 400 characters.").default(""),
        caption: pictureSchema.shape.caption,
      })
      .default({ image: "", alt: "", caption: undefined }),
    tags: z.array(z.string().trim().min(1).max(60)).max(12, "Use 12 topics or fewer.").default([]),
    body: z.array(blockSchema).default([]),
  })
  .superRefine((a, ctx) => {
    if (a.status !== "published") return;
    for (const [path, message] of missingForPublish(a)) ctx.addIssue({ code: "custom", path, message });
  });

type ArticleInput = z.infer<typeof articleInput>;

/** What a story still needs before readers can see it. */
function missingForPublish(a: { dek?: string | null; cover?: { image?: string | null; alt?: string | null } | null; body?: unknown[] | null }) {
  const missing: [string[], string][] = [];
  if (!a.dek?.trim()) missing.push([["dek"], "Add a standfirst before publishing."]);
  if (!a.cover?.image) missing.push([["cover", "image"], "Choose a cover image before publishing."]);
  if (!a.cover?.alt?.trim()) missing.push([["cover", "alt"], "Describe the cover image for readers who cannot see it."]);
  if (!a.body?.length) missing.push([["body"], "Write at least one paragraph before publishing."]);
  return missing;
}

function imageKeysOf(cover: { image: string }, body: Block[]) {
  const keys = [cover.image, ...body.flatMap((b) => (b.type === "figure" ? [b.picture.image] : []))];
  return [...new Set(keys.filter(Boolean))];
}

async function prepare(input: ArticleInput, existing?: InstanceType<typeof Article>) {
  const fields: Record<string, string> = {};

  const slug = slugify(input.slug || input.title);
  if (!slug) fields.slug = "Use letters or numbers in the URL.";
  else if (await Article.exists({ slug, _id: { $ne: existing?._id } })) fields.slug = "Another story already uses this URL.";

  const [section, author] = await Promise.all([Section.exists({ slug: input.section }), Author.exists({ _id: input.author })]);
  if (!section) fields.section = "That section does not exist.";
  if (!author) fields.author = "That author does not exist.";

  const imageKeys = imageKeysOf(input.cover, input.body);
  const known = new Set((await Image.find({ key: { $in: imageKeys } }).select("key").lean()).map((i) => i.key));
  if (input.cover.image && !known.has(input.cover.image)) fields["cover.image"] = "That cover image no longer exists. Choose another.";
  input.body.forEach((b, i) => {
    if (b.type === "figure" && !known.has(b.picture.image)) fields[`body.${i}.picture.image`] = "Choose an image for this figure.";
  });

  if (Object.keys(fields).length) throw new HttpError(400, "Some fields need attention.", fields);

  // Tags: keep the first spelling of each, drop duplicates.
  const seen = new Set<string>();
  const tags = input.tags.filter((t) => {
    const s = slugify(t);
    if (!s || seen.has(s)) return false;
    seen.add(s);
    return true;
  });

  const wasLive = existing?.status === "published";
  let publishedAt: Date;
  if (input.publishedAt) publishedAt = input.publishedAt;
  else if (input.status === "published" && !wasLive) publishedAt = new Date();
  else publishedAt = existing?.publishedAt ?? new Date();

  let revisedAt = existing?.revisedAt ?? undefined;
  if (input.revised === "now") revisedAt = new Date();
  if (input.revised === "clear") revisedAt = undefined;

  const wordCount = countWords(input.body);
  return {
    slug,
    title: input.title,
    dek: input.dek,
    seoDescription: input.seoDescription || undefined,
    section: input.section,
    format: input.format,
    author: input.author,
    status: input.status,
    publishedAt,
    revisedAt,
    cover: input.cover,
    tags,
    tagSlugs: [...seen],
    body: input.body,
    imageKeys,
    wordCount,
    readingMinutes: readingMinutes(wordCount),
  };
}

articlesRouter.post("/", async (req, res) => {
  const data = await prepare(parse(articleInput, req.body));
  const doc = await Article.create({ ...data, createdBy: req.user!.id, updatedBy: req.user!.id });
  res.status(201).json({ id: String(doc._id), slug: doc.slug, status: statusOf(doc) });
});

articlesRouter.put("/:id", async (req, res) => {
  if (!isId(req.params.id)) throw notFound();
  const doc = await Article.findById(req.params.id);
  if (!doc) throw notFound("That story no longer exists.");
  const data = await prepare(parse(articleInput, req.body), doc);
  doc.set({ ...data, updatedBy: req.user!.id });
  if (!data.revisedAt) doc.set("revisedAt", undefined);
  if (!data.seoDescription) doc.set("seoDescription", undefined);
  await doc.save();
  res.json({ id: String(doc._id), slug: doc.slug, status: statusOf(doc) });
});

/** Quick status change from the list: publish now, or move back to drafts. */
articlesRouter.post("/:id/status", async (req, res) => {
  if (!isId(req.params.id)) throw notFound();
  const { status } = parse(z.object({ status: z.enum(["draft", "published"]) }), req.body);
  const doc = await Article.findById(req.params.id);
  if (!doc) throw notFound("That story no longer exists.");
  if (status === "published") {
    const missing = missingForPublish(doc);
    if (missing.length) {
      throw new HttpError(400, `This draft is not ready: ${missing.map(([, m]) => m.replace(/ before publishing\.$/, "").replace(/\.$/, "").toLowerCase()).join("; ")}. Open it in the editor to finish it.`);
    }
    if (doc.status !== "published") doc.publishedAt = new Date();
  }
  doc.status = status;
  doc.set("updatedBy", req.user!.id);
  await doc.save();
  res.json({ id: String(doc._id), slug: doc.slug, status: statusOf(doc) });
});

articlesRouter.delete("/:id", async (req, res) => {
  if (!isId(req.params.id)) throw notFound();
  const doc = await Article.findByIdAndDelete(req.params.id);
  if (!doc) throw notFound("That story no longer exists.");
  await Promise.all([
    Settings.updateMany({}, { $pull: { editorsPicks: doc._id } }),
    Settings.updateMany({ coverStory: doc._id }, { $set: { coverStory: null } }),
    PageView.updateMany({ article: doc._id }, { $unset: { article: 1 } }),
  ]);
  res.json({ ok: true });
});
