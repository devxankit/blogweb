import { model, Schema, type InferSchemaType } from "mongoose";

/* Sections */

const sectionSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    /** Each section is keyed to a spectral emission line. */
    line: {
      label: { type: String, required: true, trim: true },
      nm: { type: Number, required: true },
    },
    /** Line color for sections added later; the original six have theme-tuned colors in CSS. */
    color: { type: String, default: "" },
    order: { type: Number, default: 0 },
  },
  { timestamps: true },
);
export const Section = model("Section", sectionSchema);
export type SectionDoc = InferSchemaType<typeof sectionSchema>;

/* Authors (bylines; separate from login accounts) */

const authorSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    role: { type: String, required: true, trim: true },
    shortBio: { type: String, required: true, trim: true },
    bio: { type: [String], default: [] },
    location: { type: String, default: "", trim: true },
    expertise: { type: [String], default: [] },
    links: { type: [{ label: String, href: String, _id: false }], default: [] },
  },
  { timestamps: true },
);
export const Author = model("Author", authorSchema);
export type AuthorDoc = InferSchemaType<typeof authorSchema>;

/* Images */

const imageSchema = new Schema(
  {
    key: { type: String, required: true, unique: true },
    /** Width divided by height. */
    aspect: { type: Number, required: true },
    widths: { type: [Number], required: true },
    credit: { type: String, required: true, trim: true },
    license: { type: String, required: true, trim: true },
    source: { type: String, default: "", trim: true },
    /** True when a 1200×630 share image exists. */
    og: { type: Boolean, default: false },
    /**
     * "static": shipped with the frontend in public/images/stories.
     * "upload": files on this server's disk (local development).
     * "blob": files in Vercel Blob (production).
     */
    storage: { type: String, enum: ["static", "upload", "blob"], default: "upload" },
    /** URL prefix of the files, for "blob" storage. */
    baseUrl: { type: String, default: "" },
    originalName: { type: String, default: "" },
    bytes: { type: Number, default: 0 },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);
export const Image = model("Image", imageSchema);
export type ImageDoc = InferSchemaType<typeof imageSchema>;

/* Articles */

export const FORMATS = ["Feature", "Essay", "Analysis", "Explainer", "Profile", "Report"] as const;

// Empty only on drafts: the API requires a cover image and alt text to publish.
const pictureSchema = new Schema(
  { image: { type: String, default: "" }, alt: { type: String, default: "" }, caption: { type: String } },
  { _id: false },
);

const articleSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true, trim: true },
    title: { type: String, required: true, trim: true },
    dek: { type: String, default: "", trim: true },
    /** Title for search results when the headline doesn't name the topic. */
    seoTitle: { type: String, trim: true },
    seoDescription: { type: String, trim: true },
    section: { type: String, required: true, index: true },
    format: { type: String, enum: FORMATS, required: true },
    author: { type: Schema.Types.ObjectId, ref: "Author", required: true, index: true },
    status: { type: String, enum: ["draft", "published"], default: "draft" },
    /** Publication date. A published story with a future date is scheduled. */
    publishedAt: { type: Date, required: true },
    /** Shown to readers as "Updated"; set only for meaningful revisions. */
    revisedAt: { type: Date },
    cover: { type: pictureSchema, default: () => ({}) },
    tags: { type: [String], default: [] },
    tagSlugs: { type: [String], default: [], index: true },
    /** Typed blocks: p, h2, h3, quote, figure, list, aside. Validated by the API. */
    body: { type: [Schema.Types.Mixed], default: [] },
    /** Every image key used by the cover and body, for "is this image in use" checks. */
    imageKeys: { type: [String], default: [], index: true },
    wordCount: { type: Number, default: 0 },
    readingMinutes: { type: Number, default: 1 },
    views: { type: Number, default: 0 },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);
articleSchema.index({ status: 1, publishedAt: -1 });
export const Article = model("Article", articleSchema);
export type ArticleDoc = InferSchemaType<typeof articleSchema>;

/* Users (admin panel accounts) */

export const ROLES = ["admin", "editor"] as const;
export type Role = (typeof ROLES)[number];

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ROLES, default: "editor" },
    active: { type: Boolean, default: true },
    lastLoginAt: { type: Date },
    /** Bumped on password change or deactivation so older sessions stop working. */
    tokenVersion: { type: Number, default: 0 },
  },
  { timestamps: true },
);
export const User = model("User", userSchema);

/* Newsletter subscribers */

const subscriberSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    status: { type: String, enum: ["active", "unsubscribed"], default: "active", index: true },
    source: { type: String, default: "" },
  },
  { timestamps: true },
);
export const Subscriber = model("Subscriber", subscriberSchema);

/* Contact form messages */

export const TOPICS = ["tip", "correction", "feedback", "partnership", "other"] as const;

const messageSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    topic: { type: String, enum: TOPICS, default: "other" },
    message: { type: String, required: true },
    read: { type: Boolean, default: false, index: true },
  },
  { timestamps: true },
);
export const Message = model("Message", messageSchema);

/* Daily page-view counters: one document per UTC day and path */

const pageViewSchema = new Schema({
  day: { type: String, required: true },
  path: { type: String, required: true },
  article: { type: Schema.Types.ObjectId, ref: "Article" },
  views: { type: Number, default: 0 },
});
pageViewSchema.index({ day: 1, path: 1 }, { unique: true });
pageViewSchema.index({ article: 1, day: 1 });
export const PageView = model("PageView", pageViewSchema);

/*
 * Reader activity: one document per page view, recorded only for visitors who
 * accepted analytics cookies. Holds random ids, never an IP address or name.
 * Deleted automatically after about 13 months.
 */

const VISIT_TTL_SECONDS = 60 * 60 * 24 * 395;

const visitSchema = new Schema({
  /** Random id for this one page view; later updates refer to it. */
  pv: { type: String, required: true, unique: true },
  vid: { type: String, required: true, index: true },
  sid: { type: String, required: true },
  at: { type: Date, required: true, default: () => new Date(), expires: VISIT_TTL_SECONDS },
  path: { type: String, required: true },
  /** Set when the page is a story. */
  slug: { type: String, default: "" },
  /** Host name of the site that sent the visitor; empty means direct. */
  referrer: { type: String, default: "" },
  returning: { type: Boolean, default: false },
  country: { type: String, default: "" },
  device: { type: String, default: "" },
  browser: { type: String, default: "" },
  os: { type: String, default: "" },
  /** Seconds the page was visible and the reader active. */
  activeSeconds: { type: Number, default: 0 },
  /** How far down the page or story the reader got, 0 to 100. */
  depth: { type: Number, default: 0 },
});
export const Visit = model("Visit", visitSchema);

/* Daily totals of cookie choices. No identifiers. */

export const CONSENT_CHOICES = ["accept", "essential", "reject"] as const;

const consentDaySchema = new Schema({
  day: { type: String, required: true, unique: true },
  accept: { type: Number, default: 0 },
  essential: { type: Number, default: 0 },
  reject: { type: Number, default: 0 },
});
export const ConsentDay = model("ConsentDay", consentDaySchema);

/* Reader comments. Nothing appears on the site until it is approved. */

export const COMMENT_STATUSES = ["pending", "approved", "rejected"] as const;

const commentSchema = new Schema(
  {
    article: { type: Schema.Types.ObjectId, ref: "Article", required: true },
    name: { type: String, required: true, trim: true },
    /** Optional, for an editor to reply. Never shown on the site. */
    email: { type: String, default: "", lowercase: true, trim: true },
    body: { type: String, required: true },
    status: { type: String, enum: COMMENT_STATUSES, default: "pending" },
  },
  { timestamps: true },
);
commentSchema.index({ article: 1, status: 1, createdAt: 1 });
commentSchema.index({ status: 1, createdAt: -1 });
export const Comment = model("Comment", commentSchema);

/* Site-wide editorial settings: a single document with key "site" */

const settingsSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, default: "site" },
    /** Pinned home page cover story; when empty the newest story is the cover. */
    coverStory: { type: Schema.Types.ObjectId, ref: "Article", default: null },
    /** Article ids, in order, for the home page long-reads band. */
    editorsPicks: { type: [{ type: Schema.Types.ObjectId, ref: "Article" }], default: [] },
    picksTitle: { type: String, default: "Long reads" },
    picksIntro: { type: String, default: "" },
    /** Raised on every content change, so all server instances know to refresh their caches. */
    contentVersion: { type: Number, default: 0 },
  },
  { timestamps: true },
);
export const Settings = model("Settings", settingsSchema);

export async function getSettings() {
  return (await Settings.findOne({ key: "site" })) ?? (await Settings.create({ key: "site" }));
}
