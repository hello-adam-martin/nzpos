# Phase 11: Partial Refunds - Context

**Gathered:** 2026-04-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Staff can refund individual line items from any order (online, POS cash, POS EFTPOS), with stock atomically restored, Stripe partial refund for online orders, Xero credit note for accounting, and a full audit trail. The existing full-refund flow is replaced by a unified partial refund flow where "Select All" is the full-refund case.

</domain>

<decisions>
## Implementation Decisions

### Line Item Selection UX
- **D-01:** Checkbox + quantity adjuster per line item. Each order line item gets a checkbox to select it for refund, plus a quantity spinner (e.g., bought 5, refund 2).
- **D-02:** Replace the existing `RefundConfirmationStep` with an upgraded component that shows line items with checkboxes/quantities first, then reason + confirm. Same drawer flow, richer content.
- **D-03:** Refund amount is auto-calculated only — sum of selected items x quantities x unit price (with discount applied). No manual override.
- **D-04:** "Select All" toggle at the top — full refund becomes a special case of partial refund. One unified flow replaces the current full-refund-only flow.

### Refund State & Audit Trail
- **D-05:** Add `partially_refunded` status to orders. Status model: `completed` → `partially_refunded` (some items refunded) → `refunded` (all items refunded). Auto-upgrades to `refunded` when all items have been refunded.
- **D-06:** New `refunds` table: id, order_id, store_id, reason, total_cents, stripe_refund_id, created_by (staff), created_at, customer_notified (boolean). Plus `refund_items` join table linking refund → order_items with quantity_refunded.
- **D-07:** Multiple partial refunds allowed on the same order. Staff can refund some items now, more later. Already-refunded items are greyed out in the selection UI.
- **D-08:** Audit trail captures: which items, how many of each, calculated amount, reason (from existing enum), staff member who processed it, timestamp, and whether customer was notified (email sent flag).

### Xero Credit Note Integration
- **D-09:** Credit note created immediately on refund (not batched). Fails gracefully if Xero is disconnected — refund succeeds, credit note flagged as pending for daily sync or manual retry.
- **D-10:** Credit note linked to the original Xero invoice. Requires storing Xero invoice ID on the orders table (added during Xero sync). Proper double-entry accounting.

### Cash/EFTPOS Refund Handling
- **D-11:** POS refunds (cash/EFTPOS) are record-only — system records the refund and restores stock, but the actual money return is handled manually. Confirmation step says "Return $X.XX to the customer via [original payment method]".
- **D-12:** Same refund flow for all payment types — identical item selection and reason UI. Confirmation step adapts the message: Stripe → "Refund will be processed to card", Cash → "Hand $X.XX cash to customer", EFTPOS → "Process $X.XX refund on EFTPOS terminal".
- **D-13:** EFTPOS refunds include a terminal confirmation step matching the existing sale pattern: "Did the terminal approve the refund?" with Yes/No buttons.

### Claude's Discretion
- Component structure within the refund drawer (splitting into sub-components as needed)
- Database migration numbering and ordering
- Xero credit note API field mapping details
- Error handling UX for edge cases (Stripe timeout, network failure mid-refund)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing Refund Code
- `src/actions/orders/processRefund.ts` — Current full-refund server action (to be replaced/upgraded)
- `src/schemas/refund.ts` — Zod schema for refund input (needs line items added)
- `src/components/admin/orders/RefundConfirmationStep.tsx` — Current full-refund UI (to be replaced)
- `src/components/admin/orders/OrderDetailDrawer.tsx` — Hosts refund flow, has REFUNDABLE_STATUSES set

### Order & Item Schema
- `src/types/database.ts` — Database types including orders and order_items
- `supabase/migrations/001_initial_schema.sql` — Order status CHECK constraint (needs `partially_refunded` added)
- `supabase/migrations/009_security_fixes.sql` — stripe_refund_id column and restore_stock RPC

### Xero Integration
- `src/app/api/cron/xero-sync/route.ts` — Daily Xero sync (invoice creation pattern to follow for credit notes)
- `src/components/admin/integrations/XeroSyncButton.tsx` — Manual sync trigger

### EFTPOS Pattern
- `src/components/pos/` — Existing EFTPOS confirmation step pattern (to replicate for refund flow)

### Requirements
- `.planning/REQUIREMENTS.md` — REFUND-01 through REFUND-05

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `restore_stock` RPC: Already handles atomic stock increment per product_id + quantity — reusable as-is for partial refunds
- `RefundSchema` (Zod): Existing validation schema, needs extension for line items array
- `OrderDetailDrawer`: Hosts the refund flow, already has status checks and drawer pattern
- `OrderStatusBadge`: Will need `partially_refunded` added to its status-to-color mapping
- `formatNZD`: Currency formatting utility, reusable throughout refund UI
- Resend email infrastructure (Phase 9): Can be used for refund notification emails

### Established Patterns
- Server Actions for mutations (`processRefund` pattern with auth check → validate → fetch → mutate → revalidate)
- Optimistic locking via status-conditional updates (prevents double-refund race)
- Admin client (`createSupabaseAdminClient`) for operations that bypass RLS
- Zod schema validation on all server action inputs

### Integration Points
- `OrderDetailDrawer` → new partial refund component (replaces `RefundConfirmationStep`)
- Orders status CHECK constraint → needs migration to add `partially_refunded`
- `OrderStatusBadge` → needs new status color/label
- `OrderFilterBar` → may need filter option for partially_refunded
- Xero sync → new credit note creation path alongside existing invoice sync
- Reports page → refund totals should appear in daily/GST reports

</code_context>

<specifics>
## Specific Ideas

- EFTPOS refund confirmation should mirror the sale confirmation exactly — staff are already trained on that pattern
- Already-refunded items greyed out in selection UI prevents confusion on multi-refund orders
- "Select All" makes the old full-refund flow a subset — no separate code path needed

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 11-partial-refunds*
*Context gathered: 2026-04-03*
