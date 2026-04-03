# Phase 11: Partial Refunds - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-03
**Phase:** 11-partial-refunds
**Areas discussed:** Line item selection UX, Refund state & audit trail, Xero credit note integration, Cash/EFTPOS refund handling

---

## Line Item Selection UX

### How should staff select items to refund?

| Option | Description | Selected |
|--------|-------------|----------|
| Checkbox per line item | Each line item gets a checkbox. Full quantity of each checked item is refunded. | |
| Checkbox + quantity adjuster | Checkbox to select, then a quantity spinner per item (e.g., bought 5, refund 2). | ✓ |
| You decide | Claude picks the best approach. | |

**User's choice:** Checkbox + quantity adjuster
**Notes:** More flexible for real retail scenarios where partial quantities need refunding.

### Where should the line item selection appear in the flow?

| Option | Description | Selected |
|--------|-------------|----------|
| Replace current refund step | RefundConfirmationStep gets upgraded — shows line items first, then reason + confirm. | ✓ |
| New step before confirmation | Add a separate 'Select Items' step before confirmation. Two-step flow. | |
| You decide | Claude picks the layout. | |

**User's choice:** Replace current refund step
**Notes:** None

### Should the refund amount be editable?

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-calculated only | Amount = sum of selected items. No manual override. | ✓ |
| Auto-calculated with manual override | Shows calculated amount but staff can type a custom amount. | |
| You decide | Claude picks safest approach. | |

**User's choice:** Auto-calculated only
**Notes:** None

### Should 'Refund All' be a shortcut?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, include a Select All toggle | Full refund becomes a special case of partial refund — one unified flow. | ✓ |
| No, keep full refund separate | Keep existing full-refund button. Two code paths. | |
| You decide | Claude picks cleanest approach. | |

**User's choice:** Yes, include a Select All toggle
**Notes:** None

---

## Refund State & Audit Trail

### Should orders get a 'partially_refunded' status?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, add partially_refunded | Orders can be: completed, partially_refunded, or refunded. Auto-upgrades when all items refunded. | ✓ |
| Keep refunded only | Any refund marks order as 'refunded'. | |
| You decide | Claude picks based on reporting needs. | |

**User's choice:** Yes, add partially_refunded
**Notes:** None

### How should refund records be stored?

| Option | Description | Selected |
|--------|-------------|----------|
| New refunds table | Dedicated 'refunds' + 'refund_items' tables. Supports multiple partial refunds. | ✓ |
| JSONB on orders table | Store refund history as JSONB array. | |
| You decide | Claude picks best approach. | |

**User's choice:** New refunds table
**Notes:** None

### Should multiple partial refunds be allowed?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, multiple refunds allowed | Refund some now, more later. Already-refunded items greyed out. | ✓ |
| One refund per order only | Once any refund issued, no further refunds. | |
| You decide | Claude picks based on retail patterns. | |

**User's choice:** Yes, multiple refunds allowed
**Notes:** None

### What should the audit trail capture?

| Option | Description | Selected |
|--------|-------------|----------|
| Items, quantities, amounts, reason, who, when | Standard audit fields. | |
| Above + customer notification flag | Also track whether customer was notified (email sent). | ✓ |
| You decide | Claude picks minimum viable audit. | |

**User's choice:** Above + customer notification flag
**Notes:** None

---

## Xero Credit Note Integration

### When should Xero credit notes be created?

| Option | Description | Selected |
|--------|-------------|----------|
| Immediately on refund | Created as part of refund action. Fails gracefully if disconnected. | ✓ |
| Batched in daily sync | Picked up by existing daily cron job. | |
| You decide | Claude picks based on existing architecture. | |

**User's choice:** Immediately on refund
**Notes:** None

### If Xero is disconnected?

| Option | Description | Selected |
|--------|-------------|----------|
| Refund succeeds, credit note queued | Stripe/stock proceed. Credit note flagged pending for later sync. | ✓ |
| Refund blocked until Xero connected | Cannot refund without Xero. | |
| You decide | Claude picks most pragmatic approach. | |

**User's choice:** Refund succeeds, credit note queued
**Notes:** None

### Should credit note reference original invoice?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, linked to original invoice | Allocated against original sales invoice in Xero. Requires Xero invoice ID on order. | ✓ |
| Standalone credit note | Independent, not linked. | |
| You decide | Claude picks based on Xero API and accounting practice. | |

**User's choice:** Yes, linked to original invoice
**Notes:** None

---

## Cash/EFTPOS Refund Handling

### How should POS refunds work?

| Option | Description | Selected |
|--------|-------------|----------|
| Record-only refund | System records refund + restores stock. Cash/EFTPOS return handled manually at till. | ✓ |
| Block POS refunds entirely | Only allow refunds on online orders. | |
| You decide | Claude picks based on supplies store needs. | |

**User's choice:** Record-only refund
**Notes:** None

### Should refund flow differ by payment type?

| Option | Description | Selected |
|--------|-------------|----------|
| Same flow, different confirmation message | Identical UI, confirmation adapts per payment method. | ✓ |
| Separate flows per payment type | Different refund screens per method. | |
| You decide | Claude picks cleanest approach. | |

**User's choice:** Same flow, different confirmation message
**Notes:** None

### EFTPOS terminal confirmation step?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, same pattern as sale | "Did the terminal approve?" Yes/No — matches existing EFTPOS sale flow. | ✓ |
| No confirmation needed | Just record the refund. | |
| You decide | Claude picks based on existing pattern. | |

**User's choice:** Yes, same pattern as sale
**Notes:** None

---

## Claude's Discretion

- Component structure within the refund drawer
- Database migration numbering and ordering
- Xero credit note API field mapping details
- Error handling UX for edge cases

## Deferred Ideas

None — discussion stayed within phase scope
