import type { NextFunction, Request, Response } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import { config } from "../config";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public fields?: Record<string, string>,
  ) {
    super(message);
  }
}

export const notFound = (what = "Not found") => new HttpError(404, what);

/** Parses a body with a zod schema; failures become a 400 with per-field messages. */
export function parse<T extends z.ZodType>(schema: T, input: unknown): z.infer<T> {
  const result = schema.safeParse(input);
  if (result.success) return result.data;
  const fields: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = issue.path.join(".") || "_";
    fields[key] ??= issue.message;
  }
  throw new HttpError(400, "Some fields need attention.", fields);
}

export function isId(value: unknown): value is string {
  return typeof value === "string" && mongoose.isValidObjectId(value);
}

export function intParam(value: unknown, fallback: number, max = 100) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? Math.min(n, max) : fallback;
}

export function escapeRegex(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** The reader's IP. Trusted from the frontend server only when it presents the internal key. */
export function clientIp(req: Request) {
  const forwarded = req.get("x-client-ip");
  if (forwarded && config.internalKey && req.get("x-internal-key") === config.internalKey) return forwarded;
  return req.ip ?? "unknown";
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message, fields: err.fields });
    return;
  }
  if (err instanceof mongoose.Error.CastError) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  if (typeof err === "object" && err && "code" in err && err.code === 11000) {
    const field = Object.keys((err as { keyValue?: object }).keyValue ?? {})[0] ?? "value";
    res.status(409).json({ error: `That ${field} is already in use.`, fields: { [field]: "Already in use." } });
    return;
  }
  if (typeof err === "object" && err && "type" in err && err.type === "entity.too.large") {
    res.status(413).json({ error: "The request is too large." });
    return;
  }
  // Errors from Express middleware (missing static files, malformed JSON, multer limits).
  const status = typeof err === "object" && err ? Number((err as { status?: number }).status ?? (err as { statusCode?: number }).statusCode) : NaN;
  if (status >= 400 && status < 500) {
    const code = (err as { code?: string }).code;
    res.status(status).json({ error: code === "LIMIT_FILE_SIZE" ? "Images must be 20 MB or smaller." : status === 404 ? "Not found" : "The request could not be read." });
    return;
  }
  if (typeof err === "object" && err && (err as { name?: string }).name === "MulterError") {
    res.status(400).json({ error: "Images must be 20 MB or smaller." });
    return;
  }
  console.error(err);
  res.status(500).json({ error: "Something went wrong on the server." });
}
