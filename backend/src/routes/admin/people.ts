import { Router } from "express";
import { z } from "zod";
import { hashPassword, requireRole } from "../../lib/auth";
import { escapeRegex, HttpError, intParam, isId, notFound, parse } from "../../lib/http";
import { Message, ROLES, Subscriber, User } from "../../models";
import { passwordRule } from "../auth";

/* Newsletter subscribers */

export const subscribersRouter = Router();

function subscriberFilter(q: unknown, status: unknown) {
  const filter: Record<string, unknown> = {};
  if (status === "active" || status === "unsubscribed") filter.status = status;
  if (typeof q === "string" && q.trim()) filter.email = new RegExp(escapeRegex(q.trim()), "i");
  return filter;
}

subscribersRouter.get("/", async (req, res) => {
  const page = intParam(req.query.page, 1, 10000);
  const size = intParam(req.query.limit, 50, 200);
  const filter = subscriberFilter(req.query.q, req.query.status);
  const [docs, total, active, unsubscribed] = await Promise.all([
    Subscriber.find(filter).sort({ createdAt: -1 }).skip((page - 1) * size).limit(size).lean(),
    Subscriber.countDocuments(filter),
    Subscriber.countDocuments({ status: "active" }),
    Subscriber.countDocuments({ status: "unsubscribed" }),
  ]);
  res.json({
    items: docs.map((d) => ({ id: String(d._id), email: d.email, status: d.status, source: d.source, createdAt: d.createdAt })),
    page,
    total,
    totalPages: Math.max(1, Math.ceil(total / size)),
    counts: { active, unsubscribed },
  });
});

subscribersRouter.get("/export.csv", async (req, res) => {
  const docs = await Subscriber.find(subscriberFilter(req.query.q, req.query.status)).sort({ createdAt: 1 }).lean();
  const cell = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const rows = ["email,status,source,subscribed_at", ...docs.map((d) => [d.email, d.status, d.source ?? "", d.createdAt.toISOString()].map(cell).join(","))];
  res.type("text/csv").attachment("subscribers.csv").send(rows.join("\n"));
});

subscribersRouter.put("/:id", async (req, res) => {
  if (!isId(req.params.id)) throw notFound();
  const { status } = parse(z.object({ status: z.enum(["active", "unsubscribed"]) }), req.body);
  const doc = await Subscriber.findByIdAndUpdate(req.params.id, { status }, { returnDocument: "after" });
  if (!doc) throw notFound();
  res.json({ ok: true });
});

subscribersRouter.delete("/:id", async (req, res) => {
  if (!isId(req.params.id)) throw notFound();
  await Subscriber.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

/* Contact messages */

export const messagesRouter = Router();

messagesRouter.get("/", async (req, res) => {
  const page = intParam(req.query.page, 1, 10000);
  const size = intParam(req.query.limit, 30, 100);
  const filter: Record<string, unknown> = {};
  if (req.query.filter === "unread") filter.read = false;
  if (typeof req.query.topic === "string" && req.query.topic) filter.topic = req.query.topic;
  const [docs, total, unread] = await Promise.all([
    Message.find(filter).sort({ createdAt: -1 }).skip((page - 1) * size).limit(size).lean(),
    Message.countDocuments(filter),
    Message.countDocuments({ read: false }),
  ]);
  res.json({
    items: docs.map((d) => ({
      id: String(d._id),
      name: d.name,
      email: d.email,
      topic: d.topic,
      message: d.message,
      read: d.read,
      createdAt: d.createdAt,
    })),
    page,
    total,
    totalPages: Math.max(1, Math.ceil(total / size)),
    unread,
  });
});

messagesRouter.put("/:id", async (req, res) => {
  if (!isId(req.params.id)) throw notFound();
  const { read } = parse(z.object({ read: z.boolean() }), req.body);
  const doc = await Message.findByIdAndUpdate(req.params.id, { read }, { returnDocument: "after" });
  if (!doc) throw notFound();
  res.json({ ok: true });
});

messagesRouter.delete("/:id", async (req, res) => {
  if (!isId(req.params.id)) throw notFound();
  await Message.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

/* Admin panel accounts (administrators only) */

export const usersRouter = Router();
usersRouter.use(requireRole("admin"));

const userOut = (u: { _id: unknown; name: string; email: string; role: string; active: boolean; lastLoginAt?: Date | null; createdAt?: Date }) => ({
  id: String(u._id),
  name: u.name,
  email: u.email,
  role: u.role,
  active: u.active,
  lastLoginAt: u.lastLoginAt ?? null,
  createdAt: u.createdAt,
});

usersRouter.get("/", async (_req, res) => {
  const users = await User.find().sort({ createdAt: 1 }).lean();
  res.json(users.map(userOut));
});

const userBase = {
  name: z.string().trim().min(1, "Add a name.").max(120),
  email: z.email({ error: "Enter a valid email." }).trim().toLowerCase(),
  role: z.enum(ROLES),
};

usersRouter.post("/", async (req, res) => {
  const input = parse(z.object({ ...userBase, password: passwordRule }), req.body);
  const user = await User.create({ name: input.name, email: input.email, role: input.role, passwordHash: await hashPassword(input.password) });
  res.status(201).json(userOut(user));
});

/** Changing the role, turning an account off or resetting its password signs it out everywhere. */
usersRouter.put("/:id", async (req, res) => {
  if (!isId(req.params.id)) throw notFound();
  const input = parse(
    z.object({ ...userBase, active: z.boolean(), password: z.union([z.literal(""), passwordRule]).default("") }),
    req.body,
  );
  const user = await User.findById(req.params.id);
  if (!user) throw notFound("That account no longer exists.");

  const self = String(user._id) === req.user!.id;
  if (self && (!input.active || input.role !== "admin")) {
    throw new HttpError(400, "You cannot turn off or demote your own account.");
  }
  if (user.role === "admin" && (input.role !== "admin" || !input.active)) await ensureAnotherAdmin(user._id);

  const signOut = input.role !== user.role || input.active !== user.active || Boolean(input.password);
  user.set({ name: input.name, email: input.email, role: input.role, active: input.active });
  if (input.password) user.passwordHash = await hashPassword(input.password);
  if (signOut) user.tokenVersion += 1;
  await user.save();
  res.json(userOut(user));
});

usersRouter.delete("/:id", async (req, res) => {
  if (!isId(req.params.id)) throw notFound();
  if (req.params.id === req.user!.id) throw new HttpError(400, "You cannot delete your own account.");
  const user = await User.findById(req.params.id);
  if (!user) throw notFound();
  if (user.role === "admin") await ensureAnotherAdmin(user._id);
  await user.deleteOne();
  res.json({ ok: true });
});

async function ensureAnotherAdmin(exceptId: unknown) {
  const others = await User.countDocuments({ role: "admin", active: true, _id: { $ne: exceptId } });
  if (!others) throw new HttpError(400, "Keep at least one active administrator.");
}
