import { useCallback, useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router";
import { site } from "~/config/site";
import { useSections } from "~/lib/sections";
import { moonPhase } from "~/lib/moon";
import { CloseIcon, MenuIcon, MoonGlyph, MoonIcon, SearchIcon, SunIcon } from "./icons";

const publicationLinks = [
  { to: "/articles", label: "All stories" },
  { to: "/authors", label: "Contributors" },
  { to: "/newsletter", label: "Newsletter" },
  { to: "/about", label: "About" },
  { to: "/editorial-standards", label: "Editorial standards" },
  { to: "/contribute", label: "Write for us" },
  { to: "/contact", label: "Contact" },
  { to: "/search", label: "Search" },
];

/** Date and tonight's Moon. Rendered after hydration so it is never stale. */
function SkyNote() {
  const [sky, setSky] = useState<{ date: string; moon: ReturnType<typeof moonPhase> } | null>(null);

  useEffect(() => {
    const now = new Date();
    setSky({
      date: now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }),
      moon: moonPhase(now),
    });
  }, []);

  return (
    <div className="sky-note">
      <div className="container sky-note__inner">
        <p className="sky-note__sky" aria-live="off">
          {sky ? (
            <>
              <span>{sky.date}</span>
              <span className="sky-note__moon">
                <MoonGlyph fraction={sky.moon.fraction} />
                {sky.moon.name}, {Math.round(sky.moon.illumination * 100)}% lit
              </span>
            </>
          ) : (
            <span>&nbsp;</span>
          )}
        </p>
        <nav className="sky-note__links" aria-label="Publication">
          <Link to="/about">About</Link>
          <Link to="/newsletter">Newsletter</Link>
          <Link to="/contribute">Write for us</Link>
        </nav>
      </div>
    </div>
  );
}

export function ThemeToggle() {
  const toggle = () => {
    const root = document.documentElement;
    const current = root.dataset.theme ?? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    const next = current === "dark" ? "light" : "dark";
    root.dataset.theme = next;
    try {
      localStorage.setItem("theme", next);
    } catch {
      /* storage unavailable: the choice lasts for this page view */
    }
  };

  return (
    <button type="button" className="icon-button theme-toggle" onClick={toggle} aria-label="Switch between light and dark theme">
      <MoonIcon className="icon-moon" />
      <SunIcon className="icon-sun" />
    </button>
  );
}

function MenuDrawer({ onClose }: { onClose: () => void }) {
  const sections = useSections();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div className="drawer" role="dialog" aria-modal="true" aria-label="Menu">
      <div className="container drawer__top">
        <Link to="/" className="wordmark" onClick={onClose}>
          {site.name}
        </Link>
        <button ref={closeRef} type="button" className="icon-button" onClick={onClose} aria-label="Close menu">
          <CloseIcon />
        </button>
      </div>
      <div className="container drawer__body">
        <nav aria-label="Sections">
          <p className="label drawer__group-title">Sections</p>
          <ul className="drawer__sections">
            {sections.map((s) => (
              <li key={s.slug} data-section={s.slug}>
                <Link to={`/${s.slug}`} onClick={onClose}>
                  {s.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label="The publication">
          <p className="label drawer__group-title">The publication</p>
          <ul className="drawer__links">
            {publicationLinks.map((l) => (
              <li key={l.to}>
                <Link to={l.to} onClick={onClose}>
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  );
}

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const location = useLocation();
  const sections = useSections();

  useEffect(closeMenu, [location.pathname, closeMenu]);

  return (
    <header className="site-header">
      <SkyNote />
      <div className="container masthead">
        <Link to="/" className="wordmark" aria-label={`${site.name}, home`}>
          {site.name}
        </Link>
        <nav className="primary-nav" aria-label="Sections">
          <ul className="primary-nav__list">
            {sections.map((s) => (
              <li key={s.slug} data-section={s.slug}>
                <NavLink to={`/${s.slug}`} className="primary-nav__link" prefetch="intent">
                  {s.name}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="masthead__actions">
          <Link to="/search" className="icon-button" aria-label="Search">
            <SearchIcon />
          </Link>
          <ThemeToggle />
          <Link to="/newsletter" className="button masthead__subscribe">
            Subscribe
          </Link>
          <button
            type="button"
            className="icon-button menu-button"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
            aria-expanded={menuOpen}
          >
            <MenuIcon />
          </button>
        </div>
      </div>
      <nav className="section-strip" aria-label="Sections">
        <ul className="container section-strip__list">
          {sections.map((s) => (
            <li key={s.slug} data-section={s.slug}>
              <NavLink to={`/${s.slug}`} className="primary-nav__link">
                {s.name}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      {menuOpen ? <MenuDrawer onClose={closeMenu} /> : null}
    </header>
  );
}
