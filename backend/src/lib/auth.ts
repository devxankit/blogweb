import bcrypt from "bcryptjs";
import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config";
import { User, type Role } from "../models";
import { HttpError } from "./http";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

const TOKEN_TTL = "7d";

export function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export function checkPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export function signToken(user: { _id: unknown; tokenVersion: number; role: string }) {
  return jwt.sign({ sub: String(user._id), v: user.tokenVersion, role: user.role }, config.jwtSecret, {
    expiresIn: TOKEN_TTL,
    algorithm: "HS256",
  });
}

export function toAuthUser(u: { _id: unknown; name: string; email: string; role: string }): AuthUser {
  return { id: String(u._id), name: u.name, email: u.email, role: u.role as Role };
}

/** Requires a valid bearer token for an active account. */
export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) throw new HttpError(401, "Sign in to continue.");

  let payload: { sub?: string; v?: number };
  try {
    payload = jwt.verify(token, config.jwtSecret, { algorithms: ["HS256"] }) as typeof payload;
  } catch {
    throw new HttpError(401, "Your session has expired. Sign in again.");
  }

  const user = await User.findById(payload.sub).lean();
  if (!user || !user.active || user.tokenVersion !== payload.v) {
    throw new HttpError(401, "Your session has expired. Sign in again.");
  }
  req.user = toAuthUser(user);
  next();
}

export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) throw new HttpError(403, "Your account does not have access to this.");
    next();
  };
}
