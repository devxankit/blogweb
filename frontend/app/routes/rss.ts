import { absoluteUrl, site } from "~/config/site";
import { getLatest, getSections } from "~/lib/content.server";
import { ogImageUrl } from "~/lib/images";
import { escapeXml } from "./sitemap";

export async function loader() {
  const [stories, sections] = await Promise.all([getLatest(30), getSections()]);
  const sectionName = new Map(sections.map((s) => [s.slug, s.name]));
  const items = stories.map((s) => {
    const link = absoluteUrl(`/articles/${s.slug}`);
    return [
      "<item>",
      `<title>${escapeXml(s.title)}</title>`,
      `<link>${link}</link>`,
      `<guid isPermaLink="true">${link}</guid>`,
      `<pubDate>${new Date(s.publishedAt).toUTCString()}</pubDate>`,
      `<dc:creator>${escapeXml(s.author.name)}</dc:creator>`,
      `<category>${escapeXml(sectionName.get(s.section) ?? s.section)}</category>`,
      `<description>${escapeXml(s.dek)}</description>`,
      `<media:content url="${escapeXml(ogImageUrl(s.cover.image))}" medium="image" type="image/jpeg" width="1200" height="630" />`,
      "</item>",
    ].join("");
  });

  const body = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:media="http://search.yahoo.com/mrss/">`,
    "<channel>",
    `<title>${escapeXml(site.name)}</title>`,
    `<link>${site.url}</link>`,
    `<description>${escapeXml(site.description)}</description>`,
    `<language>${site.language}</language>`,
    `<atom:link href="${absoluteUrl("/rss.xml")}" rel="self" type="application/rss+xml" />`,
    stories[0] ? `<lastBuildDate>${new Date(stories[0].updatedAt ?? stories[0].publishedAt).toUTCString()}</lastBuildDate>` : "",
    ...items,
    "</channel>",
    "</rss>",
  ].join("\n");

  return new Response(body, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=1800",
    },
  });
}
