import type { Config } from "@react-router/dev/config";
import { vercelPreset } from "@vercel/react-router/vite";

export default {
  appDirectory: "app",
  // Every page is rendered on the server per request from the API's data, so
  // stories published in the admin panel appear at once. The content layer
  // (app/lib/content.server.ts) caches API responses briefly to keep it fast.
  ssr: true,
  // On Vercel, build for Vercel Functions; locally, keep the plain Node server
  // that `npm start` runs.
  presets: process.env.VERCEL ? [vercelPreset()] : [],
} satisfies Config;
