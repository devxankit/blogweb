import compression from "compression";
import cors from "cors";
import express, { Router } from "express";
import helmet from "helmet";
import { config } from "./config";
import { connectDb } from "./db";
import { requireAuth } from "./lib/auth";
import { errorHandler, HttpError } from "./lib/http";
import { UPLOAD_DIR } from "./lib/media";
import { bumpsVersion, currentVersion, syncVersion } from "./lib/version";
import { articlesRouter } from "./routes/admin/articles";
import { settingsRouter, statsRouter } from "./routes/admin/insights";
import { authorsRouter, imagesRouter, sectionsRouter } from "./routes/admin/library";
import { messagesRouter, subscribersRouter, usersRouter } from "./routes/admin/people";
import { authRouter } from "./routes/auth";
import { publicRouter } from "./routes/public";

/**
 * The API as an Express app. src/index.ts serves it locally; on Vercel,
 * api/index.js exports it as a function (bundled by `npm run build`).
 */
const app = express();
app.disable("x-powered-by");
app.set("trust proxy", "loopback");

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(compression());
app.use(cors({ origin: config.corsOrigins, credentials: false }));
app.use(express.json({ limit: "2mb" }));

// Uploaded images in local development: immutable names, cached for a year.
app.use("/media", express.static(UPLOAD_DIR, { immutable: true, maxAge: "365d", index: false, fallthrough: false }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

// Every other API route needs the database, and fresh caches.
app.use("/api", async (_req, _res, next) => {
  await connectDb();
  next();
});
app.use("/api", syncVersion);

app.get("/api/version", async (_req, res) => {
  res.set("Cache-Control", "no-store").json({ version: await currentVersion() });
});

app.use("/api", publicRouter);
app.use("/api/auth", authRouter);

const admin = Router();
admin.use(requireAuth);
admin.use("/stats", statsRouter);
// Changes to these appear on the public site, so they raise the content version.
admin.use("/articles", bumpsVersion, articlesRouter);
admin.use("/authors", bumpsVersion, authorsRouter);
admin.use("/sections", bumpsVersion, sectionsRouter);
admin.use("/images", bumpsVersion, imagesRouter);
admin.use("/settings", bumpsVersion, settingsRouter);
admin.use("/subscribers", subscribersRouter);
admin.use("/messages", messagesRouter);
admin.use("/users", usersRouter);
app.use("/api/admin", admin);

app.use("/api", () => {
  throw new HttpError(404, "No such endpoint.");
});
app.use(errorHandler);

export default app;
