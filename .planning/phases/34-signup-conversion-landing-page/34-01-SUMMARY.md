---
phase: 34-signup-conversion-landing-page
plan: 01
subsystem: ui
tags: [react, nextjs, pos, demo, conversion, cta, testing]

# Dependency graph
requires:
  - phase: 33-demo-pos-route-checkout
    provides: demoMode prop pattern established in POSClientShell and POSTopBar

provides:
  - ReceiptScreen conditional demoMode CTA banner with /signup link
  - POSClientShell threads demoMode to ReceiptScreen
  - Unit tests covering CONV-01, CONV-02, CONV-03 (4 test cases)

affects: [34-02-landing-page-cta, any plan touching ReceiptScreen or demo flow]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "demoMode prop conditional rendering: guard JSX blocks with {demoMode && (...)}"
    - "TDD RED/GREEN: write failing tests first, implement minimal code to pass"

key-files:
  created:
    - src/components/pos/__tests__/ReceiptScreen.demo.test.tsx
  modified:
    - src/components/pos/ReceiptScreen.tsx
    - src/components/pos/POSClientShell.tsx

key-decisions:
  - "CTA placed between store info footer and email capture sections — most prominent position without blocking receipt content"
  - "Dismiss action reuses onNewSale callback (no new prop) — consistent with existing pattern"
  - "fireEvent used instead of userEvent — @testing-library/user-event not installed in project"

patterns-established:
  - "ReceiptScreen demoMode CTA: inline banner below receipt, navy primary button to /signup, optional dismiss via onNewSale"

requirements-completed: [CONV-01, CONV-02, CONV-03]

# Metrics
duration: 4min
completed: 2026-04-06
---

# Phase 34 Plan 01: Signup Conversion CTA Summary

**Inline demo-mode signup CTA on ReceiptScreen — navy 'Create your free store' button linking to /signup, rendered only when demoMode=true, with optional dismiss via onNewSale callback**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-04-06T09:53:12Z
- **Completed:** 2026-04-06T09:57:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- ReceiptScreen extended with `demoMode?: boolean` prop and inline CTA banner when true
- CTA renders "Create your free store" Link to /signup and optional "or start a new sale" dismiss button
- POSClientShell passes `demoMode={demoMode}` to ReceiptScreen at the sale_complete call site
- 4 TDD unit tests covering: link present, dismiss fires callback, hidden in production, renders without onNewSale

## Task Commits

Each task was committed atomically:

1. **Task 1: Add demoMode CTA to ReceiptScreen with tests** - `1dad5d8` (feat)
2. **Task 2: Thread demoMode prop through POSClientShell to ReceiptScreen** - `0f43b92` (feat)

## Files Created/Modified
- `src/components/pos/ReceiptScreen.tsx` - Added demoMode prop, Link import, conditional CTA section
- `src/components/pos/__tests__/ReceiptScreen.demo.test.tsx` - 4 unit tests for demo CTA behaviour
- `src/components/pos/POSClientShell.tsx` - Added demoMode={demoMode} to ReceiptScreen JSX

## Decisions Made
- CTA placed between store info footer and email capture sections for maximum prominence without blocking receipt
- Dismiss action reuses existing onNewSale callback — no new prop needed, consistent with POSClientShell's sale reset logic
- Used `fireEvent` from @testing-library/react (not userEvent) since @testing-library/user-event is not installed in project

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed incomplete ReceiptData mock in test**
- **Found during:** Task 2 (TypeScript verification)
- **Issue:** mockReceipt was missing required fields (storeAddress, storePhone, gstNumber, completedAt, staffName) per the ReceiptData type
- **Fix:** Added all required fields to mockReceipt object in test file
- **Files modified:** src/components/pos/__tests__/ReceiptScreen.demo.test.tsx
- **Verification:** No TypeScript errors in test file after fix; all 4 tests still pass
- **Committed in:** 0f43b92 (Task 2 commit)

**2. [Rule 3 - Blocking] Replaced userEvent with fireEvent**
- **Found during:** Task 1 (RED phase test run)
- **Issue:** @testing-library/user-event not installed in project — import resolution failure
- **Fix:** Used fireEvent from @testing-library/react instead (already installed)
- **Files modified:** src/components/pos/__tests__/ReceiptScreen.demo.test.tsx
- **Verification:** Tests run and fail correctly in RED phase, pass in GREEN phase
- **Committed in:** 1dad5d8 (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (1 bug fix, 1 blocking issue)
**Impact on plan:** Both fixes necessary for correctness. No scope creep. All acceptance criteria met.

## Issues Encountered
- Pre-existing TypeScript errors in unrelated files (adjustStock.ts, createProduct.ts, importProducts.ts) — out of scope, logged as pre-existing, not caused by this plan's changes
- Pre-existing test failures in processRefund.test.ts (3 failing tests unrelated to receipt/demo code) — confirmed not caused by this plan

## Known Stubs
None — ReceiptScreen CTA is fully wired with real /signup link and real onNewSale callback threading.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Demo receipt CTA ready: after a demo sale, visitors see signup prompt at /signup
- Plan 34-02 can add "Try POS Demo" button to landing page to funnel visitors into the demo flow
- No blockers

## Self-Check: PASSED

- FOUND: src/components/pos/ReceiptScreen.tsx
- FOUND: src/components/pos/__tests__/ReceiptScreen.demo.test.tsx
- FOUND: src/components/pos/POSClientShell.tsx
- FOUND: .planning/phases/34-signup-conversion-landing-page/34-01-SUMMARY.md
- FOUND: commit 1dad5d8
- FOUND: commit 0f43b92

---
*Phase: 34-signup-conversion-landing-page*
*Completed: 2026-04-06*
