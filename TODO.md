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

## Operations

- [ ] **Production database for Workers.** Pick a hosted Postgres reachable from Cloudflare, add a Hyperdrive binding, point `DATABASE_URL` at it, and run the migrations there. Also confirm long Agent search streams (minutes) aren't cut off by Workers request limits.
- [ ] **Cloudflare build settings.** In the dashboard set the build command to `pnpm run build:deploy` (migrates, then builds), add `DATABASE_URL` as a build variable, and set the deploy command to `npx wrangler deploy`.
- [ ] **Production sign-in settings.** Set `ADMIN_EMAILS`, `ALLOWED_EMAILS`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, and the Google client before the next deploy; without them nobody can sign in.
- [ ] **Randomize sign-in codes.** The code is fixed to `656565` (`FIXED_OTP` in `src/server/better-auth.ts`) so anyone who knows an invited email can sign in; remove `generateOTP` once an email sender is set up.
- [ ] **Email sender for sign-in codes.** Codes are only printed in the server log; pick a sender (e.g. Resend or SMTP) before users rely on email sign-in.
- [ ] **Lists: header row fill.** The starter header row's light grey fill doesn't show; bold does.
- [ ] **Invite list in the app.** Invites live in `ALLOWED_EMAILS` today; an admin screen to add and remove people would avoid redeploys.
- [ ] **Production migrations.** Run migrations 0003 to 0023 (`pnpm db:migrate`) before the next deploy.
