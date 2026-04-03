---
phase: 11-partial-refunds
verified: 2026-04-03T01:16:00Z
status: human_needed
score: 14/14 must-haves verified
re_verification: false
human_verification:
  - test: "End-to-end partial refund flow on a completed order"
    expected: "Line item checkboxes appear, amount auto-calculates, order transitions to 'Partially Refunded' amber badge, already-refunded items greyed on second visit"
    why_human: "UI rendering, multi-step drawer interaction, and real Stripe partial refund cannot be verified programmatically without a running dev server and test data"
  - test: "EFTPOS terminal confirmation screen"
    expected: "Full-screen navy overlay with YES/NO buttons appears when payment_method is 'eftpos', matches the sale confirmation pattern"
    why_human: "Visual appearance and EFTPOS-specific branch requires test order with payment_method='eftpos' and running dev server"
  - test: "Xero credit note on partial refund"
    expected: "Credit note created in Xero for the partial amount when Xero is connected; refund succeeds without error when Xero is not connected"
    why_human: "Requires live Xero OAuth connection or a connected test org; xero_sync_log data required"
---

# Phase 11: Partial Refunds Verification Report

**Phase Goal:** Staff can refund individual line items from any order, with stock restored and accounting updated
**Verified:** 2026-04-03T01:16:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Partial refund amount is server-calculated from selected items, never client-provided | VERIFIED | `calculateItemRefundCents` with `Math.floor` in `processPartialRefund.ts`; `PartialRefundSchema` accepts only `orderId + reason + items[]`, no `amount` field |
| 2 | Stripe receives the partial amount in cents, not the full order total | VERIFIED | Line 152-155 of `processPartialRefund.ts`: `stripe.refunds.create({ payment_intent: ..., amount: totalRefundCents })` where `totalRefundCents` is summed from selected items only |
| 3 | Stock is atomically restored per refunded item via restore_stock RPC | VERIFIED | `adminClient.rpc('restore_stock', { p_product_id: ..., p_quantity: quantityToRefund })` called in a loop per item (line 171) |
| 4 | Xero credit note is attempted but failure does not block refund completion | VERIFIED | `buildCreditNote` call at line 254 is inside a `try/catch` block (lines 227-269); catch logs warning only, does not return error |
| 5 | Order status transitions correctly: completed -> partially_refunded -> refunded | VERIFIED | `newStatus = allItemsFullyRefunded ? 'refunded' : 'partially_refunded'` (line 214); `partially_refunded` is in `REFUNDABLE_STATUSES` (line 13) enabling chained partial refunds |
| 6 | Multiple partial refunds on the same order are supported without over-refunding | VERIFIED | Existing `refund_items` are fetched before validation; per-item check `quantityToRefund <= (item.quantity - alreadyRefundedQty)` (lines 70-95) |
| 7 | Staff can select individual line items with checkbox and quantity spinner | HUMAN NEEDED | `RefundItemSelector.tsx` has checkbox + -/+ spinner UI with `alreadyRefundedQty` prop — visual rendering requires running dev server |
| 8 | Select All toggle selects every un-refunded item at max refundable quantity | VERIFIED (code) | `RefundItemSelector.tsx` contains "Select All" toggle (2 occurrences); logic iterates items and computes max qty |
| 9 | Already-refunded items are greyed out and non-selectable | VERIFIED (code) | `opacity` class applied when `alreadyRefundedQty >= item.quantity` in `RefundItemSelector.tsx` (3 opacity refs) |
| 10 | Refund amount auto-calculates from selected items (no manual override) | VERIFIED | `Math.floor((quantityToRefund / item.quantity) * item.line_total_cents)` in `RefundItemSelector.tsx`; no amount input field |
| 11 | EFTPOS refunds show terminal confirmation step matching sale pattern | HUMAN NEEDED | `PartialRefundFlow.tsx` has `eftpos_confirm` step with `role="alertdialog"`, `z-[70]`, "Did the EFTPOS terminal approve the refund?" — actual rendering requires EFTPOS test order |
| 12 | Confirmation message adapts per payment method: Stripe/Cash/EFTPOS | VERIFIED (code) | "Refund will be processed to", "Hand", "EFTPOS terminal" all present in `PartialRefundFlow.tsx` |
| 13 | OrderStatusBadge displays partially_refunded with amber/warning styling | VERIFIED | `partially_refunded` in type union, `STATUS_STYLES` (color-warning), `STATUS_LABELS` ("Partially Refunded") all present |
| 14 | OrderFilterBar includes Partially Refunded filter option | VERIFIED | `{ value: 'partially_refunded', label: 'Partially Refunded' }` present in `OrderFilterBar.tsx` |

**Score:** 12/14 truths fully automated-verified, 2 require human (visual/EFTPOS)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `supabase/migrations/013_partial_refunds.sql` | refunds + refund_items tables, partially_refunded status, xero_invoice_id, RLS | VERIFIED | All 4 CREATE/ALTER statements present; ENABLE ROW LEVEL SECURITY x2; partially_refunded in CHECK constraint x3 |
| `src/schemas/refund.ts` | PartialRefundSchema, PartialRefundInput, backward-compat RefundSchema | VERIFIED | All 3 exports present; `.min(1)` on items array x2 |
| `src/actions/orders/processPartialRefund.ts` | Unified partial+full refund server action | VERIFIED | `'use server'`, `import 'server-only'`, all 10 substantive checks pass |
| `src/actions/orders/__tests__/processPartialRefund.test.ts` | 29 unit tests covering all behavior groups | VERIFIED | 29 tests, 928 lines; all 7 describe groups present (validation, stripe, stock, xero, audit, status, amount) |
| `src/components/admin/orders/RefundItemSelector.tsx` | Per-item checkbox + quantity spinner | VERIFIED | All 5 substantive checks pass |
| `src/components/admin/orders/PartialRefundFlow.tsx` | Multi-step flow with EFTPOS confirm | VERIFIED | All 9 substantive checks pass |
| `src/components/admin/orders/OrderDetailDrawer.tsx` | Wired to PartialRefundFlow, existingRefunds fetch | VERIFIED | PartialRefundFlow imported + rendered; existingRefunds state + useEffect present; "Refund More Items" label present |
| `src/components/admin/orders/OrderStatusBadge.tsx` | partially_refunded type, style, label | VERIFIED | 3 occurrences (type union, STATUS_STYLES, STATUS_LABELS) |
| `src/components/admin/orders/OrderFilterBar.tsx` | Partially Refunded filter option | VERIFIED | 1 occurrence in STATUS_OPTIONS |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `processPartialRefund.ts` | `stripe.refunds.create` | `amount: totalRefundCents` | WIRED | Line 152-154: call with partial cents, not `order.total_cents` |
| `processPartialRefund.ts` | `restore_stock` RPC | `adminClient.rpc('restore_stock', ...)` | WIRED | Line 171: called per item with `p_product_id` + `p_quantity` |
| `processPartialRefund.ts` | `refunds` + `refund_items` tables | `adminClient.from(...)` | WIRED | 5 references to `from('refunds')`; 4 references to `from('refund_items')` |
| `processPartialRefund.ts` | `buildCreditNote` | `import from '@/lib/xero/buildInvoice'` | WIRED | Import line 8; called at line 254 inside try/catch |
| `PartialRefundFlow.tsx` | `processPartialRefund` | `import from '@/actions/orders/processPartialRefund'` | WIRED | Import line 4; called at line 68 on form submit |
| `OrderDetailDrawer.tsx` | `PartialRefundFlow` | `import { PartialRefundFlow } from './PartialRefundFlow'` | WIRED | Import line 6; rendered at line 128 with `existingRefunds` prop |
| `RefundItemSelector.tsx` | `calculateItemRefundCents` logic | `Math.floor` client-side preview | WIRED | `Math.floor` present; matches server formula |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|-------------------|--------|
| `OrderDetailDrawer.tsx` | `existingRefunds` | `supabase.from('refunds').select(...).eq('order_id', order.id)` | Yes — DB query with order_id filter | FLOWING |
| `PartialRefundFlow.tsx` | `result` from `processPartialRefund` | Server action with DB + Stripe | Yes — full server-side computation | FLOWING |
| `RefundItemSelector.tsx` | `selections`, `totalRefundCents` | Props from parent + client-side `Math.floor` | Yes — computed from real order_items data passed in | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| 29 unit tests pass | `npx vitest run src/actions/orders/__tests__/processPartialRefund.test.ts` | 29 passed (1 file) in 705ms | PASS |
| TypeScript clean on source files | `npx tsc --noEmit` (excluding .next/types) | 0 errors in src/ | PASS |
| Stripe calls with partial amount | grep `amount: totalRefundCents` in processPartialRefund.ts | Line 154 confirmed | PASS |
| Xero wrapped in try/catch | Read lines 227-269 of processPartialRefund.ts | try/catch confirmed, catch only console.warn | PASS |
| Commits exist in git history | `git log --oneline 056edd8 3934bf9 f1c148c 01a4035` | All 4 commits found | PASS |
| End-to-end UI flow | Requires running dev server | N/A | SKIP |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| REFUND-01 | 11-02-PLAN.md | Staff can select individual line items to refund from an order | SATISFIED (human pending) | `RefundItemSelector.tsx` with checkbox + spinner; code verified, visual rendering needs human |
| REFUND-02 | 11-01-PLAN.md | Stripe processes partial refund for selected items' total amount | SATISFIED | `stripe.refunds.create({ amount: totalRefundCents })` — test "calls stripe.refunds.create with partial amount for online orders" passes |
| REFUND-03 | 11-01-PLAN.md | Stock restored for refunded line items via atomic RPC | SATISFIED | `restore_stock` RPC called per item; test "calls restore_stock once per selected item" passes |
| REFUND-04 | 11-01-PLAN.md | Xero credit note generated for partial refund amount | SATISFIED (human pending) | `buildCreditNote` called when Xero connected; graceful failure verified in tests; live Xero connection requires human |
| REFUND-05 | 11-01-PLAN.md + 11-02-PLAN.md | Refund audit trail (items, amounts, reason) stored on order | SATISFIED | `refund_items` inserted with `order_item_id`, `quantity_refunded`, `line_total_refunded_cents`; test "inserts refund_items with correct per-item fields" passes |

No orphaned requirements — all 5 REFUND-xx IDs in REQUIREMENTS.md are claimed by plans and verified.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `OrderDetailDrawer.tsx` | 74-75 | `supabase as any` cast for `from('refunds')` query | Info | Safe workaround for stale generated types (migration 013 not yet reflected in Supabase-generated TypeScript). Type safety restored on `.then()` callback. Resolved when `npx supabase gen types` is run after migration applies. |
| `RefundConfirmationStep.tsx` | — | Deprecated component left in codebase (no callers) | Info | No callers after Plan 02 wiring. Dead code, not a blocker. Can be deleted in a cleanup pass. |

No blocker anti-patterns found.

### Human Verification Required

#### 1. End-to-End Partial Refund Flow

**Test:** Run `npm run dev`, navigate to Admin > Orders, open a completed order with multiple line items, click "Refund Order"
**Expected:**
- Line items appear with checkboxes and quantity -/+ spinners (44px touch targets)
- Checking items updates the refund total in real-time
- "Select All" toggle selects all un-refunded items at max quantity
- Continuing to confirmation shows item summary, correct payment-method message, reason dropdown
- Submitting transitions order status to "Partially Refunded" with amber badge
- Reopening the order shows "Refund More Items" button; already-refunded items are greyed (opacity-40) and non-checkable
- "Partially Refunded" option is present in the Orders filter bar
**Why human:** Multi-step drawer interaction, real Stripe test refund API call, visual badge styling

#### 2. EFTPOS Terminal Confirmation Screen

**Test:** Find or create a completed POS order with `payment_method = 'eftpos'`, click "Refund Order", proceed to confirmation step, click "Continue to Terminal"
**Expected:**
- Full-screen navy overlay appears (z-[70], above drawer)
- Shows refund amount in large text
- "Did the EFTPOS terminal approve the refund?" heading
- YES (green) and NO (red) buttons with 56px min-height and flex-1 width
- YES calls `processPartialRefund` and closes; NO returns to confirm step
- `role="alertdialog"` and `aria-modal="true"` on overlay (check DevTools)
**Why human:** Visual match to EftposConfirmScreen pattern, focus trap behavior, EFTPOS-specific order required

#### 3. Xero Credit Note on Partial Refund

**Test:** With Xero connected (or test org), process a partial refund on an order that has a `xero_sync_log` entry
**Expected:** Credit note appears in Xero for the partial amount; refund completes successfully even if Xero is disconnected or throws
**Why human:** Requires live Xero OAuth connection and `xero_sync_log` data from a previous sync

### Gaps Summary

No gaps found in automated verification. All artifacts exist, are substantive, are wired, and data flows correctly. The 3 human verification items are standard UI/integration concerns that cannot be verified programmatically.

The only open item is Task 3 (checkpoint:human-verify) from 11-02-PLAN.md, which is explicitly designed as a blocking human gate before phase sign-off.

---

_Verified: 2026-04-03T01:16:00Z_
_Verifier: Claude (gsd-verifier)_
