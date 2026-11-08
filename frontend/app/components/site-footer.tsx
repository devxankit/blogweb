import { Link, useLocation } from "react-router";
import { site } from "~/config/site";
import { useSections } from "~/lib/sections";
import { NewsletterBlock } from "./newsletter";

export function SiteFooter() {
  const sections = useSections();
  const year = new Date().getUTCFullYear();
  const { pathname } = useLocation();
  return (
    <footer className="site-footer night">
      <div className="container">
        {pathname === "/newsletter" ? null : (
          <div className="site-footer__letter">
            <NewsletterBlock compact />
          </div>
        )}
        <div className="site-footer__top">
          <div className="site-footer__brand">
            <Link to="/" className="wordmark">
              {site.name}
            </Link>
            <p className="site-footer__mission">
              Reported features, essays and analysis on space and science, written for readers who want the whole story and the
              evidence behind it.
            </p>
          </div>
          <div className="site-footer__nav">
            <nav aria-label="Sections">
              <h2 className="site-footer__heading">Sections</h2>
              <ul className="site-footer__list">
                {sections.map((s) => (
                  <li key={s.slug}>
                    <Link to={`/${s.slug}`} className="section-mark" data-section={s.slug}>
                      {s.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
            <nav aria-label="The publication">
              <h2 className="site-footer__heading">The publication</h2>
              <ul className="site-footer__list">
                <li><Link to="/about">About</Link></li>
                <li><Link to="/authors">Contributors</Link></li>
                <li><Link to="/editorial-standards">Editorial standards</Link></li>
                <li><Link to="/contribute">Write for us</Link></li>
                <li><Link to="/contact">Contact</Link></li>
                <li><Link to="/articles">All stories</Link></li>
              </ul>
            </nav>
            <nav aria-label="Follow and policies">
              <h2 className="site-footer__heading">Follow</h2>
              <ul className="site-footer__list">
                <li><Link to="/newsletter">Newsletter</Link></li>
                <li><a href="/rss.xml">RSS feed</a></li>
              </ul>
            </nav>
          </div>
        </div>
        <div className="site-footer__bottom">
          <p>
            © {year} {site.name}. Images are credited in their captions; most come from NASA, ESA and other public institutions.
          </p>
          <nav aria-label="Legal">
            <ul className="inline-list">
              <li><Link to="/privacy">Privacy</Link></li>
              <li><Link to="/cookies">Cookies</Link></li>
              <li><Link to="/terms">Terms</Link></li>
              <li><a href="/sitemap.xml">Sitemap</a></li>
            </ul>
          </nav>
        </div>
      </div>
    </footer>
  );
}
