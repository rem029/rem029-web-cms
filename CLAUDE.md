# CLAUDE.md

Guidance for Claude Code in this repo. Built by hand before AI tooling — respect the existing patterns over "template defaults".

## Project

Payload CMS 3.44 + Next.js 15 (App Router) + Postgres, started from the official Payload website template and customised heavily.

- Admin: `/admin` (`src/app/(payload)`), frontend: `src/app/(frontend)`
- Collections: Pages, Posts, Media, Categories, Users, Roles, Analytics (`src/collections`)
- Globals: Header, Footer, Theme, Settings (`src/Header`, `src/Footer`, `src/Theme`, `src/Settings`)
- Styling: Tailwind 3 + shadcn-style primitives in `src/components/ui`, CSS variables in `src/app/(frontend)/globals.css`; site themes are editable in the Theme global
- Localization: `en`, `ar` (`src/utilities/constant.ts`). Locale is stored in a cookie set by `src/middleware.ts` (`?lang=ar`). Arabic renders `dir="rtl"` — **every UI change must work in RTL** (prefer logical utilities like `ms-`/`me-`/`ps-`/`pe-`/`start-`/`end-`)

## Commands

Package manager is **pnpm** (scripts and `.vscode` assume it; `yarn.lock` is a leftover).

```bash
pnpm dev                    # dev server (turbopack), DB schema auto-pushed in development
pnpm build                  # production build (+ sitemap via postbuild)
pnpm lint / pnpm lint:fix
pnpm generate:types         # regenerate src/payload-types.ts after any schema change
pnpm generate:importmap     # after adding/moving admin components referenced by path
pnpm payload migrate:create <name>   # create a migration after schema changes
pnpm payload migrate        # run migrations
pnpm release                # standard-version bump + CHANGELOG
```

There is no test suite. Verify with `pnpm lint`, `npx tsc --noEmit`, and (for anything non-trivial) `pnpm build`.

## Conventions

- Prettier: single quotes, no semicolons, trailing commas, width 100. Path alias `@/` → `src/`.
- Commits: Conventional Commits (`feat:`, `fix:`, `refactor:`, `chore:`) — `standard-version` builds the CHANGELOG from them.
- Branches: `staging` is the main/PR target; `production` is deployed from staging.
- **Never hand-edit** `src/payload-types.ts` or `src/app/(payload)/admin/importMap.js` — regenerate them.
- **Schema changes need a migration.** Dev uses `push: true`, so the DB looks fine locally even without one; production does not push. After changing any collection/global/block field: `generate:types` → `migrate:create` → commit both the `.ts` and `.json` migration files (index is updated automatically).
- Blocks live in `src/blocks/<Name>/{config.ts,Component.tsx}`. `src/blocks/old/*` are legacy template blocks still used by Pages/Posts — don't delete without a migration plan.
- Access control: use `accessCheckResolver(slug, 'canRead' | 'canCreate' | 'canUpdate' | 'canDelete')` from `src/utilities/access.ts`. Users with `super_user` bypass all checks; otherwise permissions come from the user's Role. `src/access/checkPermission.ts` is an older unused implementation.
- Use `createdUpdatedByFields` + `setCreatedUpdatedBy*` hooks for audit fields on new collections/globals.
- Secrets come from `.env` (see `.env.example`); never commit `.env`.

## Workflow: Claude plans & reviews, agy-bridge builds

For **long or multi-file tasks**, Claude acts as planner/reviewer and delegates implementation to the `agy-bridge` MCP server (Antigravity/Gemini):

1. **Plan** — Claude reads the code and writes the plan in `docs/<branch>/` (see below). Get an `mcp__agy-bridge__adversarial_review` of the plan for anything touching schema, access control, or migrations.
2. **Build** — delegate each phase with `mcp__agy-bridge__delegate` (`cwd` = repo root). The prompt must be self-contained: point it at the phase file, list files to touch, conventions above, and the definition of done (lint + tsc pass, types/migrations regenerated). Use `mcp__agy-bridge__follow_up` with the returned `session_id` for corrections instead of re-delegating.
3. **Review** — Claude reviews the diff itself (`git diff`), runs lint/tsc/build, and fixes or sends back issues. Then write the phase `-result` file.
4. Use `analyze_files` / `deep_search` / `web_lookup` to keep large files, git archaeology, and doc lookups out of Claude's context.

Small, single-file changes: just do them directly.

## Planning docs (`docs/`)

```
docs/<branch-name>/
├── .plan.md                                   # overview: goal, scope, approach, phase list, status
├── phases/
│   ├── phase-1-<short-description>.md         # what to build, files, acceptance criteria
│   └── phase-1-<short-description>-result.md  # written after implementing: what changed, deviations, follow-ups
└── references/                                # specs, screenshots, API notes, research
```

- `<branch-name>` = current git branch with `/` replaced by `-`.
- Only create `phases/` when the plan is big enough to split; small plans live entirely in `.plan.md`.
- Keep `.plan.md` status current (phase checklist) so work can resume across sessions.
- Templates: `docs/README.md`.

## UI/UX: impeccable

The [impeccable](https://impeccable.style) skill is installed in `.claude/skills/impeccable` for design work (`/impeccable audit`, `critique`, `polish`, `layout`, `typeset`, `adapt`, `harden`, …). Its hooks (`.claude/settings.json`) run a design detector after UI edits.

- Design context lives in `PRODUCT.md` and `DESIGN.md` at the repo root (created by `/impeccable init` and `/impeccable document`). Read them before UI work.
- Frontend design must still respect the Theme global (CSS variables), Tailwind tokens, and RTL.
- The engine binary (`.claude/skills/impeccable/scripts/bin/`) is gitignored; the launcher downloads it on first run. Update with `npx impeccable update`.
