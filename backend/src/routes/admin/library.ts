import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { escapeRegex, HttpError, intParam, isId, notFound, parse } from "../../lib/http";
import { deleteUploadFiles, processUpload } from "../../lib/media";
import { authorOut, invalidateAuthors, invalidateImages, invalidateSections, sectionOut, toImageRef } from "../../lib/serialize";
import { slugify } from "../../lib/text";
import { Article, Author, Image, Section } from "../../models";

/* Authors */

export const authorsRouter = Router();

const authorInput = z.object({
  name: z.string().trim().min(1, "Add a name.").max(120),
  slug: z.string().trim().max(80).optional(),
  role: z.string().trim().min(1, "Add a role, like Contributing writer.").max(120),
  shortBio: z.string().trim().min(1, "Add a one-line bio.").max(300),
  bio: z.array(z.string().trim().min(1).max(2000)).max(10).default([]),
  location: z.string().trim().max(120).default(""),
  expertise: z.array(z.string().trim().min(1).max(80)).max(12).default([]),
  links: z
    .array(z.object({ label: z.string().trim().min(1).max(60), href: z.url({ error: "Links must be full URLs." }) }))
    .max(8)
    .default([]),
});

authorsRouter.get("/", async (_req, res) => {
  const [authors, counts] = await Promise.all([
    Author.find().sort({ name: 1 }).lean(),
    Article.aggregate<{ _id: unknown; n: number }>([{ $group: { _id: "$author", n: { $sum: 1 } } }]),
  ]);
  const byId = new Map(counts.map((c) => [String(c._id), c.n]));
  res.json(authors.map((a) => ({ id: String(a._id), ...authorOut(a), articleCount: byId.get(String(a._id)) ?? 0 })));
});

authorsRouter.get("/:id", async (req, res) => {
  if (!isId(req.params.id)) throw notFound();
  const a = await Author.findById(req.params.id).lean();
  if (!a) throw notFound("That author no longer exists.");
  res.json({ id: String(a._id), ...authorOut(a) });
});

async function authorData(input: z.infer<typeof authorInput>, id?: unknown) {
  const slug = slugify(input.slug || input.name);
  if (!slug) throw new HttpError(400, "Some fields need attention.", { slug: "Use letters or numbers in the URL." });
  if (await Author.exists({ slug, _id: { $ne: id } })) {
    throw new HttpError(409, "Some fields need attention.", { slug: "Another author already uses this URL." });
  }
  return { ...input, slug };
}

authorsRouter.post("/", async (req, res) => {
  const a = await Author.create(await authorData(parse(authorInput, req.body)));
  invalidateAuthors();
  res.status(201).json({ id: String(a._id), slug: a.slug });
});

authorsRouter.put("/:id", async (req, res) => {
  if (!isId(req.params.id)) throw notFound();
  const a = await Author.findById(req.params.id);
  if (!a) throw notFound("That author no longer exists.");
  a.set(await authorData(parse(authorInput, req.body), a._id));
  await a.save();
  invalidateAuthors();
  res.json({ id: String(a._id), slug: a.slug });
});

authorsRouter.delete("/:id", async (req, res) => {
  if (!isId(req.params.id)) throw notFound();
  const n = await Article.countDocuments({ author: req.params.id });
  if (n) throw new HttpError(409, `This author has ${n} ${n === 1 ? "story" : "stories"}. Move them to another author first.`);
  await Author.findByIdAndDelete(req.params.id);
  invalidateAuthors();
  res.json({ ok: true });
});

/* Sections */

export const sectionsRouter = Router();

const sectionInput = z.object({
  name: z.string().trim().min(1, "Add a name.").max(60),
  slug: z.string().trim().max(40).optional(),
  description: z.string().trim().min(1, "Add a description.").max(400),
  line: z.object({
    label: z.string().trim().min(1, "Name the emission line.").max(60),
    nm: z.coerce.number({ error: "Enter a wavelength in nanometers." }).min(100).max(2000),
  }),
  color: z
    .string()
    .trim()
    .regex(/^(#[0-9a-fA-F]{6})?$/, "Use a hex color like #4d7cc7.")
    .default(""),
  order: z.coerce.number().int().min(0).max(999).default(0),
});

// Top-level URLs that a section slug must not take over.
const RESERVED = new Set(["articles", "authors", "tags", "search", "about", "contact", "newsletter", "contribute", "editorial-standards", "privacy", "terms", "cookies", "admin", "api", "images", "media", "sitemap-xml", "rss-xml", "robots-txt"]);

sectionsRouter.get("/", async (_req, res) => {
  const [sections, counts] = await Promise.all([
    Section.find().sort({ order: 1, name: 1 }).lean(),
    Article.aggregate<{ _id: string; n: number }>([{ $group: { _id: "$section", n: { $sum: 1 } } }]),
  ]);
  const bySlug = new Map(counts.map((c) => [c._id, c.n]));
  res.json(sections.map((s) => ({ id: String(s._id), ...sectionOut(s), order: s.order, articleCount: bySlug.get(s.slug) ?? 0 })));
});

sectionsRouter.post("/", async (req, res) => {
  const input = parse(sectionInput, req.body);
  const slug = slugify(input.slug || input.name);
  if (!slug || RESERVED.has(slug)) throw new HttpError(400, "Some fields need attention.", { slug: "Choose a different URL." });
  if (await Section.exists({ slug })) throw new HttpError(409, "Some fields need attention.", { slug: "Another section uses this URL." });
  const s = await Section.create({ ...input, slug });
  invalidateSections();
  res.status(201).json({ id: String(s._id), slug: s.slug });
});

/** The slug is fixed once created: stories and links refer to it. */
sectionsRouter.put("/:id", async (req, res) => {
  if (!isId(req.params.id)) throw notFound();
  const s = await Section.findById(req.params.id);
  if (!s) throw notFound("That section no longer exists.");
  const { slug: _ignored, ...input } = parse(sectionInput, req.body);
  s.set(input);
  await s.save();
  invalidateSections();
  res.json({ id: String(s._id), slug: s.slug });
});

sectionsRouter.delete("/:id", async (req, res) => {
  if (!isId(req.params.id)) throw notFound();
  const s = await Section.findById(req.params.id);
  if (!s) throw notFound("That section no longer exists.");
  const n = await Article.countDocuments({ section: s.slug });
  if (n) throw new HttpError(409, `This section has ${n} ${n === 1 ? "story" : "stories"}. Move them to another section first.`);
  await s.deleteOne();
  invalidateSections();
  res.json({ ok: true });
});

/* Images */

export const imagesRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => cb(null, /^image\//.test(file.mimetype)),
});

const imageMeta = z.object({
  credit: z.string().trim().min(1, "Credit the photographer or source.").max(300),
  license: z.string().trim().min(1, "Name the license, like Public domain or CC BY 4.0.").max(120),
  source: z.union([z.literal(""), z.url({ error: "Use a full URL, or leave it empty." })]).default(""),
});

imagesRouter.get("/", async (req, res) => {
  const page = intParam(req.query.page, 1, 10000);
  const size = intParam(req.query.limit, 24, 100);
  const filter: Record<string, unknown> = {};
  if (typeof req.query.q === "string" && req.query.q.trim()) {
    const rx = new RegExp(escapeRegex(req.query.q.trim()), "i");
    filter.$or = [{ key: rx }, { credit: rx }, { originalName: rx }];
  }
  const [docs, total] = await Promise.all([
    Image.find(filter).sort({ createdAt: -1 }).skip((page - 1) * size).limit(size).lean(),
    Image.countDocuments(filter),
  ]);
  const usage = await Article.aggregate<{ _id: string; n: number }>([
    { $match: { imageKeys: { $in: docs.map((d) => d.key) } } },
    { $unwind: "$imageKeys" },
    { $group: { _id: "$imageKeys", n: { $sum: 1 } } },
  ]);
  const used = new Map(usage.map((u) => [u._id, u.n]));
  res.json({
    items: docs.map((d) => ({
      id: String(d._id),
      ...toImageRef(d),
      storage: d.storage,
      originalName: d.originalName,
      bytes: d.bytes,
      createdAt: d.createdAt,
      usedBy: used.get(d.key) ?? 0,
    })),
    page,
    total,
    totalPages: Math.max(1, Math.ceil(total / size)),
  });
});

imagesRouter.post("/", upload.single("file"), async (req, res) => {
  if (!req.file) throw new HttpError(400, "Choose an image file to upload.", { file: "Choose an image file." });
  const meta = parse(imageMeta, req.body);
  const processed = await processUpload(req.file.buffer, req.file.originalname);
  const doc = await Image.create({
    ...meta,
    key: processed.key,
    aspect: processed.aspect,
    widths: processed.widths,
    og: true,
    storage: "upload",
    originalName: req.file.originalname,
    bytes: processed.bytes,
    createdBy: req.user!.id,
  });
  invalidateImages();
  res.status(201).json({ id: String(doc._id), ...toImageRef(doc) });
});

imagesRouter.put("/:id", async (req, res) => {
  if (!isId(req.params.id)) throw notFound();
  const doc = await Image.findByIdAndUpdate(req.params.id, parse(imageMeta, req.body), { new: true });
  if (!doc) throw notFound("That image no longer exists.");
  invalidateImages();
  res.json({ id: String(doc._id), ...toImageRef(doc) });
});

imagesRouter.delete("/:id", async (req, res) => {
  if (!isId(req.params.id)) throw notFound();
  const doc = await Image.findById(req.params.id);
  if (!doc) throw notFound("That image no longer exists.");
  const n = await Article.countDocuments({ imageKeys: doc.key });
  if (n) throw new HttpError(409, `This image is used in ${n} ${n === 1 ? "story" : "stories"}. Replace it there first.`);
  await doc.deleteOne();
  if (doc.storage === "upload") await deleteUploadFiles(doc.key, doc.widths);
  invalidateImages();
  res.json({ ok: true });
});
