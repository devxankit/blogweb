import { imageUrl } from "~/lib/images";
import type { ImageRef } from "~/lib/types";

interface ImgProps {
  image: ImageRef;
  alt: string;
  /** The `sizes` attribute: how wide the image renders at each breakpoint. */
  sizes: string;
  /** Above-the-fold images: load eagerly with high fetch priority (LCP). */
  priority?: boolean;
  className?: string;
}

// Phones have 2.5–3x screens, which would otherwise pull 1200–1600px files.
// Capping small screens at 800px keeps images sharp at ~2x for far fewer bytes.
const PHONE_QUERY = "(max-width: 600px)";
const PHONE_MAX_WIDTH = 800;

/** Responsive AVIF with WebP fallback, sized to avoid layout shift. */
export function Img({ image, alt, sizes, priority = false, className }: ImgProps) {
  const asset = image;
  const widths = asset.widths;
  const largest = widths[widths.length - 1];
  const fallback = widths.find((w) => w >= 800) ?? largest;
  const phoneWidths = widths.filter((w) => w <= PHONE_MAX_WIDTH);
  const srcSet = (format: "avif" | "webp", list = widths) => list.map((w) => `${imageUrl(image, w, format)} ${w}w`).join(", ");

  return (
    <picture className={className}>
      <source type="image/avif" media={PHONE_QUERY} srcSet={srcSet("avif", phoneWidths)} sizes={sizes} />
      <source type="image/avif" srcSet={srcSet("avif")} sizes={sizes} />
      <source type="image/webp" media={PHONE_QUERY} srcSet={srcSet("webp", phoneWidths)} sizes={sizes} />
      <img
        src={imageUrl(image, fallback, "webp")}
        srcSet={srcSet("webp")}
        sizes={sizes}
        alt={alt}
        width={largest}
        height={Math.round(largest / asset.aspect)}
        loading={priority ? "eager" : "lazy"}
        decoding={priority ? "sync" : "async"}
        fetchPriority={priority ? "high" : "auto"}
      />
    </picture>
  );
}

/** Caption plus the image credit and license, linked to the source. */
export function Caption({ image: asset, caption }: { image: ImageRef; caption?: string }) {
  return (
    <figcaption className="caption">
      {caption ? <span>{caption}</span> : null}
      <span className="caption__credit">
        Image: {asset.credit} (
        <a href={asset.source} rel="noopener" target="_blank">
          {asset.license}
        </a>
        )
      </span>
    </figcaption>
  );
}
