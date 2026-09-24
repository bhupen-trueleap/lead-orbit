# LeadOrbit Rulebook

## Mission

- Build LeadOrbit: a web-based intelligent search and discovery platform for people, companies, and other entities using natural-language queries.
- Search flow: check PostgreSQL for existing data first, then use the Exa API for fresh web discovery and enrichment, store results back in PostgreSQL, and stream them to the user.
- Keep the codebase simple, composable, and reusable.
- No app-level auth, user accounts, or profiles: access is gated by Cloudflare and limited to @trueleap.io users.
- Prioritize fastest load time at deployment and fast SSR.
- Ship in small, safe, incremental steps.

## Non-Negotiable Rules

- Never commit automatically. Only run `git commit` when explicitly asked.
- Never add Claude/AI as author or co-author on commits: no `Co-Authored-By` trailer and no "Generated with Claude Code" lines, in commit messages or PR descriptions.
- Always ask for technical decisions (with a recommendation) before adding a new library or paradigm.
- No type assertions to bypass strict typing (`as`, non-null `!`, unsafe casts).
- No unnecessary comments during implementation.
- Ensure lint and format checks pass with zero errors/warnings before finishing a change.
- Keep `CLAUDE.md` updated when the project direction changes.
- Prefer reusable code and composable building blocks.
- Keep SSR simple and fast.
- Avoid unnecessary complexity.
- Look for available skills before implementation and use them when relevant.
- Design UI for all screen sizes by default.
- Use media queries and container queries when responsiveness needs component-level control.
- Minimize custom CSS; keep only essential tokens/keyframes/effects and prefer utility classes.
- Do not use `!important` in CSS.
- Do not use arbitrary/random `z-index`; use a small intentional layer scale.

## Decision Protocol

- If a change introduces a new library, framework pattern, or architectural paradigm:
  - Ask one focused technical question.
  - Put the recommended option first.
  - State what changes based on each option.

## Working Loop

- Pick one small task.
- Implement smallest complete slice.
- Run lint and format checks, fix all errors/warnings.
- Report what changed and leave it uncommitted for review.
- Repeat.

## Documentation Index (Where to Look)

- Project setup/context: `README.md`
