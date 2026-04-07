---
phase: 37-loyalty-points-add-on
plan: 07
subsystem: pos, storefront, ui
tags: [loyalty, props, server-component, supabase, typescript]

# Dependency graph
requires:
  - phase: 37-loyalty-points-add-on
    provides: POSClientShell hasLoyalty/redeemRateCents props interface, CartDrawer isAuthenticated prop interface

provides:
  - POS page fetches has_loyalty_points + redeem_rate_cents and passes to POSClientShell
  - Storefront layout passes isAuthenticated to CartDrawer
  - LOYAL-04, LOYAL-08, LOYAL-09 unblocked

affects: [37-loyalty-points-add-on, pos, storefront]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "as-any cast with eslint-disable for columns not in generated database.ts types (matches admin/layout.tsx pattern)"
    - "Conditional loyalty_settings fetch only when has_loyalty_points=true (zero cost for non-subscribers)"

key-files:
  created: []
  modified:
    - src/app/(pos)/pos/page.tsx
    - src/app/(store)/layout.tsx

key-decisions:
  - "as-any cast used for loyalty columns/tables not yet in generated database types — matches established admin/layout.tsx pattern"
  - "Conditional loyalty_settings fetch gated on has_loyalty_points=true — non-subscribers pay zero additional query cost"

patterns-established:
  - "Gap closure: only server-component prop wiring fixed — no component internals modified"

requirements-completed: [LOYAL-04, LOYAL-08, LOYAL-09]

# Metrics
duration: 12min
completed: 2026-04-07
---

# Phase 37 Plan 07: Loyalty Prop Wiring Gap Closure Summary

**POS page and storefront layout wired to pass hasLoyalty/redeemRateCents and isAuthenticated props, unblocking LOYAL-04, LOYAL-08, and LOYAL-09 without touching any component internals**

## Performance

- **Duration:** 12 min
- **Started:** 2026-04-07T02:00:00Z
- **Completed:** 2026-04-07T02:12:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- POS page now fetches `has_loyalty_points` from `store_plans` and conditionally fetches `redeem_rate_cents` from `loyalty_settings`, passing both to POSClientShell as `hasLoyalty` and `redeemRateCents`
- Storefront layout now passes `isAuthenticated={isCustomer}` to CartDrawer — single prop addition enabling loyalty balance fetch and LoyaltyRedeemControl for authenticated customers
- Applied established `as any` cast pattern (matching `admin/layout.tsx`) for columns not yet in generated database types — zero TypeScript errors in modified files

## Task Commits

Each task was committed atomically:

1. **Task 1: Wire loyalty props from POS page to POSClientShell** - `b76172b` (feat)
2. **Fix: Apply as-any cast for loyalty columns not in generated types** - `2cc0128` (fix)
3. **Task 2: Wire isAuthenticated prop from storefront layout to CartDrawer** - `fc874af` (feat)

## Files Created/Modified
- `src/app/(pos)/pos/page.tsx` - Expanded store_plans SELECT to include has_loyalty_points; added conditional loyalty_settings fetch; passed hasLoyalty and redeemRateCents to POSClientShell
- `src/app/(store)/layout.tsx` - Added isAuthenticated={isCustomer} prop to CartDrawer JSX

## Decisions Made
- Used `as any` cast + `eslint-disable` comment for loyalty columns/tables not yet in database.ts types — exactly matches the `admin/layout.tsx` pattern already established in Phase 37
- Conditional loyalty_settings query only fires when `has_loyalty_points === true`, so non-subscribers pay zero additional DB round-trip cost

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Applied as-any cast for stale database.ts types**
- **Found during:** Task 1 (Wire loyalty props from POS page to POSClientShell)
- **Issue:** `has_loyalty_points` column not in generated `database.ts` types for `store_plans`; `loyalty_settings` table entirely absent from types — pre-existing type generation gap from Phase 37 migrations not regenerating types
- **Fix:** Applied `(supabase as any)` cast with `eslint-disable-next-line @typescript-eslint/no-explicit-any` comment, plus explicit return type assertions — identical to pattern used in `admin/layout.tsx`
- **Files modified:** `src/app/(pos)/pos/page.tsx`
- **Verification:** `tsc --noEmit` produces zero errors in target files
- **Committed in:** `2cc0128` (separate fix commit after Task 1)

---

**Total deviations:** 1 auto-fixed (Rule 1 - pre-existing type generation gap)
**Impact on plan:** Fix necessary for TypeScript correctness. No scope creep — pattern was already established in the codebase.

## Issues Encountered
- Pre-existing `database.ts` type generation gap meant `has_loyalty_points` and `loyalty_settings` were not in generated types — resolved via established `as any` cast pattern (same as `admin/layout.tsx`). Other unrelated TypeScript errors in `adjustStock.ts`, `createProduct.ts`, `gift-cards/page.tsx` are pre-existing and out of scope for this plan.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All three verification truths now unblocked: LOYAL-04 (POS Add Customer + points redemption), LOYAL-08 (online CartDrawer loyalty control), LOYAL-09 (POS LoyaltyRedemptionRow)
- Phase 37 loyalty add-on is fully wired end-to-end
- No blockers for phase completion

---
*Phase: 37-loyalty-points-add-on*
*Completed: 2026-04-07*
