---
phase: 11-partial-refunds
plan: 01
subsystem: database
tags: [postgres, supabase, stripe, xero, zod, vitest, refunds, rls]

requires:
  - phase: 09-notifications
    provides: Resend email infrastructure (available for refund notifications)
  - phase: 06-xero
    provides: xero_sync_log table, buildCreditNote, getAuthenticatedXeroClient
  - phase: 02-security
    provides: restore_stock RPC, admin client pattern

provides:
  - supabase/migrations/013_partial_refunds.sql — refunds + refund_items tables with RLS, partially_refunded status, xero_invoice_id on orders
  - src/schemas/refund.ts PartialRefundSchema — validates line-item selections with items array min 1
  - src/actions/orders/processPartialRefund.ts — unified server action for partial+full refunds
  - 29 unit tests covering all edge cases

affects: [11-partial-refunds/02-ui, admin orders UI, xero sync, reporting]

tech-stack:
  added: []
  patterns:
    - "Partial refund amount = Math.floor(quantityToRefund / item.quantity * item.line_total_cents) — avoids over-refunding"
    - "Idempotency anchor: insert refund record before Stripe call, delete on failure"
    - "Status auto-upgrade: partially_refunded -> refunded when all items fully refunded"
    - "Xero credit note in try/catch (D-09 graceful failure)"

key-files:
  created:
    - supabase/migrations/013_partial_refunds.sql
    - src/actions/orders/processPartialRefund.ts
    - src/actions/orders/__tests__/processPartialRefund.test.ts
  modified:
    - src/schemas/refund.ts
    - src/actions/orders/processRefund.ts

key-decisions:
  - "Math.floor for per-item refund calculation prevents over-refunding due to integer division"
  - "Idempotency: insert refund record (pending) before calling Stripe — delete on Stripe failure rather than rollback"
  - "Zod v4 UUID validation is stricter than v3 (requires RFC 4122 variant bits [89abAB]) — test UUIDs must comply"
  - "REFUNDABLE_STATUSES includes partially_refunded (unlike old processRefund) to allow multiple partial refunds"

patterns-established:
  - "Per-item refund amount: calculateItemRefundCents(item, quantityToRefund) = Math.floor(qty/total * cents)"
  - "Already-refunded tracking: aggregate refund_items for order before validating new request"

requirements-completed: [REFUND-02, REFUND-03, REFUND-04, REFUND-05]

duration: 6min
completed: 2026-04-03
---

# Phase 11 Plan 01: Partial Refunds Backend Summary

**Postgres migration for refunds/refund_items tables with RLS, PartialRefundSchema with line-item validation, and processPartialRefund server action handling Stripe partial refunds, atomic stock restore, Xero credit notes (graceful), and order status auto-upgrade**

## Performance

- **Duration:** 6 min
- **Started:** 2026-04-03T00:50:10Z
- **Completed:** 2026-04-03T00:56:11Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Migration 013 adds `refunds` and `refund_items` tables with store-scoped RLS, adds `partially_refunded` status to orders CHECK constraint, and adds `xero_invoice_id` column on orders
- `PartialRefundSchema` extends existing `RefundSchema` (preserved backward compat) with items array validation (min 1 item, quantity >= 1, UUID IDs)
- `processPartialRefund` server action orchestrates the full refund transaction in correct order: auth -> validate -> fetch -> quantity check -> Stripe partial (online only) -> stock restore per item -> audit trail -> status transition -> Xero credit note (graceful)
- 29 unit tests pass covering all behavior groups: validation, stripe, stock, xero, audit, status transitions, and amount calculation

## Task Commits

1. **Task 1: Database migration + Zod schema extension** - `056edd8` (feat)
2. **Task 2: processPartialRefund server action + tests** - `3934bf9` (feat)

## Files Created/Modified

- `supabase/migrations/013_partial_refunds.sql` — refunds/refund_items tables, partially_refunded status, xero_invoice_id, RLS policies
- `src/schemas/refund.ts` — Added PartialRefundSchema + PartialRefundInput type; existing RefundSchema preserved
- `src/actions/orders/processPartialRefund.ts` — Unified partial+full refund server action
- `src/actions/orders/__tests__/processPartialRefund.test.ts` — 29 unit tests
- `src/actions/orders/processRefund.ts` — Added @deprecated comment

## Decisions Made

- `Math.floor` for per-item refund cents calculation prevents over-refunding when quantities don't divide evenly (e.g., 1 of 3 items at $10.00 = $3.33 not $3.34)
- Idempotency anchor: refund record inserted BEFORE Stripe call; deleted on Stripe failure. Simpler than a two-phase commit and self-healing.
- `partially_refunded` added to REFUNDABLE_STATUSES so multiple partial refunds work on the same order
- Xero credit note query uses `xero_sync_log` to find the original invoice number, then wraps entire block in try/catch per D-09

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Zod v4 UUID validation stricter than v3 — fixed test UUIDs**
- **Found during:** Task 2 (running tests in GREEN phase)
- **Issue:** Zod v4 (^4.3.6 in this project) validates UUID variant bits `[89abAB]` strictly per RFC 4122. Several test UUID constants had variant byte `c`, `d`, `e`, `f` which fail validation, causing `safeParse` to return "Invalid input" for what appeared to be valid test scenarios.
- **Fix:** Replaced non-compliant test UUID constants with `crypto.randomUUID()`-generated values that pass Zod v4 validation
- **Files modified:** src/actions/orders/__tests__/processPartialRefund.test.ts
- **Verification:** All 29 tests pass after fix
- **Committed in:** `3934bf9` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - bug in test UUIDs)
**Impact on plan:** Auto-fix essential for test correctness. Tests now validate the real Zod v4 behavior used in production. No scope creep.

## Issues Encountered

- Zod v4 UUID validation is significantly stricter than v3 — requires RFC 4122 variant bits `[89abAB]` in position 19 of UUID. All test UUIDs must use valid UUIDs from this point forward. This affected only the test file, not production code.

## Known Stubs

None — all implementation is complete. The server action is fully wired and ready for UI in Plan 02.

## Next Phase Readiness

- Plan 02 (UI) can import `processPartialRefund` from `@/actions/orders/processPartialRefund`
- `PartialRefundInput` type is exported for UI form state
- Migration 013 must be applied to target DB before UI can test against real data
- `OrderStatusBadge` will need `partially_refunded` label/color in Plan 02 (not blocking Plan 02 creation)

---
*Phase: 11-partial-refunds*
*Completed: 2026-04-03*
