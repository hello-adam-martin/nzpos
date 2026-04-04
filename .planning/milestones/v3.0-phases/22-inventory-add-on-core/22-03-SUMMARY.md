---
phase: 22-inventory-add-on-core
plan: "03"
subsystem: api
tags: [supabase, server-actions, stocktake, inventory, zod, vitest]

# Dependency graph
requires:
  - phase: 22-01
    provides: "Migration with stocktake_sessions/stocktake_lines tables, complete_stocktake RPC, schemas"
provides:
  - createStocktakeSession server action — creates session + pre-populated lines with snapshot quantities
  - updateStocktakeLine server action — auto-save counted quantity with session state check
  - commitStocktake server action — atomic commit via complete_stocktake RPC
  - discardStocktakeSession server action — soft discard with in_progress guard
  - getStocktakeSession server action — load session with lines and product details
  - getStocktakeSessions server action — list all sessions with line counts
affects: [22-05-stocktake-ui, any future stocktake workflows]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Supabase query builder returned as thenable proxy for test mocking without terminal method"
    - "Shared mockFrom.mockImplementation for table-specific chainable mocks"
    - "TDD: Proxy-based awaitable mock for Supabase query chains without .single()"

key-files:
  created:
    - src/actions/inventory/createStocktakeSession.ts
    - src/actions/inventory/updateStocktakeLine.ts
    - src/actions/inventory/commitStocktake.ts
    - src/actions/inventory/discardStocktakeSession.ts
    - src/actions/inventory/getStocktakeSession.ts
    - src/actions/inventory/getStocktakeSessions.ts
  modified:
    - src/actions/inventory/__tests__/createStocktakeSession.test.ts
    - src/actions/inventory/__tests__/updateStocktakeLine.test.ts
    - src/actions/inventory/__tests__/commitStocktake.test.ts

key-decisions:
  - "resolveAuth() returns snake_case { store_id, staff_id } — plan pseudocode used camelCase storeId/staffId which was corrected to match actual implementation"
  - "Query actions (getStocktakeSession, getStocktakeSessions) skip requireFeature gate — sessions only exist if feature was active at creation, reads are safe"
  - "updateStocktakeLine verifies session is in_progress via join select before updating — prevents silent writes to completed/discarded sessions"

patterns-established:
  - "Proxy-based awaitable mock for Supabase query builder: intercepts .then on proxy object to delegate to vi.fn()"
  - "Table-dispatch pattern in mockFrom: mockImplementation routes by table name to appropriate chain factory"

requirements-completed: [TAKE-01, TAKE-02, TAKE-04]

# Metrics
duration: 5min
completed: 2026-04-04
---

# Phase 22 Plan 03: Stocktake Server Actions Summary

**Six stocktake server actions implementing session lifecycle (create/commit/discard), auto-save counted quantities, and query actions — all mutations gated behind requireFeature('inventory') and delegating atomic operations to the complete_stocktake RPC**

## Performance

- **Duration:** 5 min
- **Started:** 2026-04-04T08:18:13Z
- **Completed:** 2026-04-04T08:23:40Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments
- Six server action files created: createStocktakeSession, updateStocktakeLine, commitStocktake, discardStocktakeSession, getStocktakeSession, getStocktakeSessions
- All mutation actions gated behind `requireFeature('inventory', { requireDbCheck: true })`
- commitStocktake uses `complete_stocktake` RPC (not application-layer loop) for atomicity
- updateStocktakeLine verifies session is in_progress before updating to prevent stale writes
- All 47 inventory tests passing (all 3 test files from Wave 0 stubs fully filled in)

## Task Commits

Each task was committed atomically:

1. **Task 1: createStocktakeSession + test stubs** - `3b2d594` (feat)
2. **Task 2: remaining 5 actions + updateStocktakeLine/commitStocktake tests** - `28ba894` (feat)

**Plan metadata:** _(to be committed with SUMMARY.md)_

## Files Created/Modified
- `src/actions/inventory/createStocktakeSession.ts` - Create session + pre-populate lines with snapshot quantities
- `src/actions/inventory/updateStocktakeLine.ts` - Auto-save counted qty with in_progress session check
- `src/actions/inventory/commitStocktake.ts` - Atomic commit via complete_stocktake RPC
- `src/actions/inventory/discardStocktakeSession.ts` - Soft discard with in_progress guard
- `src/actions/inventory/getStocktakeSession.ts` - Load session with lines and product name/sku/barcode
- `src/actions/inventory/getStocktakeSessions.ts` - List all sessions with line counts ordered by created_at desc
- `src/actions/inventory/__tests__/createStocktakeSession.test.ts` - 11 tests (schema + server action behavior)
- `src/actions/inventory/__tests__/updateStocktakeLine.test.ts` - 11 tests (schema + server action behavior)
- `src/actions/inventory/__tests__/commitStocktake.test.ts` - 8 tests (schema + RPC behavior)

## Decisions Made

- **resolveAuth returns snake_case properties**: Plan pseudocode used `staff.storeId` and `staff.staffId`. The actual `resolveAuth()` return type is `{ store_id, staff_id }` (snake_case), matching the existing `adjustStock.ts` pattern. All action files use `staff.store_id` / `staff.staff_id`.
- **No requireFeature on read actions**: `getStocktakeSession` and `getStocktakeSessions` do not gate on the feature flag. Sessions can only exist if the feature was active when created, so reads are always safe regardless of current flag state.
- **updateStocktakeLine session status check**: Verifies `stocktake_sessions.status === 'in_progress'` via join before updating. This prevents silent writes to completed or discarded sessions and returns a specific `session_not_in_progress` error.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Corrected resolveAuth property names from camelCase to snake_case**
- **Found during:** Task 1 (createStocktakeSession implementation)
- **Issue:** Plan pseudocode referenced `staff.storeId` and `staff.staffId`. The actual `resolveAuth()` function returns `{ store_id, staff_id }` (confirmed in `adjustStock.ts` and `resolveAuth.ts`).
- **Fix:** Used `staff.store_id` and `staff.staff_id` in all action files.
- **Files modified:** All 5 new action files that use resolveAuth
- **Verification:** TypeScript passes with no errors, tests pass
- **Committed in:** 3b2d594 and 28ba894 (inline with tasks)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug)
**Impact on plan:** Essential correction — wrong property names would cause runtime errors. No scope creep.

## Issues Encountered

- Supabase query builder for `products` query has no terminal method (`.single()`) — the builder is awaitable directly. Resolved by using a Proxy-based mock that intercepts `.then` to delegate to `vi.fn()`. This pattern is now documented for reuse.

## User Setup Required

None - no external service configuration required.

## Known Stubs

None - all server actions are fully implemented with real DB/RPC calls. No hardcoded data.

## Next Phase Readiness

- All 6 stocktake server actions are ready for use in the stocktake UI (Plan 05)
- Plan 04 (stock tracking UI) can proceed independently — it only needs adjustStock and getStockLevels from Plan 02
- getStocktakeSession returns `lines` with `products(name, sku, barcode)` join — ready for the count table UI
- commitStocktake returns `lines_committed` count — ready for the success confirmation UI

---
*Phase: 22-inventory-add-on-core*
*Completed: 2026-04-04*
