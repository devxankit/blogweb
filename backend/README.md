# CosmosLens — backend

The API behind the CosmosLens site and its admin panel: Node, Express 5, MongoDB
(Mongoose 9) and TypeScript, run with `tsx` (no build step).

## Run it

```bash
npm install
cp .env.example .env   # then fill it in (see below)
npm run seed           # load the launch content and the two admin accounts
npm run dev            # http://localhost:4000, restarts on changes
npm start              # same, without watching
npm run typecheck
```

Restart the API after running the seed or editing the database by hand: it keeps
images, authors and sections in memory (see Caching).

### Settings (`.env`)

| Variable | What it is |
|---|---|
| `MONGODB_URI` | MongoDB connection string, including the database name (`…/blogweb`) |
| `JWT_SECRET` | Long random string that signs admin sessions. Changing it signs everyone out |
| `INTERNAL_API_KEY` | Shared secret; the same value goes in `frontend/.env`. Lets the site report page views and readers' IPs |
| `MEDIA_PUBLIC_URL` | Public address of this server's `/media` folder, where uploads are served |
| `CORS_ORIGIN` | Comma-separated origins allowed to call the API from a browser |
| `SEED_ADMIN_*`, `SEED_EDITOR_*` | Name, email and password of the accounts `npm run seed` creates |
| `PORT` | Defaults to 4000 |

Generate secrets with
`node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`.

## The seed

`npm run seed` adds whatever is missing and never overwrites edits made in the
admin panel, so it is safe to run again. `npm run seed -- --reset` first deletes
all stories, authors, sections and the launch image records.

It loads, from `src/seed-data/`:

- the six sections, six authors and 16 stories written for launch;
- records for the 27 launch images, whose files ship with the frontend in
  `frontend/public/images/stories`;
- the home page settings (long-reads band);
- an administrator and an editor account from the `SEED_*` variables. An account
  that already exists keeps its password.

## Accounts and roles

Admin accounts are separate from authors: an author is a byline on the site, an
account is someone who can sign in.

- **Editor:** stories, media, authors, sections, home page, subscribers, messages.
- **Administrator:** all of that, plus creating and managing accounts.

Passwords are hashed with bcrypt. Sign-in issues a 7-day token (JWT). Changing a
password, a role, or turning an account off signs that account out everywhere.
The panel never exposes the token to the browser: the frontend server keeps it in
an httpOnly, signed cookie. At least one active administrator always remains.

## API

Everything is JSON under `/api`.

**Public** (what the site reads; only published stories whose date has passed):

| Endpoint | Returns |
|---|---|
| `GET /site` | Sections and home page band text |
| `GET /home` | Cover story, cover lines, latest, long reads |
| `GET /articles?page&limit&section&tag&author` | A page of story summaries |
| `GET /articles/:slug` | One story with its author, section, related, newer and older |
| `GET /most-read?limit` | Most read in the last 30 days (then all-time, then newest) |
| `GET /section-leads?per` | The newest stories in each section |
| `GET /authors`, `GET /authors/:slug` | Contributors and their stories |
| `GET /tags`, `GET /tags/:slug` | Topics and their stories |
| `GET /search-index`, `GET /sitemap` | Search and sitemap data |
| `POST /subscribe`, `POST /contact` | Newsletter sign-up, contact form (rate-limited) |
| `POST /track` | A page view (frontend server only, needs `INTERNAL_API_KEY`) |

**Sign-in:** `POST /auth/login`, `GET /auth/me`, `POST /auth/password`.

**Admin** (`/api/admin/…`, needs a token): `stats`, `articles` (plus `/:id/status`
and `/tags`), `authors`, `sections`, `images` (multipart upload), `subscribers`
(plus `export.csv`), `messages`, `settings`, and `users` (administrators only).

Errors look like `{ "error": "Message", "fields": { "title": "Add a headline." } }`.

## How stories are stored

- The body is a list of typed blocks (`p`, `h2`, `h3`, `quote`, `figure`, `list`,
  `aside`), validated with zod. Paragraph and list HTML is sanitized on the way
  in: only links, emphasis, bold, super- and subscript, `code` and `abbr` survive.
- A draft needs only a headline. Publishing needs a standfirst, a cover image,
  alt text and at least one block.
- A published story with a future date is scheduled: readers see it from that
  moment, with no job to run.
- Word count, reading time, topic slugs and the images each story uses are worked
  out on save. An image used by a story cannot be deleted.

## Images

Uploads (JPEG, PNG, WebP, AVIF or TIFF) are converted with sharp to AVIF and WebP
at 480, 800, 1200 and 1600 pixels wide, plus a 1200×630 JPEG for social sharing.

- **On Vercel** (`BLOB_READ_WRITE_TOKEN` set): the files go to the Vercel Blob
  store and are served from its CDN with a one-year cache. Vercel limits request
  bodies to 4.5 MB, so the admin panel scales larger photos down in the browser
  before uploading.
- **Locally:** they are written to `uploads/stories` and served from `/media`
  (`MEDIA_PUBLIC_URL`).

## Statistics

The site reports one page view per page a reader opens. Bots, link prefetches and
admin pages are not counted. Views are stored as daily counters per path, which
gives the dashboard its views per day, most-read stories, views by section and
most-visited pages. Nothing personal is stored.

## Caching

Images, authors and sections are cached in memory and reloaded after any change
made through the API. This assumes one API process; to run several, remove the
caches in `src/lib/serialize.ts` or add a shared cache.

## Security notes

- Keep `.env` out of version control (it is in `.gitignore`). If the database
  password has ever been shared, change it in MongoDB Atlas (Database Access) and
  update `MONGODB_URI`.
- In Atlas, allow connections only from your server's IP (Network Access).
- Sign-in is limited to 10 failed attempts per 15 minutes per IP, the reader forms
  to 8 per 10 minutes. Behind a proxy, make sure the site passes the real client
  IP (`X-Forwarded-For`).
- `helmet` sets security headers; CORS allows only `CORS_ORIGIN`.

## Layout

```
src/
  index.ts            server setup and routes
  config.ts, db.ts    settings and the MongoDB connection
  models/             Mongoose schemas
  lib/                auth, validation, sanitizing, image processing, serializers
  routes/public.ts    the public API
  routes/auth.ts      sign-in and password changes
  routes/admin/       the admin API
  seed.ts, seed-data/ the launch content
```
