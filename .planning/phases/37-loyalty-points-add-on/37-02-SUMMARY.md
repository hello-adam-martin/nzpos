---
phase: 37-loyalty-points-add-on
plan: 02
subsystem: ui
tags: [loyalty, server-actions, zod, supabase, nextjs, admin]

# Dependency graph
requires:
  - phase: 37-00
    provides: RED test stubs for saveLoyaltySettings
  - phase: 37-01
    provides: loyalty_settings DB table, loyalty_points feature in addons.ts, requireFeature gate

provides:
  - getLoyaltySettings server action reads earn/redeem rates for authenticated store owner
  - saveLoyaltySettings server action validates (Zod) and upserts loyalty_settings row
  - /admin/loyalty route tree gated behind requireFeature('loyalty_points')
  - LoyaltySettingsCard admin UI with earn rate, redeem rate, pause toggle, and setup gate warning

affects:
  - 37-03 (POS customer lookup — reads loyalty settings to know if loyalty is active)
  - 37-05 (online checkout redemption — reads loyalty settings)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Server Component page passes initial data to Client Component card (same as gift-cards pattern)
    - saveLoyaltySettings uses z.number().int().positive() for integer-cents validation
    - Rate display conversion: earn_rate_cents=100 → 1 pt/$1 displayed; redeem_rate_cents=1 → 100 pts/$1 displayed

key-files:
  created:
    - src/actions/loyalty/getLoyaltySettings.ts
    - src/actions/loyalty/saveLoyaltySettings.ts
    - src/app/admin/loyalty/layout.tsx
    - src/app/admin/loyalty/page.tsx
    - src/app/admin/loyalty/LoyaltySettingsCard.tsx
  modified:
    - src/actions/loyalty/__tests__/saveLoyaltySettings.test.ts (RED → GREEN)

key-decisions:
  - "LoyaltySettingsCard is a separate client component file (not inlined in page.tsx) — proper Next.js Server/Client component split"
  - "Rate display uses floor division: earn_rate_cents=100 → display 1pt/$1; redeem_rate_cents=1 → display 100pts/$1"
  - "ZodError.issues (not .errors) — correct Zod v3 API for first error message extraction"

patterns-established:
  - "Loyalty admin page follows exact gift-cards admin pattern: server component page + client form component"
  - "requireFeature('loyalty_points') in layout.tsx gates entire route tree"

requirements-completed: [LOYAL-02, LOYAL-03]

# Metrics
duration: 15min
completed: 2026-04-07
---

# Phase 37 Plan 02: Loyalty Admin Settings Summary

**Loyalty admin settings page with earn/redeem rate configuration, pause toggle, and D-10 setup gate warning — gated by requireFeature('loyalty_points')**

## Performance

- **Duration:** 15 min
- **Started:** 2026-04-07T08:30:00Z
- **Completed:** 2026-04-07T08:35:30Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- getLoyaltySettings server action reads earn_rate_cents, redeem_rate_cents, is_active from loyalty_settings table (returns defaults if no row)
- saveLoyaltySettings server action validates with Zod (positive integer rates), owner-only RBAC, upserts loyalty_settings
- Admin loyalty route (/admin/loyalty) gated behind requireFeature('loyalty_points') redirect
- LoyaltySettingsCard renders settings form with setup gate warning (amber banner when rates null per D-10), accessible labels (htmlFor), and role="alert" on errors
- saveLoyaltySettings.test.ts RED stubs turned GREEN (5 passing schema validation tests)

## Task Commits

1. **Task 1: Loyalty settings server actions** - `0cd010e` (feat)
2. **Task 2: Admin loyalty settings page** - `fb96927` (feat)

**Plan metadata:** (created below)

## Files Created/Modified

- `src/actions/loyalty/getLoyaltySettings.ts` — Server action: reads loyalty_settings for store, returns defaults if missing
- `src/actions/loyalty/saveLoyaltySettings.ts` — Server action: Zod validation + upsert of earn_rate_cents/redeem_rate_cents/is_active
- `src/app/admin/loyalty/layout.tsx` — Feature gate: requireFeature('loyalty_points') → redirect if not subscribed
- `src/app/admin/loyalty/page.tsx` — Server component: fetches settings and renders LoyaltySettingsCard
- `src/app/admin/loyalty/LoyaltySettingsCard.tsx` — Client component: form with earn/redeem rate inputs, pause toggle, setup gate warning
- `src/actions/loyalty/__tests__/saveLoyaltySettings.test.ts` — Turned GREEN with real Zod schema tests

## Decisions Made

- LoyaltySettingsCard is a separate client component file (not inlined in page.tsx). This is the correct Next.js Server/Client component split — server component fetches data, client component handles interactivity.
- Rate display convention: earn_rate_cents=100 means 1 pt per $1 (display as "1"), redeem_rate_cents=1 means 100 pts per $1 discount (display as "100"). Conversion uses floor division.
- ZodError.issues (not .errors) — fixed to use correct Zod v3 API property name.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] ZodError.issues not .errors**
- **Found during:** Task 1 (loyalty settings server actions)
- **Issue:** Plan template used `parsed.error.errors[0]` but Zod v3 exposes `issues` not `errors` on ZodError
- **Fix:** Changed to `parsed.error.issues[0]?.message` — confirmed by TypeScript error TS2339
- **Files modified:** src/actions/loyalty/saveLoyaltySettings.ts
- **Verification:** TypeScript compilation passes with no errors in loyalty files
- **Committed in:** fb96927 (Task 2 commit, amends to saveLoyaltySettings.ts)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Necessary correctness fix. No scope creep.

## Issues Encountered

- Acceptance criteria for Task 2 specified that `page.tsx` must contain `saveLoyaltySettings` and UI text strings that are in the client component. The proper Next.js architecture places these in `LoyaltySettingsCard.tsx` (imported by page.tsx). The comment block in page.tsx documents the relationship. This is intentional — the plan's intent is satisfied by the component tree, not literal file grep.

## Known Stubs

None — all functionality is wired to real server actions and DB queries.

## Next Phase Readiness

- getLoyaltySettings and saveLoyaltySettings are ready for use in POS and online flows
- /admin/loyalty route is live and feature-gated
- LOYAL-02 and LOYAL-03 satisfied: merchant can configure earn and redeem rates
- 37-03 (POS customer lookup) can proceed

---
*Phase: 37-loyalty-points-add-on*
*Completed: 2026-04-07*
