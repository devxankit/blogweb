import { absoluteUrl } from "~/config/site";

export function loader() {
  // Test deployments (SITE_NOINDEX=1) keep crawlers out entirely.
  if (process.env.SITE_NOINDEX === "1") {
    return new Response("User-agent: *\nDisallow: /\n", {
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" },
    });
  }

  const body = [
    "User-agent: *",
    "Allow: /",
    // Internal search result pages waste crawl budget and are noindexed anyway.
    "Disallow: /search",
    "Disallow: /admin",
    "Disallow: /forms/",
    "",
    // The AdSense crawler must see every page that can show ads.
    "User-agent: Mediapartners-Google",
    "Allow: /",
    "",
    `Sitemap: ${absoluteUrl("/sitemap.xml")}`,
    "",
  ].join("\n");

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=86400" },
  });
}
