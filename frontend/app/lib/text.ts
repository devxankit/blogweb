import type { Block } from "./types";

export function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[’'"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function stripTags(html: string) {
  return html.replace(/<[^>]+>/g, "");
}

export function blockText(block: Block): string {
  switch (block.type) {
    case "p":
      return stripTags(block.html);
    case "h2":
    case "h3":
      return block.text;
    case "quote":
      return ""; // pull quotes repeat body text
    case "figure":
      return block.picture.caption ?? "";
    case "list":
      return block.items.map(stripTags).join(" ");
    case "aside":
      return block.items.map((i) => `${i.term} ${i.detail}`).join(" ");
  }
}

export function countWords(blocks: Block[]) {
  return blocks.reduce((sum, b) => sum + (blockText(b).match(/\S+/g)?.length ?? 0), 0);
}

const WORDS_PER_MINUTE = 230;
export function readingMinutes(words: number) {
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}

const dateFormat = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});
const shortDateFormat = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

export function formatDate(iso: string) {
  return dateFormat.format(new Date(iso));
}

export function formatShortDate(iso: string) {
  return shortDateFormat.format(new Date(iso));
}
