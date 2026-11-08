/**
 * Loads the launch content into MongoDB: sections, authors, image records,
 * the 16 seed stories, home page settings and the two admin panel accounts.
 *
 *   npm run seed            add anything missing; never overwrites edits
 *   npm run seed -- --reset wipe stories, authors, sections and images first
 *
 * The launch content lives in src/seed-data.
 */
import mongoose from "mongoose";
import { articles as seedArticles, editorsPickSlugs } from "./seed-data/articles/index";
import { authors as seedAuthors } from "./seed-data/authors";
import { images as seedImages } from "./seed-data/images";
import { sections as seedSections } from "./seed-data/sections";
import { connectDb } from "./db";
import { hashPassword } from "./lib/auth";
import { blockSchema, type Block } from "./lib/blocks";
import { countWords, readingMinutes, slugify } from "./lib/text";
import { Article, Author, getSettings, Image, Section, User } from "./models";

const reset = process.argv.includes("--reset");

async function main() {
  await connectDb();
  console.log(`Connected to ${mongoose.connection.name}.`);

  if (reset) {
    await Promise.all([Article.deleteMany({}), Author.deleteMany({}), Section.deleteMany({}), Image.deleteMany({ storage: "static" })]);
    console.log("Cleared stories, authors, sections and seed image records.");
  }

  // Sections, in their original order.
  for (const [order, s] of seedSections.entries()) {
    await Section.updateOne({ slug: s.slug }, { $setOnInsert: { ...s, order } }, { upsert: true });
  }
  console.log(`Sections: ${await Section.countDocuments()}`);

  for (const a of seedAuthors) {
    await Author.updateOne({ slug: a.slug }, { $setOnInsert: { ...a, links: a.links ?? [] } }, { upsert: true });
  }
  console.log(`Authors: ${await Author.countDocuments()}`);

  // Image records for the files in frontend/public/images/stories.
  for (const [key, img] of Object.entries(seedImages)) {
    await Image.updateOne(
      { key },
      { $setOnInsert: { key, ...img, widths: [...img.widths], og: Boolean(img.og), storage: "static", originalName: `${key}.jpg` } },
      { upsert: true },
    );
  }
  console.log(`Images: ${await Image.countDocuments()}`);

  const authorIds = new Map((await Author.find().select("slug").lean()).map((a) => [a.slug, a._id]));
  let added = 0;
  for (const a of seedArticles) {
    const body = a.body.map((b) => blockSchema.parse(b)) as Block[];
    const wordCount = countWords(body);
    const tagSlugs = [...new Set(a.tags.map(slugify))];
    const imageKeys = [...new Set([a.cover.image, ...body.flatMap((b) => (b.type === "figure" ? [b.picture.image] : []))])];
    const result = await Article.updateOne(
      { slug: a.slug },
      {
        $setOnInsert: {
          slug: a.slug,
          title: a.title,
          dek: a.dek,
          seoTitle: a.seoTitle,
          seoDescription: a.seoDescription,
          section: a.section,
          format: a.format,
          author: authorIds.get(a.author),
          status: "published",
          publishedAt: new Date(a.publishedAt),
          revisedAt: a.updatedAt ? new Date(a.updatedAt) : undefined,
          cover: a.cover,
          tags: a.tags,
          tagSlugs,
          body,
          imageKeys,
          wordCount,
          readingMinutes: readingMinutes(wordCount),
        },
      },
      { upsert: true },
    );
    if (result.upsertedCount) added++;
  }
  console.log(`Stories: ${await Article.countDocuments()} (${added} added)`);

  const settings = await getSettings();
  if (!settings.editorsPicks.length) {
    const picks = await Article.find({ slug: { $in: editorsPickSlugs } }).select("slug").lean();
    const order = new Map(editorsPickSlugs.map((s, i) => [s, i]));
    settings.editorsPicks = picks.sort((x, y) => order.get(x.slug)! - order.get(y.slug)!).map((p) => p._id) as never;
    settings.picksIntro ||=
      "Three stories the editors think are worth an evening: a forgotten astronomer, the clocks that measure gravity, and an ocean hidden under ice.";
    await settings.save();
  }
  console.log("Home page settings ready.");

  for (const role of ["admin", "editor"] as const) {
    const prefix = `SEED_${role.toUpperCase()}`;
    const email = process.env[`${prefix}_EMAIL`]?.toLowerCase();
    const password = process.env[`${prefix}_PASSWORD`];
    const name = process.env[`${prefix}_NAME`] ?? (role === "admin" ? "Site Admin" : "Staff Editor");
    if (!email || !password) {
      console.log(`Skipped the ${role} account: set ${prefix}_EMAIL and ${prefix}_PASSWORD in .env.`);
      continue;
    }
    if (await User.exists({ email })) {
      console.log(`${role} account ${email} already exists (password unchanged).`);
      continue;
    }
    await User.create({ name, email, role, passwordHash: await hashPassword(password) });
    console.log(`Created ${role} account ${email}.`);
  }

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect();
  process.exit(1);
});
