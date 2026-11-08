import { useEffect, useState } from "react";
import { Form, Link, NavLink, Outlet, useLocation, useNavigation } from "react-router";
import { ThemeToggle } from "~/components/site-header";
import { CloseIcon, MenuIcon } from "~/components/icons";
import { site } from "~/config/site";
import { adminApi, requireUser } from "~/lib/admin.server";
import "~/styles/admin.css";
import type { Route } from "./+types/layout";

export async function loader({ request }: Route.LoaderArgs) {
  const { user } = await requireUser(request);
  const [{ unread }, comments] = await Promise.all([
    adminApi<{ unread: number }>(request, "/messages?filter=unread&limit=1"),
    adminApi<{ counts: { pending: number } }>(request, "/comments?status=pending&limit=1"),
  ]);
  return { user, unread, pendingComments: comments.counts.pending };
}

export const meta: Route.MetaFunction = () => [{ title: `Admin | ${site.name}` }, { name: "robots", content: "noindex, nofollow" }];

const NAV = [
  {
    group: "Publishing",
    items: [
      { to: "/admin", label: "Dashboard", end: true },
      { to: "/admin/search-console", label: "Google Search" },
      { to: "/admin/articles", label: "Stories" },
      { to: "/admin/media", label: "Media library" },
      { to: "/admin/home-page", label: "Home page" },
    ],
  },
  {
    group: "Structure",
    items: [
      { to: "/admin/sections", label: "Sections" },
      { to: "/admin/authors", label: "Authors" },
    ],
  },
  {
    group: "Readers",
    items: [
      { to: "/admin/analytics", label: "Reader activity" },
      { to: "/admin/comments", label: "Comments", badge: "pending" as const },
      { to: "/admin/subscribers", label: "Subscribers" },
      { to: "/admin/messages", label: "Messages", badge: "unread" as const },
    ],
  },
];

export default function AdminLayout({ loaderData }: Route.ComponentProps) {
  const { user, unread, pendingComments } = loaderData;
  const badges = {
    unread: { count: unread, label: "unread" },
    pending: { count: pendingComments, label: "waiting for review" },
  };
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigation = useNavigation();
  const loading = navigation.state === "loading" && !navigation.formMethod;

  useEffect(() => setOpen(false), [location.pathname]);

  return (
    <div className={open ? "nr nr--menu-open" : "nr"}>
      <aside className="nr-side" aria-label="Admin">
        <div className="nr-side__top">
          <Link to="/admin" className="nr-brand">
            {site.name}
            <span className="nr-brand__tag">Admin</span>
          </Link>
          <button type="button" className="icon-button nr-side__close" onClick={() => setOpen(false)} aria-label="Close menu">
            <CloseIcon />
          </button>
        </div>

        <Link to="/admin/articles/new" className="button nr-side__new">
          New story
        </Link>

        <nav className="nr-nav">
          {NAV.map((g) => (
            <div key={g.group} className="nr-nav__group">
              <p className="nr-nav__heading">{g.group}</p>
              <ul>
                {g.items.map((item) => (
                  <li key={item.to}>
                    <NavLink to={item.to} end={"end" in item ? item.end : false} className="nr-nav__link" prefetch="intent">
                      {item.label}
                      {"badge" in item && item.badge && badges[item.badge].count > 0 ? (
                        <span className="nr-nav__badge" aria-label={`${badges[item.badge].count} ${badges[item.badge].label}`}>
                          {badges[item.badge].count}
                        </span>
                      ) : null}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {user.role === "admin" ? (
            <div className="nr-nav__group">
              <p className="nr-nav__heading">Team</p>
              <ul>
                <li>
                  <NavLink to="/admin/users" className="nr-nav__link" prefetch="intent">
                    Users
                  </NavLink>
                </li>
              </ul>
            </div>
          ) : null}
        </nav>

        <div className="nr-side__foot">
          <a href="/" className="nr-side__site" target="_blank" rel="noopener">
            View the site <span aria-hidden="true">↗</span>
          </a>
          <div className="nr-user">
            <Link to="/admin/account" className="nr-user__name">
              <span className="nr-user__avatar" aria-hidden="true">
                {user.name
                  .split(/\s+/)
                  .map((p) => p[0])
                  .slice(0, 2)
                  .join("")}
              </span>
              <span>
                {user.name}
                <span className="nr-user__role">{user.role === "admin" ? "Administrator" : "Editor"}</span>
              </span>
            </Link>
            <ThemeToggle />
          </div>
          <Form method="post" action="/admin/logout">
            <button type="submit" className="nr-link nr-side__logout">
              Sign out
            </button>
          </Form>
        </div>
      </aside>

      <div className="nr-main">
        <div className="nr-topbar">
          <button type="button" className="icon-button" onClick={() => setOpen(true)} aria-label="Open menu" aria-expanded={open}>
            <MenuIcon />
          </button>
          <Link to="/admin" className="nr-brand">
            {site.name}
            <span className="nr-brand__tag">Admin</span>
          </Link>
        </div>
        <div className={loading ? "nr-progress nr-progress--on" : "nr-progress"} aria-hidden="true" />
        <main className="nr-content" id="main">
          <Outlet context={{ user }} />
        </main>
      </div>
      <button type="button" className="nr-scrim" aria-hidden="true" tabIndex={-1} onClick={() => setOpen(false)} />
    </div>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const message =
    error && typeof error === "object" && "status" in error && (error as { status: number }).status === 404
      ? "That page does not exist in the admin panel."
      : error instanceof Error
        ? error.message
        : "Something went wrong while loading this page.";
  return (
    <div className="nr-fatal">
      <h1>Could not load the admin panel</h1>
      <p>{message}</p>
      <p>
        Check that the API server is running (<code>npm run dev</code> in the <code>backend</code> folder), then{" "}
        <a href="/admin">try again</a>.
      </p>
    </div>
  );
}
