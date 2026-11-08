import { randomBytes } from "node:crypto";
import { mkdir, unlink } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp, { type Metadata } from "sharp";
import { HttpError } from "./http";
import { slugify } from "./text";

export const UPLOAD_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../uploads");
export const STORIES_DIR = path.join(UPLOAD_DIR, "stories");

/** Same widths as the seed images, so the frontend's srcset logic is unchanged. */
const WIDTHS = [480, 800, 1200, 1600];

/**
 * Turns one uploaded image into the set the frontend expects:
 * {key}-{width}.avif / .webp at each width, plus a 1200×630 {key}-og.jpg.
 */
export async function processUpload(buffer: Buffer, originalName: string) {
  let meta: Metadata;
  try {
    meta = await sharp(buffer).metadata();
  } catch {
    throw new HttpError(400, "That file is not an image we can read. Use JPEG, PNG, WebP, AVIF or TIFF.");
  }
  if (!meta.width || !meta.height) throw new HttpError(400, "Could not read the image size.");

  // Respect EXIF rotation when measuring.
  const rotated = meta.orientation && meta.orientation >= 5;
  const width = rotated ? meta.height : meta.width;
  const height = rotated ? meta.width : meta.height;
  if (width < 480) throw new HttpError(400, "Images must be at least 480 pixels wide.");

  const base = slugify(path.parse(originalName).name).slice(0, 40) || "image";
  const key = `${base}-${randomBytes(3).toString("hex")}`;
  await mkdir(STORIES_DIR, { recursive: true });

  const widths = WIDTHS.filter((w) => w <= width);
  if (widths[widths.length - 1] !== Math.min(width, 1600) && width < 1600) widths.push(width);

  const source = sharp(buffer, { failOn: "none" }).rotate();
  await Promise.all(
    widths.flatMap((w) => [
      source.clone().resize({ width: w }).avif({ quality: 52, effort: 4 }).toFile(path.join(STORIES_DIR, `${key}-${w}.avif`)),
      source.clone().resize({ width: w }).webp({ quality: 78 }).toFile(path.join(STORIES_DIR, `${key}-${w}.webp`)),
    ]),
  );
  await source
    .clone()
    .resize({ width: 1200, height: 630, fit: "cover", position: "attention" })
    .jpeg({ quality: 82, mozjpeg: true })
    .toFile(path.join(STORIES_DIR, `${key}-og.jpg`));

  return { key, widths, aspect: Math.round((width / height) * 1000) / 1000, bytes: buffer.length };
}

export async function deleteUploadFiles(key: string, widths: number[]) {
  const files = [...widths.flatMap((w) => [`${key}-${w}.avif`, `${key}-${w}.webp`]), `${key}-og.jpg`];
  await Promise.all(files.map((f) => unlink(path.join(STORIES_DIR, f)).catch(() => undefined)));
}
