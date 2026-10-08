# LeadOrbit To-Do

Features and decisions parked for later. Add new items here; remove them when they ship.

## To do

- [ ] **Add to collection from the Database page.** Collections can only be filled from the Searches page today; add the same checkboxes and button to the Database table.

## Discussed, not yet scheduled

- [ ] **Find more.** Rerun an Agent search with what is already stored as the exclusion list, so each run grows the list without repeats.
- [ ] **Deep returns few results.** Exa's Deep keeps only strong matches (14 of 60 in a test). Pick one: show a note, top up with Normal, or cap Deep's number.
- [ ] **Agent defaults.** Email and Phone are ticked by default for People, so Agent runs include paid lookups unless unticked.
- [ ] **Search timeouts.** Fast (10 s) and Normal (20 s) can fail when column extraction runs long.

- [ ] **Collections: status and notes per lead.** A small pipeline (New, Contacted, Replied, Not a fit) and a free-text note per item.
- [ ] **Collections: "already in" badge.** Show on search results and the Database table which collections an entity is already in.
- [ ] **Collections: enrich.** Run an Agent pass over a collection's members to fill email and phone.

- [ ] **Lists: live sync (Google Sheets style).** Decided: build it on Cloudflare Durable Objects, not Univer's paid collaboration server. One Durable Object per open list; each browser connects by WebSocket (with hibernation), sends Univer mutations, and receives everyone else's in one shared order; the object saves the snapshot to Postgres every few seconds. Hard part: simultaneous structural edits (row or column inserts while someone types further down). Cost: free plan (100k requests/day) or included in Workers Paid; about a week of work for everyday editing.
- [ ] **Lists: conflict check (do before live sync).** Saves send the full workbook, so two windows on the same list (same login or two tabs) silently overwrite each other, last save wins. Send the version each save started from, refuse stale saves, and show "This list was changed in another window. Reload to get the latest." Also show when a list is open elsewhere.

## Operations

- [ ] **Production database for Workers.** Pick a hosted Postgres reachable from Cloudflare, add a Hyperdrive binding, point `DATABASE_URL` at it, and run the migrations there. Also confirm long Agent search streams (minutes) aren't cut off by Workers request limits.
- [ ] **Cloudflare build settings.** In the dashboard set the build command to `pnpm run build:deploy` (migrates, then builds), add `DATABASE_URL` as a build variable, and set the deploy command to `npx wrangler deploy`.
- [ ] **Production sign-in settings.** Set `ADMIN_EMAILS`, `BETTER_AUTH_SECRET`, and `BETTER_AUTH_URL` before the next deploy, then invite each person with `pnpm user:password` (or `pnpm user:invite` if they already have a password) against the production database; without them nobody can sign in. `ALLOWED_EMAILS` is no longer read and can be deleted from Cloudflare.
- [ ] **Google sign-in.** Removed for now: the trueleap.io Google account can't create a Cloud project. Bring it back (Better Auth `socialProviders.google`) once an admin grants Project Creator or creates the project.
- [ ] **Email sender.** Needed for self-serve password resets and invite emails (e.g. Resend). Until then admins set and share passwords from the People page.
- [ ] **Stronger password hashing.** PBKDF2 runs 50,000 rounds to fit the Workers free plan's 10 ms CPU limit. On Workers Paid, raise `ITERATIONS` in `src/server/password.ts` to 100,000 (the Workers maximum); old hashes keep working because each stores its own count.
- [ ] **Change password in the app.** Let people change the password an admin gave them.
- [ ] **Lists: header row fill.** The starter header row's light grey fill doesn't show; bold does.
- [ ] **Production migrations.** Run migrations 0003 to 0023 (`pnpm db:migrate`) before the next deploy.
