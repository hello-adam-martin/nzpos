---
phase: 37-loyalty-points-add-on
plan: "04"
subsystem: loyalty
tags: [loyalty, points, pos, webhook, stripe]
dependency_graph:
  requires: ["37-01"]
  provides: ["LOYAL-05", "LOYAL-06"]
  affects: ["completeSale", "stripe-webhook"]
tech_stack:
  added: []
  patterns:
    - "Non-fatal loyalty hook pattern: try/catch with console.warn, sale never voided"
    - "D-09: net amount = total_cents - gift_card_amount_cents - loyalty_discount_cents (POS)"
    - "D-09: online net amount = session.amount_total (already reflects all Stripe negative line items)"
key_files:
  created: []
  modified:
    - src/schemas/order.ts
    - src/actions/orders/completeSale.ts
    - src/app/api/webhooks/stripe/route.ts
decisions:
  - "Loyalty operations are non-fatal — sale is never voided by a loyalty RPC failure (matches gift card redemption pattern)"
  - "Online net amount uses session.amount_total directly — no double-subtraction since Stripe already reflects negative line items"
  - "Supabase types not regenerated locally (local Supabase instance not available) — noted as post-phase cleanup"
metrics:
  duration: "~2 min"
  completed: "2026-04-07"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 3
---

# Phase 37 Plan 04: Loyalty Points Earning Hooks Summary

Loyalty points earning and redemption hooked into POS completeSale and Stripe webhook; RPC calls are non-fatal and operate on net amount (D-09).

## What Was Built

### Task 1: POS completeSale loyalty hook (LOYAL-05)

Extended `CreateOrderSchema` in `src/schemas/order.ts` with three optional fields:
- `customer_id: z.string().uuid().optional()`
- `loyalty_discount_cents: z.number().int().min(0).optional()`
- `loyalty_points_redeemed: z.number().int().min(0).optional()`

Added to `src/actions/orders/completeSale.ts` after gift card redemption (section 6b/6c):

**Redemption (6b):** If `customer_id` + `loyalty_points_redeemed > 0`, calls `redeem_loyalty_points` RPC. Non-fatal — catches error, warns, continues.

**Earning (6c):** If `customer_id` present, computes `netAmountCents = total_cents - gift_card_amount_cents - loyalty_discount_cents` (D-09 compliance), then calls `earn_loyalty_points` RPC if `netAmountCents > 0`. Non-fatal.

### Task 2: Stripe webhook loyalty hook (LOYAL-06)

Added to `src/app/api/webhooks/stripe/route.ts` in `handleCheckoutComplete`, after the existing gift card redemption block:

**Metadata extraction:** Reads `session.metadata?.loyalty_customer_id` and `session.metadata?.loyalty_points_redeemed`.

**Redemption:** If metadata present with points > 0, calls `redeem_loyalty_points` with `p_channel: 'online'`, `p_staff_id: null`. AFTER `complete_online_sale` per Pitfall 2 (never before payment confirmed). Non-fatal.

**Earning:** Looks up customer by `session.customer_details?.email` in `customers` table. If found, uses `session.amount_total` as net amount (already reflects all Stripe negative line items — gift card and loyalty deductions). Calls `earn_loyalty_points` with `p_channel: 'online'`, `p_staff_id: null`. Non-fatal.

## Decisions Made

1. **Non-fatal loyalty operations** — Both redemption and earning use try/catch with `console.warn`. Sale/order is never voided by a loyalty RPC failure. Matches the existing gift card redemption pattern in both files.

2. **Online net amount = session.amount_total** — Stripe `amount_total` already reflects all negative line items (gift card discount line + loyalty discount line). No additional subtraction needed. This avoids double-deduction and aligns with how Stripe Checkout works.

3. **Supabase types not regenerated** — Local Supabase instance not available. The `earn_loyalty_points` and `redeem_loyalty_points` RPC calls use `(supabase as any).rpc(...)` casts until types are regenerated in production. This is consistent with how other new RPCs are used before type generation runs.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all loyalty hooks wire to real RPCs. The RPCs themselves handle the "not configured" case by returning `{ points_earned: 0, reason: 'not_configured' }` silently.

## Post-Phase Cleanup

- Run `npx supabase gen types typescript --local > src/types/supabase.ts` after local Supabase migration is applied to remove `(supabase as any)` casts on `earn_loyalty_points` and `redeem_loyalty_points` RPC calls.

## Verification

- All 7 existing `completeSale` tests pass (new schema fields are optional — zero regression)
- TypeScript: no errors in modified files (`src/schemas/order.ts`, `src/actions/orders/completeSale.ts`, `src/app/api/webhooks/stripe/route.ts`)
- Pre-existing TS errors in unrelated files (`adjustStock.ts`, `quickAddCustomer.ts`, etc.) are out of scope

## Self-Check: PASSED

- src/schemas/order.ts: FOUND
- src/actions/orders/completeSale.ts: FOUND
- src/app/api/webhooks/stripe/route.ts: FOUND
- Commit b2eb931: FOUND (POS loyalty hook)
- Commit 41063c6: FOUND (webhook loyalty hook)
