# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

The internal growth and partnerships team at TrueLeap. They use LeadOrbit to find people and companies worth partnering with or reaching out to, such as founders, community builders, and startups in a given region or niche. Access is invite-only through the app's own sign-in; there are no customer-facing users.

## Product Purpose

LeadOrbit lets the team describe who or what they are looking for in plain language and get a usable list of people, companies, and other entities back. Success means the team goes from an idea ("fintech founders in Singapore", "community builders in Houston") to a shortlist they can act on quickly, without hand-building filters or paying per seat for a contact database.

After finding good results, the team:

- reaches out directly, mostly through LinkedIn and email;
- curates shortlists they come back to inside LeadOrbit (saved searches, collections);
- exports results into a CRM or other tools.

## Positioning

Natural-language search backed by a private database that grows with every search. Queries are written in plain words rather than rigid filters, and every result Exa returns is stored with its extracted columns, so the team builds a searchable, filterable lead database over time instead of losing each one-off web search.

## Operating Context

- Every search calls the Exa Search API directly (no database-first lookup), stores everything in PostgreSQL, and streams the results into a results table. Stored data is browsed and filtered on the Database page.
- Results are people, companies, and web pages (news, articles). People and companies carry structured data from Exa: title, company, location, work history, headcount, funding, headquarters, web traffic.
- Work happens on desktop in a browser, alongside LinkedIn, email, and a CRM.
- Screens: Dashboard (search box, example prompts, recent searches), Searches (streaming results, filter, result count, save), Database (spreadsheet import into the shared database, plus the whole stored database with search, filters, sorting, pagination), Saved Searches, Lists (each person's own lists, shown as cards; private to the owner, admins can view everyone's read-only; each list is a full spreadsheet workbook built on Univer, with tabs, formulas, and formatting, autosaved; new lists start with a Leads tab and a starter header row; a list opens full screen with a Search panel on the right that pre-selects search columns from the active tab's header row, asks which unmatched headers to search for, and appends ticked results to the tab under matching headers, skipping URLs already in it; importing a .xlsx, .xlsm, .xlsb, .xls, .ods, .numbers, .csv, or .tsv file replaces all of the list's tabs with the file's sheets (after a confirmation if the list already has data), and download as .xlsx, .xls, or .ods (all tabs) or .csv and .tsv (current tab), using SheetJS in the browser; lists are standalone, and nothing in them reaches the shared database unless someone uses "To database" on a tab; users can run the search modes that admins allow in Settings from this panel, with Agent runs confirmed), Collections (named lists filled from search results; list page with name search and sort, plus a detail page per collection with the Database toolbar: search, filters, sorting, column picker, remove, and CSV export), Settings (admins only, built as sections of cards so more settings can be added; People: who can sign in, with role, whether a password is set, and invite date; invite an email with a role and a password, change roles, reset passwords, and remove people; User permissions: turn the list Search panel on or off for all users and choose which search depths, Fast, Normal, Deep, and Agent, users may run; applies to every user including later invites, admins are never restricted).

## Capabilities and Constraints

- Result types: All plus every Exa category (People, Companies, News, Research papers, Personal sites, Financial reports); result count 1 to 100; depth Fast, Normal, Deep, or Agent.
- Agent depth uses the Exa Agent API (`/agent/runs`): it builds a verified list up to the chosen size, with a fixed effort tier (Minimal by default, $0.012 to $1.00 per run, plus $0.005 per web search). Email and phone columns become paid lookups only in Agent mode ($0.02 per email, $0.07 per phone) and carry price badges; every Agent run needs a cost confirmation. Runs are polled server-side, stored in `agent_runs`, and can be reopened from Recent searches (`/searches?run=<id>`) without rerunning. Per-field citations and confidence are stored in `field_values` and shown on hover.
- Every search sends Exa a structured-output schema built from the columns picked before searching (per-category presets plus user-created text, number, or yes/no columns). Extracted values are stored in `field_values`: facts on the entity, yes/no checks per search.
- Exa can only strictly filter by category, domains, and publish dates; location, title, seniority, headcount, funding, and follower counts cannot be enforced at search time and must be filtered on stored data afterwards.
- LinkedIn follower counts appear in stored LinkedIn profile text but are not yet parsed into a filterable field.
- Every search costs an Exa call, including repeats. Exa Websets (verified lists) is not available on the current Exa plan.
- Sign-in with email and password (set by an admin); only invited emails get in (the invite list is stored in the database and managed by admins in Settings). The signed-in email identifies each person; saved searches, recent searches, and lists are scoped by it. Two roles: admins see the whole app; users see only Lists, their own CRM-style lists.
- Spreadsheet import into the shared database: admins upload a file on the Database page, and anyone can send a list tab with "To database". A preview maps each column to Name, LinkedIn or website URL, Type, an existing column, a new column, or nothing. Rows are matched to existing leads by normalised URL; existing leads only get empty fields filled in, never overwritten. Rows without a name or a valid URL, and repeated URLs, are skipped and reported. Imported values are marked with confidence "imported".
- Collections are shared by everyone (no owner is stored) and hold people, companies, and pages. On the Searches page, ticked rows (or the whole result list when nothing is ticked) are added to a new or existing collection. A collection is a one-time copy: it keeps no link to the search it came from, and deleting it never deletes stored data. Inside a collection, pages respond to search text, Type, Site, and Date added only; a column filter hides them, and they are listed after people and companies.
- Terminology: "entity" is any stored person, company, or organization; "page" is a stored web page; "saved search" is a bookmarked query.
- Undecided: which CRM exports go to; query parsing with an LLM; semantic (vector) search; copying data into BigQuery for analytics.

## Brand Commitments

- Product name: LeadOrbit.

## Evidence on Hand

- Real stored data in the local PostgreSQL database (people, companies, pages, work history, searches).
- Sample Exa responses in the project root: `exa-deep-raw.json`, `deep-community.json`, `deep-community-response.json`.
- No customers, testimonials, pricing, or usage metrics exist. This is an internal tool; do not invent any.

## Product Principles

- Plain language first: the team describes what they want; the product does the translation into search and filters.
- Every search compounds: nothing Exa returns is thrown away; it becomes part of a filterable lead database.
- Actionable over exhaustive: a short, trustworthy list the team can contact or export beats a long, noisy one.
- Honest about certainty: show where data came from (stored or fresh from the web) and never present guessed values as verified.
- Cost-aware: paid calls are deliberate and visible, not hidden in background work.
