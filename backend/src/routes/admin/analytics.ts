import { Router } from "express";
import { dayKey } from "../../lib/text";
import { Article, ConsentDay, Visit } from "../../models";

/*
 * Reader activity report, built from visitors who accepted analytics cookies.
 * Worked out in application code: the data set is small, and it keeps each
 * figure's definition in one readable place.
 */

export const analyticsRouter = Router();

const MAX_VISITS = 100_000;
const FINISHED_DEPTH = 90;

type VisitRow = {
  vid: string;
  sid: string;
  at: Date;
  path: string;
  slug?: string | null;
  referrer?: string | null;
  returning?: boolean | null;
  country?: string | null;
  device?: string | null;
  browser?: string | null;
  os?: string | null;
  activeSeconds?: number | null;
  depth?: number | null;
};

const secs = (v: VisitRow) => v.activeSeconds ?? 0;
const depth = (v: VisitRow) => v.depth ?? 0;
const mean = (total: number, n: number) => (n ? Math.round(total / n) : 0);

/** Counts distinct `id`s per label, largest first. */
function ranked(rows: { label: string; id: string }[], limit = 8) {
  const sets = new Map<string, Set<string>>();
  for (const r of rows) (sets.get(r.label) ?? sets.set(r.label, new Set()).get(r.label)!).add(r.id);
  return [...sets.entries()]
    .map(([label, ids]) => ({ label, count: ids.size }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

analyticsRouter.get("/", async (req, res) => {
  const days = [7, 30, 90].includes(Number(req.query.days)) ? Number(req.query.days) : 30;
  const dayList = Array.from({ length: days }, (_, i) => dayKey(new Date(Date.now() - (days - 1 - i) * 86400000)));
  const from = new Date(`${dayList[0]}T00:00:00Z`);

  const [visits, articles, consentDays] = await Promise.all([
    Visit.find({ at: { $gte: from } }).sort({ at: -1 }).limit(MAX_VISITS).select("-_id -pv -__v").lean() as unknown as Promise<VisitRow[]>,
    Article.find().select("slug title section tags readingMinutes").lean(),
    ConsentDay.find({ day: { $gte: dayList[0] } }).lean(),
  ]);

  const articleBySlug = new Map(articles.map((a) => [a.slug, a]));
  const stories = visits.filter((v) => v.slug && articleBySlug.has(v.slug));
  const pages = visits.filter((v) => !v.slug);

  /* Sessions */
  const sessions = new Map<string, VisitRow[]>();
  for (const v of visits) (sessions.get(v.sid) ?? sessions.set(v.sid, []).get(v.sid)!).push(v);
  // Visits arrive newest first, so a session's last element is where it began.
  const firstOf = (s: VisitRow[]) => s[s.length - 1];
  const totalSeconds = visits.reduce((sum, v) => sum + secs(v), 0);
  const visitors = new Set(visits.map((v) => v.vid));
  const newVisitors = new Set(visits.filter((v) => !v.returning).map((v) => v.vid));

  /* Per day */
  const perDay = new Map<string, Set<string>>();
  const viewsPerDay = new Map<string, number>();
  for (const v of visits) {
    const day = dayKey(v.at);
    (perDay.get(day) ?? perDay.set(day, new Set()).get(day)!).add(v.vid);
    viewsPerDay.set(day, (viewsPerDay.get(day) ?? 0) + 1);
  }

  /* Stories */
  const byStory = new Map<string, VisitRow[]>();
  for (const v of stories) (byStory.get(v.slug!) ?? byStory.set(v.slug!, []).get(v.slug!)!).push(v);
  const storyRows = [...byStory.entries()]
    .map(([slug, rows]) => {
      const a = articleBySlug.get(slug)!;
      const total = rows.reduce((s, v) => s + secs(v), 0);
      const avg = mean(total, rows.length);
      return {
        slug,
        title: a.title,
        section: a.section,
        views: rows.length,
        readers: new Set(rows.map((v) => v.vid)).size,
        totalSeconds: total,
        avgSeconds: avg,
        avgDepth: mean(rows.reduce((s, v) => s + depth(v), 0), rows.length),
        finishedPercent: mean(rows.filter((v) => depth(v) >= FINISHED_DEPTH).length * 100, rows.length),
        // How much of the estimated reading time the average reader spent.
        readTimePercent: Math.min(100, mean(avg * 100, a.readingMinutes * 60)),
      };
    })
    .sort((a, b) => b.totalSeconds - a.totalSeconds);

  /* Attention by section and topic */
  const sectionTotals = new Map<string, number>();
  const tagTotals = new Map<string, number>();
  for (const v of stories) {
    const a = articleBySlug.get(v.slug!)!;
    sectionTotals.set(a.section, (sectionTotals.get(a.section) ?? 0) + secs(v));
    for (const t of a.tags) tagTotals.set(t, (tagTotals.get(t) ?? 0) + secs(v));
  }
  const toRanked = (m: Map<string, number>, limit: number) =>
    [...m.entries()].map(([label, seconds]) => ({ label, seconds })).sort((a, b) => b.seconds - a.seconds).slice(0, limit);

  /* Other pages */
  const byPage = new Map<string, VisitRow[]>();
  for (const v of pages) (byPage.get(v.path) ?? byPage.set(v.path, []).get(v.path)!).push(v);
  const pageRows = [...byPage.entries()]
    .map(([path, rows]) => ({ path, views: rows.length, avgSeconds: mean(rows.reduce((s, v) => s + secs(v), 0), rows.length) }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 10);

  /* How far readers get into stories */
  const reach = [25, 50, 75, 100].map((mark) => ({
    mark,
    percent: mean(stories.filter((v) => depth(v) >= (mark === 100 ? FINISHED_DEPTH : mark)).length * 100, stories.length),
  }));

  /* Recent sessions, newest first */
  const titleOf = (v: VisitRow) => (v.slug ? articleBySlug.get(v.slug)?.title : null) ?? v.path;
  const recent = [...sessions.values()].slice(0, 20).map((s) => {
    const start = firstOf(s);
    return {
      id: start.sid.slice(0, 8),
      at: start.at,
      country: start.country ?? "",
      device: start.device ?? "",
      source: start.referrer || "Direct",
      seconds: s.reduce((sum, v) => sum + secs(v), 0),
      pages: [...s].reverse().map((v) => ({ path: v.path, title: titleOf(v), seconds: secs(v), depth: depth(v) })),
    };
  });

  const sessionFirsts = [...sessions.values()].map(firstOf);
  const consent = consentDays.reduce(
    (t, d) => ({ accept: t.accept + (d.accept ?? 0), essential: t.essential + (d.essential ?? 0), reject: t.reject + (d.reject ?? 0) }),
    { accept: 0, essential: 0, reject: 0 },
  );

  res.json({
    days,
    truncated: visits.length >= MAX_VISITS,
    totals: {
      visitors: visitors.size,
      newVisitors: newVisitors.size,
      returningVisitors: visitors.size - newVisitors.size,
      sessions: sessions.size,
      views: visits.length,
      totalSeconds,
      avgSessionSeconds: mean(totalSeconds, sessions.size),
      pagesPerSession: sessions.size ? Math.round((visits.length / sessions.size) * 10) / 10 : 0,
      storyViews: stories.length,
      avgStorySeconds: mean(stories.reduce((s, v) => s + secs(v), 0), stories.length),
      avgStoryDepth: mean(stories.reduce((s, v) => s + depth(v), 0), stories.length),
    },
    daily: dayList.map((day) => ({ day, visitors: perDay.get(day)?.size ?? 0, views: viewsPerDay.get(day) ?? 0 })),
    stories: storyRows.slice(0, 20),
    sections: toRanked(sectionTotals, 12),
    topics: toRanked(tagTotals, 10),
    pages: pageRows,
    reach,
    sources: ranked(sessionFirsts.map((v) => ({ label: v.referrer || "Direct", id: v.sid }))),
    countries: ranked(visits.filter((v) => v.country).map((v) => ({ label: v.country!, id: v.vid }))),
    devices: ranked(visits.filter((v) => v.device).map((v) => ({ label: v.device!, id: v.vid })), 4),
    browsers: ranked(visits.filter((v) => v.browser).map((v) => ({ label: v.browser!, id: v.vid })), 6),
    recent,
    consent,
  });
});
