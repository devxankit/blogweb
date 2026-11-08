import type { NextFunction, Request, Response } from "express";
import { Settings } from "../models";
import { invalidateAuthors, invalidateImages, invalidateSections } from "./serialize";

/**
 * Keeps in-memory caches honest when the API runs as several instances (as
 * on Vercel). Every content change raises Settings.contentVersion; each
 * instance re-reads it at most every few seconds and drops its caches when
 * it moved. The site's server uses GET /api/version the same way.
 */

const CHECK_MS = 5000;
let known: number | null = null;
let checkedAt = 0;
let pending: Promise<number> | null = null;

export function currentVersion(): Promise<number> {
  if (known !== null && Date.now() - checkedAt < CHECK_MS) return Promise.resolve(known);
  pending ??= Settings.findOne({ key: "site" })
    .select("contentVersion")
    .lean()
    .then((s) => {
      const version = s?.contentVersion ?? 0;
      if (known !== null && version !== known) {
        invalidateImages();
        invalidateAuthors();
        invalidateSections();
      }
      known = version;
      checkedAt = Date.now();
      return version;
    })
    .finally(() => {
      pending = null;
    });
  return pending;
}

async function bumpVersion() {
  const s = await Settings.findOneAndUpdate({ key: "site" }, { $inc: { contentVersion: 1 } }, { returnDocument: "after", upsert: true })
    .select("contentVersion")
    .lean();
  known = s?.contentVersion ?? null;
  checkedAt = Date.now();
}

/** Middleware: check the version before serving content. */
export async function syncVersion(_req: Request, _res: Response, next: NextFunction) {
  await currentVersion().catch(() => undefined);
  next();
}

/**
 * Middleware for routes that change content: once a change succeeds, raise
 * the version before the response is sent (serverless instances may be
 * frozen right after responding, so this cannot wait until later).
 */
export function bumpsVersion(req: Request, res: Response, next: NextFunction) {
  if (req.method === "GET") return next();
  const json = res.json.bind(res);
  res.json = ((body: unknown) => {
    if (res.statusCode >= 400) return json(body);
    bumpVersion()
      .catch((err) => console.warn("Could not raise the content version:", err))
      .finally(() => json(body));
    return res;
  }) as Response["json"];
  next();
}
