---
phase: 14-store-setup-wizard-marketing
plan: 01
subsystem: database, api, auth
tags: [supabase, vitest, zod, server-actions, storage, middleware]

# Dependency graph
requires:
  - phase: 13-merchant-self-serve-signup
    provides: resolveAuth, provision_store RPC, middleware admin client pattern
  - phase: 12-multi-tenant-infrastructure
    provides: stores table, middleware structure, wildcard subdomain routing
provides:
  - supabase/migrations/018_setup_wizard.sql — setup_completed_steps + setup_wizard_dismissed columns + store-logos bucket
  - src/actions/setup/saveStoreNameStep.ts — Server Action for wizard step 1 (store name)
  - src/actions/setup/saveLogoStep.ts — Server Action for wizard step 2 (logo + color)
  - src/actions/setup/saveProductStep.ts — Server Action for wizard step 3 (first product)
  - src/actions/setup/dismissWizard.ts — Server Action to mark wizard complete
  - src/lib/setupChecklist.ts — pure function deriving 5-item checklist state
  - src/app/api/store/logo/route.ts — Logo upload Route Handler with SVG passthrough
  - src/middleware.ts — setup wizard redirect for admin routes
affects:
  - 14-02 (wizard UI builds against these Server Actions)
  - 14-03 (checklist component uses getChecklistState)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Bitwise OR for step tracking (setup_completed_steps: read → OR → write)
    - SVG passthrough vs raster sharp pipeline in upload routes
    - Pure function checklist state derivation (no DB calls in utility)
    - Middleware admin client for bypassing RLS in setup check

key-files:
  created:
    - supabase/migrations/018_setup_wizard.sql
    - src/actions/setup/saveStoreNameStep.ts
    - src/actions/setup/saveLogoStep.ts
    - src/actions/setup/saveProductStep.ts
    - src/actions/setup/dismissWizard.ts
    - src/lib/setupChecklist.ts
    - src/app/api/store/logo/route.ts
    - src/actions/setup/saveStoreNameStep.test.ts
    - src/actions/setup/saveLogoStep.test.ts
    - src/actions/setup/saveProductStep.test.ts
    - src/actions/setup/dismissWizard.test.ts
    - src/lib/setupChecklist.test.ts
  modified:
    - src/middleware.ts
    - supabase/seed.ts

key-decisions:
  - "Zod v4 installed despite ^3.x spec — uses .issues[] not .errors[] on ZodError"
  - "saveLogoStep accepts null for both logo and color (skip case still marks step complete)"
  - "Middleware admin client used for setup check to bypass RLS (consistent with tenant resolution pattern)"

patterns-established:
  - "Vitest mock pattern: vi.hoisted() for all mocks, separate SELECT vs UPDATE eq() mocks to handle terminal awaitable vs chained"

requirements-completed:
  - SETUP-01
  - SETUP-02
  - SETUP-03

# Metrics
duration: 6min
completed: 2026-04-03
---

# Phase 14 Plan 01: Setup Wizard Backend Summary

**Migration + 4 Server Actions + SVG-aware logo upload + pure checklist utility + middleware setup redirect, with 36 passing unit tests**

## Performance

- **Duration:** 6 min
- **Started:** 2026-04-03T02:40:10Z
- **Completed:** 2026-04-03T02:46:00Z
- **Tasks:** 2
- **Files modified:** 14

## Accomplishments

- Migration 018 adds setup_completed_steps (bitfield) and setup_wizard_dismissed to stores, creates store-logos bucket with public read + authenticated write policies
- Four Server Actions (saveStoreNameStep, saveLogoStep, saveProductStep, dismissWizard) follow established pattern: resolveAuth → z.safeParse → bitwise OR → Supabase update
- Logo upload route mirrors products/image pattern with SVG passthrough (no sharp), 2MB limit, and 400x400 max raster resize
- Pure getChecklistState function derives 5 items from store name/slug comparison, logo_url, productCount, and orderChannels array
- Middleware redirects unauthenticated-setup admin visits to /admin/setup while excluding /admin/setup (loop prevention) and /admin/settings

## Task Commits

1. **Task 1: Schema, Server Actions, logo route, checklist utility** - `f4cfe32` (feat)
2. **Task 2: Middleware setup redirect** - `cae4cab` (feat)

## Files Created/Modified

- `supabase/migrations/018_setup_wizard.sql` — schema migration with 2 columns + store-logos bucket + 4 policies
- `supabase/seed.ts` — updated with setup_wizard_dismissed: true + setup_completed_steps: 7 for demo store
- `src/actions/setup/saveStoreNameStep.ts` — validates 1-100 chars, ORs bit 0
- `src/actions/setup/saveLogoStep.ts` — validates URL + #hex6 color, ORs bit 1, accepts null (skip)
- `src/actions/setup/saveProductStep.ts` — optionally inserts product, ORs bit 2
- `src/actions/setup/dismissWizard.ts` — sets setup_wizard_dismissed = true
- `src/lib/setupChecklist.ts` — pure function: storeName/logo/firstProduct/firstPosSale/firstOnlineOrder
- `src/app/api/store/logo/route.ts` — SVG passthrough, raster → 400x400 WebP, 2MB limit
- `src/middleware.ts` — setup redirect block after role check, before header injection
- `src/actions/setup/*.test.ts` — 36 unit tests (vi.hoisted pattern, separate SELECT/UPDATE mocks)

## Decisions Made

- **Zod v4 installed despite ^3.x spec:** Uses `.issues[]` not `.errors[]` on ZodError (discovered via test failures, fixed inline — Rule 1 auto-fix)
- **Null accepted in saveLogoStep:** Both logoUrl and primaryColor can be null — this is the "skip" case, step still marked complete (bit 1 set)
- **Middleware admin client for setup check:** Consistent with existing tenant resolution pattern; bypasses RLS to read setup_wizard_dismissed

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Zod v4 uses .issues[] not .errors[] on ZodError**
- **Found during:** Task 1 (GREEN phase — tests failing with TypeError)
- **Issue:** Project CLAUDE.md specifies Zod ^3.x but Zod v4 is actually installed. In Zod v4, `ZodError.errors` is undefined; the correct property is `ZodError.issues`.
- **Fix:** Changed `parsed.error.errors[0].message` to `parsed.error.issues[0].message` in all three Server Actions
- **Files modified:** saveStoreNameStep.ts, saveLogoStep.ts, saveProductStep.ts
- **Verification:** All 36 tests pass
- **Committed in:** f4cfe32 (Task 1 commit)

**2. [Rule 1 - Bug] Test mock for terminal .eq() in UPDATE chains returned function instead of promise**
- **Found during:** Task 1 (GREEN phase — dismissWizard "returns error when DB update fails" failing)
- **Issue:** `mockEq.mockReturnValue(mockUpdateEq)` where mockUpdateEq is a vi.fn() — awaiting a function gives the function itself, not the resolved value
- **Fix:** Rewrote test mocks to use separate SELECT-chain and UPDATE-chain mocks; terminal `.eq()` uses `mockResolvedValue` directly
- **Files modified:** saveStoreNameStep.test.ts, saveLogoStep.test.ts, saveProductStep.test.ts, dismissWizard.test.ts
- **Verification:** All 36 tests pass
- **Committed in:** f4cfe32 (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (2 Rule 1 bugs)
**Impact on plan:** Both bugs in test infrastructure and runtime code. Zero scope creep.

## Issues Encountered

None beyond the auto-fixed deviations above.

## User Setup Required

None — no external service configuration required. Migration runs via `supabase db push` or `supabase migration up`.

## Next Phase Readiness

- All Server Actions ready for Plan 02 wizard UI to call
- getChecklistState ready for Plan 03 checklist component
- Middleware redirect active — Plan 02 must deliver /admin/setup route or all admin access will redirect there
- store-logos bucket policy in place — logo upload route functional

---
*Phase: 14-store-setup-wizard-marketing*
*Completed: 2026-04-03*
