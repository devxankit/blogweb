import compression from "compression";
import cors from "cors";
import express, { Router } from "express";
import helmet from "helmet";
import { config } from "./config";
import { connectDb } from "./db";
import { requireAuth } from "./lib/auth";
import { errorHandler, HttpError } from "./lib/http";
import { UPLOAD_DIR } from "./lib/media";
import { authorMap, imageMap, sectionList } from "./lib/serialize";
import { articlesRouter } from "./routes/admin/articles";
import { settingsRouter, statsRouter } from "./routes/admin/insights";
import { authorsRouter, imagesRouter, sectionsRouter } from "./routes/admin/library";
import { messagesRouter, subscribersRouter, usersRouter } from "./routes/admin/people";
import { authRouter } from "./routes/auth";
import { publicRouter } from "./routes/public";

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", "loopback");

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(compression());
app.use(cors({ origin: config.corsOrigins, credentials: false }));
app.use(express.json({ limit: "2mb" }));

// Uploaded images: immutable file names, so they can be cached for a year.
app.use(
  "/media",
  express.static(UPLOAD_DIR, { immutable: true, maxAge: "365d", index: false, fallthrough: false }),
);

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api", publicRouter);
app.use("/api/auth", authRouter);

const admin = Router();
admin.use(requireAuth);
admin.use("/stats", statsRouter);
admin.use("/articles", articlesRouter);
admin.use("/authors", authorsRouter);
admin.use("/sections", sectionsRouter);
admin.use("/images", imagesRouter);
admin.use("/subscribers", subscribersRouter);
admin.use("/messages", messagesRouter);
admin.use("/users", usersRouter);
admin.use("/settings", settingsRouter);
app.use("/api/admin", admin);

app.use("/api", () => {
  throw new HttpError(404, "No such endpoint.");
});
app.use(errorHandler);

await connectDb();
// Load the small, hot collections into memory before the first reader arrives.
await Promise.all([imageMap(), authorMap(), sectionList()]).catch((err) => console.warn("Cache warm-up failed:", err));
app.listen(config.port, () => {
  console.log(`CosmosLens API listening on http://localhost:${config.port}`);
});
