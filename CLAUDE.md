# AGENTS Rulebook

## Mission

- Build a simple, composable, reusable waitlist product.
- Prioritize fastest load time at deployment and fast SSR.
- Ship in small, safe, incremental steps.

## Non-Negotiable Rules

- Always do small incremental git commits.
- Always ask for technical decisions (with a recommendation) before adding a new library or paradigm.
- No type assertions to bypass strict typing (`as`, non-null `!`, unsafe casts).
- No unnecessary comments during implementation.
- Ensure lint and format checks pass with zero errors/warnings before each commit.
- Always keep TODOs up to date and sync progress in plan + todo docs when implementation starts.
- Keep `CLAUDE.md`, plan doc, and todo doc updated.
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

- Read plan and todo docs first.
- Pick one small task.
- Implement smallest complete slice.
- Update todo status and unresolved questions.
- Update plan if scope or assumptions change.
- Run lint and format checks, fix all errors/warnings.
- Commit that slice.
- Repeat.

## Documentation Index (Where to Look)

- Product and architecture plan: `docs/plan/ssr-plan.md`
- Active execution tracker: `docs/todo/todo.md`
- Project setup/context: `README.md`

## Unresolved Questions Policy

- Keep unresolved questions in both plan and todo docs.
- Remove a question only when a decision is explicitly made.
- If blocked by a question, mark related todo as blocked.
