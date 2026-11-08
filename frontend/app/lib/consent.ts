import { beacon } from "./api";

/**
 * The reader's cookie choice. Decided and stored in the browser only, because
 * public pages are cached and shared between visitors.
 *
 * accept:    essential cookies, a page-view count and detailed analytics
 * essential: essential cookies and an anonymous page-view count
 * reject:    only the cookie that remembers this choice; nothing is counted
 */
export type ConsentChoice = "accept" | "essential" | "reject";

// Bump to ask everyone again after a material change to what is collected.
const POLICY_VERSION = "1";
const CONSENT_COOKIE = "cl_consent";
export const VISITOR_COOKIE = "cl_vid";
export const SESSION_COOKIE = "cl_sid";

const YEAR = 60 * 60 * 24 * 365;

export const CONSENT_CHANGED = "cl:consent";
export const CONSENT_OPEN = "cl:consent-open";

export function readCookie(name: string) {
  return document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))?.[1] ?? null;
}

export function writeCookie(name: string, value: string, maxAgeSeconds: number) {
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${name}=${value}; Max-Age=${maxAgeSeconds}; Path=/; SameSite=Lax${secure}`;
}

export function getConsent(): ConsentChoice | null {
  const [version, choice] = (readCookie(CONSENT_COOKIE) ?? "").split(".");
  if (version !== POLICY_VERSION) return null;
  return choice === "accept" || choice === "essential" || choice === "reject" ? choice : null;
}

export function saveConsent(choice: ConsentChoice) {
  const previous = getConsent();
  const visitorId = readCookie(VISITOR_COOKIE);
  writeCookie(CONSENT_COOKIE, `${POLICY_VERSION}.${choice}`, YEAR);

  if (choice !== "accept") {
    writeCookie(VISITOR_COOKIE, "", 0);
    writeCookie(SESSION_COOKIE, "", 0);
  }
  window.dispatchEvent(new CustomEvent(CONSENT_CHANGED));

  if (choice !== previous) beacon("/forms/consent", { choice });
  // Withdrawing consent also erases what was recorded under this visitor's random id.
  if (previous === "accept" && choice !== "accept" && visitorId) beacon("/forms/analytics-forget", { vid: visitorId });
}

/** Reopens the dialog, from the "Cookie settings" link. */
export function openConsentSettings() {
  window.dispatchEvent(new CustomEvent(CONSENT_OPEN));
}
