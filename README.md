# LeadOrbit

A web-based intelligent search and discovery platform for people, companies, and other entities using natural-language queries.

Each search calls the Exa API for web discovery and enrichment, stores the results in PostgreSQL, and streams them to the user. Agent mode uses the Exa Agent API for verified lists with optional paid email and phone lookups. Stored data can be browsed and filtered on the Database page.

## Stack

- TanStack Start (React 19, file-based routing, SSR) on Vite
- Tailwind CSS v4 and shadcn/ui
- PostgreSQL 17 via Docker Compose

## Getting started

```bash
pnpm install
cp .env.example .env    # set a real POSTGRES_PASSWORD
docker compose up -d --wait
pnpm dev
```

The app runs at http://localhost:3000. Postgres listens on `127.0.0.1:5432` only.

## Users and roles

People sign in at `/login` with Google or a one-time code sent to their email. Access is invite-only:

- `ADMIN_EMAILS` (comma-separated): admins, who see the whole app.
- `ALLOWED_EMAILS` (comma-separated): users, who see only Lists.
- Anyone else cannot sign in: no code is sent and no account is created. Removing an email from both lists blocks their next sign-in; their current session lasts until it expires (30 days) or they sign out.

Auth settings:

- `BETTER_AUTH_SECRET`: a random secret, e.g. `openssl rand -base64 32`.
- `BETTER_AUTH_URL`: the app's public URL (`http://localhost:3000` locally).
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`: from a Google Cloud OAuth client with redirect URI `<BETTER_AUTH_URL>/api/auth/callback/google`. Leave empty to hide the Google button.

Sign-in codes are not emailed yet: they are printed in the server log (`[auth] Sign-in code for …`).

## Deploying to Cloudflare Workers

The app builds for Cloudflare Workers through `@cloudflare/vite-plugin` (see `wrangler.jsonc`, with Node compatibility on). `pnpm dev` also runs the server in Cloudflare's runtime locally and reads secrets from `.env`.

In the Cloudflare dashboard (Workers → lead-orbit → Settings → Build):

- Build command: `pnpm run build`
- Deploy command: `npx wrangler deploy`

Set these as Worker secrets: `DATABASE_URL`, `EXA_API_KEY`, `ADMIN_EMAILS`, `ALLOWED_EMAILS`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`.

Workers cannot share a database connection between requests, so each request gets its own Postgres client (`withDatabase` in `src/server.ts`). The database must be reachable from Cloudflare; put Cloudflare Hyperdrive in front of it so these connections are pooled.

## Scripts

| Command        | Description                       |
| -------------- | --------------------------------- |
| `pnpm dev`     | Start the dev server on port 3000 |
| `pnpm build`   | Production build                  |
| `pnpm preview` | Preview the production build      |
| `pnpm lint`    | Run ESLint                        |
| `pnpm check`   | Check formatting with Prettier    |
| `pnpm format`  | Format with Prettier, then ESLint |

## Project structure

```
src/
  components/
    layout/     App shell, header, sidebar
    search/     Search box and result cards
    ui/         shadcn/ui components
  config/       App name, user, navigation
  lib/          Shared utilities and placeholder data
  routes/       File-based routes
```

Add shadcn components with `pnpm dlx shadcn@latest add <component>`.

## Database

```bash
docker compose up -d      # start
docker compose down       # stop, keep data
docker compose down -v    # stop and delete all data
```

`POSTGRES_PASSWORD` is only applied when the data volume is first created. To change it later, run `ALTER USER` or recreate the volume with `docker compose down -v`.
