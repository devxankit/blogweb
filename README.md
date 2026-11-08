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
browser ──> frontend server (5173 / 3000) ──> API (4000) ──> MongoDB Atlas
                                                      └──> uploads/ (images)
```

## Production

1. API: set `NODE_ENV=production`, a real `MEDIA_PUBLIC_URL` and `CORS_ORIGIN`,
   then `npm start` in `backend/`.
2. Site: set `API_URL`, `INTERNAL_API_KEY` (same as the API), `SESSION_SECRET`
   and `VITE_SITE_URL` in `frontend/.env`, then `npm run build` and `npm start`.
3. Put both behind HTTPS (for example nginx or Caddy) and pass the client IP in
   `X-Forwarded-For`.
