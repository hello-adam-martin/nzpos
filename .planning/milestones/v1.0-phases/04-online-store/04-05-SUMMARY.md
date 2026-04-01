---
phase: 04-online-store
plan: "05"
subsystem: storefront-cart
tags: [cart, stripe, checkout, promo, gst, ui]
dependency_graph:
  requires: [04-02, 04-03, 04-04]
  provides: [cart-drawer-ui, checkout-session-action]
  affects: [storefront-layout, order-flow]
tech_stack:
  added: []
  patterns:
    - "Cart drawer with slide animation and mobile bottom sheet"
    - "Server Action validates product prices before Stripe redirect"
    - "order_items inserted before Stripe session (required for stock decrement webhook)"
    - "Pro-rata promo discount distribution with Math.floor + last-item remainder absorption"
    - "Double-validate promo server-side even after client-side validatePromoCode call"
key_files:
  created:
    - src/components/store/CartDrawer.tsx
    - src/components/store/CartLineItem.tsx
    - src/components/store/CartSummary.tsx
    - src/components/store/PromoCodeInput.tsx
    - src/actions/orders/createCheckoutSession.ts
  modified: []
decisions:
  - "CartDrawer references createCheckoutSession import at Task 1 time — TypeScript resolves once Task 2 creates the file (intra-plan dependency resolved by execution order)"
  - "Promo current_uses incremented via read-then-write (not RPC) — increment_promo_uses RPC not in generated types; direct update is safe for v1 traffic"
  - "Promo uses increment is non-fatal — logged but does not fail checkout; next validate call enforces max_uses"
  - "CartDrawer uses window.location.href for Stripe redirect (not Next.js router) — Server Action returns URL and client-side redirect is required for external Stripe URL"
metrics:
  duration: "225s"
  completed_date: "2026-04-01"
  tasks_completed: 2
  files_created: 5
  files_modified: 0
---

# Phase 04 Plan 05: Cart Drawer UI and Stripe Checkout Session Summary

**One-liner:** Cart drawer with GST-aware totals and promo code input, backed by a Server Action that creates a PENDING order with order_items before redirecting to Stripe Checkout (NZD, no Stripe Tax).

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Cart drawer UI components | bfd88d2 | CartDrawer.tsx, CartLineItem.tsx, CartSummary.tsx, PromoCodeInput.tsx |
| 2 | createCheckoutSession Server Action | db9872b | createCheckoutSession.ts |

## What Was Built

### Task 1: Cart Drawer UI Components

**CartLineItem** (`src/components/store/CartLineItem.tsx`):
- Product thumbnail (48x48, placeholder SVG when no image), product name, quantity stepper, line total
- Quantity stepper: decrement disabled at qty=1, increment disabled at maxStock
- Remove button: `aria-label="Remove {productName} from cart"` per UI-SPEC
- Price in tabular-nums, `formatNZD()` (actual money.ts export, not formatCents)

**CartSummary** (`src/components/store/CartSummary.tsx`):
- Rows: Subtotal, Discount (conditional on discountCents > 0, in error color), GST (incl.), Total
- Total in `text-base font-semibold`, all prices in tabular-nums
- Uses `useCart()` computed values directly

**PromoCodeInput** (`src/components/store/PromoCodeInput.tsx`):
- Text input + "Apply Code" button, `useTransition` for loading state
- Calls `validatePromoCode` Server Action, dispatches `APPLY_PROMO` on success
- Error messages from `result.message` with `aria-live="polite"` on error container
- CSS keyframe shake animation (300ms, 3px amplitude per UI-SPEC)
- Applied state: shows discount label + "Remove" button that dispatches `CLEAR_PROMO`

**CartDrawer** (`src/components/store/CartDrawer.tsx`):
- Desktop: 380px right panel with `translate-x-full -> translate-x-0` slide, 250ms ease-in-out
- Mobile: bottom sheet 85vh with `translate-y-full -> translate-y-0` slide
- Backdrop: `bg-[var(--color-navy)]/30` click-to-close
- `role="dialog" aria-modal="true"`, focus trap (Tab/Shift+Tab), Escape closes
- Header: "Your Cart" + item count + close X button
- Empty state: cart SVG icon, "Your cart is empty" / "Browse our products and add something you like." / "Continue Shopping" link
- Items list scrollable, wires CartLineItem → dispatch SET_QUANTITY / REMOVE_ITEM
- PromoCodeInput + CartSummary below items
- Checkout CTA: amber button "Proceed to Checkout", calls createCheckoutSession, redirects via `window.location.href`

### Task 2: createCheckoutSession Server Action

**`src/actions/orders/createCheckoutSession.ts`** (`'use server'`, `'server-only'`):

Flow:
1. Read `storeId` from `STORE_ID` env var
2. Re-fetch product prices from DB (never trusts client) — verifies `is_active=true` and `stock_quantity >= requested`
3. Out-of-stock: returns `{ error: 'out_of_stock', productName }` immediately
4. Builds cart with server-verified prices
5. If `promoId` provided: double-validates from DB (expiry, uses, active) — recalculates discount
6. Distributes discount pro-rata (Math.floor for all lines, last line absorbs remainder)
7. Calculates per-line GST via `calcLineItem()`, totals via `calcOrderGST()`
8. Creates PENDING order in Supabase (`channel: 'online'`, `payment_method: 'stripe'`)
9. **Inserts order_items** for each line (required for `complete_online_sale` RPC stock decrement in webhook)
10. Increments promo `current_uses` via read-then-write (non-fatal)
11. Creates Stripe Checkout Session: `mode: 'payment'`, `currency: 'nzd'`, no `tax_rates`, GST-inclusive prices
12. Returns `{ url: session.url }`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed invalid Supabase `.catch()` chaining on promo increment**
- **Found during:** Task 2 TypeScript check
- **Issue:** Plan called a non-existent `increment_promo_uses` RPC. Supabase types only declare `complete_online_sale`. Using `.rpc()` with `.throwOnError().catch()` fails because `.catch()` is not on `PostgrestFilterBuilder`.
- **Fix:** Replaced with read-then-increment pattern: fetch `current_uses`, update with `current_uses + 1`. Non-fatal — errors logged but checkout continues.
- **Files modified:** `src/actions/orders/createCheckoutSession.ts`
- **Commit:** db9872b

### Out-of-Scope Issues Noted

**Pre-existing TypeScript errors in `src/actions/orders/completeSale.ts`:**
- Line 36: `complete_pos_sale` RPC name not in generated types (only `complete_online_sale` is)
- Line 72: `data as { order_id: string }` type cast on `void` return
- These errors existed before this plan. Not caused by Plan 05 changes.
- Logged to deferred-items for Phase 03 review.

## Self-Check

- [x] `src/components/store/CartDrawer.tsx` exists (created)
- [x] `src/components/store/CartLineItem.tsx` exists (created)
- [x] `src/components/store/CartSummary.tsx` exists (created)
- [x] `src/components/store/PromoCodeInput.tsx` exists (created)
- [x] `src/actions/orders/createCheckoutSession.ts` exists (created)
- [x] Commit bfd88d2 exists (Task 1)
- [x] Commit db9872b exists (Task 2)
- [x] TypeScript: 0 errors in plan files (2 pre-existing errors in unrelated completeSale.ts)

## Self-Check: PASSED
