---
phase: 09-notifications
plan: 02
subsystem: notifications
tags: [email, stripe-webhook, pos, server-action, pickup-ready, resend]
dependency_graph:
  requires: [09-01]
  provides: [NOTIF-01, NOTIF-02, NOTIF-03]
  affects: [stripe-webhook, pos-shell, order-status]
tech_stack:
  added: []
  patterns: [fire-and-forget-void-sendEmail, server-action-email-trigger, webhook-email-integration]
key_files:
  created:
    - supabase/migrations/011_notifications.sql
    - src/actions/orders/sendPosReceipt.ts
    - src/actions/orders/__tests__/sendPosReceipt.test.ts
    - src/actions/orders/__tests__/updateOrderStatus.test.ts
  modified:
    - src/app/api/webhooks/stripe/route.ts
    - src/components/pos/POSClientShell.tsx
    - src/actions/orders/updateOrderStatus.ts
    - src/lib/receipt.ts
    - src/types/database.ts
decisions:
  - "Extended ReceiptData.paymentMethod union to include 'online' for Stripe payments — cleaner than overriding in template"
  - "Added opening_hours to database.ts types manually (migration pending DB apply) to unblock TypeScript compilation"
  - "updateOrderStatus mock uses thenable chain pattern to support both .single() and direct await (.update().eq()) patterns"
metrics:
  duration_seconds: 340
  completed_date: "2026-04-02"
  tasks_completed: 2
  tasks_total: 2
  files_created: 4
  files_modified: 5
---

# Phase 09 Plan 02: Email Trigger Wiring Summary

All three real-time email notification triggers are now wired to actual send points. Online receipt fires from the Stripe webhook, POS receipt fires from a new server action called directly from POSClientShell, and pickup-ready fires from updateOrderStatus when status transitions to "ready". All use `void sendEmail(...)` fire-and-forget per D-05.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | DB migration for opening_hours + wire online receipt email in Stripe webhook | 3442b5c | 011_notifications.sql, route.ts, receipt.ts |
| 2 | Create POS receipt server action + wire pickup-ready email + tests | 2aa2fcb | sendPosReceipt.ts, POSClientShell.tsx, updateOrderStatus.ts, 2 test files, database.ts |

## What Was Built

**NOTIF-01 — Online receipt (Stripe webhook):**
- After `complete_online_sale` RPC succeeds, checks for `session.customer_details?.email`
- If order has `receipt_data` stored by the RPC, uses it directly for the email
- Fallback path: builds `ReceiptData` from `order_items` joined with products + store
- Uses `OnlineReceiptEmail` template, paymentMethod `'online'`

**NOTIF-02 — POS receipt (sendPosReceipt server action):**
- New `sendPosReceipt` server action: Zod validates `{ orderId, email }`, resolves staff auth
- Fetches order with `receipt_data` (stored at POS sale completion in Phase 8)
- Updates `customer_email` on order then fires `PosReceiptEmail` fire-and-forget
- POSClientShell's `onEmailCapture` now calls `sendPosReceipt` instead of inline Supabase client update

**NOTIF-03 — Pickup-ready (updateOrderStatus):**
- When `newStatus === 'ready'`, fetches order `customer_email` + order items + store details
- Fires `PickupReadyEmail` with order items, store name/address/phone/opening_hours
- Uses opening_hours column added by 011_notifications.sql migration

**DB migration:**
- `011_notifications.sql`: `ALTER TABLE stores ADD COLUMN IF NOT EXISTS opening_hours TEXT`

## Tests

27 tests pass (7 new for sendPosReceipt, 6 new for updateOrderStatus pickup-ready trigger, 14 existing unchanged):

- `sendPosReceipt`: unauthenticated, invalid input (missing/malformed email), order not found, no receipt_data, valid send with correct recipient + subject, customer_email update
- `updateOrderStatus`: sends email on ready + customer_email, skips on ready + no customer_email, skips on collected, skips on pending_pickup, auth error, invalid transition

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Type] Extended ReceiptData.paymentMethod union to include 'online'**
- **Found during:** Task 1
- **Issue:** Online Stripe payments had no valid `paymentMethod` value in the union type
- **Fix:** Added `'online'` to `ReceiptData.paymentMethod` and `BuildReceiptDataParams.paymentMethod` unions in `src/lib/receipt.ts`
- **Files modified:** src/lib/receipt.ts
- **Commit:** 3442b5c

**2. [Rule 3 - Blocking TypeScript Error] Added opening_hours to database.ts types**
- **Found during:** Task 2
- **Issue:** Supabase-generated types don't yet have `opening_hours` on `stores` because migration hasn't run. TypeScript reported `SelectQueryError<"column 'opening_hours' does not exist on 'stores'.">` blocking compilation.
- **Fix:** Manually added `opening_hours: string | null` to Row/Insert/Update in `src/types/database.ts` to mirror the pending migration
- **Files modified:** src/types/database.ts
- **Commit:** 2aa2fcb

## Known Stubs

None. All email triggers are fully wired with real data sources.

## Self-Check: PASSED
