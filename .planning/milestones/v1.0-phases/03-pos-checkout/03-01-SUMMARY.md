---
phase: 03-pos-checkout
plan: 01
subsystem: pos-checkout-backend
tags: [cart, reducer, gst, rpc, server-action, tdd]
dependency_graph:
  requires:
    - src/lib/gst.ts (calcLineItem, calcOrderGST — imported, not re-implemented)
    - src/lib/supabase/admin.ts (createSupabaseAdminClient)
    - src/actions/auth/staffPin.ts (jose JWT pattern — reused for getStaffSession)
    - src/schemas/order.ts (CreateOrderSchema — updated and consumed by completeSale)
  provides:
    - src/lib/cart.ts (CartItem, CartState, CartAction, cartReducer, calcCartTotals, applyCartDiscount, calcChangeDue, initialCartState)
    - src/actions/orders/completeSale.ts (completeSale Server Action)
    - supabase/migrations/005_pos_rpc.sql (complete_pos_sale RPC + cash_tendered_cents + 'split' payment method)
  affects:
    - Plans 03-02 through 03-05 depend on CartItem, CartState, CartAction types and completeSale action
    - Phase 5 cash-up report will use cash_tendered_cents column added in 005_pos_rpc.sql
tech_stack:
  added: []
  patterns:
    - useReducer cart state machine with discriminated union CartAction type
    - Pro-rata cart discount distribution with Math.floor + last-item remainder
    - SELECT FOR UPDATE row locking in Postgres RPC for race-condition-free stock decrement
    - SECURITY DEFINER RPC for admin-level DB operations called from service-role client
    - Staff JWT verification via jose jwtVerify (reusing pattern from staffPin.ts)
key_files:
  created:
    - src/lib/cart.ts
    - src/lib/__tests__/pos-cart.test.ts
    - src/actions/orders/completeSale.ts
    - src/actions/orders/__tests__/completeSale.test.ts
    - supabase/migrations/005_pos_rpc.sql
  modified:
    - src/schemas/order.ts (added 'split' to payment_method, added cash_tendered_cents)
    - src/types/database.ts (added 'split' + cash_tendered_cents to orders, added complete_pos_sale to Functions)
decisions:
  - GST computed per-line using calcLineItem from gst.ts — not re-implemented in cart module
  - Pro-rata cart discount: Math.floor for all items, last item absorbs rounding remainder to ensure exact total
  - completeSale uses admin client (not SSR client) to bypass RLS for atomic stock decrement via SECURITY DEFINER RPC
  - RPC raises structured EXCEPTION strings (OUT_OF_STOCK:id:msg, PRODUCT_NOT_FOUND:id) for typed error handling in Server Action
  - 005_pos_rpc.sql adds store_id column to order_items with ADD COLUMN IF NOT EXISTS (safe idempotent)
metrics:
  duration_minutes: 3
  completed_date: "2026-04-01"
  tasks_completed: 2
  files_created: 5
  files_modified: 2
---

# Phase 3 Plan 1: POS Checkout Backend Foundation Summary

**One-liner:** Cart reducer with pro-rata GST discounts, atomic Postgres RPC with FOR UPDATE stock locking, and staff-JWT-authenticated completeSale Server Action.

## What Was Built

### Task 1: Cart Logic Module (TDD)

`src/lib/cart.ts` implements the full POS cart state machine as a `useReducer`-compatible reducer.

**Types exported:**
- `CartItem` — per-line item with unitPriceCents, quantity, discountCents, lineTotalCents, gstCents
- `CartState` — items array + paymentMethod + cashTenderedCents + cartDiscountCents + phase + completedOrderId
- `CartAction` — discriminated union covering all 12 action types

**Functions exported:**
- `cartReducer(state, action)` — all state transitions
- `calcCartTotals(items)` — returns subtotalCents, gstCents, totalCents (tax-inclusive: total === subtotal)
- `applyCartDiscount(items, discountCents)` — pro-rata distribution with floor + last-item remainder
- `calcChangeDue(total, tendered)` — simple arithmetic for cash payment change
- `initialCartState` — zero-value initial state constant

GST is computed per-line using `calcLineItem` from `src/lib/gst.ts` — IRD-compliant, no re-implementation.

**20 unit tests** covering all reducer transitions, discount distribution, and helper functions.

### Task 2: RPC Migration + completeSale Server Action

**`supabase/migrations/005_pos_rpc.sql`:**
- Alters `payment_method` CHECK to include `'split'`
- Adds `cash_tendered_cents INTEGER` column to orders
- Creates `complete_pos_sale` SECURITY DEFINER function:
  1. Locks product rows with `SELECT FOR UPDATE` (prevents overselling under concurrent transactions)
  2. Validates stock levels, raises `OUT_OF_STOCK` or `PRODUCT_NOT_FOUND` with structured exception strings
  3. Inserts order + all line items atomically
  4. Decrements stock for each product in the same transaction

**Schema updates:**
- `src/schemas/order.ts`: `payment_method` now accepts `'split'`, added `cash_tendered_cents` optional field
- `src/types/database.ts`: orders Row/Insert/Update updated, `complete_pos_sale` added to `Functions` record

**`src/actions/orders/completeSale.ts`:**
- `'use server'` + `'server-only'` guard
- Extracts and verifies `staff_session` cookie JWT via `jwtVerify` (jose)
- Validates input with `CreateOrderSchema.safeParse()`
- Calls `complete_pos_sale` RPC via admin client
- Handles `OUT_OF_STOCK`, `PRODUCT_NOT_FOUND`, and generic errors with structured return values
- Calls `revalidatePath('/pos')` for refresh-on-transaction inventory sync

**7 unit tests** covering all auth/validation/RPC error paths.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated test UUID from all-zeros to valid hex format**
- **Found during:** Task 2 completeSale test RED phase
- **Issue:** Test used `'00000000-0000-0000-0000-000000000001'` as product_id — Zod v4's UUID validator rejected it (last segment `000000000001` must contain hex chars a-f, not just digits in some validator implementations)
- **Fix:** Changed to `'a1b2c3d4-e5f6-7890-abcd-ef1234567890'` which is unambiguously valid
- **Files modified:** `src/actions/orders/__tests__/completeSale.test.ts`
- **Commit:** 5abb9e9

None — plan executed correctly.

## Known Stubs

None. All exported functions are fully implemented with no placeholder values or TODO stubs.

## Test Results

```
Test Files: 177 passed, 4 skipped
Tests:      177 passed, 4 skipped
```

Skipped tests: RLS integration tests (require live Supabase instance — expected behaviour).

## Self-Check: PASSED
