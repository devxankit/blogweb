import { absoluteUrl } from "~/config/site";
import { getSitemapEntries, getTags } from "~/lib/content.server";
import { ogImageUrl } from "~/lib/images";
import { MIN_TAG_STORIES } from "~/lib/seo";

const STATIC_PAGES = ["/", "/articles", "/authors", "/about", "/newsletter", "/contribute", "/editorial-standards", "/contact", "/privacy", "/terms", "/cookies"];

export const escapeXml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

function url(path: string, lastmod?: string, image?: string) {
  return [
    "<url>",
    `<loc>${escapeXml(absoluteUrl(path))}</loc>`,
    lastmod ? `<lastmod>${lastmod}</lastmod>` : "",
    image ? `<image:image><image:loc>${escapeXml(image)}</image:loc></image:image>` : "",
    "</url>",
  ].join("");
}

export async function loader() {
  const entries = await getSitemapEntries();
  // Thin tag pages are noindexed, so leave them out here too.
  const indexableTags = new Set((await getTags()).filter((t) => t.count >= MIN_TAG_STORIES).map((t) => `/tags/${t.slug}`));

  const body = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">`,
    ...STATIC_PAGES.map((p) => url(p, p === "/" || p === "/articles" ? entries.latest : undefined)),
    ...entries.articles.map((a) => url(a.path, a.lastmod, ogImageUrl(a.cover.image))),
    ...entries.sections.map((s) => url(s.path, s.lastmod)),
    ...entries.authors.map((a) => url(a.path, a.lastmod)),
    ...entries.tags.filter((t) => indexableTags.has(t.path)).map((t) => url(t.path, t.lastmod)),
    `</urlset>`,
  ].join("\n");

  return new Response(body, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
