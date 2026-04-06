---
phase: 37-loyalty-points-add-on
plan: "00"
subsystem: testing
tags: [vitest, loyalty, tdd, red-stubs]

# Dependency graph
requires: []
provides:
  - RED test stubs for calculatePointsEarned, calculateRedemptionDiscount, formatLoyaltyDisplay
  - RED test stubs for ATTACH_CUSTOMER, DETACH_CUSTOMER, APPLY_LOYALTY_DISCOUNT, REMOVE_LOYALTY_DISCOUNT cart actions
  - RED test stubs for saveLoyaltySettings, quickAddCustomer, lookupCustomerForPOS server actions
  - src/actions/loyalty/__tests__/ directory created
affects: [37-loyalty-points-add-on]

# Tech tracking
tech-stack:
  added: []
  patterns: [expect(true).toBe(false) RED stub pattern (established in Phase 35, continued here)]

key-files:
  created:
    - src/lib/__tests__/loyalty-utils.test.ts
    - src/lib/__tests__/pos-cart-loyalty.test.ts
    - src/actions/loyalty/__tests__/saveLoyaltySettings.test.ts
    - src/actions/loyalty/__tests__/quickAddCustomer.test.ts
    - src/actions/loyalty/__tests__/lookupCustomerForPOS.test.ts
  modified: []

key-decisions:
  - "RED stubs use expect(true).toBe(false) pattern — matches Phase 35/36 Wave 0 convention"
  - "32 total RED stubs across 5 files (plan estimated 27 — actual count higher due to loyalty utils having 8 and cart machine having 9)"

patterns-established:
  - "Wave 0 RED stubs: create test files with expect(true).toBe(false) before any implementation"

requirements-completed: [LOYAL-02, LOYAL-03, LOYAL-04, LOYAL-09, LOYAL-11]

# Metrics
duration: 2min
completed: 2026-04-07
---

# Phase 37 Plan 00: Loyalty Points Add-On — RED Test Stubs Summary

**32 RED test stubs across 5 files for loyalty utility functions, cart state machine extensions, and server actions**

## Performance

- **Duration:** 2 min
- **Started:** 2026-04-06T20:28:14Z
- **Completed:** 2026-04-06T20:29:39Z
- **Tasks:** 2 of 2
- **Files modified:** 5

## Accomplishments
- Created RED stubs for loyalty pure functions: calculatePointsEarned (4 tests), calculateRedemptionDiscount (3 tests), formatLoyaltyDisplay (1 test)
- Created RED stubs for cart state machine loyalty extensions: ATTACH_CUSTOMER (4 tests), DETACH_CUSTOMER, APPLY_LOYALTY_DISCOUNT, REMOVE_LOYALTY_DISCOUNT (5 tests)
- Created RED stubs for 3 loyalty server actions: saveLoyaltySettings (5), quickAddCustomer with IPP 3A consent validation (5), lookupCustomerForPOS (5)
- All 32 stubs fail with `expect(true).toBe(false)` as required by Wave 0 Nyquist baseline

## Task Commits

Each task was committed atomically:

1. **Task 1: RED stubs for loyalty-utils and pos-cart-loyalty** - `13c03ba` (test)
2. **Task 2: RED stubs for loyalty server actions** - `c2da894` (test)

**Plan metadata:** (docs commit below)

## Files Created/Modified
- `src/lib/__tests__/loyalty-utils.test.ts` - 8 RED stubs for calculatePointsEarned, calculateRedemptionDiscount, formatLoyaltyDisplay
- `src/lib/__tests__/pos-cart-loyalty.test.ts` - 9 RED stubs for ATTACH_CUSTOMER, DETACH_CUSTOMER, APPLY_LOYALTY_DISCOUNT, REMOVE_LOYALTY_DISCOUNT
- `src/actions/loyalty/__tests__/saveLoyaltySettings.test.ts` - 5 RED stubs for earn_rate_cents and redeem_rate_cents validation
- `src/actions/loyalty/__tests__/quickAddCustomer.test.ts` - 5 RED stubs including IPP 3A consent_given validation
- `src/actions/loyalty/__tests__/lookupCustomerForPOS.test.ts` - 5 RED stubs for customer search result shape and min query length

## Decisions Made
- Followed expect(true).toBe(false) RED stub pattern from Phase 35/36 Wave 0
- 32 stubs created (plan estimated 27 — actual count reflects thorough coverage of all described behaviors)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All 5 RED test files in place — implementation plans (37-01 through 37-06) can now make these GREEN
- No production code created — stubs only
- Vitest confirms all 32 tests fail correctly (5 test files, 32 tests, all RED)

## Self-Check: PASSED

- FOUND: src/lib/__tests__/loyalty-utils.test.ts
- FOUND: src/lib/__tests__/pos-cart-loyalty.test.ts
- FOUND: src/actions/loyalty/__tests__/saveLoyaltySettings.test.ts
- FOUND: src/actions/loyalty/__tests__/quickAddCustomer.test.ts
- FOUND: src/actions/loyalty/__tests__/lookupCustomerForPOS.test.ts
- FOUND commit: 13c03ba (loyalty-utils + pos-cart-loyalty stubs)
- FOUND commit: c2da894 (server action stubs)

---
*Phase: 37-loyalty-points-add-on*
*Completed: 2026-04-07*
