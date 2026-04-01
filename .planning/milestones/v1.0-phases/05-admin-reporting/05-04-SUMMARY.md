---
phase: 05-admin-reporting
plan: 04
subsystem: admin-orders-refund
tags: [refund, stripe, server-action, drawer-ui, stock-restore]
dependency_graph:
  requires: [05-03]
  provides: [processRefund-action, RefundConfirmationStep-component]
  affects: [admin-orders-page, stock-levels, stripe-refunds]
tech_stack:
  added: []
  patterns: [server-action-with-stripe, in-drawer-confirmation-step, optimistic-toast-with-router-refresh]
key_files:
  created:
    - src/actions/orders/processRefund.ts
    - src/components/admin/orders/RefundConfirmationStep.tsx
  modified:
    - src/components/admin/orders/OrderDetailDrawer.tsx
    - src/components/admin/orders/OrdersPageClient.tsx
decisions:
  - Refund step replaces drawer content in-place (no new modal) per UI-SPEC D-13 through D-17
  - Overlay click and Escape key blocked during refund step — requires explicit cancel
  - onRefundClick prop retained in OrderDetailDrawer for backward compatibility but drawer manages flow internally via showRefundStep state
  - router.refresh() used after successful refund to re-fetch server data (consistent with refresh-on-transaction pattern)
  - Toast auto-dismisses after 3 seconds with success green styling
metrics:
  duration: ~4m
  completed: 2026-04-01
  tasks: 2
  files: 4
---

# Phase 05 Plan 04: Refund Flow Summary

**One-liner:** Full refund flow with Stripe API integration, in-drawer confirmation UI with reason selection and restock toggle, and success toast with router refresh.

## What Was Built

### processRefund Server Action (`src/actions/orders/processRefund.ts`)

Server Action implementing the complete refund flow:
- Verifies owner auth via Supabase Auth (`createSupabaseServerClient`) — not staff JWT
- Validates input with `RefundSchema.safeParse()` (orderId, reason enum, restoreStock boolean)
- Fetches order with `order_items` via admin client (RLS bypass)
- Guards refundable states: `completed`, `pending_pickup`, `ready`, `collected`
- Returns error if already refunded
- Calls `stripe.refunds.create({ payment_intent })` for online orders with PI ID
- Returns descriptive error when online order lacks Stripe PI (Pitfall #6 from research)
- Wraps Stripe call in try/catch
- Updates `orders.status = 'refunded'` and stores reason in `notes`
- Restocks items via read-then-write loop when `restoreStock = true` (safe for v1 single-operator)
- Revalidates `/admin/orders`, `/admin/reports`, `/admin/dashboard`

### RefundConfirmationStep Component (`src/components/admin/orders/RefundConfirmationStep.tsx`)

Client component that replaces drawer content during refund flow:
- Heading: "Confirm Refund"
- Body: "This will refund {formatNZD(totalCents)} to the customer. This cannot be undone."
- Reason select: Customer request / Damaged / Wrong item / Other (placeholder: "Select a reason")
- Restock toggle with hint: "Add these items back to stock if they are in a sellable condition."
- Amber "Confirm Refund" button — disabled until reason selected, shows "Processing..." during action
- Ghost "Back to Order" button — calls `onBack` without processing refund
- Inline error display above buttons on failure

### OrderDetailDrawer Updates

- Added `showRefundStep: boolean` state
- "Refund Order" footer button now sets `showRefundStep = true` (internal state, not `onRefundClick` prop)
- When `showRefundStep` is true, renders `<RefundConfirmationStep>` instead of normal drawer content
- Overlay click is blocked during refund step (no `onClick` handler passed)
- Escape key is also blocked during refund step
- `onRefundComplete` prop added to propagate successful refund up to page

### OrdersPageClient Updates

- Removed stub `refundTargetOrder` state (plan 03 placeholder)
- Added `handleRefundComplete(totalCents)`: calls `router.refresh()` then sets toast
- Added toast state with 3-second auto-dismiss via `useEffect`
- Toast copy: "Refund processed. {formatNZD(totalCents)} returned to customer."
- Toast positioned `fixed top-4 right-4 z-[100]` with success green styling

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all refund functionality is fully wired.

## Self-Check: PASSED

- `src/actions/orders/processRefund.ts` — EXISTS
- `src/components/admin/orders/RefundConfirmationStep.tsx` — EXISTS
- `src/components/admin/orders/OrderDetailDrawer.tsx` — MODIFIED
- `src/components/admin/orders/OrdersPageClient.tsx` — MODIFIED
- Task 1 commit: d90b727
- Task 2 commit: 7290351
