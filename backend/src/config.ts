function required(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable ${name}. Copy .env.example to .env and fill it in.`);
  return value;
}

export const config = {
  port: Number(process.env.PORT ?? 4000),
  mongoUri: required("MONGODB_URI"),
  jwtSecret: required("JWT_SECRET"),
  /** Shared with the frontend server, which reports page views and the reader's IP. */
  internalKey: process.env.INTERNAL_API_KEY ?? "",
  mediaPublicUrl: (process.env.MEDIA_PUBLIC_URL ?? "http://localhost:4000/media").replace(/\/$/, ""),
  corsOrigins: (process.env.CORS_ORIGIN ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
  /** Optional: connects the admin panel to Google Search Console. */
  searchConsole: {
    serviceAccount: process.env.GSC_SERVICE_ACCOUNT_JSON ?? "",
    /** The property exactly as Search Console names it, with the trailing slash. */
    siteUrl: process.env.GSC_SITE_URL ?? "https://www.cosmoslens.com/",
  },
  isProduction: process.env.NODE_ENV === "production",
};
