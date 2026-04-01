---
phase: 06-xero-integration
plan: 03
subsystem: api
tags: [xero, sync, invoice, credit-note, retry, backoff, supabase, vitest]

# Dependency graph
requires:
  - phase: 06-01
    provides: "xero lib foundation: types, vault, client, dates, buildInvoice"
provides:
  - "executeDailySync: aggregates previous NZ day's sales, creates/updates Xero invoice, writes sync log"
  - "executeManualSync: same as daily but uses getNZTodayBoundaries for today's sales so far"
  - "executeDailySyncWithRetry: wraps executeDailySync with 3x exponential backoff (1min/5min/15min) per D-09"
  - "aggregateDailySales: internal helper grouping orders by payment_method (cash/eftpos/online)"
  - "xero_sync_log insert/update on every sync attempt with status, invoice ID, error"
affects:
  - "06-04 (cron route will call executeDailySyncWithRetry)"
  - "06-05 (admin Integrations page will call executeManualSync)"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "sleepFn injection: executeDailySyncWithRetry accepts optional sleepFn parameter for testability without fake timers"
    - "forRetry mock pattern: setupStandardMocks uses modulo call counting so orders mock handles multi-attempt retry loops"
    - "as any cast for unregistered DB tables: xero_connections/xero_sync_log not in generated Database types, cast via (supabase as any).from(...)"

key-files:
  created:
    - src/lib/xero/sync.ts
    - src/lib/xero/__tests__/sync.test.ts
  modified: []

key-decisions:
  - "executeDailySyncWithRetry accepts optional sleepFn for testability — avoids fake timer complexity in Vitest ESM"
  - "Non-retryable failures (Xero not connected, account codes not configured) skip all retries immediately"
  - "'ready' status orders included in daily sales aggregate — confirmed payment for click-and-collect; 'pending_pickup' excluded"

patterns-established:
  - "sleepFn injection: pass sleep function as optional parameter with production default, override in tests"
  - "forRetry mock: use modulo-based call counting when testing multi-attempt retry flows"

requirements-completed:
  - XERO-02
  - XERO-03
  - XERO-04

# Metrics
duration: 12min
completed: 2026-04-02
---

# Phase 06 Plan 03: Xero Sync Engine Summary

**Sync orchestration engine with sales aggregation by payment method, Xero invoice upsert, credit note for refunds, and 3x exponential backoff retry (1min/5min/15min)**

## Performance

- **Duration:** 12 min
- **Started:** 2026-04-01T19:05:33Z
- **Completed:** 2026-04-02T08:17:12Z
- **Tasks:** 1 (TDD: RED + GREEN)
- **Files modified:** 2

## Accomplishments

- Sales aggregation queries orders table filtering `['completed', 'collected', 'ready']` statuses (confirmed payment); aggregates cash/eftpos/online totals separately
- executeDailySync upserts Xero invoices: checks xero_sync_log for prior success, calls updateInvoice if exists, createInvoices if new; writes sync log entry (pending → success/failed)
- executeDailySyncWithRetry: 3x retry with 1min/5min/15min exponential backoff per D-09; non-retryable failures (Xero not connected, account codes not configured) return immediately
- Refunded orders in the sync period produce Xero credit notes via createCreditNotes
- 14 unit tests passing with fully mocked Xero API and Supabase

## Task Commits

1. **Task 1: RED phase - failing tests** - `b187a1b` (test)
2. **Task 1: GREEN phase - implementation** - `0a16b7b` (feat)

## Files Created/Modified

- `/Users/adam-personal/CODER/IDEAS/NZPOS/src/lib/xero/sync.ts` - Complete sync orchestration: aggregateDailySales, runSync, executeDailySync, executeManualSync, executeDailySyncWithRetry, writeSyncLog, updateSyncLog, sleep
- `/Users/adam-personal/CODER/IDEAS/NZPOS/src/lib/xero/__tests__/sync.test.ts` - 14 tests covering all sync behaviors with mocked Xero API and Supabase

## Decisions Made

- `executeDailySyncWithRetry` accepts optional `sleepFn` parameter (default: `sleep`) for testability. ESM module boundaries in Vitest prevent mocking `sleep` via `vi.mock` for internal calls; injection pattern avoids fake timer complexity.
- Non-retryable failure messages `['Xero not connected', 'Account codes not configured']` return immediately — these are configuration issues, not transient network errors.
- `'ready'` status orders included in daily aggregation — these have confirmed payment for click-and-collect and were excluded would undercount daily sales.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Added type assertions for xero_connections and xero_sync_log tables**
- **Found during:** Task 1 (TypeScript check)
- **Issue:** Supabase generated types don't include the new Phase 06 tables; accessing them via `.from('xero_connections')` caused TS2339 errors
- **Fix:** Added `(supabase as any).from(...)` with explicit return type casts, following the same pattern used in client.ts and vault.ts from Plan 01
- **Files modified:** src/lib/xero/sync.ts
- **Verification:** `npx tsc --noEmit` shows zero new errors from sync.ts
- **Committed in:** 0a16b7b (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (type safety workaround for unregistered DB tables)
**Impact on plan:** Necessary workaround matching existing pattern in vault.ts/client.ts. Pre-existing TS errors in those files are unchanged.

## Issues Encountered

- Vitest ESM module cache caused test isolation failures: `vi.clearAllMocks()` resets call counts but not `mockResolvedValueOnce` queue; `vi.mockReset()` needed for the Xero API mocks between tests.
- Retry tests used a shared `setupStandardMocks` closure where `ordersCallCount` accumulated across multiple `executeDailySync` calls, causing the second attempt to return "No sales" (zero totals). Fixed by adding `forRetry: true` option that uses modulo-based counting to always return `completedOrders` on odd calls.

## Known Stubs

None - sync.ts is fully wired to real dependencies. No stub patterns found.

## Next Phase Readiness

- `executeDailySyncWithRetry` is ready for the cron route (Plan 04)
- `executeManualSync` is ready for the admin Integrations page trigger (Plan 05)
- Sync log table operations tested and working

---
*Phase: 06-xero-integration*
*Completed: 2026-04-02*
