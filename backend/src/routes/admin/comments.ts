import { Router } from "express";
import { z } from "zod";
import { intParam, isId, notFound, parse } from "../../lib/http";
import { Comment, COMMENT_STATUSES } from "../../models";

/* Moderation queue for reader comments. */

export const commentsRouter = Router();

commentsRouter.get("/", async (req, res) => {
  const page = intParam(req.query.page, 1, 10000);
  const size = intParam(req.query.limit, 30, 100);
  const asked = req.query.status as (typeof COMMENT_STATUSES)[number];
  const status = COMMENT_STATUSES.includes(asked) ? asked : "pending";
  const [docs, total, pending, approved, rejected] = await Promise.all([
    Comment.find({ status })
      .sort({ createdAt: -1 })
      .skip((page - 1) * size)
      .limit(size)
      .populate("article", "title slug")
      .lean(),
    Comment.countDocuments({ status }),
    Comment.countDocuments({ status: "pending" }),
    Comment.countDocuments({ status: "approved" }),
    Comment.countDocuments({ status: "rejected" }),
  ]);
  res.json({
    items: docs.map((c) => {
      const article = c.article as unknown as { title: string; slug: string } | null;
      return {
        id: String(c._id),
        name: c.name,
        email: c.email,
        body: c.body,
        status: c.status,
        createdAt: c.createdAt,
        article: article ? { title: article.title, slug: article.slug } : null,
      };
    }),
    page,
    total,
    totalPages: Math.max(1, Math.ceil(total / size)),
    counts: { pending, approved, rejected },
  });
});

commentsRouter.put("/:id", async (req, res) => {
  if (!isId(req.params.id)) throw notFound();
  const { status } = parse(z.object({ status: z.enum(COMMENT_STATUSES) }), req.body);
  const doc = await Comment.findByIdAndUpdate(req.params.id, { status }, { returnDocument: "after" });
  if (!doc) throw notFound("That comment no longer exists.");
  res.json({ ok: true });
});

commentsRouter.delete("/:id", async (req, res) => {
  if (!isId(req.params.id)) throw notFound();
  await Comment.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});
