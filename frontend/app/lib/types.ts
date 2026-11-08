/** Section URL slug, such as "cosmos". Sections are managed in the admin panel. */
export type SectionSlug = string;

export interface Section {
  slug: SectionSlug;
  name: string;
  description: string;
  /**
   * Each section is keyed to a spectral emission line. The color is used for
   * the thin vertical mark beside the section name, never for running text.
   */
  line: { label: string; nm: number };
  /** Line color for sections added in the admin; the original six have theme-tuned colors in CSS. */
  color?: string;
}

export interface Author {
  slug: string;
  name: string;
  role: string;
  shortBio: string;
  bio: string[];
  location: string;
  expertise: string[];
  links?: { label: string; href: string }[];
}

/** Image identifier; files are named {key}-{width}.{avif|webp}. */
export type ImageKey = string;

export interface ImageAsset {
  aspect: number;
  widths: readonly number[];
  credit: string;
  license: string;
  source: string;
  og?: boolean;
}

/** An image record as the API sends it, with everything needed to render it. */
export interface ImageRef extends ImageAsset {
  key: ImageKey;
  /** URL prefix for the files: {base}/{key}-{width}.{format}. */
  base: string;
}

export interface Picture {
  image: ImageRef;
  alt: string;
  caption?: string;
}

export type Block =
  | { type: "p"; html: string }
  | { type: "h2"; text: string }
  | { type: "h3"; text: string }
  | { type: "quote"; text: string; cite?: string }
  | { type: "figure"; picture: Picture; size?: "column" | "wide" }
  | { type: "list"; ordered?: boolean; items: string[] }
  | { type: "aside"; title: string; items: { term: string; detail: string }[] };

export type ArticleFormat = "Feature" | "Essay" | "Analysis" | "Explainer" | "Profile" | "Report";

export interface Article {
  slug: string;
  title: string;
  /** Standfirst: one or two sentences under the headline. */
  dek: string;
  /** Optional title for search results, for headlines that don't name the topic. */
  seoTitle?: string;
  /** Optional shorter description for search results, 150–160 characters. */
  seoDescription?: string;
  section: SectionSlug;
  format: ArticleFormat;
  author: string;
  publishedAt: string;
  updatedAt?: string;
  cover: Picture;
  tags: string[];
  body: Block[];
}

/** What listing pages receive: everything except the body. */
export interface ArticleSummary extends Omit<Article, "body" | "author"> {
  author: Pick<Author, "slug" | "name">;
  readingMinutes: number;
  wordCount: number;
  views: number;
}

/** An approved reader comment. */
export interface StoryComment {
  id: string;
  name: string;
  body: string;
  createdAt: string;
}

export type SearchEntry = Pick<
  ArticleSummary,
  "slug" | "title" | "dek" | "section" | "format" | "tags" | "publishedAt" | "readingMinutes" | "cover"
> & { author: string };
