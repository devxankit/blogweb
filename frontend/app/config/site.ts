const env = import.meta.env;

export const site = {
  name: "CosmosLens",
  // Shown in the masthead, footer and the default meta description.
  tagline: "Long-form journalism on space and science",
  description:
    "CosmosLens publishes features, essays and analysis on cosmology, planetary science, exploration, physics and life, written for readers who want the whole story.",
  url: (env.VITE_SITE_URL || "https://www.cosmoslens.com").replace(/\/$/, ""),
  /** Slug of the shared byline. It is the publication's team, so schema.org marks it as an Organization, not a Person. */
  houseAuthor: "cosmoslens-editors",
  language: "en-US",
  locale: "en_US",
  // These mailboxes don't exist yet. Create them (or forwarders) for cosmoslens.com before launch.
  email: {
    editors: "editors@cosmoslens.com",
    pitches: "pitches@cosmoslens.com",
    corrections: "corrections@cosmoslens.com",
    privacy: "privacy@cosmoslens.com",
  },
  // No official social accounts yet. Add full profile URLs here when there are
  // real ones (for example x: "https://x.com/…") and link them in the footer.
  social: {} as Record<string, string>,
  twitterHandle: "",
  foundingYear: 2026,
  ogImage: "/images/stories/ultra-deep-field-og.jpg",
  ads: {
    client: env.VITE_ADSENSE_CLIENT || "",
    // Create these ad units in AdSense and paste their slot IDs here.
    slots: {
      leaderboard: "0000000001",
      sidebar: "0000000002",
      inArticle: "0000000003",
      inFeed: "0000000004",
    },
  },
} as const;

export const adsEnabled = Boolean(site.ads.client);

export function absoluteUrl(path = "/") {
  if (/^https?:\/\//.test(path)) return path;
  return site.url + (path.startsWith("/") ? path : `/${path}`);
}
