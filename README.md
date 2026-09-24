# LeadOrbit

A web-based intelligent search and discovery platform for people, companies, and other entities using natural-language queries.

A search first checks PostgreSQL for existing data, then uses the Exa API for fresh web discovery and enrichment, stores the results back in PostgreSQL, and streams them to the user.

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
