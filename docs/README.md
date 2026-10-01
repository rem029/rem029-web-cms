# Planning docs

one folder per ticket: `docs/<ticket-id>-<short-name>/`, all lowercase kebab-case with no spaces (e.g. `docs/rem0001-access-control/`). the branch uses the same name.

```
docs/<ticket-id>-<short-name>/
├── .plan.md
├── phases/
│   ├── phase-<n>-<short-description>.md
│   └── phase-<n>-<short-description>-result.md
└── references/
```

## `.plan.md` template

```md
# <Title>

**Branch:** <branch> · **Status:** planning | in progress | done

## Goal
What we're trying to achieve and why.

## Scope
- In:
- Out:

## Approach
Key decisions, schema/migration impact, access-control impact, UI/RTL impact.

## Phases
- [ ] phase-1-<short-description>
- [ ] phase-2-<short-description>

## Risks / open questions
```

## `phases/phase-<n>-<short-description>.md` template

```md
# Phase <n>: <Short description>

## Objective

## Files to touch
- `src/...`

## Steps

## Acceptance criteria
- [ ] `pnpm lint` and `npx tsc --noEmit` pass
- [ ] `pnpm generate:types` / migration created (if schema changed)
- [ ] Works in `en` and `ar` (RTL) (if UI changed)
```

## `phases/phase-<n>-<short-description>-result.md` template

```md
# Phase <n> result: <Short description>

## What changed
- `src/...` — ...

## Deviations from plan

## Verification
Commands run and outcomes.

## Follow-ups
```
