---
phase: 08-checkout-speed
plan: 03
subsystem: receipt-screen
tags: [receipt, pos, admin, server-action, jsonb]
dependency_graph:
  requires:
    - phase: 08-01
      provides: ReceiptData type, buildReceiptData, receipt_data DB column, stores contact columns
    - phase: 08-02
      provides: POSClientShell scanner wiring (preserved)
  provides:
    - ReceiptScreen component (POS overlay + admin inline)
    - completeSale updated with store/staff queries and receipt_data persistence
    - Admin View Receipt button in OrderDetailDrawer
  affects: []
tech_stack:
  added: []
  patterns:
    - "ReceiptData passed client-side from server action response — no second DB fetch"
    - "mode='pos' renders fixed overlay; mode='admin' renders card directly (inside drawer)"
    - "Email capture: onBlur or Enter triggers onEmailCapture; updates customer_email via browser Supabase client"
    - "Fallback overlay for sale_complete + null receiptData edge case"
key_files:
  created:
    - src/components/pos/ReceiptScreen.tsx
  modified:
    - src/actions/orders/completeSale.ts
    - src/components/pos/POSClientShell.tsx
    - src/components/admin/orders/OrderDetailDrawer.tsx
    - src/components/admin/orders/OrderDataTable.tsx
decisions:
  - "completeSale queries store details and staff name before RPC, builds ReceiptData after, persists to orders.receipt_data — single server action handles full receipt lifecycle"
  - "ReceiptScreen accepts null receiptData — renders 'Receipt not available' message for old orders"
  - "OrderWithStaff type extended with receipt_data — required for admin drawer to access JSONB"
  - "p_receipt_data passed as undefined to RPC (not null) to match Supabase TypeScript types"
metrics:
  duration_minutes: 8
  completed_date: "2026-04-02T07:38:00Z"
  tasks_completed: 2
  files_changed: 5
---

# Phase 8 Plan 3: Receipt Screen Summary

ReceiptScreen component (replacing SaleSummaryScreen) with full NZ receipt layout (store name, line items, GST, total, payment method), wired into POS post-sale flow and admin order drawer, with receipt data persisted as JSONB.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | ReceiptScreen component + completeSale receipt data | 873d123 | ReceiptScreen.tsx, completeSale.ts |
| 2 | Wire into POSClientShell + admin View Receipt | f2d50c3 | POSClientShell.tsx, OrderDetailDrawer.tsx, OrderDataTable.tsx |
| 3 | Verify receipt flow end-to-end | PENDING | — |

## What Was Built

### src/components/pos/ReceiptScreen.tsx (new)
- `'use client'` component accepting `ReceiptData | null | undefined`
- POS mode: fixed overlay (`z-50`) with fade-in animation
- Admin mode: card only (no overlay — renders inside drawer)
- Header: CheckCircle icon, store name, "Sale Complete" label, order ID (short)
- Items: scrollable list with name, qty × price, discount note, line total
- Totals: subtotal, GST (15% incl.), divider, total (large `font-display`), payment badge
- Cash rows: Tendered and Change (green) when present
- Store info footer: address, phone, GST number (each shown only if non-empty)
- Email capture: text input in POS mode only; calls `onEmailCapture` on blur/Enter
- Null guard: "Receipt not available for orders placed before receipt tracking was enabled."
- New Sale CTA: amber button, only rendered when `onNewSale` provided

### src/actions/orders/completeSale.ts (updated)
- Queries staff name from `staff` table before calling RPC
- Queries store contact details (name, address, phone, gst_number) before calling RPC
- Passes `p_receipt_data: undefined` and `p_customer_email` to RPC
- After RPC returns `order_id`, calls `buildReceiptData()` to construct full receipt
- Persists receipt data with `.update({ receipt_data })` on orders table
- Returns `{ success: true, orderId, receiptData }` — receipt passed to client immediately

### src/components/pos/POSClientShell.tsx (updated)
- Removed `SaleSummaryScreen` import, added `ReceiptScreen` + `ReceiptData` type
- Added `lastReceiptData` state (`ReceiptData | null`)
- `handleCompleteSale`: captures `result.receiptData` and stores in `lastReceiptData`
- Sale complete overlay: renders `ReceiptScreen` with `lastReceiptData` when available
- Email capture: browser Supabase client updates `customer_email` on order record
- Fallback overlay: minimal "Sale Complete" for edge case where receipt data absent
- `NEW_SALE` handler: resets `lastReceiptData` to null
- All Plan 02 scanner wiring preserved: `scannerOpen`, `BarcodeScannerSheet`, `searchInputRef`

### src/components/admin/orders/OrderDetailDrawer.tsx (updated)
- Added `ReceiptScreen` and `ReceiptData` imports
- Added `showReceipt` state
- View Receipt button: renders below Payment section when `order.receipt_data` is not null
- Receipt modal: fixed overlay at `z-[60]` (above drawer z-50), admin mode, Close button
- Reset `showReceipt` when order changes

### src/components/admin/orders/OrderDataTable.tsx (updated)
- `OrderWithStaff` type: added `receipt_data: Record<string, unknown> | null`

## Verification Results

- `npx tsc --noEmit` — only 2 pre-existing errors (.next/types/validator.ts dev-login routes, confirmed pre-existing in 08-01-SUMMARY.md)
- Acceptance criteria: all 14 checks across ReceiptScreen.tsx and completeSale.ts met
- Task 3 (human-verify): PENDING — awaiting device verification

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed null type mismatch in RPC call**
- **Found during:** Task 1 TypeScript check
- **Issue:** `p_receipt_data: null` caused TS2322 — `null` is not assignable to `Record<string, unknown> | undefined`; `p_customer_email: null` caused same error
- **Fix:** Changed both to `undefined` — TypeScript accepts undefined for optional params, and Supabase treats missing params as NULL
- **Files modified:** src/actions/orders/completeSale.ts
- **Commit:** 873d123

**2. [Rule 2 - Missing] Added receipt_data to OrderWithStaff type**
- **Found during:** Task 2 (writing OrderDetailDrawer)
- **Issue:** `OrderWithStaff` type in OrderDataTable.tsx did not include `receipt_data` field — TypeScript would error on `order.receipt_data` access
- **Fix:** Added `receipt_data: Record<string, unknown> | null` to the type
- **Files modified:** src/components/admin/orders/OrderDataTable.tsx
- **Commit:** f2d50c3

## Known Stubs

None — ReceiptScreen renders real `ReceiptData` from `completeSale`. Email capture calls real Supabase client. Admin View Receipt renders real receipt data from orders.receipt_data JSONB.

## Self-Check: PASSED

- src/components/pos/ReceiptScreen.tsx — FOUND
- src/actions/orders/completeSale.ts — MODIFIED (contains buildReceiptData, receipt_data)
- src/components/pos/POSClientShell.tsx — MODIFIED (contains ReceiptScreen, lastReceiptData, scannerOpen)
- src/components/admin/orders/OrderDetailDrawer.tsx — MODIFIED (contains View Receipt, ReceiptScreen)
- src/components/admin/orders/OrderDataTable.tsx — MODIFIED (contains receipt_data)
- Commits 873d123, f2d50c3 — present in git log
