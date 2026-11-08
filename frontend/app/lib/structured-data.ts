import { absoluteUrl, site } from "~/config/site";
import { ogImageUrl } from "./images";
import type { Article, ArticleSummary, Author, Section } from "./types";

const publisherId = `${site.url}/#publisher`;

export function publisher() {
  return {
    "@context": "https://schema.org",
    "@type": "NewsMediaOrganization",
    "@id": publisherId,
    name: site.name,
    url: site.url,
    description: site.description,
    foundingDate: String(site.foundingYear),
    logo: { "@type": "ImageObject", url: absoluteUrl("/icon-512.png"), width: 512, height: 512 },
    email: site.email.editors,
    sameAs: Object.values(site.social),
    publishingPrinciples: absoluteUrl("/editorial-standards"),
    correctionsPolicy: absoluteUrl("/editorial-standards#corrections"),
    ethicsPolicy: absoluteUrl("/editorial-standards#independence"),
    masthead: absoluteUrl("/about#masthead"),
  };
}

export function website() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${site.url}/#website`,
    name: site.name,
    url: site.url,
    inLanguage: site.language,
    publisher: { "@id": publisherId },
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${site.url}/search?q={search_term_string}` },
      "query-input": "required name=search_term_string",
    },
  };
}

export function breadcrumbs(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function articleSchema(article: Article, summary: ArticleSummary, author: Author, section: Section) {
  const url = absoluteUrl(`/articles/${article.slug}`);
  return {
    "@context": "https://schema.org",
    "@type": article.format === "Report" || article.format === "Analysis" ? "NewsArticle" : "Article",
    "@id": `${url}#article`,
    mainEntityOfPage: url,
    headline: article.title,
    description: article.seoDescription ?? article.dek,
    image: [ogImageUrl(article.cover.image)],
    datePublished: article.publishedAt,
    dateModified: article.updatedAt ?? article.publishedAt,
    inLanguage: site.language,
    articleSection: section.name,
    keywords: article.tags.join(", "),
    wordCount: summary.wordCount,
    timeRequired: `PT${summary.readingMinutes}M`,
    isAccessibleForFree: true,
    author: {
      "@type": "Person",
      name: author.name,
      url: absoluteUrl(`/authors/${author.slug}`),
      jobTitle: author.role,
    },
    publisher: { "@id": publisherId },
  };
}

export function authorProfile(author: Author) {
  return {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    mainEntity: {
      "@type": "Person",
      name: author.name,
      url: absoluteUrl(`/authors/${author.slug}`),
      jobTitle: author.role,
      description: author.shortBio,
      knowsAbout: author.expertise,
      worksFor: { "@id": publisherId },
    },
  };
}

export function collection(name: string, description: string, path: string, items: ArticleSummary[]) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name,
    description,
    url: absoluteUrl(path),
    isPartOf: { "@id": `${site.url}/#website` },
    mainEntity: {
      "@type": "ItemList",
      itemListElement: items.map((a, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: absoluteUrl(`/articles/${a.slug}`),
        name: a.title,
      })),
    },
  };
}
