import { index, layout, prefix, route, type RouteConfig } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),

  // Admin panel. Sign-in sits outside the layout, which requires an account.
  ...prefix("admin", [
    route("login", "routes/admin/login.tsx"),
    route("logout", "routes/admin/logout.ts"),
    layout("routes/admin/layout.tsx", [
      index("routes/admin/dashboard.tsx"),
      route("articles", "routes/admin/articles.tsx"),
      route("articles/new", "routes/admin/article-edit.tsx", { id: "admin-article-new" }),
      route("articles/:id", "routes/admin/article-edit.tsx", { id: "admin-article-edit" }),
      route("media", "routes/admin/media.tsx"),
      route("authors", "routes/admin/authors.tsx"),
      route("authors/new", "routes/admin/author-edit.tsx", { id: "admin-author-new" }),
      route("authors/:id", "routes/admin/author-edit.tsx", { id: "admin-author-edit" }),
      route("sections", "routes/admin/sections.tsx"),
      route("subscribers", "routes/admin/subscribers.tsx"),
      route("subscribers/export", "routes/admin/subscribers-export.ts"),
      route("messages", "routes/admin/messages.tsx"),
      route("home-page", "routes/admin/home-page.tsx"),
      route("users", "routes/admin/users.tsx"),
      route("account", "routes/admin/account.tsx"),
      route("*", "routes/admin/not-found.tsx"),
    ]),
  ]),

  // Reader forms and page views, passed on to the API.
  route("forms/:form", "routes/forms.ts"),

  route("articles", "routes/archive.tsx", { id: "archive" }),
  route("articles/page/:page", "routes/archive.tsx", { id: "archive-page" }),
  route("articles/:slug", "routes/article.tsx"),

  route("authors", "routes/authors.tsx"),
  route("authors/:slug", "routes/author.tsx"),
  route("tags/:tag", "routes/tag.tsx"),
  route("search", "routes/search.tsx"),

  route("about", "routes/about.tsx"),
  route("contact", "routes/contact.tsx"),
  route("newsletter", "routes/newsletter.tsx"),
  route("contribute", "routes/contribute.tsx"),
  route("editorial-standards", "routes/editorial-standards.tsx"),
  route("privacy", "routes/privacy.tsx"),
  route("terms", "routes/terms.tsx"),
  route("cookies", "routes/cookies.tsx"),

  route("sitemap.xml", "routes/sitemap.ts"),
  route("rss.xml", "routes/rss.ts"),
  route("robots.txt", "routes/robots.ts"),

  // Section fronts live at the top level (/cosmos). Static routes above win.
  route(":section", "routes/section.tsx", { id: "section" }),
  route(":section/page/:page", "routes/section.tsx", { id: "section-page" }),

  route("*", "routes/not-found.tsx"),
] satisfies RouteConfig;
