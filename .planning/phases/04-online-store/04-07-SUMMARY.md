---
phase: 04-online-store
plan: "07"
subsystem: online-store
tags: [stripe, webhooks, idempotency, order-confirmation, click-and-collect]
dependency_graph:
  requires: ["04-01", "04-05"]
  provides: ["stripe-webhook-handler", "order-confirmation-page", "order-status-page"]
  affects: ["online-store-checkout-flow"]
tech_stack:
  added: []
  patterns:
    - "Stripe raw body webhook (req.text()) with signature verification"
    - "Idempotency via stripe_events PK insert + PostgreSQL 23505 code check"
    - "complete_online_sale RPC for atomic order completion + stock decrement"
    - "Server Component order pages with createSupabaseAdminClient"
    - "CartClearer client component dispatching CLEAR_CART on mount"
    - "force-dynamic for live order status page"
key_files:
  created:
    - src/app/api/webhooks/stripe/route.ts
    - src/app/(store)/order/[id]/confirmation/page.tsx
    - src/app/(store)/order/[id]/confirmation/CartClearer.tsx
    - src/app/(store)/order/[id]/page.tsx
  modified: []
decisions:
  - "CartClearer extracted as isolated client component — keeps confirmation page as Server Component while allowing useCart hook access"
  - "Used createSupabaseAdminClient in order pages to read online orders (public RLS policy from migration 006 allows SELECT on channel=online)"
  - "Order number displayed as first 8 chars of UUID in uppercase for readability"
metrics:
  duration: "134s"
  completed_date: "2026-04-01"
  tasks_completed: 2
  files_created: 4
  files_modified: 0
---

# Phase 04 Plan 07: Stripe Webhook and Order Pages Summary

Stripe webhook handler with idempotency, order confirmation page with cart clearing, and live order status page completing the post-payment flow.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Stripe webhook handler with idempotency and stock decrement | bbe5cb6 | src/app/api/webhooks/stripe/route.ts |
| 2 | Order confirmation and order status pages | e2b9459 | src/app/(store)/order/[id]/confirmation/page.tsx, CartClearer.tsx, src/app/(store)/order/[id]/page.tsx |

## What Was Built

### Task 1: Stripe Webhook Handler

`src/app/api/webhooks/stripe/route.ts` handles `checkout.session.completed` events:

1. **Raw body**: Uses `req.text()` (not `req.json()`) to preserve raw body for Stripe signature verification — critical pitfall avoided.
2. **Signature verification**: `stripe.webhooks.constructEvent(rawBody, signature, STRIPE_WEBHOOK_SECRET)` returns 400 on failure.
3. **Idempotency**: Inserts Stripe event ID as TEXT PK into `stripe_events` table. On duplicate (PostgreSQL error code `23505`), silently returns without reprocessing.
4. **Stock decrement**: Fetches `order_items` for the order, then calls `complete_online_sale` RPC which atomically:
   - Locks product rows with SELECT FOR UPDATE
   - Decrements stock quantities
   - Updates order status PENDING → COMPLETED with Stripe session/payment intent IDs

### Task 2: Order Pages

**Confirmation page** (`/order/[id]/confirmation`):
- Server Component fetches order + items from Supabase via admin client
- Success icon (emerald green #059669 per DESIGN.md semantic colors)
- "Order confirmed" heading + "Thanks for your order. Bring your order number when you collect." body (exact UI-SPEC copywriting)
- Order number in `font-mono` (Geist Mono per DESIGN.md data/tables typography)
- Full order summary: items with quantity × line total, subtotal, discount (conditional), GST (incl.), total
- Click-and-collect status message matching UI-SPEC copywriting contract
- CartClearer client component clears cart on mount via `dispatch({ type: 'CLEAR_CART' })`

**Order status page** (`/order/[id]`):
- `export const dynamic = 'force-dynamic'` ensures customer always sees latest status
- Same order data fetch with status label and descriptive message
- Same copywriting contract as confirmation page for status messages

## Deviations from Plan

None — plan executed exactly as written.

Pre-existing TypeScript errors in `src/actions/orders/completeSale.ts` and `src/components/store/CartDrawer.tsx` were present before this plan and are out of scope. No new errors introduced by this plan's files.

## Known Stubs

None. All data is fetched live from Supabase. Status messages are wired to actual order status values from the database.

## Self-Check: PASSED

All files created and commits verified:
- FOUND: src/app/api/webhooks/stripe/route.ts
- FOUND: src/app/(store)/order/[id]/confirmation/page.tsx
- FOUND: src/app/(store)/order/[id]/confirmation/CartClearer.tsx
- FOUND: src/app/(store)/order/[id]/page.tsx
- FOUND commit: bbe5cb6
- FOUND commit: e2b9459
