import app from "./app";
import { config } from "./config";
import { connectDb } from "./db";
import { authorMap, imageMap, sectionList } from "./lib/serialize";

// Local server. On Vercel the same app runs as a function (see api/index.js).
await connectDb();
// Load the small, hot collections into memory before the first reader arrives.
await Promise.all([imageMap(), authorMap(), sectionList()]).catch((err) => console.warn("Cache warm-up failed:", err));
app.listen(config.port, () => {
  console.log(`CosmosLens API listening on http://localhost:${config.port}`);
});
