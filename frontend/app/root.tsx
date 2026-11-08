import { useEffect } from "react";
import { isRouteErrorResponse, Links, Meta, Outlet, Scripts, ScrollRestoration, useLocation, useRouteLoaderData } from "react-router";
import type { Route } from "./+types/root";
import "./app.css";
import displayFont from "./assets/fonts/newsreader-display.woff2?url";
import { SiteFooter } from "./components/site-footer";
import { SiteHeader } from "./components/site-header";
import { NotFound } from "./components/not-found";
import { site } from "./config/site";
import { trackPageView } from "./lib/api";
import { getSiteData } from "./lib/content.server";
import { sectionColorCss } from "./lib/sections";

export async function loader() {
  const { sections } = await getSiteData();
  return { sections };
}

// Test deployments (SITE_NOINDEX=1) ask search engines not to index any page.
// Child routes without their own headers inherit this.
export const headers: Route.HeadersFunction = () =>
  process.env.SITE_NOINDEX === "1" ? { "X-Robots-Tag": "noindex, nofollow" } : new Headers();

// Only the headline face is preloaded so it never competes with the LCP image
// for long; the other faces swap in over metric-matched fallbacks without shift.
export const links: Route.LinksFunction = () => [
  { rel: "preload", href: displayFont, as: "font", type: "font/woff2", crossOrigin: "anonymous" },
  { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
  { rel: "icon", href: "/favicon-32.png", type: "image/png", sizes: "32x32" },
  { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
  { rel: "manifest", href: "/site.webmanifest" },
  { rel: "alternate", type: "application/rss+xml", title: site.name, href: "/rss.xml" },
];

// Runs before first paint so a saved theme never flashes the wrong colors.
const themeScript = `try{var t=localStorage.getItem("theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

export function Layout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const isAdmin = pathname === "/admin" || pathname.startsWith("/admin/");
  const root = useRouteLoaderData<typeof loader>("root");
  const sectionCss = sectionColorCss(root?.sections ?? []);

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <meta name="theme-color" content="#f3f4f1" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#0b1626" media="(prefers-color-scheme: dark)" />
        <meta name="color-scheme" content="light dark" />
        {/* Google Search Console ownership. Removing this un-verifies the site. */}
        <meta name="google-site-verification" content="ZvTj3SyaIF-yX8w6kfXFGeePsCm5AgLURNkrOUI1QgA" />
        {site.ads.client ? <meta name="google-adsense-account" content={site.ads.client} /> : null}
        {sectionCss ? <style dangerouslySetInnerHTML={{ __html: sectionCss }} /> : null}
        <Meta />
        <Links />
      </head>
      <body>
        {isAdmin ? (
          children
        ) : (
          <>
            <a href="#main" className="skip-link">
              Skip to content
            </a>
            <SiteHeader />
            <main id="main" className="main" tabIndex={-1}>
              {children}
            </main>
            <SiteFooter />
          </>
        )}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  const { pathname } = useLocation();

  // One page view per page, counted in the API's daily statistics.
  useEffect(() => {
    if (!pathname.startsWith("/admin")) trackPageView(pathname);
  }, [pathname]);

  return <Outlet />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  if (isRouteErrorResponse(error) && error.status === 404) {
    return <NotFound />;
  }

  const detail = import.meta.env.DEV && error instanceof Error ? error.stack : null;
  return (
    <div className="container">
      <title>{`Something went wrong | ${site.name}`}</title>
      <meta name="robots" content="noindex" />
      <div className="not-found">
        <p className="not-found__code">Error</p>
        <h1 className="not-found__title">This page failed to load</h1>
        <p className="not-found__text">
          Something went wrong on our side. Reload the page to try again, or go back to the front page.
        </p>
        <div className="not-found__actions">
          <a className="button" href="/">
            Go to the front page
          </a>
        </div>
        {detail ? <pre style={{ overflow: "auto", fontSize: "0.8rem" }}>{detail}</pre> : null}
      </div>
    </div>
  );
}
