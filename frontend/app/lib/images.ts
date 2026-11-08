import { absoluteUrl, site } from "~/config/site";
import type { ImageRef } from "./types";

/**
 * Builds image URLs from the image records the API sends. Seed images are
 * served from public/images/stories; uploads come from the API's /media.
 * To move images to a CDN, change `base` on the server or these functions.
 */
export function imageUrl(image: ImageRef, width: number, format: "avif" | "webp") {
  return `${image.base}/${image.key}-${width}.${format}`;
}

export function ogImageUrl(image: ImageRef | null | undefined) {
  return absoluteUrl(image?.og ? `${image.base}/${image.key}-og.jpg` : site.ogImage);
}

/** The Hubble Ultra Deep Field, used on the About page. Ships with the frontend. */
export const ultraDeepField: ImageRef = {
  key: "ultra-deep-field",
  base: "/images/stories",
  aspect: 1.5,
  widths: [480, 800, 1200, 1600],
  credit: "NASA, ESA, H. Teplitz and M. Rafelski (IPAC/Caltech), A. Koekemoer (STScI), R. Windhorst (ASU), Z. Levay (STScI)",
  license: "Public domain",
  source: "https://commons.wikimedia.org/wiki/File:NASA-HS201427a-HubbleUltraDeepField2014-20140603.jpg",
  og: true,
};
