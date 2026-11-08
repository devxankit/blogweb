// Server-only settings. Vite exposes only VITE_* variables to the app, so the
// server reads frontend/.env itself (values already in the environment win).
try {
  process.loadEnvFile(".env");
} catch {
  // No .env file: rely on the real environment.
}

export const env = {
  /** Base URL of the Node API, without a trailing slash. */
  apiUrl: (process.env.API_URL ?? "http://localhost:4000").replace(/\/$/, ""),
  /** Shared secret that lets this server report page views and readers' IPs to the API. */
  internalKey: process.env.INTERNAL_API_KEY ?? "",
  /** Signs the admin session cookie. */
  sessionSecret: process.env.SESSION_SECRET ?? "dev-only-session-secret-change-me",
  isProduction: process.env.NODE_ENV === "production",
};

if (env.isProduction && env.sessionSecret.startsWith("dev-only")) {
  console.warn("SESSION_SECRET is not set. Set it in frontend/.env before going live.");
}
