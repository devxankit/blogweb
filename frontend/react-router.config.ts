import type { Config } from "@react-router/dev/config";

export default {
  appDirectory: "app",
  // Every page is rendered on the server per request from the API's data, so
  // stories published in the admin panel appear at once. The content layer
  // (app/lib/content.server.ts) caches API responses briefly to keep it fast.
  ssr: true,
} satisfies Config;
