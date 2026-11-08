import { Router, type Response } from "express";
import { indexStatus, SEARCH_TYPES, SearchConsoleError, searchReport, type SearchType } from "../../lib/search-console";
import { Article } from "../../models";

/* Google Search Console, for the admin panel. Read-only. */

export const searchConsoleRouter = Router();

// A setup problem is something to show on the page, not a failed request.
async function respond(res: Response, work: () => Promise<unknown>) {
  try {
    res.json(await work());
  } catch (err) {
    if (!(err instanceof SearchConsoleError)) throw err;
    res.json({ status: "error", message: err.message });
  }
}

searchConsoleRouter.get("/", async (req, res) => {
  const days = [7, 30, 90].includes(Number(req.query.days)) ? Number(req.query.days) : 30;
  const type = SEARCH_TYPES.includes(req.query.type as SearchType) ? (req.query.type as SearchType) : "web";
  await respond(res, () => searchReport(days, type));
});

searchConsoleRouter.get("/index-status", async (_req, res) => {
  await respond(res, () =>
    indexStatus(async () => {
      const stories = await Article.find({ status: "published", publishedAt: { $lte: new Date() } })
        .sort({ publishedAt: -1 })
        .limit(60)
        .select("slug title")
        .lean();
      return [{ path: "/", title: "Home page" }, ...stories.map((s) => ({ path: `/articles/${s.slug}`, title: s.title }))];
    }),
  );
});
