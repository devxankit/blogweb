# CosmosLens

Long-form space and science journalism: the reader site, its admin panel, and the
API behind both.

```
frontend/   the site and the admin panel (React Router 7, server-rendered)
backend/    the API and database (Express, MongoDB)
```

## Run it locally

Two terminals. The first time, run `npm install` in each folder and create the
`.env` files from `.env.example` (see each folder's README).

```bash
# 1. The API, on http://localhost:4000
cd backend
npm run seed      # first time only: loads the stories and admin accounts
npm run dev

# 2. The site, on http://localhost:5173
cd frontend
npm run dev
```

- Site: http://localhost:5173
- Admin panel: http://localhost:5173/admin. Sign in with `SEED_ADMIN_EMAIL` and
  `SEED_ADMIN_PASSWORD` from `backend/.env`, then change the password under
  Account.

## How the pieces fit

Readers' browsers only ever talk to the site. The site's server calls the API for
every page, caching responses in memory so pages render in milliseconds, and
clears that cache whenever something changes in the admin panel. The admin panel
calls the API from the site's server too, so the sign-in token never reaches the
browser.

```
browser ──> site (Vercel: cosmoslens) ──> API (Vercel: cosmoslens-api) ──> MongoDB Atlas (Mumbai)
                                                          └──> Vercel Blob (uploaded images)
```

## Production (Vercel)

Two Vercel projects in the `ram312908-gmailcoms-projects` team, both in the Mumbai
region (`bom1`), next to the database:

| Project | Root directory | Address |
|---|---|---|
| `cosmoslens` | `frontend` | https://www.cosmoslens.com |
| `cosmoslens-api` | `backend` | https://cosmoslens-api.vercel.app |

`www.cosmoslens.com` is the main address; `cosmoslens.com` redirects to it. The
site's `VITE_SITE_URL` and the API's `CORS_ORIGIN` are set to it.

- **API:** runs as one Vercel function. `npm run build` (`backend/build.mjs`)
  bundles it into `dist/app.js`, which `backend/api/index.js` serves. Uploaded
  images go to the Vercel Blob store `cosmoslens-media`.
- **Settings:** set in each project's Environment Variables, not in files.
  - **API:** `MONGODB_URI`, `JWT_SECRET`, `INTERNAL_API_KEY`, `CORS_ORIGIN` and
    `BLOB_READ_WRITE_TOKEN`, which Vercel added when the Blob store was connected.
  - **Site:** `API_URL`, `INTERNAL_API_KEY` (the same value as the API's),
    `SESSION_SECRET`, `VITE_SITE_URL` and `SITE_NOINDEX`.
- **Search engines:** `SITE_NOINDEX=1` on the `cosmoslens` project keeps them out
  until the site is ready to be public. To open it, delete that variable and
  redeploy the site.
- **Deploying:** both projects are connected to `devxankit/blogweb` on GitHub.
  Every push to `main` builds and deploys both automatically. Pushes to any other
  branch get preview deployments. A build that fails never replaces the live
  site, so the previous version keeps running.
- **One database:** local development uses the same MongoDB database as the live
  site, so anything you publish or delete locally changes the live site too.
