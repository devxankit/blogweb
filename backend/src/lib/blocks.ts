import sanitizeHtml from "sanitize-html";
import { z } from "zod";

/**
 * Article body blocks. The frontend renders `p.html` and `list.items` as HTML,
 * so both are sanitized here, on the way into the database.
 */
const inlineHtml: sanitizeHtml.IOptions = {
  allowedTags: ["a", "em", "strong", "i", "b", "sup", "sub", "br", "code", "abbr", "span"],
  allowedAttributes: { a: ["href", "title", "rel", "target"], abbr: ["title"], span: ["lang"] },
  allowedSchemes: ["http", "https", "mailto"],
  allowProtocolRelative: false,
  transformTags: {
    a: (tagName, attribs) => {
      const external = /^https?:\/\//.test(attribs.href ?? "");
      return {
        tagName,
        attribs: external ? { ...attribs, rel: "noopener", target: attribs.target === "_blank" ? "_blank" : "" } : attribs,
      };
    },
  },
};

export function cleanInline(html: string) {
  return sanitizeHtml(html, inlineHtml).replace(/ target=""/g, "").trim();
}

const text = (label: string, max = 2000) =>
  z
    .string({ error: `${label} is required.` })
    .trim()
    .min(1, `${label} is required.`)
    .max(max, `${label} is too long.`);

export const pictureSchema = z.object({
  image: z.string({ error: "Choose an image." }).trim().min(1, "Choose an image for this figure."),
  alt: text("Alt text", 400),
  caption: z.string().trim().max(800).optional().transform((v) => v || undefined),
});

export const blockSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("p"), html: text("Paragraph", 10000).transform(cleanInline) }),
  z.object({ type: z.literal("h2"), text: text("Heading", 200) }),
  z.object({ type: z.literal("h3"), text: text("Subheading", 200) }),
  z.object({
    type: z.literal("quote"),
    text: text("Quote", 600),
    cite: z.string().trim().max(200).optional().transform((v) => v || undefined),
  }),
  z.object({ type: z.literal("figure"), picture: pictureSchema, size: z.enum(["column", "wide"]).optional() }),
  z.object({
    type: z.literal("list"),
    ordered: z.boolean().optional(),
    items: z.array(text("List item", 2000).transform(cleanInline)).min(1, "A list needs at least one item."),
  }),
  z.object({
    type: z.literal("aside"),
    title: text("Fact box title", 120),
    items: z
      .array(z.object({ term: text("Term", 200), detail: text("Detail", 600) }))
      .min(1, "A fact box needs at least one row."),
  }),
]);

export type Block = z.infer<typeof blockSchema>;
export type Picture = z.infer<typeof pictureSchema>;
