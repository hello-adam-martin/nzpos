---
phase: 11-partial-refunds
plan: 02
subsystem: ui
tags: [react, tailwindcss, supabase, refunds, eftpos, admin]

requires:
  - phase: 11-partial-refunds
    plan: 01
    provides: processPartialRefund server action, PartialRefundSchema, refunds/refund_items tables

provides:
  - src/components/admin/orders/RefundItemSelector.tsx — per-item checkbox + quantity spinner with already-refunded tracking
  - src/components/admin/orders/PartialRefundFlow.tsx — multi-step refund flow (select -> confirm -> EFTPOS confirm)
  - src/components/admin/orders/OrderDetailDrawer.tsx — updated to use PartialRefundFlow, fetches existing refunds, shows "Refund More Items" for partially_refunded
  - src/components/admin/orders/OrderStatusBadge.tsx — partially_refunded type, amber/warning style, label
  - src/components/admin/orders/OrderFilterBar.tsx — Partially Refunded filter option

affects: [admin orders UI, refund flow, order status display, filter bar]

tech-stack:
  added: []
  patterns:
    - "calculateItemRefundCents client-side mirrors server formula: Math.floor(qty/total * cents)"
    - "alreadyRefundedQty Map computed from existingRefunds array on each render"
    - "EFTPOS refund overlay at z-[70] (above drawer z-50, above receipt z-[60])"
    - "supabase.from('refunds') cast via any to bypass stale generated types"

key-files:
  created:
    - src/components/admin/orders/RefundItemSelector.tsx
    - src/components/admin/orders/PartialRefundFlow.tsx
  modified:
    - src/components/admin/orders/OrderDetailDrawer.tsx
    - src/components/admin/orders/OrderStatusBadge.tsx
    - src/components/admin/orders/OrderFilterBar.tsx

key-decisions:
  - "supabase.from('refunds') cast as any in drawer — Supabase generated types predate migration 013; cast is safe, same pattern used in processPartialRefund"
  - "RefundConfirmationStep.tsx left in place (not deleted) as deprecated file — no callers after this plan"
  - "EftposRefundConfirm component inlined in PartialRefundFlow.tsx (private, not exported) to keep the flow co-located"

requirements: [REFUND-01, REFUND-05]

duration: 4min
completed: 2026-04-03
---

# Phase 11 Plan 02: Partial Refund UI Summary

**Per-item refund selection UI with quantity spinners, Select All toggle, payment-method-specific confirmation messages, EFTPOS terminal confirmation step (navy overlay matching sale pattern), partially_refunded status badge and filter — wired into OrderDetailDrawer replacing the full-refund-only RefundConfirmationStep**

## Performance

- **Duration:** 4 min
- **Started:** 2026-04-02T11:59:31Z
- **Completed:** 2026-04-02T12:03:12Z
- **Tasks:** 2 of 3 (Task 3 is a checkpoint:human-verify)
- **Files modified:** 5

## Accomplishments

- `RefundItemSelector`: checkbox list with quantity spinners (-/+ buttons, 44px touch targets), "Select All" toggle, already-refunded greying (opacity-40 on fully refunded items), live total calculation using `Math.floor` matching server formula
- `PartialRefundFlow`: 3-step flow managed by `useState<'select' | 'confirm' | 'eftpos_confirm'>`. Step 'select' shows RefundItemSelector; step 'confirm' shows item summary, payment-method-specific message (Stripe/online: "to card", cash: "Hand $X.XX cash", EFTPOS: "on the EFTPOS terminal"), reason dropdown, "This cannot be undone." warning; step 'eftpos_confirm' shows full-screen navy overlay with YES/NO buttons (z-[70], role="alertdialog", focus trap)
- `OrderDetailDrawer` updated: imports PartialRefundFlow (not RefundConfirmationStep), adds `partially_refunded` to REFUNDABLE_STATUSES, fetches existing refunds via useEffect on order open, passes existingRefunds to PartialRefundFlow, shows "Refund More Items" button label for partially_refunded orders
- `OrderStatusBadge` updated: adds `partially_refunded` to type union with amber/warning styling and "Partially Refunded" label
- `OrderFilterBar` updated: adds "Partially Refunded" filter option after "Refunded"

## Task Commits

1. **Task 1: RefundItemSelector + PartialRefundFlow components** - `f1c148c` (feat)
2. **Task 2: Wire PartialRefundFlow into drawer + update badge and filter** - `01a4035` (feat)

## Files Created/Modified

- `src/components/admin/orders/RefundItemSelector.tsx` — new: per-item checkbox + quantity spinner UI
- `src/components/admin/orders/PartialRefundFlow.tsx` — new: 3-step refund flow with EFTPOS confirm overlay
- `src/components/admin/orders/OrderDetailDrawer.tsx` — updated: PartialRefundFlow wiring, existingRefunds fetch, status-aware button label
- `src/components/admin/orders/OrderStatusBadge.tsx` — updated: partially_refunded status
- `src/components/admin/orders/OrderFilterBar.tsx` — updated: Partially Refunded filter option

## Decisions Made

- `supabase.from('refunds')` cast as `any` in the drawer because Supabase generated types don't include `refunds` table yet (migration 013 applied in Plan 01 but types not regenerated). Same pattern used in Plan 01's processPartialRefund.ts. Safe — type safety restored when types are regenerated.
- `EftposRefundConfirm` is a private component inlined in PartialRefundFlow.tsx (not exported). Keeps the flow co-located and avoids a new file for what is conceptually part of the same flow.
- `RefundConfirmationStep.tsx` left in place as deprecated — removing it is out of scope and low priority.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Supabase type cast for `refunds` table query in OrderDetailDrawer**
- **Found during:** Task 2 (TypeScript check)
- **Issue:** `supabase.from('refunds')` fails TypeScript because Supabase generated types don't include `refunds` table (added by migration 013 in Plan 01, but `npx supabase gen types` not run yet). Same root cause as Plan 01's processPartialRefund.ts.
- **Fix:** Cast `supabase` as `any` for the query, with explicit type annotation on the `.then()` callback to restore type safety on the result.
- **Files modified:** src/components/admin/orders/OrderDetailDrawer.tsx
- **Commit:** `01a4035` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - TypeScript type workaround)
**Impact on plan:** Minimal — same workaround pattern already established in Plan 01. Types will be restored when migration is applied to Supabase and `gen types` is run.

## Checkpoint Status

**Task 3 (checkpoint:human-verify)** is pending. This requires human verification of the end-to-end partial refund flow in the running dev server.

### Verification Steps for Task 3

1. Run `npm run dev` and navigate to Admin > Orders
2. Open a completed order with multiple line items
3. Click "Refund Order" — verify line items appear with checkboxes and quantity spinners
4. Select a subset of items (partial refund) — verify total auto-calculates
5. Test "Select All" toggle — verify all items selected at max quantity
6. Click Continue, verify confirmation step shows correct amount and payment method message
7. For an online/Stripe order: confirm message says "Refund will be processed to the customer's card"
8. For a cash order: confirm message says "Hand $X.XX cash to the customer"
9. Complete a partial refund — verify order status changes to "Partially Refunded" (amber badge)
10. Reopen the same order, click "Refund More Items" — verify already-refunded items are greyed out
11. Check the "Partially Refunded" filter option appears in the filter bar
12. If an EFTPOS order is available: verify the EFTPOS terminal confirmation screen appears (navy overlay, YES/NO buttons)

## Known Stubs

None — all implementation is complete and wired to the Plan 01 server action.

## Self-Check

- `src/components/admin/orders/RefundItemSelector.tsx` — FOUND
- `src/components/admin/orders/PartialRefundFlow.tsx` — FOUND
- `src/components/admin/orders/OrderDetailDrawer.tsx` — MODIFIED
- `src/components/admin/orders/OrderStatusBadge.tsx` — MODIFIED
- `src/components/admin/orders/OrderFilterBar.tsx` — MODIFIED
- Commit `f1c148c` — FOUND
- Commit `01a4035` — FOUND

## Self-Check: PASSED
