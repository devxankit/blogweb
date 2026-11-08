import { beacon } from "./api";
import { CONSENT_CHANGED, getConsent, readCookie, SESSION_COOKIE, VISITOR_COOKIE, writeCookie } from "./consent";

/**
 * Measures reading, and only as far as the visitor's cookie choice allows.
 * Until a choice is made, nothing is sent at all.
 */

const SESSION_SECONDS = 30 * 60;
// The analytics cookie is set once and not extended, so it ends after 13 months at most.
const VISITOR_SECONDS = 60 * 60 * 24 * 395;
// Reading is quiet: someone counts as present for a minute after their last input.
const IDLE_MS = 60_000;
const TICK_MS = 1000;

function uuid() {
  if (crypto.randomUUID) return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const hex = [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** The site that sent this visitor, as a host name only. Empty for direct visits and our own pages. */
function referrerHost() {
  try {
    const host = new URL(document.referrer).hostname.replace(/^www\./, "");
    return host === location.hostname.replace(/^www\./, "") ? "" : host;
  } catch {
    return "";
  }
}

/** How far through the page or story the reader has got, 0 to 100. */
function currentDepth() {
  const story = document.querySelector<HTMLElement>(".prose");
  const viewportBottom = window.scrollY + window.innerHeight;
  if (story) {
    const top = story.getBoundingClientRect().top + window.scrollY;
    return Math.round(Math.max(0, Math.min(1, (viewportBottom - top) / story.offsetHeight)) * 100);
  }
  return Math.round(Math.min(1, viewportBottom / document.documentElement.scrollHeight) * 100);
}

/** Follows one page view; returns a function that ends it. */
function followPage(path: string) {
  const returning = readCookie(VISITOR_COOKIE) !== null;
  const vid = readCookie(VISITOR_COOKIE) ?? uuid();
  if (!returning) writeCookie(VISITOR_COOKIE, vid, VISITOR_SECONDS);

  const existingSession = readCookie(SESSION_COOKIE);
  const sid = existingSession ?? uuid();
  const keepSessionAlive = () => writeCookie(SESSION_COOKIE, sid, SESSION_SECONDS);
  keepSessionAlive();

  const pv = uuid();
  const referrer = existingSession ? "" : referrerHost();
  let activeMs = 0;
  let depth = currentDepth();
  let lastActivity = performance.now();
  let lastTick = lastActivity;
  let sent = "";

  const send = () => {
    const active = Math.round(activeMs / 1000);
    const state = `${active}:${depth}`;
    if (state === sent) return;
    sent = state;
    beacon("/forms/analytics", { pv, vid, sid, path, referrer, returning, active, depth });
  };

  const tick = () => {
    const now = performance.now();
    if (document.visibilityState === "visible" && now - lastActivity < IDLE_MS) activeMs += now - lastTick;
    lastTick = now;
  };
  const onActivity = () => {
    tick();
    lastActivity = performance.now();
    keepSessionAlive();
  };
  const onScroll = () => {
    onActivity();
    depth = Math.max(depth, currentDepth());
  };
  const onHidden = () => {
    tick();
    if (document.visibilityState === "hidden") send();
  };
  const onPageHide = () => {
    tick();
    send();
  };

  const timer = window.setInterval(tick, TICK_MS);
  const activity = ["pointerdown", "pointermove", "keydown"] as const;
  activity.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));
  window.addEventListener("scroll", onScroll, { passive: true });
  document.addEventListener("visibilitychange", onHidden);
  window.addEventListener("pagehide", onPageHide);

  send(); // Record the view straight away, even if the reader leaves quickly.

  return (report: boolean) => {
    window.clearInterval(timer);
    activity.forEach((e) => window.removeEventListener(e, onActivity));
    window.removeEventListener("scroll", onScroll);
    document.removeEventListener("visibilitychange", onHidden);
    window.removeEventListener("pagehide", onPageHide);
    if (report) {
      tick();
      depth = Math.max(depth, currentDepth());
      send();
    }
  };
}

let currentPath: string | null = null;
let counted = false;
let stopFollowing: ((report: boolean) => void) | null = null;
let listening = false;

/** Applies the current choice to the current page. Safe to call again when the choice changes. */
function applyConsent() {
  const choice = getConsent();
  if (!currentPath || !choice || choice === "reject") return;
  if (!counted) {
    counted = true;
    beacon("/forms/track", { path: currentPath });
  }
  if (choice === "accept" && !stopFollowing) stopFollowing = followPage(currentPath);
}

/** Call on every navigation to a public page. */
export function trackPage(path: string) {
  if (!listening) {
    listening = true;
    window.addEventListener(CONSENT_CHANGED, () => {
      if (getConsent() === "accept" && stopFollowing) return; // Same choice again.
      // No final report: if consent was just withdrawn, nothing more may be sent.
      stopFollowing?.(false);
      stopFollowing = null;
      applyConsent();
    });
  }
  stopFollowing?.(true);
  stopFollowing = null;
  currentPath = path;
  counted = false;
  applyConsent();
}

/** Stops measuring, for pages that are not public. */
export function stopTracking() {
  stopFollowing?.(true);
  stopFollowing = null;
  currentPath = null;
}
