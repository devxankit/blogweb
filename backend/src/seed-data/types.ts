// Shapes of the launch content as written by hand. The API stores the same
// fields; image keys are resolved to full image records when it serves them.
export type SectionSlug = "cosmos" | "planets" | "exploration" | "physics" | "life" | "ideas";

export interface Section {
  slug: SectionSlug;
  name: string;
  description: string;
  line: { label: string; nm: number };
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

export type ImageKey = string;

export interface ImageAsset {
  aspect: number;
  widths: readonly number[];
  credit: string;
  license: string;
  source: string;
  og?: boolean;
}

export interface Picture {
  image: ImageKey;
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
  dek: string;
  seoTitle?: string;
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
