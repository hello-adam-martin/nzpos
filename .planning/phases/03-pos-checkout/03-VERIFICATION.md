---
phase: 03-pos-checkout
verified: 2026-04-01T16:55:00Z
status: gaps_found
score: 4/5 must-haves verified
gaps:
  - truth: "Staff can log in with PIN, see the product grid filtered by category, tap products to add to cart, and adjust quantities"
    status: partial
    reason: "The PIN login page (/pos/login/page.tsx) is a stub — it renders only a heading with no PIN pad, no staff selector, and no form. The verifyStaffPin server action is fully implemented and wired, but staff cannot actually complete the login flow in a browser. The POS page itself (product grid, category filter, cart add, quantity controls) is fully implemented."
    artifacts:
      - path: "src/app/(pos)/pos/login/page.tsx"
        issue: "Stub — renders only '<h1>Staff PIN Login</h1>' with no PIN input form, no staff selector, no submit handler"
    missing:
      - "Staff selector (name list or staff ID field) on the login page"
      - "4-digit PIN pad or numeric input"
      - "Form submission that calls verifyStaffPin server action"
      - "Error display for invalid PIN or lockout state"
      - "Redirect to /pos on successful login"
human_verification:
  - test: "Navigate to /pos/login on an iPad, select a staff member, enter a valid 4-digit PIN"
    expected: "Staff session cookie is set, redirect to /pos, product grid loads with staff name in top bar"
    why_human: "Login page is a stub — cannot verify the full flow automatically; functional login depends on a real Supabase instance with seeded staff records and PIN hashes"
  - test: "At /pos/login, enter an incorrect PIN 10 times in 5 minutes"
    expected: "Account lockout message displayed; further attempts blocked until window expires"
    why_human: "Lockout behavior requires a live DB and timing"
  - test: "Complete a full sale: add products, apply discount, select EFTPOS, confirm APPROVED on the EFTPOS screen"
    expected: "SaleSummaryScreen shows correct total, GST breakdown, sale ID; product grid stock counts decrement"
    why_human: "End-to-end flow requires a seeded Supabase instance and real completeSale RPC execution"
  - test: "Tap an out-of-stock product as a staff member; enter owner PIN in the dialog"
    expected: "Product is added to cart after successful PIN verification"
    why_human: "Requires real DB with staff records and PIN hashes"
---

# Phase 3: POS Checkout Verification Report

**Phase Goal:** Staff can complete an in-store sale from product selection to payment recording, with inventory updating atomically
**Verified:** 2026-04-01T16:55:00Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | Staff can log in with PIN, see the product grid filtered by category, tap products to add to cart, and adjust quantities | PARTIAL | PIN login page is a stub (no form); product grid, category filter, cart add, and quantity controls are fully wired |
| 2 | Staff can apply a percentage or fixed-amount discount to any line item; cart recalculates GST per-line on discounted amount and shows correct subtotal, GST, and total | VERIFIED | DiscountSheet, cartReducer APPLY_LINE_DISCOUNT, calcCartTotals all implemented; 20 unit tests pass |
| 3 | For EFTPOS: full-screen confirmation asks "Did the terminal show APPROVED?" — No voids the sale; Yes records it and decrements stock atomically | VERIFIED | EftposConfirmScreen wired; YES calls handleEftposConfirm → completeSale → complete_pos_sale RPC with FOR UPDATE stock lock |
| 4 | After each completed sale the product grid reflects updated stock counts without a manual refresh | VERIFIED | revalidatePath('/pos') in completeSale + router.refresh() in POSClientShell + visibilitychange listener all wired |
| 5 | Out-of-stock products show a warning on the grid; owner override is available | VERIFIED | StockBadge renders red "Out of Stock"; ProductCard disables for staff; OutOfStockDialog shows owner bypass and staff PIN flow |

**Score:** 4/5 truths verified (Truth 1 is partial — POS grid half passes, login UI is a stub)

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `supabase/migrations/005_pos_rpc.sql` | complete_pos_sale RPC + cash_tendered_cents + split payment | VERIFIED | Contains CREATE OR REPLACE FUNCTION, FOR UPDATE, OUT_OF_STOCK exception, split payment constraint |
| `src/lib/cart.ts` | CartItem, CartState, CartAction, cartReducer, calcCartTotals, applyCartDiscount, initialCartState | VERIFIED | All exports present; imports calcLineItem from gst.ts (not re-implemented) |
| `src/actions/orders/completeSale.ts` | Server Action with JWT verify, Zod validate, RPC call, revalidatePath | VERIFIED | server-only guard, jwtVerify, CreateOrderSchema.safeParse, rpc('complete_pos_sale'), revalidatePath('/pos') |
| `src/app/(pos)/pos/page.tsx` | Server Component with admin client, JWT verify, data fetch, POSClientShell render | VERIFIED | Fetches products, categories, staff, store, staffList via Promise.all; passes all as props |
| `src/components/pos/POSClientShell.tsx` | useReducer cart root, all overlays, handlers wired | VERIFIED | useReducer(cartReducer), all 5 overlay components rendered conditionally, handleCompleteSale calls completeSale |
| `src/components/pos/ProductGrid.tsx` | Auto-fill grid with search and category filter | VERIFIED | Receives filtered products from shell; search + SKU quick-entry wired |
| `src/components/pos/ProductCard.tsx` | Tap handler, stock badge, disabled for out-of-stock staff | VERIFIED | isDisabled = isOutOfStock && staffRole !== 'owner'; StockBadge included |
| `src/components/pos/CartPanel.tsx` | Line items, summary, payment toggle, pay button | VERIFIED | CartLineItem, CartSummary, PaymentMethodToggle, PayButton all rendered with dispatch |
| `src/components/pos/CartSummary.tsx` | calcCartTotals driven subtotal/GST/total | VERIFIED | Calls calcCartTotals(items) — not manual calculation |
| `src/components/pos/DiscountSheet.tsx` | Percentage/fixed toggle, reason dropdown, live preview, apply | VERIFIED | Substantive — computes discountCents, calls onApply(discountCents, discountType, reason) |
| `src/components/pos/EftposConfirmScreen.tsx` | Full-screen navy, APPROVED question, YES/NO buttons, isProcessing disable | VERIFIED | role="alertdialog", focus trap, isProcessing prop disables both buttons |
| `src/components/pos/CashEntryScreen.tsx` | Auto-focus, change calculation, insufficient warning, split button, MAX_CASH_CENTS cap | VERIFIED | calcChangeDue wired, $99,999 cap present, split payment triggers onSplit |
| `src/components/pos/OutOfStockDialog.tsx` | Owner direct bypass, staff PIN verification against owner record | VERIFIED | Owner button + staff PIN input; verifyStaffPin called; error reset on failure |
| `src/components/pos/SaleSummaryScreen.tsx` | Items list, GST breakdown, payment method badge, cash tendered/change, New Sale button | VERIFIED | Substantive — all fields rendered from real props |
| `src/components/pos/PayButton.tsx` | Amber CTA with "Charge $X.XX", disabled state | VERIFIED | formatNZD(totalCents) label, pointer-events-none when disabled |
| `src/components/pos/PaymentMethodToggle.tsx` | EFTPOS/Cash pills, navy active state | VERIFIED | aria-pressed, dispatches SET_PAYMENT_METHOD |
| **`src/app/(pos)/pos/login/page.tsx`** | PIN login form with staff selector, PIN input, submit | **STUB** | Renders only `<h1>Staff PIN Login</h1>` — no PIN input, no staff selector, no form |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `pos/page.tsx` | `POSClientShell` | Server Component passes products + categories as props | WIRED | `<POSClientShell products={products} categories={categories} ...>` |
| `POSClientShell` | `src/lib/cart.ts` | useReducer(cartReducer, initialCartState) | WIRED | `const [cart, dispatch] = useReducer(cartReducer, initialCartState)` |
| `ProductCard` | `POSClientShell` | onAddToCart callback dispatches ADD_PRODUCT | WIRED | `onAddToCart` prop triggers `handleAddToCart` which dispatches |
| `POSClientShell` | `completeSale` | handleCompleteSale calls completeSale Server Action | WIRED | `const result = await completeSale({ ... })` |
| `completeSale` | `complete_pos_sale` RPC | supabase.rpc('complete_pos_sale', ...) | WIRED | `supabase.rpc('complete_pos_sale', { p_store_id, ... })` |
| `CartSummary` | `calcCartTotals` | Import and call with items | WIRED | `const { subtotalCents, gstCents, totalCents } = calcCartTotals(items)` |
| `cart.ts` | `src/lib/gst.ts` | import calcLineItem, calcOrderGST | WIRED | `import { calcLineItem, calcOrderGST } from '@/lib/gst'` |
| `EftposConfirmScreen` YES | `handleCompleteSale` | onConfirm prop | WIRED | `handleEftposConfirm` → `handleCompleteSale(undefined, splitCashCents)` |
| `EftposConfirmScreen` NO | `VOID_SALE` dispatch | onVoid prop | WIRED | `handleEftposVoid` dispatches `{ type: 'VOID_SALE' }` |
| `pos/login/page.tsx` | `verifyStaffPin` | Form submission | NOT_WIRED | Login page is a stub; verifyStaffPin action exists but is not imported or called from the login page |

---

## Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|-------------------|--------|
| `ProductGrid` | `products` | Passed as prop from POSClientShell; fetched in `pos/page.tsx` via admin client `.from('products').select('*')` | Yes — DB query with store_id filter | FLOWING |
| `CartSummary` | `subtotalCents, gstCents, totalCents` | `calcCartTotals(items)` — reduces over cart.items populated by ADD_PRODUCT dispatch | Yes — real reducer state | FLOWING |
| `SaleSummaryScreen` | `items, orderId, totalCents` | Passed from POSClientShell; orderId comes from completeSale response (RPC return) | Yes — real DB order_id | FLOWING |
| `OutOfStockDialog` | `product` | Passed from POSClientShell's `outOfStockProduct` state, set when ProductCard tapped with stock_quantity === 0 | Yes — real product row from DB | FLOWING |
| `pos/login/page.tsx` | (no data rendered) | Stub — no data fetch, no state | N/A — stub | DISCONNECTED |

---

## Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Cart GST calculations pass all unit tests | `npx vitest run src/lib/__tests__/pos-cart.test.ts` | 20 tests pass | PASS |
| completeSale Server Action auth/validation/error paths | `npx vitest run src/actions/orders/__tests__/completeSale.test.ts` | 7 tests pass | PASS |
| Full test suite green | `npx vitest run` | 343 passed, 6 skipped (RLS integration tests — require live DB) | PASS |
| Login page is interactive | Visit `/pos/login`, expect PIN form | Page shows only heading, no form elements | FAIL |
| Login page calls verifyStaffPin | Grep for import in login page | Not imported; not referenced | FAIL |

---

## Requirements Coverage

| Requirement | Description | Status | Evidence |
|-------------|-------------|--------|---------|
| POS-01 | Staff sees product grid with images, categories, search on iPad | SATISFIED | ProductGrid + CategoryFilterBar + ProductCard with image/placeholder; search wired |
| POS-02 | Staff can tap products to add to cart, adjust quantities | SATISFIED | ADD_PRODUCT dispatch on tap; SET_QUANTITY in CartLineItem; QuantityControl with +/- |
| POS-03 | Staff can apply percentage or fixed-amount discounts per line | SATISFIED | DiscountSheet with % and $ toggle; APPLY_LINE_DISCOUNT dispatched |
| POS-04 | Cart shows subtotal, GST breakdown (per-line on discounted amounts), and total | SATISFIED | CartSummary calls calcCartTotals; calcCartTotals uses calcOrderGST; GST computed per-line via calcLineItem |
| POS-05 | Staff selects payment method (EFTPOS or cash) | SATISFIED | PaymentMethodToggle dispatches SET_PAYMENT_METHOD; PayButton initiates payment |
| POS-06 | EFTPOS confirmation: "Did the terminal show APPROVED?" — Yes completes, No voids | SATISFIED | EftposConfirmScreen with exact question text; YES → handleEftposConfirm → completeSale; NO → VOID_SALE |
| POS-07 | Completed sale atomically decrements stock and creates order record | SATISFIED | complete_pos_sale RPC with SELECT FOR UPDATE + INSERT order + UPDATE products in single transaction |
| POS-08 | POS re-fetches stock after each sale and on page focus | SATISFIED | revalidatePath('/pos') in completeSale; router.refresh() in handleCompleteSale; visibilitychange listener in POSClientShell |
| POS-09 | Out-of-stock warning displayed, owner can override | SATISFIED | StockBadge "Out of Stock" red badge; ProductCard disabled for staff; OutOfStockDialog with owner bypass + staff PIN |
| DISC-03 | POS staff can apply manual discounts with reason (staff, damaged, loyalty) | SATISFIED | DiscountSheet reason dropdown: Staff discount / Damaged item / Loyalty reward / Other; reason stored in CartItem.discountReason |
| DISC-04 | GST recalculates correctly on discounted line items | SATISFIED | calcLineItem(unitPriceCents, quantity, discountCents) called in recalcItem; 20 unit tests validate correctness |

**Note:** AUTH-02 (Staff can log in with 4-digit PIN) is satisfied at the server action level (`verifyStaffPin` is fully implemented), but the login UI is a stub. The requirement is functionally incomplete for end-to-end use — staff cannot complete login in a browser without a PIN entry form.

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|---------|--------|
| `src/app/(pos)/pos/login/page.tsx` | 1-7 | Stub component — returns only a heading, no interactive elements | BLOCKER | Staff cannot log in via UI; the POS is inaccessible in a real-world deployment without a working login page or the dev-login bypass route |
| `src/app/api/dev-login/pos/route.ts` | All | Dev-only bypass with hardcoded UUIDs; only usable in dev mode | INFO | Correctly gated to NODE_ENV !== 'production'; does not replace the missing login UI |

---

## Human Verification Required

### 1. Staff PIN Login Flow

**Test:** Navigate to `/pos/login`, observe the page
**Expected:** Should see a staff selector (or name/ID field), a 4-digit PIN pad or numeric input, and a submit mechanism
**Why human:** The login page is a confirmed stub — this test will fail visually; documenting it so the fix priority is clear

### 2. Complete End-to-End Sale

**Test:** With a seeded Supabase instance: log in as staff, add 2-3 products to cart, apply a 10% discount to one line, select EFTPOS, tap "Charge $X.XX", confirm YES on EFTPOS screen
**Expected:** SaleSummaryScreen shows correct sale ID, items list, GST breakdown, "EFTPOS" payment badge; product stock counts decrement on the grid after tapping New Sale
**Why human:** Requires live Supabase with products and stock; completeSale RPC must execute against a real DB

### 3. Cash Change Calculation Display

**Test:** Add products totalling $25.00, select Cash, enter $30.00 tendered
**Expected:** "Change due: $5.00" displays in green; Complete Sale button is enabled
**Why human:** Requires browser interaction; calcChangeDue is unit-tested but UI rendering needs visual confirmation

### 4. Out-of-Stock Staff PIN Override

**Test:** As staff, tap an out-of-stock product; when OutOfStockDialog appears, enter the owner's 4-digit PIN
**Expected:** PIN is verified against the owner's DB record; product is added to cart; dialog closes
**Why human:** Requires live DB with staff records and PIN hashes; verifyStaffPin is unit-tested but the full dialog flow needs real data

---

## Gaps Summary

**One gap blocks the phase goal:** The PIN login page (`src/app/(pos)/pos/login/page.tsx`) is a stub from Phase 1 that was never completed in Phase 3. The `verifyStaffPin` server action is fully implemented, but staff have no UI to enter their PIN. In a real deployment, staff cannot access the POS.

This gap is specifically about Success Criterion 1: "Staff can log in with PIN." The subsequent criteria (product grid, discounts, EFTPOS, stock refresh, out-of-stock) are all fully implemented and wired correctly.

**All other 4 success criteria are fully verified.** The backend foundation (RPC, cart reducer, completeSale action) is solid with 27 unit tests passing. The POS surface components (grid, cart, overlays) are substantive and wired. The EFTPOS confirmation, stock refresh, and out-of-stock override are all correctly implemented.

**Scope note:** The 03-CONTEXT.md describes the login page as "existing" (from Phase 1) and Phase 3's plans do not include tasks to build the login UI — this gap was inherited and not addressed.

---

_Verified: 2026-04-01T16:55:00Z_
_Verifier: Claude (gsd-verifier)_
