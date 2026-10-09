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

People sign in at `/login` with their email and a password. There is no self sign-up: an admin sets each person's password. Access is invite-only, and the invite list lives in the database (`auth_invite`: email and role):

- Admins see the whole app; users see only Lists.
- Admins choose in **Settings → User permissions** whether users can search from their lists and which search depths (Fast, Normal, Deep, Agent) they get. It is one setting for all users, enforced on the server; by default everything is allowed.
- Anyone not on the list cannot sign in, even with a password, and loses access on their next request once removed.
- `ADMIN_EMAILS` (comma-separated) is a fallback only: those emails are always admins, so the first admin can get in and nobody can lock everyone out. Everyone else belongs in the database.

Auth settings:

- `BETTER_AUTH_SECRET`: a random secret, e.g. `openssl rand -base64 32`.
- `BETTER_AUTH_URL`: the app's public URL (`http://localhost:3000` locally). Emails link to `<BETTER_AUTH_URL>/login`.
- `BREVO_API_KEY`, `EMAIL_FROM`: optional. A Brevo API key and a sender address verified in Brevo (Senders → Add a sender; no DNS needed). Leave empty to send no email.

Admins manage this in **Settings → People**: invite an email with a role and a password, change roles, reset passwords, and remove people. When email is set up, the person is emailed the sign-in address, their email, and the password (on invite and on password reset); the details are also shown to the admin once, in case the email does not arrive. Admins can't remove or demote themselves or an `ADMIN_EMAILS` admin.

The same actions are available from the terminal (useful for the first admin or when locked out):

```bash
pnpm user:password person@company.com              # invite as a user, generate a password and print it
pnpm user:password person@company.com 'their-pass' # or choose the password (8+ characters)
pnpm user:password person@company.com --admin      # invite as an admin
pnpm user:invite person@company.com [--admin]      # invite or change role without touching the password
pnpm user:remove person@company.com                # revoke access and sign them out
```

Passwords are hashed with PBKDF2-SHA256 through Web Crypto (`src/server/password.ts`), which runs natively on Workers and stays inside the free plan's CPU limit. `user:password` also resets a forgotten password and signs the person out everywhere. These commands use `DATABASE_URL` from `.env`; for production, run them with the production URL: `DATABASE_URL='postgres://…' pnpm user:password …`.

## Deploying to Cloudflare Workers

The app builds for Cloudflare Workers through `@cloudflare/vite-plugin` (see `wrangler.jsonc`, with Node compatibility on). `pnpm dev` also runs the server in Cloudflare's runtime locally and reads secrets from `.env`.

In the Cloudflare dashboard (Workers → lead-orbit → Settings → Build):

- Build command: `pnpm run build:deploy` (runs `pnpm db:migrate`, then `vite build`, so the database is migrated before each deploy)
- Deploy command: `npx wrangler deploy`

Set `DATABASE_URL` as a build variable too (Settings → Build → Variables and secrets), since migrations run during the build. Use the production branch only for this build command; preview branches should use `pnpm run build` so they never migrate production.

Set these as Worker secrets: `EXA_API_KEY`, `ADMIN_EMAILS`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, and, for emails, `BREVO_API_KEY` and `EMAIL_FROM`.

Workers cannot share a database connection between requests, so each request gets its own Postgres client (`withDatabase` in `src/server.ts`). The app reaches the database through Cloudflare Hyperdrive (the `HYPERDRIVE` binding in `wrangler.jsonc`, query caching off), which keeps connections pooled, and Smart Placement runs the Worker near the database. In `pnpm dev` the binding connects to `CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE` from `.env` (set it to the same value as `DATABASE_URL`). Migrations and the `pnpm user:*` commands still use `DATABASE_URL` directly.

## Scripts

| Command             | Description                                              |
| ------------------- | -------------------------------------------------------- |
| `pnpm dev`          | Start the dev server on port 3000                        |
| `pnpm build`        | Production build                                         |
| `pnpm build:deploy` | Run database migrations, then build (used by Cloudflare) |
| `pnpm preview`      | Preview the production build                             |
| `pnpm lint`         | Run ESLint                                               |
| `pnpm check`        | Check formatting with Prettier                           |
| `pnpm format`       | Format with Prettier, then ESLint                        |

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
