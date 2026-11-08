import { useEffect, useRef } from "react";
import { useLocation } from "react-router";
import { adsEnabled, site } from "~/config/site";

type Variant = "leaderboard" | "inline" | "sidebar" | "feed";

const slotFor: Record<Variant, string> = {
  leaderboard: site.ads.slots.leaderboard,
  inline: site.ads.slots.inArticle,
  sidebar: site.ads.slots.sidebar,
  feed: site.ads.slots.inFeed,
};

const showPlaceholder = import.meta.env.DEV || import.meta.env.VITE_AD_PREVIEW === "1";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

let scriptRequested = false;

/**
 * Loads adsbygoogle.js once, after the page is interactive: on the first
 * scroll, tap or key press, or when the browser is idle. This keeps the ad
 * script off the critical path for Largest Contentful Paint.
 */
function loadAdSenseWhenIdle() {
  if (scriptRequested || typeof window === "undefined") return;
  scriptRequested = true;
  const inject = () => {
    const s = document.createElement("script");
    s.async = true;
    s.crossOrigin = "anonymous";
    s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${site.ads.client}`;
    document.head.appendChild(s);
  };
  let done = false;
  const once = () => {
    if (done) return;
    done = true;
    events.forEach((e) => window.removeEventListener(e, once));
    inject();
  };
  const events = ["scroll", "pointerdown", "keydown"] as const;
  events.forEach((e) => window.addEventListener(e, once, { passive: true, once: true }));
  if ("requestIdleCallback" in window) window.requestIdleCallback(once, { timeout: 3500 });
  else setTimeout(once, 2500);
}

export function AdSlot({ variant }: { variant: Variant }) {
  const location = useLocation();
  const ref = useRef<HTMLModElement>(null);

  useEffect(() => {
    if (!adsEnabled || !ref.current) return;
    loadAdSenseWhenIdle();
    if (ref.current.dataset.adsbygoogleStatus) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      /* AdSense throws if a slot is filled twice; safe to ignore */
    }
  }, [location.key]);

  if (!adsEnabled && !showPlaceholder) return null;

  return (
    <aside className={`ad ad--${variant}`} aria-label="Advertisement">
      <span className="ad__label">Advertisement</span>
      {adsEnabled ? (
        <ins
          key={location.key}
          ref={ref}
          className="adsbygoogle ad__slot"
          style={{ display: "block" }}
          data-ad-client={site.ads.client}
          data-ad-slot={slotFor[variant]}
          data-ad-format={variant === "inline" ? "fluid" : "auto"}
          data-ad-layout={variant === "inline" ? "in-article" : undefined}
          data-full-width-responsive="true"
        />
      ) : (
        <div className="ad__slot">
          <div className="ad__placeholder">Ad slot: {variant}</div>
        </div>
      )}
    </aside>
  );
}
