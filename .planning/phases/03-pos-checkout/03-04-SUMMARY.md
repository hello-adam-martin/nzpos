---
phase: 03-pos-checkout
plan: "04"
subsystem: pos-checkout
tags: [pos, payment-flow, overlays, eftpos, cash, discounts, out-of-stock]
dependency_graph:
  requires: [03-02, 03-03]
  provides: [complete-pos-payment-flow, overlay-components]
  affects: [src/components/pos/POSClientShell.tsx, src/app/(pos)/pos/page.tsx]
tech_stack:
  added: []
  patterns:
    - "Phase state machine via cart.phase driving overlay rendering"
    - "Split payment: cash portion stored in useState, then EFTPOS confirm for remainder"
    - "Out-of-stock: owner bypasses directly, staff calls verifyStaffPin"
    - "Sale completion: completeSale Server Action called with full payload, router.refresh() after"
key_files:
  created:
    - src/components/pos/DiscountSheet.tsx
    - src/components/pos/EftposConfirmScreen.tsx
    - src/components/pos/CashEntryScreen.tsx
    - src/components/pos/OutOfStockDialog.tsx
    - src/components/pos/SaleSummaryScreen.tsx
  modified:
    - src/components/pos/POSClientShell.tsx
    - src/app/(pos)/pos/page.tsx
decisions:
  - "Split payment implemented sequentially: cash entered first in CashEntryScreen, then EFTPOS confirm for remainder — matches D-11 Claude's discretion"
  - "Out-of-stock owner bypass is direct (no PIN) since owner is already authenticated; staff route calls verifyStaffPin against owner staff record"
  - "paymentMethod widened to 'eftpos' | 'cash' | 'split' in handleCompleteSale to satisfy schema (split is valid in CreateOrderSchema)"
  - "sale_void auto-resets after 2s timer with error banner displayed if sale error occurred"
  - "Processing overlay (bg-navy/80) shown during completeSale in-flight to prevent double-tap"
metrics:
  duration: "4 minutes"
  completed_date: "2026-04-01"
  tasks: 2
  files_changed: 7
---

# Phase 03 Plan 04: Payment Flow Overlays Summary

**One-liner:** Full POS payment flow overlays — DiscountSheet, EftposConfirmScreen, CashEntryScreen, OutOfStockDialog, SaleSummaryScreen — wired into POSClientShell with completeSale Server Action and split payment support.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | DiscountSheet + EftposConfirmScreen + CashEntryScreen + OutOfStockDialog + SaleSummaryScreen | c89fbe1 | 5 new component files |
| 2 | Wire POSClientShell — connect all components, payment flow, completeSale | a168fd7 | POSClientShell.tsx, page.tsx |

## What Was Built

### Task 1: Five Overlay Components

**DiscountSheet (`src/components/pos/DiscountSheet.tsx`):**
- Slide-in panel from right (320px), `translate-x-full` when closed, `translate-x-0` when open
- `duration-150 ease-out` transition (matches POS motion rules)
- `%` and `$` toggle buttons (navy active, border inactive)
- Large `text-3xl` decimal input with `inputMode="decimal"`
- Reason dropdown: Staff discount / Damaged item / Loyalty reward / Other
- "Apply Discount" button, disabled when amount is 0
- Shows live discounted total preview

**EftposConfirmScreen (`src/components/pos/EftposConfirmScreen.tsx`):**
- Full-screen navy (`bg-navy`) overlay, `fixed inset-0 z-50`
- `role="alertdialog" aria-modal="true"`
- Focus trap with Tab/Shift+Tab keyboard handling
- Fade-in animation `animate-[fadeIn_150ms_ease-out]`
- "Did the EFTPOS terminal show APPROVED?" instruction
- YES button: `bg-success` / NO button: `bg-error` — both `min-h-[56px]`

**CashEntryScreen (`src/components/pos/CashEntryScreen.tsx`):**
- Auto-focuses input on mount
- Live change calculation via `calcChangeDue`
- Shows "Insufficient — $X short" in `text-error` when tendered < total
- "Complete Sale" button disabled while insufficient
- "Pay $X cash, $Y EFTPOS" split button shown when partial amount entered
- "Cancel" ghost button

**OutOfStockDialog (`src/components/pos/OutOfStockDialog.tsx`):**
- Small centered modal with amber `AlertTriangle` icon
- Owner role: direct "Add anyway (override)" button (amber)
- Staff role: 4-digit PIN input, auto-verifies on 4th digit via `verifyStaffPin`
- Shows verification error, resets PIN on failure
- "Keep out of stock" ghost button (navy border)

**SaleSummaryScreen (`src/components/pos/SaleSummaryScreen.tsx`):**
- Full-screen white overlay with `CheckCircle` success icon
- "Sale recorded. Stock updated." heading in `text-success`
- Sale ID (first 8 chars, uppercase)
- Scrollable items list with per-line discount indicators
- Summary: subtotal, GST, total, payment method badge
- Cash tendered and change due (when applicable)
- "New Sale" amber button

### Task 2: POSClientShell Wiring

- All 5 overlays imported and conditionally rendered based on `cart.phase`
- `handleAddToCart`: checks `stock_quantity === 0`, owner bypasses, staff triggers dialog
- `handleApplyDiscount`: dispatches `APPLY_LINE_DISCOUNT` to cart reducer
- `handleCompleteSale`: calls `completeSale` Server Action with full payload, handles `out_of_stock` and generic errors
- Split payment: `splitCashCents` state stores cash portion; when split triggered, transitions to `eftpos_confirm`; on EFTPOS confirm, calls `handleCompleteSale(undefined, splitCashCents)`
- `router.refresh()` called after successful sale (POS-08 stock sync)
- `page.tsx` updated: adds `staffList` query (all active staff for store), passes `storeId` and `staffList` to POSClientShell

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] TypeScript: `result.error` could be undefined**
- **Found during:** Task 1 — OutOfStockDialog build check
- **Issue:** `verifyStaffPin` returns `{ error: string | undefined }` but `setPinError` expects `string | null`
- **Fix:** Added nullish coalesce: `result.error ?? 'Verification failed'`
- **Files modified:** src/components/pos/OutOfStockDialog.tsx

**2. [Rule 1 - Bug] TypeScript: `paymentMethod = 'split'` not assignable to `'eftpos' | 'cash'`**
- **Found during:** Task 2 — POSClientShell build check
- **Issue:** `cart.paymentMethod` is typed as `'eftpos' | 'cash' | null` but split payment needs wider type
- **Fix:** Explicitly typed `let paymentMethod: 'eftpos' | 'cash' | 'split'`
- **Files modified:** src/components/pos/POSClientShell.tsx

## Known Stubs

None — all components are fully wired with real data sources. No hardcoded empty values or placeholders.

## Self-Check: PASSED
