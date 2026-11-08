import { randomBytes } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { del, put } from "@vercel/blob";
import sharp, { type Metadata } from "sharp";
import { HttpError } from "./http";
import { slugify } from "./text";

/** Local uploads (development). In production images go to Vercel Blob. */
export const UPLOAD_DIR = path.resolve(process.cwd(), "uploads");
export const STORIES_DIR = path.join(UPLOAD_DIR, "stories");

/** Same widths as the seed images, so the frontend's srcset logic is unchanged. */
const WIDTHS = [480, 800, 1200, 1600];

const useBlob = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN);

interface OutputFile {
  name: string;
  data: Buffer;
  type: string;
}

/**
 * Turns one uploaded image into the set the frontend expects:
 * {key}-{width}.avif / .webp at each width, plus a 1200×630 {key}-og.jpg,
 * and stores them in Vercel Blob or, locally, in uploads/stories.
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

  const widths = WIDTHS.filter((w) => w <= width);
  if (widths[widths.length - 1] !== Math.min(width, 1600) && width < 1600) widths.push(width);

  const source = sharp(buffer, { failOn: "none" }).rotate();
  const files: OutputFile[] = await Promise.all([
    ...widths.flatMap((w) => [
      source
        .clone()
        .resize({ width: w })
        .avif({ quality: 52, effort: 4 })
        .toBuffer()
        .then((data) => ({ name: `${key}-${w}.avif`, data, type: "image/avif" })),
      source
        .clone()
        .resize({ width: w })
        .webp({ quality: 78 })
        .toBuffer()
        .then((data) => ({ name: `${key}-${w}.webp`, data, type: "image/webp" })),
    ]),
    source
      .clone()
      .resize({ width: 1200, height: 630, fit: "cover", position: "attention" })
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer()
      .then((data) => ({ name: `${key}-og.jpg`, data, type: "image/jpeg" })),
  ]);

  const stored = await storeFiles(files);
  return { key, widths, aspect: Math.round((width / height) * 1000) / 1000, bytes: buffer.length, ...stored };
}

async function storeFiles(files: OutputFile[]): Promise<{ storage: "blob" | "upload"; baseUrl: string }> {
  if (useBlob()) {
    const results = await Promise.all(
      files.map((f) =>
        put(`stories/${f.name}`, f.data, {
          access: "public",
          contentType: f.type,
          addRandomSuffix: false,
          // File names never change, so browsers and the CDN may keep them for a year.
          cacheControlMaxAge: 60 * 60 * 24 * 365,
        }),
      ),
    );
    const url = results[0].url;
    return { storage: "blob", baseUrl: url.slice(0, url.lastIndexOf("/")) };
  }
  if (process.env.VERCEL) {
    throw new HttpError(500, "Image storage is not set up. Connect a Vercel Blob store to the API project.");
  }
  await mkdir(STORIES_DIR, { recursive: true });
  await Promise.all(files.map((f) => writeFile(path.join(STORIES_DIR, f.name), f.data)));
  return { storage: "upload", baseUrl: "" };
}

/** Removes an uploaded image's files. Launch ("static") images ship with the frontend and are left alone. */
export async function deleteImageFiles(image: { key: string; widths: number[]; storage?: string | null; baseUrl?: string | null }) {
  const names = [...image.widths.flatMap((w) => [`${image.key}-${w}.avif`, `${image.key}-${w}.webp`]), `${image.key}-og.jpg`];
  if (image.storage === "blob" && image.baseUrl) {
    await del(names.map((n) => `${image.baseUrl}/${n}`)).catch((err) => console.warn("Blob delete failed:", err));
  } else if (image.storage === "upload") {
    await Promise.all(names.map((n) => unlink(path.join(STORIES_DIR, n)).catch(() => undefined)));
  }
}
