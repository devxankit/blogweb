# CosmosLens — frontend

The reader-facing site for a long-form space and science publication, and its
admin panel. Built with React 19, React Router 7 (framework mode) and Vite 8, in
TypeScript. All content comes from the API in `../backend`.

The site is called CosmosLens (cosmoslens.com). The name, tagline, emails and social
links live in `app/config/site.ts`.

## Run it

The API must be running first (`npm run dev` in `../backend`).

```bash
npm install
npm run dev        # http://localhost:5173, admin panel at /admin
npm run build      # production build
npm start          # serve the production build (Node, port 3000)
npm run typecheck
```

Copy `.env.example` to `.env` and fill it in:

| Variable | What it is |
|---|---|
| `API_URL` | Address of the API, `http://localhost:4000` in development |
| `INTERNAL_API_KEY` | Same value as in `backend/.env` |
| `SESSION_SECRET` | Long random string that signs the admin session cookie |
| `VITE_SITE_URL` | The real domain, set before a production build. Canonical URLs, Open Graph tags, JSON-LD, the sitemap and the RSS feed are built from it |
| `VITE_ADSENSE_CLIENT` | AdSense publisher ID (see AdSense below) |

## How it is put together

```
app/
  config/site.ts          name, URL, emails, AdSense IDs
  lib/content.server.ts   the only place reader pages get data from: API calls + cache
  lib/admin.server.ts     admin session cookie and admin API calls
  lib/api.server.ts       the HTTP client for the API (server-only)
  lib/api.ts              newsletter, contact form and page-view calls (browser)
  lib/sections.ts         sections, read from the root loader
  lib/seo.ts              title/description/canonical/OG/Twitter/JSON-LD per page
  lib/structured-data.ts  schema.org: NewsMediaOrganization, Article, Breadcrumbs…
  lib/images.ts           image URL builder
  components/             header, footer, story cards, article body, ads…
  components/admin/       admin UI: forms, charts, block editor, image picker
  routes/                 one file per page; routes.ts maps URLs to them
  routes/admin/           the admin panel
  routes/forms.ts         /forms/subscribe, /forms/contact, /forms/track → API
  styles/                 design tokens and component CSS (no CSS framework)
  styles/admin.css        loaded on admin pages only
public/images/stories/    the launch images (AVIF/WebP + 1200×630 share images)
```

### Where the data comes from

Every reader page gets its data from the async functions in
`app/lib/content.server.ts` (`getArticle`, `getHome`, `getSectionArticles`, …),
which call the API. The `.server` suffix keeps this code, and the API address, out
of the browser.

- Pages are rendered on the server for each request, so a story published in the
  admin panel is live at once; nothing needs rebuilding.
- API responses are cached in memory: fresh for a minute, then served from memory
  while a refresh runs in the background. Any change in the admin panel clears the
  cache and re-fetches the pages readers were viewing.
- Image records arrive with each story (`ImageRef`: key, sizes, credit, license and
  the URL prefix). Launch images are served from `public/images/stories`, uploads
  from the API's `/media`.
- Newsletter sign-ups, contact messages and page views go to `/forms/*` on this
  server, which passes them to the API with the reader's IP (for rate limits).
  Bots, link prefetches and signed-in staff are not counted as views.
- The cookie choice is made and stored in the browser (`lib/consent.ts`,
  `components/cookie-consent.tsx`), because public pages are cached and shared
  between visitors. Never read it in a loader or set a cookie on a public response.
  `lib/analytics.ts` measures only as far as that choice allows.

## Admin panel

`/admin`, for the accounts created in the backend (see `../backend/README.md`).
It uses the site's own type and colors, follows the light or dark theme, and is
kept out of search engines (`noindex`, and `Disallow: /admin` in robots.txt).

- **Dashboard:** page views per day, most-read stories, views by section, new
  subscribers per day, most-visited pages, recent edits and messages, for the last
  7, 30 or 90 days.
- **Reader activity:** for visitors who accepted analytics: time per visit, what
  got attention, how far stories are read, sources, countries, devices, recent
  visits and cookie choices.
- **Comments:** approve, reject or delete reader comments before they appear.
- **Stories:** filter by status, section and author, search, publish or unpublish
  in one click. The editor has headline, standfirst and a block editor for the
  body (paragraphs with bold, italic and links, headings, pull quotes, images,
  lists and fact boxes), plus publish date and scheduling, section, format,
  author, topics, cover image with alt text, URL and search description. Ctrl+S
  saves; leaving with unsaved changes asks first.
- **Media library:** upload images with credit and license; they are resized for
  the site automatically.
- **Home page:** pin the cover story and choose the long-reads band.
- **Sections and authors:** edit the navigation and the bylines.
- **Subscribers:** search, unsubscribe, delete, export to CSV.
- **Messages:** contact form mail, with read and unread.
- **Users** (administrators): create accounts, set roles, reset passwords.
- **Account:** change your own password.

The sign-in token stays on the server in an httpOnly, signed cookie
(`SESSION_SECRET`); the browser never sees it.

## SEO

- Every page is server-rendered HTML with a unique title, description, canonical
  URL, Open Graph and Twitter tags.
- JSON-LD: `NewsMediaOrganization` and `WebSite` (with sitelinks search) on the
  home page, `Article`/`NewsArticle` + `BreadcrumbList` on stories,
  `ProfilePage` for authors, `CollectionPage` for sections and topics.
- `max-image-preview:large` is set so stories are eligible for Google Discover.
- `/sitemap.xml` (with image entries), `/rss.xml` and `/robots.txt` are generated.
  Search pages and one-story topic pages are `noindex`.
- Semantic markup throughout: one `h1` per page, `article`, `time`, breadcrumbs,
  image credits and alt text on every image.

## Performance

Measured on the production build with Lighthouse-style mobile throttling (slow 4G,
4× CPU slowdown, cold browser cache): CLS 0 on every page; LCP about 1.2 s on
stories, 2.2 s on the home page and 2.5 s on section pages. With the content cache
warm, the server answers in 10–30 ms.

What keeps it fast:

- Server-rendered HTML from an in-memory cache; JavaScript only hydrates. The
  cache is filled when the server starts, so the first reader does not wait either.
- Fonts are self-hosted, subset and cut into small instances (`scripts/build-fonts.py`),
  with metric-matched fallbacks so the swap causes no layout shift. Only the
  headline face is preloaded.
- Images are AVIF with WebP fallback at several widths, lazy-loaded below the fold,
  with phones capped at 800px files. Width and height are always set.
- About 9 KB of CSS (gzipped), no CSS or animation framework. The admin panel's
  styles and code load only on admin pages.

## AdSense

1. Apply for AdSense with the site live on its real domain. The required pages
   (About, Contact, Privacy, Terms, Cookies, Editorial standards) already exist.
2. Put your publisher ID in `.env` as `VITE_ADSENSE_CLIENT=ca-pub-…`. This adds the
   `google-adsense-account` verification meta tag and turns ad slots on.
3. Create four ad units in AdSense (leaderboard, sidebar, in-article, in-feed) and
   paste their slot IDs into `app/config/site.ts`.
4. Uncomment and fill in the line in `public/ads.txt`.
5. Set up Google's consent message (AdSense → Privacy & messaging) for visitors from
   the EEA, UK and Switzerland; the privacy and cookie pages already describe it.

Ad slots reserve their height before loading, so ads never push content around,
and the AdSense script loads only after the first interaction or when the browser
is idle. To see where ads will appear during development, they show as dashed
placeholders in `npm run dev`; for a production build, set `VITE_AD_PREVIEW=1`.

Have the privacy policy and terms reviewed for your jurisdiction before launch.

## Design notes

- Palette: Prussian ink on a cool plate-glass white; dark mode is twilight blue.
  Tokens live in `app/styles/tokens.css`.
- Type: Newsreader (separate text and display cuts) for reading and headlines,
  Schibsted Grotesk for interface text.
- Each section is keyed to a real spectral emission line (Cosmos: oxygen III,
  500.7 nm; Planets: sodium D; and so on). The color appears only as a thin line
  beside the section name.
- Article pages show reading progress as a spectrum with absorption lines where
  each section starts; hover it to jump between sections.
- The front page cover (`app/components/cover.tsx`): minimal text on the left; on
  the right, the cover photograph seen through a telescope eyepiece, ringed by a
  setting circle with N/E marks and crossed by fine orbits that pass behind the
  view on one side and in front on the other. One orbit is drawn in the cover
  story's section color. On first load the circle turns into place, the orbits
  draw themselves and the view comes into focus; with a mouse, the view pans and
  the chart tilts slightly. All motion is off for reduced-motion users. Three
  cover lines for other stories sit beneath it.
- Launch images come from NASA, ESA, NIST, NOIRLab and others via Wikimedia
  Commons; each caption carries its credit and license.
