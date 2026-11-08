const env = import.meta.env;

export const site = {
  name: "CosmosLens",
  // Shown in the masthead, footer and the default meta description.
  tagline: "Long-form journalism on space and science",
  description:
    "CosmosLens publishes reported features, essays and analysis on cosmology, planetary science, exploration, physics and life, written for readers who want the whole story.",
  url: (env.VITE_SITE_URL || "https://www.cosmoslens.com").replace(/\/$/, ""),
  language: "en-US",
  locale: "en_US",
  // These mailboxes don't exist yet. Create them (or forwarders) for cosmoslens.com before launch.
  email: {
    editors: "editors@cosmoslens.com",
    pitches: "pitches@cosmoslens.com",
    corrections: "corrections@cosmoslens.com",
    privacy: "privacy@cosmoslens.com",
  },
  // Handles not claimed yet. Register them, then update or remove any you don't get.
  social: {
    x: "https://x.com/cosmoslens",
    bluesky: "https://bsky.app/profile/cosmoslens.com",
    mastodon: "https://mastodon.social/@cosmoslens",
  },
  twitterHandle: "@cosmoslens",
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
