import type { Config } from "@react-router/dev/config";
import { vercelPreset } from "@vercel/react-router/vite";

export default {
  appDirectory: "app",
  // Pages are rendered on the server from the API's data. Stories published in
  // the admin panel appear within about a minute: app/entry.server.tsx lets the
  // CDN hold public pages that long, and the content layer
  // (app/lib/content.server.ts) caches API responses briefly to keep it fast.
  ssr: true,
  // On Vercel, build for Vercel Functions; locally, keep the plain Node server
  // that `npm start` runs.
  presets: process.env.VERCEL ? [vercelPreset()] : [],
} satisfies Config;
