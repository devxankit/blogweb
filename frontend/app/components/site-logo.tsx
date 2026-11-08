import type { SVGProps } from "react";
import { site } from "~/config/site";

export type LogoVariant = "aperture" | "spectrum" | "monogram" | "astrolabe";
export type LogoLayout = "horizontal" | "mark-only" | "stacked";

interface SiteLogoProps {
  variant?: LogoVariant;
  layout?: LogoLayout;
  className?: string;
  subtitle?: string;
}

type MarkProps = SVGProps<SVGSVGElement>;

/**
 * Mark 1: The Aperture & Lensing Star
 */
export function ApertureMark({ className, style, ...props }: MarkProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      className={className}
      style={style}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...props}
    >
      <circle cx="32" cy="32" r="30" stroke="currentColor" strokeWidth="1.6" strokeOpacity="0.25" />
      <circle cx="32" cy="32" r="23" stroke="currentColor" strokeWidth="1.2" strokeDasharray="2 3" strokeOpacity="0.45" />
      <path d="M32 9 C43 9 52 18 52 29 C44 26 38 18 32 9Z" fill="var(--line-physics, #3566d6)" fillOpacity="0.88" />
      <path d="M55 32 C55 43 46 52 35 52 C38 44 46 38 55 32Z" fill="var(--line-cosmos, #12917f)" fillOpacity="0.88" />
      <path d="M32 55 C21 55 12 46 12 35 C20 38 26 46 32 55Z" fill="var(--line-ideas, #7452d1)" fillOpacity="0.88" />
      <path d="M9 32 C9 21 18 12 29 12 C26 20 18 26 9 32Z" fill="var(--line-planets, #c88d16)" fillOpacity="0.88" />
      <circle cx="32" cy="32" r="14" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.3" />
      <circle cx="32" cy="32" r="6" fill="var(--night, #0c1a2e)" stroke="currentColor" strokeWidth="1" />
      <path d="M32 19 Q32 32 19 32 Q32 32 32 45 Q32 32 45 32 Q32 32 32 19 Z" fill="var(--night-ink, #e8ecf2)" />
      <circle cx="32" cy="32" r="2.2" fill="var(--line-planets, #c88d16)" />
    </svg>
  );
}

/**
 * Mark 2: The Emission Spectrum Horizon
 */
export function SpectrumMark({ className, style, ...props }: MarkProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      className={className}
      style={style}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...props}
    >
      <circle cx="32" cy="32" r="30" fill="var(--night, #0c1a2e)" />
      <circle cx="32" cy="27" r="13" fill="var(--night-ink, #e8ecf2)" opacity="0.95" />
      <circle cx="32" cy="27" r="10" fill="var(--night, #0c1a2e)" />
      <ellipse cx="32" cy="27" rx="22" ry="7" stroke="var(--night-ink, #e8ecf2)" strokeWidth="1.2" strokeOpacity="0.4" transform="rotate(-18 32 27)" />
      <g transform="translate(0, 5)">
        <rect x="15" y="38" width="4" height="12" rx="2" fill="var(--line-cosmos, #12917f)" />
        <rect x="21" y="35" width="4" height="15" rx="2" fill="var(--line-planets, #c88d16)" />
        <rect x="27" y="33" width="4" height="17" rx="2" fill="var(--line-exploration, #cf4232)" />
        <rect x="33" y="33" width="4" height="17" rx="2" fill="var(--line-physics, #3566d6)" />
        <rect x="39" y="35" width="4" height="15" rx="2" fill="var(--line-life, #4d9132)" />
        <rect x="45" y="38" width="4" height="12" rx="2" fill="var(--line-ideas, #7452d1)" />
      </g>
      <circle cx="16" cy="18" r="1" fill="#e8ecf2" opacity="0.8" />
      <circle cx="48" cy="16" r="1.3" fill="#e8b24a" />
      <circle cx="50" cy="26" r="0.9" fill="#e8ecf2" opacity="0.6" />
    </svg>
  );
}

/**
 * Mark 3: The Editorial DF Monogram
 */
export function MonogramMark({ className, style, ...props }: MarkProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      className={className}
      style={style}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...props}
    >
      <rect width="64" height="64" rx="14" fill="var(--night, #0c1a2e)" />
      <ellipse cx="33" cy="33" rx="26" ry="11" stroke="var(--line-physics, #3566d6)" strokeWidth="1.8" transform="rotate(-30 33 33)" strokeDasharray="1 2" />
      <ellipse cx="33" cy="33" rx="26" ry="11" stroke="var(--night-ink, #e8ecf2)" strokeWidth="1.5" strokeOpacity="0.75" transform="rotate(-30 33 33)" />
      <g fill="var(--night-ink, #e8ecf2)">
        <path d="M16 16 h6 v32 h-6 v-3 h2 v-26 h-2 z" />
        <path d="M22 16 c9 0 16 6 16 16 s-7 16 -16 16 v-4 c6 0 11.5 -4.5 11.5 -12 s-5.5 -12 -11.5 -12 z" />
        <path d="M37 20 h13 v3.5 h-11 v9 h9 v3.5 h-9 v12 h-3.5 v-28 z" />
      </g>
      <circle cx="49" cy="20" r="3" fill="var(--line-planets, #c88d16)" />
      <circle cx="49" cy="20" r="4.5" stroke="var(--line-planets, #c88d16)" strokeWidth="0.8" strokeOpacity="0.4" />
    </svg>
  );
}

/**
 * Mark 4: The Astrolabe & Galaxy Cluster
 */
export function AstrolabeMark({ className, style, ...props }: MarkProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      className={className}
      style={style}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...props}
    >
      <circle cx="32" cy="32" r="30" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.3" />
      <circle cx="32" cy="32" r="27" stroke="currentColor" strokeWidth="0.8" strokeOpacity="0.2" />
      <circle cx="32" cy="32" r="21" stroke="currentColor" strokeWidth="1.2" strokeDasharray="1 3" strokeOpacity="0.4" />
      <line x1="32" y1="2" x2="32" y2="10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <line x1="32" y1="54" x2="32" y2="62" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <line x1="2" y1="32" x2="10" y2="32" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <line x1="54" y1="32" x2="62" y2="32" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <ellipse cx="25" cy="27" rx="8" ry="3.5" transform="rotate(-35 25 27)" fill="var(--line-cosmos, #12917f)" fillOpacity="0.85" />
      <circle cx="25" cy="27" r="1.5" fill="#e8ecf2" />
      <path d="M38 21 C43 25 44 32 40 38" stroke="var(--line-planets, #c88d16)" strokeWidth="2" strokeLinecap="round" fill="none" />
      <circle cx="34" cy="36" r="3" fill="var(--line-physics, #3566d6)" />
      <circle cx="34" cy="36" r="1" fill="#ffffff" />
      <circle cx="21" cy="42" r="1.5" fill="var(--line-ideas, #7452d1)" />
      <circle cx="45" cy="27" r="1.2" fill="var(--line-exploration, #cf4232)" />
    </svg>
  );
}

/**
 * Universal SiteLogo component
 */
export function SiteLogo({
  variant = "aperture",
  layout = "horizontal",
  className = "",
  subtitle,
}: SiteLogoProps) {
  const MarkComponent =
    variant === "aperture"
      ? ApertureMark
      : variant === "spectrum"
      ? SpectrumMark
      : variant === "monogram"
      ? MonogramMark
      : AstrolabeMark;

  const defaultSubtitles: Record<LogoVariant, string> = {
    aperture: "Space & Science Journal",
    spectrum: "Long-form Space & Science",
    monogram: "Cosmology & Discovery",
    astrolabe: "Astrophysics & Exploration",
  };

  const sub = subtitle ?? defaultSubtitles[variant];

  if (layout === "mark-only") {
    return (
      <span className={`site-logo site-logo--mark-only ${className}`} style={{ display: "inline-flex", alignItems: "center" }}>
        <MarkComponent className="site-logo__mark" />
      </span>
    );
  }

  return (
    <span
      className={`site-logo site-logo--${layout} site-logo--${variant} ${className}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.75rem",
        textDecoration: "none",
        color: "inherit",
      }}
    >
      <MarkComponent
        className="site-logo__mark"
        style={{
          width: layout === "stacked" ? "3rem" : "2.25rem",
          height: layout === "stacked" ? "3rem" : "2.25rem",
          flexShrink: 0,
        }}
      />
      <span
        className="site-logo__text"
        style={{
          display: "flex",
          flexDirection: "column",
          lineHeight: 1.05,
        }}
      >
        <span
          className="site-logo__title"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "1.45rem",
            fontWeight: 500,
            letterSpacing: "-0.015em",
            color: "var(--ink)",
          }}
        >
          {site.name}
        </span>
        {sub && (
          <span
            className="site-logo__sub"
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "0.55rem",
              fontWeight: 600,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "var(--muted)",
              marginTop: "0.25rem",
            }}
          >
            {sub}
          </span>
        )}
      </span>
    </span>
  );
}
