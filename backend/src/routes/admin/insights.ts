import { Router } from "express";
import { z } from "zod";
import { intParam, isId, parse } from "../../lib/http";
import { imageMap } from "../../lib/serialize";
import { dayKey } from "../../lib/text";
import { Article, Author, getSettings, Message, PageView, Section, Subscriber } from "../../models";

/* Dashboard statistics */

export const statsRouter = Router();

function dayRange(days: number, endOffset = 0) {
  const out: string[] = [];
  const end = Date.now() - endOffset * 86400000;
  for (let i = days - 1; i >= 0; i--) out.push(dayKey(new Date(end - i * 86400000)));
  return out;
}

statsRouter.get("/", async (req, res) => {
  const days = [7, 30, 90].includes(Number(req.query.days)) ? Number(req.query.days) : 30;
  const range = dayRange(days);
  const previous = dayRange(days, days);
  const from = range[0];
  const fromDate = new Date(`${from}T00:00:00Z`);
  const now = new Date();

  const [
    daily,
    previousTotal,
    topArticles,
    topPages,
    sectionViews,
    published,
    scheduled,
    drafts,
    authors,
    subsActive,
    subsNew,
    subsDaily,
    unread,
    messagesTotal,
    recentMessages,
    recentArticles,
    allTime,
    sections,
  ] = await Promise.all([
    PageView.aggregate<{ _id: string; views: number }>([
      { $match: { day: { $gte: from } } },
      { $group: { _id: "$day", views: { $sum: "$views" } } },
    ]),
    PageView.aggregate<{ views: number }>([
      { $match: { day: { $gte: previous[0], $lte: previous[previous.length - 1] } } },
      { $group: { _id: null, views: { $sum: "$views" } } },
    ]),
    PageView.aggregate<{ _id: unknown; views: number }>([
      { $match: { day: { $gte: from }, article: { $ne: null } } },
      { $group: { _id: "$article", views: { $sum: "$views" } } },
      { $sort: { views: -1 } },
      { $limit: 8 },
    ]),
    PageView.aggregate<{ _id: string; views: number }>([
      { $match: { day: { $gte: from } } },
      { $group: { _id: "$path", views: { $sum: "$views" } } },
      { $sort: { views: -1 } },
      { $limit: 8 },
    ]),
    PageView.aggregate<{ _id: string; views: number }>([
      { $match: { day: { $gte: from }, article: { $ne: null } } },
      { $lookup: { from: "articles", localField: "article", foreignField: "_id", as: "a" } },
      { $unwind: "$a" },
      { $group: { _id: "$a.section", views: { $sum: "$views" } } },
    ]),
    Article.countDocuments({ status: "published", publishedAt: { $lte: now } }),
    Article.countDocuments({ status: "published", publishedAt: { $gt: now } }),
    Article.countDocuments({ status: "draft" }),
    Author.countDocuments(),
    Subscriber.countDocuments({ status: "active" }),
    Subscriber.countDocuments({ status: "active", createdAt: { $gte: fromDate } }),
    Subscriber.aggregate<{ _id: string; n: number }>([
      { $match: { createdAt: { $gte: fromDate } } },
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, n: { $sum: 1 } } },
    ]),
    Message.countDocuments({ read: false }),
    Message.countDocuments(),
    Message.find().sort({ createdAt: -1 }).limit(5).lean(),
    Article.find().sort({ updatedAt: -1 }).limit(6).select("title slug status publishedAt updatedAt section").lean(),
    Article.aggregate<{ views: number }>([{ $group: { _id: null, views: { $sum: "$views" } } }]),
    Section.find().sort({ order: 1 }).lean(),
  ]);

  const byDay = new Map(daily.map((d) => [d._id, d.views]));
  const subsByDay = new Map(subsDaily.map((d) => [d._id, d.n]));
  const periodViews = daily.reduce((sum, d) => sum + d.views, 0);

  const topDocs = await Article.find({ _id: { $in: topArticles.map((t) => t._id) } })
    .select("title slug section cover")
    .lean();
  const images = await imageMap();
  const docById = new Map(topDocs.map((d) => [String(d._id), d]));
  const sectionCounts = await Article.aggregate<{ _id: string; n: number }>([
    { $match: { status: "published", publishedAt: { $lte: now } } },
    { $group: { _id: "$section", n: { $sum: 1 } } },
  ]);
  const countBySection = new Map(sectionCounts.map((s) => [s._id, s.n]));
  const viewsBySection = new Map(sectionViews.map((s) => [s._id, s.views]));
  const statusOf = (a: { status: string; publishedAt?: Date | null }) =>
    a.status !== "published" ? "draft" : a.publishedAt && a.publishedAt > now ? "scheduled" : "published";

  res.json({
    days,
    views: {
      period: periodViews,
      previous: previousTotal[0]?.views ?? 0,
      allTime: allTime[0]?.views ?? 0,
      daily: range.map((day) => ({ day, views: byDay.get(day) ?? 0 })),
    },
    articles: { published, scheduled, drafts },
    authors,
    subscribers: { active: subsActive, new: subsNew, daily: range.map((day) => ({ day, count: subsByDay.get(day) ?? 0 })) },
    messages: { unread, total: messagesTotal },
    topArticles: topArticles.flatMap((t) => {
      const d = docById.get(String(t._id));
      return d ? [{ id: String(d._id), title: d.title, slug: d.slug, section: d.section, views: t.views, cover: (d.cover?.image && images.get(d.cover.image)) || null }] : [];
    }),
    topPages: topPages.map((p) => ({ path: p._id, views: p.views })),
    sections: sections.map((s) => ({
      slug: s.slug,
      name: s.name,
      color: s.color,
      articles: countBySection.get(s.slug) ?? 0,
      views: viewsBySection.get(s.slug) ?? 0,
    })),
    recentMessages: recentMessages.map((m) => ({
      id: String(m._id),
      name: m.name,
      topic: m.topic,
      message: m.message.slice(0, 160),
      read: m.read,
      createdAt: m.createdAt,
    })),
    recentArticles: recentArticles.map((a) => ({
      id: String(a._id),
      title: a.title,
      slug: a.slug,
      section: a.section,
      status: statusOf(a),
      updatedAt: a.updatedAt,
    })),
  });
});

/** Views per day for one story. */
statsRouter.get("/articles/:id", async (req, res) => {
  const days = intParam(req.query.days, 30, 365);
  const range = dayRange(days);
  if (!isId(req.params.id)) {
    res.json({ daily: [] });
    return;
  }
  const rows = await PageView.find({ article: req.params.id, day: { $gte: range[0] } }).lean();
  const byDay = new Map<string, number>();
  for (const r of rows) byDay.set(r.day, (byDay.get(r.day) ?? 0) + r.views);
  res.json({ daily: range.map((day) => ({ day, views: byDay.get(day) ?? 0 })) });
});

/* Home page settings */

export const settingsRouter = Router();

settingsRouter.get("/", async (_req, res) => {
  const s = await getSettings();
  res.json({
    coverStory: s.coverStory ? String(s.coverStory) : "",
    editorsPicks: s.editorsPicks.map(String),
    picksTitle: s.picksTitle,
    picksIntro: s.picksIntro,
  });
});

settingsRouter.put("/", async (req, res) => {
  const input = parse(
    z.object({
      coverStory: z.union([z.literal(""), z.string().refine(isId)]).default(""),
      editorsPicks: z.array(z.string().refine(isId)).max(3, "Choose up to three long reads."),
      picksTitle: z.string().trim().min(1, "Add a title for the band.").max(60),
      picksIntro: z.string().trim().max(400).default(""),
    }),
    req.body,
  );
  const s = await getSettings();
  s.set({
    coverStory: input.coverStory || null,
    editorsPicks: [...new Set(input.editorsPicks)],
    picksTitle: input.picksTitle,
    picksIntro: input.picksIntro,
  });
  await s.save();
  res.json({ ok: true });
});
