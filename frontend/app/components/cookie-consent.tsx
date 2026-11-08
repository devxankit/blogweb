import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router";
import { CONSENT_OPEN, getConsent, saveConsent, type ConsentChoice } from "~/lib/consent";

const CHOICES: { value: ConsentChoice; label: string; detail: string }[] = [
  { value: "accept", label: "Accept all", detail: "Essential cookies, plus analytics that show us what is read and for how long." },
  { value: "essential", label: "Essentials only", detail: "Essential cookies. We count the page view anonymously, with nothing that identifies you." },
  { value: "reject", label: "Reject all", detail: "We keep only the cookie that remembers this choice, and do not count your visit." },
];

// People must be able to read these before deciding, so the dialog doesn't block them.
const READABLE_WHILE_DECIDING = new Set(["/cookies", "/privacy", "/terms"]);

/**
 * The cookie choice, asked on a first visit. Rendered only in the browser after
 * hydration, because public pages are cached and shared between visitors.
 */
export function CookieConsent() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState<ConsentChoice | null>(null);
  const panel = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!getConsent()) setOpen(true);
    const reopen = () => {
      setCurrent(getConsent());
      setOpen(true);
    };
    window.addEventListener(CONSENT_OPEN, reopen);
    return () => window.removeEventListener(CONSENT_OPEN, reopen);
  }, []);

  const blocking = open && !READABLE_WHILE_DECIDING.has(pathname.replace(/\/+$/, ""));

  // Everything behind a blocking dialog is out of reach of keyboard and screen reader.
  useEffect(() => {
    if (!blocking) return;
    const behind = document.querySelectorAll<HTMLElement>(".skip-link, .site-header, .main, .site-footer");
    const returnTo = document.activeElement as HTMLElement | null;
    behind.forEach((el) => (el.inert = true));
    // The dialog itself takes focus: focusing a button would make it look like the suggested one.
    panel.current?.focus({ preventScroll: true });
    return () => {
      behind.forEach((el) => (el.inert = false));
      returnTo?.focus?.({ preventScroll: true });
    };
  }, [blocking]);

  // A visitor who has already chosen can back out of the settings without changing anything.
  useEffect(() => {
    if (!open || !current) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, current]);

  if (!open) return null;

  const choose = (choice: ConsentChoice) => {
    saveConsent(choice);
    setCurrent(choice);
    setOpen(false);
  };

  return (
    <>
      {blocking ? <div className="consent-scrim" /> : null}
      <section ref={panel} tabIndex={-1} className={blocking ? "consent" : "consent consent--passive"} role="dialog" aria-modal={blocking} aria-labelledby="consent-title" aria-describedby="consent-text">
        <h2 id="consent-title" className="consent__title">
          Your choice on cookies
        </h2>
        <p id="consent-text" className="consent__text">
          Our analytics show us which stories people read, how long they stay and how far they get. They are our own, and we do not
          sell the data. Choose what you are comfortable with; you can change it at any time. <Link to="/cookies">Read the cookie policy</Link>.
        </p>
        <div className="consent__choices">
          {CHOICES.map((c) => (
            <button
              key={c.value}
              type="button"
              className="consent__choice"
              aria-pressed={current === c.value || undefined}
              onClick={() => choose(c.value)}
            >
              <span className="consent__label">{c.label}</span>
              <span className="consent__detail">{c.detail}</span>
            </button>
          ))}
        </div>
      </section>
    </>
  );
}
