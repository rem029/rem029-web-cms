# CLAUDE.md

Guidance for Claude Code in this repo. Built by hand before AI tooling — respect the existing patterns over "template defaults".

## Product vision

A WordPress-style CMS for non-technical users, with business modules on top. Target users are businesses (restaurants first), each running as their own tenant.

1. **Website builder**: pages built in a user-friendly editor with Payload live preview. Users should be able to style things without writing code.
2. **Restaurant menu**: tenants manage menu categories and items and build customer-facing menu pages in the live editor.
3. **POS**: a cashier-facing point-of-sale screen that uses the menu data.
4. **Home page**: the public landing page, driven by the CMS like any other page.
5. **Multi-tenancy**: each tenant has its own content, and its own branding and styling across both the admin panel and the frontend components.

Every feature should be designed for the end state, even before multi-tenancy ships:
- **Tenant-scoped data.** New collections and globals must be tenant-scoped. Avoid singletons that assume one site, or document why they're fine.
- **Branding through theme tokens.** Components take their styling from Theme/CSS variables and Tailwind tokens, never hardcoded colors or fonts, so each tenant can rebrand.
- **Editor-friendly controls.** Expose options as clear admin fields (selects, toggles, presets) with sensible defaults rather than free-form CSS. The custom CSS fields (`src/fields/css`) are the escape hatch, not the main UX.
- **Live preview for every editable surface.** Pages, menus, and headers/footers should all preview live.

## Current state & roadmap

| Area | Status |
|---|---|
| Page editor (Pages/Posts + blocks + live preview) | Exists but incomplete. Needs more styling options per block (spacing, background, alignment, width, typography presets, responsive visibility) and more blocks. |
| Header / Footer globals | Basic: only `navItems` (+ `copyright` on Footer). Planned: sticky, hide-on-scroll / reveal-on-scroll-up, transparent-over-hero, shrink on scroll, layout variants, CTA button, mobile menu styles, multi-column footer, socials, newsletter. |
| Theme / Settings globals | Exist (themes array, logo, favicon, locale switch, homepage, contact). These will become per-tenant. |
| Roles & permissions | Exists (Roles collection, `super_user`). Must be extended for tenant-level roles (tenant admin, editor, cashier). |
| Restaurant menu | Not started |
| POS | Not started |
| Multi-tenancy | Not started. Evaluate `@payloadcms/plugin-multi-tenant` first. |

Track larger work in `docs/<branch>/` (see below) and keep this table current as things land.

## Project

Payload CMS 3.44 + Next.js 15 (App Router) + Postgres, started from the official Payload website template and customised heavily.

- Admin: `/admin` (`src/app/(payload)`), frontend: `src/app/(frontend)`
- Collections: Pages, Posts, Media, Categories, Users, Roles, Analytics (`src/collections`)
- Globals: Header, Footer, Theme, Settings (currently `src/Header`, `src/Footer`, `src/Theme`, `src/Settings`; new globals go in `src/globals/`)
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
- Use `createdUpdatedByFields` (`src/fields/createdUpdatedByFields.ts`) + `setCreatedUpdatedBy*` hooks (`src/hooks/setCreatedUpdatedBy.ts`) for audit fields on new collections/globals. Both are due to move to `src/common/` (REM0003).
- Secrets come from `.env` (see `.env.example`); never commit `.env`.

## Engineering principles

- **Simple, maintainable, debuggable.** Prefer the plainest code that works: small functions, clear names, early returns, no clever abstractions or premature generalisation. Duplicate twice before abstracting.
- **Debuggable failures.** Never swallow errors silently. Log with `req.payload.logger` and include context (slug, operation, user id). Use `debug` level for per-request noise like access checks, never `info`/`console.log` in hot paths.
- **Security by default.**
  - Every collection, global and field gets explicit access control, and denies by default (`fallbackAccess: false`) unless public read is intended.
  - Validate and sanitise user input.
  - Never log or store secrets, passwords, tokens or API keys. Redact them from audit data.
  - Use `overrideAccess: false` (and pass `user`) in Local API calls made on a user's behalf.
- **Typed.** Use generated types from `@/payload-types` and Payload's exported types (`import type { CollectionBeforeChangeHook } from 'payload'`), never imports from `node_modules/...` paths. Avoid `any`.
- **External packages.** Only add a dependency if it's actively maintained (recent releases and commits), widely used, and has a strong community. Prefer official `@payloadcms/*` packages. Check it first (`web_lookup`), and justify new dependencies in the plan.

## Folder structure

New code follows this layout. Existing code (`src/Header`, `src/Footer`, `src/Theme`, `src/Settings`, `src/fields`, `src/hooks`, `src/utilities`) moves over gradually when it's touched for a task. Don't refactor it unprompted.

```
src/
├── collections/<Name>/      # one folder per collection
│   ├── index.ts             # CollectionConfig
│   ├── hooks/               # used only by this collection
│   ├── components/          # admin/UI components used only by this collection
│   ├── endpoints/           # custom endpoints used only by this collection
│   └── utils/               # helpers used only by this collection
├── globals/<Name>/          # same layout as collections, with config.ts
├── common/                  # anything used by 2+ collections/globals
│   ├── hooks/
│   ├── components/
│   ├── endpoints/
│   ├── fields/
│   └── utils/
└── seeds/                   # seed data for testing features
```

- **Colocate first, then promote.** Hooks, components, endpoints and helpers start next to the one collection/global that uses them. When a second one needs them, move them to `src/common/<kind>/` in the same change. Don't leave copies behind.
- **Seeds:** every new feature that needs test data gets a seed in `src/seeds/`. Seeds must be idempotent (safe to re-run) and must never run in production. The existing template seed is in `src/endpoints/seed`.

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
