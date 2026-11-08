import type { MetaDescriptor } from "react-router";
import { absoluteUrl, site } from "~/config/site";

/** Tag pages with fewer stories are too thin to index or list in the sitemap. */
export const MIN_TAG_STORIES = 4;

interface SeoInput {
  /** Page title without the site name. Omit on the home page. */
  title?: string;
  description: string;
  path: string;
  image?: string;
  imageAlt?: string;
  type?: "website" | "article" | "profile";
  noindex?: boolean;
  article?: {
    publishedTime: string;
    modifiedTime?: string;
    section: string;
    tags: string[];
    authorUrl: string;
  };
  jsonLd?: object[];
}

/** Title, description, canonical, Open Graph, Twitter and JSON-LD for a route. */
export function seo(input: SeoInput): MetaDescriptor[] {
  const url = absoluteUrl(input.path);
  const title = input.title ? `${input.title} | ${site.name}` : `${site.name}: ${site.tagline}`;
  const image = absoluteUrl(input.image ?? site.ogImage);
  const imageAlt = input.imageAlt ?? `${site.name}`;

  const tags: MetaDescriptor[] = [
    { title },
    { name: "description", content: input.description },
    { tagName: "link", rel: "canonical", href: url },
    {
      name: "robots",
      content: input.noindex ? "noindex, follow" : "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1",
    },
    { property: "og:site_name", content: site.name },
    { property: "og:locale", content: site.locale },
    { property: "og:type", content: input.type ?? "website" },
    { property: "og:title", content: input.title ?? site.name },
    { property: "og:description", content: input.description },
    { property: "og:url", content: url },
    { property: "og:image", content: image },
    { property: "og:image:width", content: "1200" },
    { property: "og:image:height", content: "630" },
    { property: "og:image:alt", content: imageAlt },
    { name: "twitter:card", content: "summary_large_image" },
    ...(site.twitterHandle ? [{ name: "twitter:site", content: site.twitterHandle }] : []),
    { name: "twitter:title", content: input.title ?? site.name },
    { name: "twitter:description", content: input.description },
    { name: "twitter:image", content: image },
    { name: "twitter:image:alt", content: imageAlt },
  ];

  if (input.article) {
    const a = input.article;
    tags.push(
      { property: "article:published_time", content: a.publishedTime },
      { property: "article:modified_time", content: a.modifiedTime ?? a.publishedTime },
      { property: "article:section", content: a.section },
      { property: "article:author", content: a.authorUrl },
      ...a.tags.map((tag) => ({ property: "article:tag", content: tag })),
    );
  }

  for (const data of input.jsonLd ?? []) tags.push({ "script:ld+json": data });
  return tags;
}
