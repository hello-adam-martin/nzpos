# Phase 11: Partial Refunds - Research

**Researched:** 2026-04-03
**Domain:** Stripe partial refunds, Supabase schema migration, Xero credit notes, React multi-step UI
**Confidence:** HIGH — all findings verified against the codebase and existing implementation patterns

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Line Item Selection UX**
- D-01: Checkbox + quantity adjuster per line item. Each order line item gets a checkbox to select it for refund, plus a quantity spinner (e.g., bought 5, refund 2).
- D-02: Replace the existing `RefundConfirmationStep` with an upgraded component that shows line items with checkboxes/quantities first, then reason + confirm. Same drawer flow, richer content.
- D-03: Refund amount is auto-calculated only — sum of selected items x quantities x unit price (with discount applied). No manual override.
- D-04: "Select All" toggle at the top — full refund becomes a special case of partial refund. One unified flow replaces the current full-refund-only flow.

**Refund State & Audit Trail**
- D-05: Add `partially_refunded` status to orders. Status model: `completed` → `partially_refunded` (some items refunded) → `refunded` (all items refunded). Auto-upgrades to `refunded` when all items have been refunded.
- D-06: New `refunds` table: id, order_id, store_id, reason, total_cents, stripe_refund_id, created_by (staff), created_at, customer_notified (boolean). Plus `refund_items` join table linking refund → order_items with quantity_refunded.
- D-07: Multiple partial refunds allowed on the same order. Staff can refund some items now, more later. Already-refunded items are greyed out in the selection UI.
- D-08: Audit trail captures: which items, how many of each, calculated amount, reason (from existing enum), staff member who processed it, timestamp, and whether customer was notified (email sent flag).

**Xero Credit Note Integration**
- D-09: Credit note created immediately on refund (not batched). Fails gracefully if Xero is disconnected — refund succeeds, credit note flagged as pending for daily sync or manual retry.
- D-10: Credit note linked to the original Xero invoice. Requires storing Xero invoice ID on the orders table (added during Xero sync). Proper double-entry accounting.

**Cash/EFTPOS Refund Handling**
- D-11: POS refunds (cash/EFTPOS) are record-only — system records the refund and restores stock, but the actual money return is handled manually.
- D-12: Same refund flow for all payment types. Confirmation step adapts the message: Stripe → "Refund will be processed to card", Cash → "Hand $X.XX cash to customer", EFTPOS → "Process $X.XX refund on EFTPOS terminal".
- D-13: EFTPOS refunds include a terminal confirmation step matching the existing sale pattern: "Did the terminal approve the refund?" with Yes/No buttons.

### Claude's Discretion
- Component structure within the refund drawer (splitting into sub-components as needed)
- Database migration numbering and ordering
- Xero credit note API field mapping details
- Error handling UX for edge cases (Stripe timeout, network failure mid-refund)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| REFUND-01 | Staff can select individual line items to refund from an order | Line item selection UI, checkbox+qty pattern, `RefundItemSelector` component replacing `RefundConfirmationStep` |
| REFUND-02 | Stripe processes partial refund for selected items' total amount | `stripe.refunds.create({ payment_intent, amount })` — amount is the partial amount in cents, not full order total |
| REFUND-03 | Stock restored for refunded line items via atomic RPC | `restore_stock` RPC already exists (migration 009), accepts `p_product_id` + `p_quantity` — loop per refunded item |
| REFUND-04 | Xero credit note generated for partial refund amount | `buildCreditNote` already exists in `src/lib/xero/buildInvoice.ts`, needs `xero_invoice_id` stored on orders table |
| REFUND-05 | Refund audit trail (items, amounts, reason) stored on order | New `refunds` + `refund_items` tables (D-06); order status transitions via `partially_refunded` → `refunded` |
</phase_requirements>

---

## Summary

Phase 11 upgrades the existing full-refund-only flow into a flexible partial refund system. The existing codebase provides nearly every building block needed: the `processRefund` server action (replaces with new `processPartialRefund`), the `restore_stock` RPC (reuse as-is), the `buildCreditNote` function in `src/lib/xero/buildInvoice.ts` (reuse with extended context), and the `RefundConfirmationStep` component (replace with multi-step `PartialRefundFlow`).

The primary new work is: (1) a database migration adding `refunds` + `refund_items` tables, adding `partially_refunded` to the order status CHECK constraint, and adding `xero_invoice_id` to orders; (2) a new `processPartialRefund` server action with the correct transaction order (optimistic lock → Stripe → stock → Xero → DB record); (3) a new multi-step React component replacing `RefundConfirmationStep`; and (4) updates to `OrderStatusBadge` and `OrderFilterBar` for the new status.

The key complexity is the optimistic lock strategy. The old `processRefund` locks the order to `refunded` before calling Stripe, then reverts on failure. The new flow cannot lock to `partially_refunded` before calling Stripe because partial refunds are additive — a second refund on a partially-refunded order must be allowed. The correct approach is: (1) write the `refund` record as pending, (2) call Stripe, (3) call stock RPC, (4) update refund record to complete + update order status. This prevents double-submission without locking the order permanently.

**Primary recommendation:** Build the `refunds`/`refund_items` tables as the idempotency anchor. Use the refund record's own `id` as the lock mechanism — check for an existing pending refund before inserting, rather than updating order status optimistically.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| stripe (node) | ^21.0.1 (installed) | Partial refund via `stripe.refunds.create` | `amount` param accepts partial cents amount |
| @supabase/supabase-js | ^2.101.1 (installed) | New table inserts (refunds, refund_items) | Admin client bypasses RLS for cross-table writes |
| zod | ^4.3.6 (installed) | Schema validation for new `PartialRefundSchema` | Already in use for all Server Actions |
| xero-node | ^14.0.0 (installed) | Credit note creation via `createCreditNotes` | `buildCreditNote` function already written |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| date-fns | ^4.1.0 (installed) | Date label formatting for Xero credit note | Pass `dateLabel` in YYYY-MM-DD format |
| server-only | latest (installed) | Guard new server action file | Import at top of `processPartialRefund.ts` |

### Installation
No new packages required. All needed libraries are already installed.

---

## Architecture Patterns

### Recommended Project Structure
```
src/
├── actions/orders/
│   ├── processRefund.ts          # KEEP but scope to legacy callers (or redirect to new)
│   └── processPartialRefund.ts   # NEW: unified partial+full refund server action
├── schemas/
│   └── refund.ts                 # EXTEND: add PartialRefundSchema with line items
├── components/admin/orders/
│   ├── RefundConfirmationStep.tsx # REPLACE with PartialRefundFlow
│   ├── PartialRefundFlow.tsx     # NEW: multi-step drawer content (item select → confirm)
│   ├── RefundItemSelector.tsx    # NEW: sub-component for checkbox+qty per line item
│   ├── OrderDetailDrawer.tsx     # UPDATE: pass order_items to PartialRefundFlow
│   ├── OrderStatusBadge.tsx      # UPDATE: add partially_refunded
│   └── OrderFilterBar.tsx        # UPDATE: add Partially Refunded option
└── lib/xero/
    └── buildInvoice.ts           # REUSE buildCreditNote as-is (or minor param extension)
```

### Pattern 1: New Database Schema (Migration 013)
**What:** Adds `refunds` table, `refund_items` join table, `partially_refunded` status, and `xero_invoice_id` on orders.

**Migration structure:**
```sql
-- Add partially_refunded to order status CHECK constraint
-- Cannot ALTER CHECK inline in Postgres — must drop and recreate constraint
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check
  CHECK (status IN ('pending', 'completed', 'refunded', 'partially_refunded',
                    'expired', 'pending_pickup', 'ready', 'collected'));

-- Add xero_invoice_id to orders (needed for D-10: credit note links to original invoice)
ALTER TABLE public.orders ADD COLUMN xero_invoice_id TEXT;

-- New refunds table (D-06)
CREATE TABLE public.refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id),
  store_id UUID NOT NULL REFERENCES public.stores(id),
  reason TEXT NOT NULL CHECK (reason IN ('customer_request', 'damaged', 'wrong_item', 'other')),
  total_cents INTEGER NOT NULL CHECK (total_cents > 0),
  stripe_refund_id TEXT,          -- null for cash/eftpos refunds
  created_by UUID REFERENCES public.staff(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  customer_notified BOOLEAN NOT NULL DEFAULT false
);

-- New refund_items join table (D-06)
CREATE TABLE public.refund_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  refund_id UUID NOT NULL REFERENCES public.refunds(id) ON DELETE CASCADE,
  order_item_id UUID NOT NULL REFERENCES public.order_items(id),
  quantity_refunded INTEGER NOT NULL CHECK (quantity_refunded > 0),
  line_total_refunded_cents INTEGER NOT NULL
);

-- Indexes
CREATE INDEX idx_refunds_order ON public.refunds(order_id);
CREATE INDEX idx_refunds_store ON public.refunds(store_id);
CREATE INDEX idx_refund_items_refund ON public.refund_items(refund_id);
CREATE INDEX idx_refund_items_order_item ON public.refund_items(order_item_id);
```

**Why:** The `refunds` table is the idempotency anchor. The `refund_items` table records per-item quantities for the audit trail and enables "already refunded items are greyed out" in the UI (query sum of `quantity_refunded` per `order_item_id`).

### Pattern 2: Partial Refund Amount Calculation
**What:** Sum selected line items with per-item discount applied, proportionally.

The existing `order_items` table stores `line_total_cents` which is already the post-discount total for that item. For a partial quantity refund: `refund_amount = floor((quantity_to_refund / original_quantity) * line_total_cents)`.

**Important:** Use `Math.floor` (round down) not `Math.round` to avoid refunding more than the original amount. This is consistent with how `gst_cents` is calculated in the existing codebase.

```typescript
// Per-item refund calculation
function calculateItemRefundCents(
  item: { line_total_cents: number; quantity: number },
  quantityToRefund: number
): number {
  // floor() avoids over-refunding due to rounding
  return Math.floor((quantityToRefund / item.quantity) * item.line_total_cents)
}
```

### Pattern 3: processPartialRefund Server Action
**What:** The new server action follows the same auth-check → validate → fetch → mutate pattern as `processRefund`, but with a different transaction order to handle additive partial refunds.

**Transaction order (critical for correctness):**
1. Verify owner auth + store context
2. Validate with Zod (`PartialRefundSchema`)
3. Fetch order + order_items + existing refunds (to calculate already-refunded quantities)
4. Validate: order is in refundable status (completed, partially_refunded, pending_pickup, ready, collected)
5. Validate: selected quantities don't exceed (original qty - already-refunded qty) per item
6. Calculate total refund amount in cents
7. Insert `refund` record with `status: 'pending'` (this is the idempotency anchor)
8. For online orders: call Stripe `refunds.create({ payment_intent, amount })`
9. Call `restore_stock` RPC for each refunded item
10. Update `refund` record: set `stripe_refund_id` + finalize
11. Insert `refund_items` records
12. Determine new order status: if all items fully refunded → `refunded`, else → `partially_refunded`
13. Update order status
14. Attempt Xero credit note (D-09: fails gracefully — don't roll back refund if Xero fails)
15. Optionally send refund email to customer (D-08: `customer_notified` flag)
16. `revalidatePath` for orders + reports + dashboard

**On Stripe failure (step 8):** Delete the pending `refund` record and return error. Order status remains unchanged. No stock has been modified yet.

**On stock RPC failure (step 9):** Log the error but don't fail the refund — Stripe already processed. The `refund` record is already committed. Surface a warning to the UI: "Refund processed but stock restore failed — please adjust stock manually."

### Pattern 4: REFUNDABLE_STATUSES update
The existing `REFUNDABLE_STATUSES` set in both `processRefund.ts` and `OrderDetailDrawer.tsx` needs `'partially_refunded'` added:
```typescript
const REFUNDABLE_STATUSES = new Set([
  'completed',
  'partially_refunded',   // ADD THIS
  'pending_pickup',
  'ready',
  'collected',
])
```

### Pattern 5: PartialRefundFlow Component (replaces RefundConfirmationStep)
**What:** Multi-step drawer content component.

**Steps:**
1. `'select'` — Line item checkboxes + quantity spinners + "Select All" toggle + calculated total
2. `'confirm'` — Payment method-specific message + reason dropdown + "Confirm Refund" button
3. (EFTPOS only) `'eftpos_confirm'` — "Did the terminal approve the refund?" (mirrors `EftposConfirmScreen`)

**Props:**
```typescript
interface PartialRefundFlowProps {
  order: OrderWithItems          // includes order_items + payment_method + channel
  existingRefunds: RefundSummary[] // for greying out already-refunded items
  onBack: () => void
  onRefundComplete: () => void
}
```

**Already-refunded quantity tracking:**
Query `refund_items` grouped by `order_item_id` to get total `quantity_refunded` per item. Pass to `RefundItemSelector` to compute `maxRefundable = original_quantity - total_already_refunded`.

### Pattern 6: Xero Credit Note (immediate, graceful failure)
**What:** Call `buildCreditNote` and `xero.accountingApi.createCreditNotes` immediately after stock restore. If Xero is disconnected or throws, log the error and set `refund.customer_notified = false` (the `customer_notified` flag doubles as "Xero credit note sent" indicator). The daily cron sync will pick up the gap.

**Existing `buildCreditNote` signature:**
```typescript
// Source: src/lib/xero/buildInvoice.ts
buildCreditNote(
  refundCents: number,
  dateLabel: string,        // YYYY-MM-DD
  settings: XeroSettings,
  originalInvoiceNumber: string  // e.g. 'NZPOS-2026-04-03'
): CreditNote
```

**Problem:** `buildCreditNote` currently takes `originalInvoiceNumber` (the invoice number string like `NZPOS-2026-04-03`), not the Xero invoice ID. The existing `xero_sync_log` table stores `xero_invoice_number`. To link properly, we need to query `xero_sync_log` for the `sync_date` matching the order's `created_at` date, or store `xero_invoice_id` on the order (D-10).

**D-10 approach:** Add `xero_invoice_id` column to `orders` (in migration 013). The Xero sync already writes `xero_invoice_id` to `xero_sync_log` — after sync, update matching orders. Or: do a sync_log lookup at refund time by order date. The latter avoids a backfill. Recommendation: at refund time, query `xero_sync_log` where `sync_date = order.created_at::date` and `status = 'success'` to get `xero_invoice_id` and `xero_invoice_number`. No column addition needed on orders.

### Pattern 7: PartialRefundSchema (Zod extension)
```typescript
// Source: src/schemas/refund.ts (extend existing)
export const PartialRefundSchema = z.object({
  orderId: z.string().uuid(),
  reason: z.enum(['customer_request', 'damaged', 'wrong_item', 'other']),
  items: z.array(z.object({
    orderItemId: z.string().uuid(),
    quantityToRefund: z.number().int().min(1),
  })).min(1),
})

export type PartialRefundInput = z.infer<typeof PartialRefundSchema>
```

### Anti-Patterns to Avoid
- **Locking order status before Stripe call (old pattern):** The old `processRefund` sets `status = 'refunded'` optimistically before Stripe, then reverts on failure. This works for full refunds (order goes from refundable → refunded). For partial refunds it breaks multi-step refunds: locking `partially_refunded` before Stripe creates a race. Use the `refund` record insert as the idempotency anchor instead.
- **Over-refunding due to rounding:** Always use `Math.floor` when calculating partial quantity amounts from `line_total_cents`. Never `Math.round`.
- **Passing `order_items` as props without existing refund data:** The item selector needs to know how much of each item is already refunded to set the max quantity. Fetch `refund_items` alongside `order_items` in the drawer query.
- **Blocking the refund on Xero failure:** D-09 explicitly says Xero fails gracefully. Never let a Xero API error prevent the refund from completing — money was already returned to Stripe.
- **Calling `processRefund` for POS orders with partial items:** The old action always refunds `order.total_cents`. The new action calculates the partial amount from selected items. The old action can be deprecated or left for non-item-based scenarios only.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Atomic stock increment | Custom UPDATE query | `restore_stock` RPC (already exists in migration 009) | Prevents read-modify-write race; already tested |
| Partial Stripe refund | Custom charge reversal | `stripe.refunds.create({ payment_intent, amount })` | Stripe handles partial amount, currency, status tracking |
| Xero credit note | Manual journal entry via Xero API | `buildCreditNote` in `src/lib/xero/buildInvoice.ts` | Already implemented, tested, handles GST inclusive amounts |
| Xero client auth | New OAuth flow | `getAuthenticatedXeroClient(storeId)` | Handles token refresh + tenant lookup |
| Currency formatting | Custom formatter | `formatNZD` from `@/lib/money` | Already used throughout; handles cents-to-dollar display |
| Authenticated Supabase client | New client setup | `createSupabaseAdminClient()` | Bypasses RLS for cross-table writes |

**Key insight:** This phase is primarily composition of existing tools. The `restore_stock` RPC, `buildCreditNote`, Stripe `refunds.create`, and admin Supabase client are all proven infrastructure — use them rather than reimplementing.

---

## Common Pitfalls

### Pitfall 1: Double Partial Refund Race
**What goes wrong:** Staff clicks "Confirm Refund" twice quickly. Two concurrent calls to `processPartialRefund` both read the same order state, both pass validation, both call Stripe, both insert refund records. Customer gets refunded twice.
**Why it happens:** No atomic lock on the partial refund path.
**How to avoid:** Insert the `refund` record first with a unique constraint or use a Postgres advisory lock via RPC. Alternatively, use a short-lived `processing` flag in the client and disable the submit button on first click (UI-level prevention). The DB-level solution: insert `refund` record first; if a concurrent insert for the same `order_id` within the same second exists, reject. The UI-level solution (simpler, sufficient): `isLoading` state disables button immediately on click, preventing double submission.
**Warning signs:** Duplicate `stripe_refund_id` values on the same order. Add a DB check: `UNIQUE(order_id, stripe_refund_id)` on `refunds` table.

### Pitfall 2: Already-Refunded Quantity Not Accounted For
**What goes wrong:** Order has item A: qty=5. First refund refunds 3 of item A. Second refund staff can select all 5 again (UI doesn't grey out already-refunded qty). Second refund refunds another 3, total refund qty = 6 > original 5.
**Why it happens:** `PartialRefundFlow` doesn't receive existing `refund_items` data.
**How to avoid:** When loading `OrderDetailDrawer`, fetch `refund_items` joined to `refunds` for this order. Compute `alreadyRefundedQty` per `order_item_id`. Pass to `RefundItemSelector` as `maxRefundable = item.quantity - alreadyRefundedQty`. Validate again server-side in `processPartialRefund`.
**Warning signs:** `total_refunded_cents > order.total_cents` on any order.

### Pitfall 3: Stripe Amount Mismatch
**What goes wrong:** Calculated refund amount in the client (UI) doesn't match the server-calculated amount. Client sends `items: [{ orderItemId, quantityToRefund }]`, server recalculates the amount from DB. If the DB values differ (e.g., someone edited an order item), the Stripe amount could be wrong.
**Why it happens:** Client calculates preview amount for display; server should recalculate from canonical DB values, not trust the client.
**How to avoid:** `processPartialRefund` NEVER trusts a client-provided `totalCents`. It always fetches `order_items` from DB and calculates independently. The schema does not include `totalCents` in the input — only `items` with `orderItemId` and `quantityToRefund`.
**Warning signs:** `RefundSchema` includes a `totalCents` field (it should not).

### Pitfall 4: Order Status Left as `partially_refunded` When All Items Refunded
**What goes wrong:** After a second partial refund that covers the remaining items, order stays at `partially_refunded` instead of upgrading to `refunded`.
**Why it happens:** Status upgrade check is missed or calculated incorrectly.
**How to avoid:** After each refund, sum all `refund_items.quantity_refunded` per `order_item_id` across all `refunds` for this order. Compare to `order_items.quantity`. If all quantities are fully covered, set status to `refunded`. Logic lives in `processPartialRefund` after writing `refund_items`.
**Warning signs:** Refund button still shows on an order where every item has been fully refunded.

### Pitfall 5: `xero_invoice_id` Lookup Fails for Old Orders
**What goes wrong:** Xero wasn't connected when the order was placed. Order date has no corresponding `xero_sync_log` row. Credit note creation fails.
**Why it happens:** Not all orders have corresponding Xero invoices.
**How to avoid:** D-09 says Xero fails gracefully. Before calling `buildCreditNote`, check if a matching `xero_sync_log` row exists. If not (Xero wasn't synced for that date), skip credit note and log a warning. The refund still proceeds.
**Warning signs:** Xero credit note errors blocking refunds.

### Pitfall 6: `OrderStatusBadge` TypeScript Union Not Updated
**What goes wrong:** `OrderStatusBadge` has a typed `status` prop with a union type of string literals. After adding `partially_refunded` to the DB, passing it as a prop causes a TypeScript error or falls through to no-style rendering.
**Why it happens:** The type union in `OrderStatusBadge.tsx` and `OrderDataTable.tsx` must be updated alongside the migration.
**How to avoid:** Update `OrderStatus` type in `OrderStatusBadge.tsx` to include `'partially_refunded'`. Add a new entry to both `STATUS_STYLES` and `STATUS_LABELS`. Suggested style: amber/warning color (partial state is neither success nor failure).
**Warning signs:** TypeScript compile error or a badge rendering with no text/background.

### Pitfall 7: EFTPOS Refund Step Not Matching Sale Pattern
**What goes wrong:** EFTPOS refund confirmation step feels different from EFTPOS sale confirmation, confusing trained staff.
**Why it happens:** New component doesn't reuse the established pattern.
**How to avoid:** The EFTPOS refund confirm step should use the same full-screen navy overlay pattern as `EftposConfirmScreen.tsx`, with "Did the terminal approve the refund?" as the heading and YES/NO buttons. Staff D-13 requires this exact match.
**Warning signs:** EFTPOS confirm step is a modal/dialog instead of full-screen overlay.

---

## Code Examples

Verified patterns from existing codebase:

### Stripe Partial Refund Call
```typescript
// Source: src/actions/orders/processRefund.ts (extend this pattern)
// The existing call uses order.total_cents — for partial refunds, pass calculated amount:
const refund = await stripe.refunds.create({
  payment_intent: order.stripe_payment_intent_id,
  amount: partialAmountCents,   // NOT order.total_cents
})
if (refund.status !== 'succeeded' && refund.status !== 'pending') {
  // Delete pending refund record, return error
  return { error: 'Stripe refund failed.' }
}
```

### restore_stock RPC (existing, reuse as-is)
```typescript
// Source: supabase/migrations/009_security_fixes.sql + src/actions/orders/processRefund.ts
for (const item of selectedItems) {
  await adminClient.rpc('restore_stock', {
    p_product_id: item.product_id,
    p_quantity: item.quantityToRefund,
  })
}
```

### buildCreditNote (existing, reuse as-is)
```typescript
// Source: src/lib/xero/buildInvoice.ts
const creditNote = buildCreditNote(
  partialAmountCents,       // refund amount in cents
  order.created_at.slice(0, 10),  // YYYY-MM-DD
  xeroSettings,
  originalInvoiceNumber     // from xero_sync_log lookup
)
await xero.accountingApi.createCreditNotes(tenantId, { creditNotes: [creditNote] })
```

### Xero sync_log lookup for original invoice
```typescript
// Query to find original Xero invoice number for a given order date
const orderDate = order.created_at.slice(0, 10) // YYYY-MM-DD
const { data: syncLog } = await adminClient
  .from('xero_sync_log')
  .select('xero_invoice_id, xero_invoice_number')
  .eq('store_id', order.store_id)
  .eq('sync_date', orderDate)
  .eq('status', 'success')
  .single()
// If syncLog is null → skip Xero credit note, proceed with refund
```

### Order status upgrade check
```typescript
// After inserting refund_items, check if all items are fully refunded
const { data: allRefundItems } = await adminClient
  .from('refund_items')
  .select('order_item_id, quantity_refunded')
  .in('refund_id', allRefundIds)  // all refund IDs for this order

const refundedQtyByItem = new Map<string, number>()
for (const ri of allRefundItems ?? []) {
  refundedQtyByItem.set(ri.order_item_id,
    (refundedQtyByItem.get(ri.order_item_id) ?? 0) + ri.quantity_refunded)
}

const allFullyRefunded = order.order_items.every(
  (item) => (refundedQtyByItem.get(item.id) ?? 0) >= item.quantity
)

const newStatus = allFullyRefunded ? 'refunded' : 'partially_refunded'
```

### EftposConfirmScreen pattern (refund variant)
```typescript
// Source: src/components/pos/EftposConfirmScreen.tsx — replicate structure
// For refund EFTPOS step, use same full-screen navy overlay with YES/NO
<div className="fixed inset-0 z-[70] bg-navy flex flex-col items-center justify-center px-4 outline-none"
  role="alertdialog" aria-modal="true">
  <p className="text-sm text-white/60 font-normal mb-1">Refund NZD</p>
  <p className="text-3xl font-display font-bold text-white tabular-nums">{formatNZD(refundCents)}</p>
  <h1 className="text-xl font-bold text-white mt-8 text-center">
    Did the EFTPOS terminal approve the refund?
  </h1>
  {/* YES / NO buttons same layout as EftposConfirmScreen */}
</div>
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Full-refund only (`processRefund`) | Unified partial+full via `processPartialRefund` | Phase 11 | Old action can remain for backward compat but new flow supersedes it |
| `stripe.refunds.create` with `order.total_cents` | `stripe.refunds.create` with calculated partial amount | Phase 11 | Amount now derives from selected items, not order total |
| `restoreStock: boolean` toggle | Per-item stock restore (always, for selected items) | Phase 11 | Stock restore is implicit in item selection, not a separate toggle |
| Status: `completed` → `refunded` | `completed` → `partially_refunded` → `refunded` | Phase 11 | Two-step status progression for partial cases |
| Refund data on `orders.notes` + `orders.stripe_refund_id` | Dedicated `refunds` + `refund_items` tables | Phase 11 | Full audit trail, multiple refunds per order |

---

## Open Questions

1. **xero_invoice_id on orders column (D-10) vs. sync_log lookup**
   - What we know: D-10 says "requires storing Xero invoice ID on the orders table". The `xero_sync_log` table already stores `xero_invoice_id` per `(store_id, sync_date)`.
   - What's unclear: Does adding `xero_invoice_id` to orders require backfilling, or is the sync_log lookup sufficient for the credit note reference?
   - Recommendation: Use sync_log lookup at refund time (no backfill needed). The planner can add `xero_invoice_id` to `orders` as a nullable column but populate it from sync_log. This is a Wave 0 migration task regardless — migration 013 adds it.

2. **Customer refund email**
   - What we know: D-08 mentions `customer_notified` boolean on `refunds`. Resend email infrastructure exists (Phase 9). No `RefundEmail` template exists yet.
   - What's unclear: Is a refund notification email in scope for this phase?
   - Recommendation: Create a minimal `RefundEmail` template using `@react-email/components` following the pattern of `OnlineReceiptEmail.tsx`. Mark as Wave 3/4 work (after core refund flow is proven). Set `customer_notified = false` until email is sent.

3. **`processRefund` deprecation**
   - What we know: `processRefund.ts` and its test `processRefund.test.ts` exist. The old action only does full refunds.
   - What's unclear: Should the old action be kept (for any remaining caller) or deleted?
   - Recommendation: Keep `processRefund.ts` but add a deprecation comment. All new refund paths go through `processPartialRefund`. Delete in a cleanup phase if no callers remain.

---

## Environment Availability

Step 2.6: SKIPPED — phase is code/config changes with no new external dependencies. Stripe, Supabase, and Xero clients are already installed and configured. No new external tools required.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest ^4.1.2 |
| Config file | none — auto-detected via `package.json` scripts |
| Quick run command | `npx vitest run src/actions/orders/__tests__/processPartialRefund.test.ts` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| REFUND-01 | Item selection validation (empty selection rejected, qty > available rejected) | unit | `npx vitest run src/actions/orders/__tests__/processPartialRefund.test.ts -t "validation"` | Wave 0 |
| REFUND-02 | Stripe called with partial amount (not full order total) | unit | `npx vitest run src/actions/orders/__tests__/processPartialRefund.test.ts -t "stripe"` | Wave 0 |
| REFUND-03 | restore_stock RPC called per selected item with correct quantity | unit | `npx vitest run src/actions/orders/__tests__/processPartialRefund.test.ts -t "stock"` | Wave 0 |
| REFUND-04 | buildCreditNote called with correct amount when Xero connected | unit | `npx vitest run src/lib/xero/__tests__/buildCreditNote.test.ts` | Exists (in buildInvoice.test.ts — extend) |
| REFUND-04 | Xero failure does not block refund completion | unit | `npx vitest run src/actions/orders/__tests__/processPartialRefund.test.ts -t "xero failure"` | Wave 0 |
| REFUND-05 | refunds + refund_items rows created with correct data | unit | `npx vitest run src/actions/orders/__tests__/processPartialRefund.test.ts -t "audit"` | Wave 0 |
| REFUND-05 | Order status transitions: completed → partially_refunded → refunded | unit | `npx vitest run src/actions/orders/__tests__/processPartialRefund.test.ts -t "status"` | Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run src/actions/orders/__tests__/processPartialRefund.test.ts`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/actions/orders/__tests__/processPartialRefund.test.ts` — covers REFUND-01 through REFUND-05
- [ ] Extend `src/lib/xero/__tests__/buildInvoice.test.ts` with partial refund amount cases

*(Existing test infrastructure covers the framework — no new config needed)*

---

## Sources

### Primary (HIGH confidence)
- `src/actions/orders/processRefund.ts` — existing refund action, transaction order, optimistic lock pattern
- `src/schemas/refund.ts` — existing Zod schema to extend
- `src/components/admin/orders/RefundConfirmationStep.tsx` — component to replace
- `src/components/admin/orders/OrderDetailDrawer.tsx` — host component, drawer pattern
- `src/components/admin/orders/OrderStatusBadge.tsx` — typed status union, styling pattern
- `src/components/admin/orders/OrderFilterBar.tsx` — status filter list
- `src/components/pos/EftposConfirmScreen.tsx` — EFTPOS confirm step to replicate
- `src/lib/xero/buildInvoice.ts` — `buildCreditNote` function (verified functional)
- `src/lib/xero/sync.ts` — `aggregateDailySales`, `getXeroSettings`, sync log pattern
- `src/lib/xero/client.ts` — `getAuthenticatedXeroClient` (graceful null return)
- `supabase/migrations/001_initial_schema.sql` — order status CHECK constraint (needs `partially_refunded`)
- `supabase/migrations/009_security_fixes.sql` — `restore_stock` RPC definition
- `supabase/migrations/008_xero_integration.sql` — `xero_sync_log` schema
- `src/types/database.ts` — full table type definitions including orders, order_items
- Stripe docs (training data, verified against existing implementation): `stripe.refunds.create({ payment_intent, amount })` supports partial amounts

### Secondary (MEDIUM confidence)
- `src/lib/xero/__tests__/buildInvoice.test.ts` — verified `buildCreditNote` signature and behaviour
- `src/actions/orders/__tests__/processRefund.test.ts` — verified mock pattern for new test file

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already installed and in use
- Architecture: HIGH — directly derived from existing codebase patterns
- Pitfalls: HIGH — identified from direct code inspection and known Stripe/Postgres patterns
- Xero credit note linking: MEDIUM — D-10 says "store xero_invoice_id on orders"; sync_log lookup approach is an inference, planner should decide canonical approach

**Research date:** 2026-04-03
**Valid until:** 2026-05-03 (stable domain — Stripe/Xero APIs, existing patterns don't change)

---

## Project Constraints (from CLAUDE.md)

| Constraint | Source | Applies To |
|-----------|--------|-----------|
| Supabase JS client only (no Prisma/Drizzle/raw pg) | CLAUDE.md stack | Migration + server action queries |
| `@supabase/ssr` (not auth-helpers) | CLAUDE.md stack | Any new auth usage |
| Zod `safeParse` on all Server Action inputs | CLAUDE.md conventions | `processPartialRefund` schema |
| `server-only` import in server files | CLAUDE.md conventions | `processPartialRefund.ts` |
| Tailwind v4 utility classes (no CSS modules, styled-components) | CLAUDE.md stack | `PartialRefundFlow`, `RefundItemSelector` components |
| No Supabase Realtime | CLAUDE.md | Status updates use revalidatePath, not websocket |
| No Stripe Terminal SDK | CLAUDE.md | EFTPOS is manual confirmation only (D-13) |
| All money in INTEGER cents (no DECIMAL/FLOAT) | CLAUDE.md + migration 001 | `total_cents`, `line_total_refunded_cents` columns |
| IRD-compliant GST 15% tax-inclusive | CLAUDE.md | Refund amounts include GST; Xero `OUTPUT2` taxType, `Inclusive` lineAmountTypes |
| Vitest (not Jest) | CLAUDE.md | Test files for new action |
| Read DESIGN.md before UI decisions | CLAUDE.md | `PartialRefundFlow`, `RefundItemSelector` must follow navy+amber design system |
