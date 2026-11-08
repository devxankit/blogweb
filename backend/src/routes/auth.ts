import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";
import { checkPassword, hashPassword, requireAuth, signToken, toAuthUser } from "../lib/auth";
import { clientIp, HttpError, parse } from "../lib/http";
import { User } from "../models";

export const authRouter = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  keyGenerator: (req) => clientIp(req),
  skipSuccessfulRequests: true,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Too many sign-in attempts. Wait 15 minutes and try again." },
});

export const passwordRule = z
  .string()
  .min(10, "Use at least 10 characters.")
  .max(200, "That password is too long.")
  .refine((p) => /[a-zA-Z]/.test(p) && /[^a-zA-Z]/.test(p), "Mix letters with numbers or symbols.");

authRouter.post("/login", loginLimiter, async (req, res) => {
  const input = parse(
    z.object({ email: z.string().trim().toLowerCase().min(1, "Enter your email."), password: z.string().min(1, "Enter your password.") }),
    req.body,
  );
  const user = await User.findOne({ email: input.email }).select("+passwordHash");
  // Same message either way, so the form does not reveal which emails have accounts.
  const ok = user ? await checkPassword(input.password, user.passwordHash) : false;
  if (!user || !ok) throw new HttpError(401, "That email and password do not match an account.");
  if (!user.active) throw new HttpError(403, "This account is turned off. Ask an administrator to turn it back on.");

  user.lastLoginAt = new Date();
  await user.save();
  res.json({ token: signToken(user), user: toAuthUser(user) });
});

authRouter.get("/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});

authRouter.post("/password", requireAuth, async (req, res) => {
  const input = parse(z.object({ current: z.string().min(1, "Enter your current password."), next: passwordRule }), req.body);
  const user = await User.findById(req.user!.id).select("+passwordHash");
  if (!user || !(await checkPassword(input.current, user.passwordHash))) {
    throw new HttpError(400, "Your current password is not right.", { current: "Not right." });
  }
  user.passwordHash = await hashPassword(input.next);
  user.tokenVersion += 1;
  await user.save();
  // A fresh token for this session; every other session is signed out.
  res.json({ token: signToken(user), user: toAuthUser(user) });
});
