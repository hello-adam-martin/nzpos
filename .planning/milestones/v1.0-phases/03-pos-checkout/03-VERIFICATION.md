---
phase: 03-pos-checkout
verified: 2026-04-01T17:57:30Z
status: human_needed
score: 5/5 must-haves verified
re_verification:
  previous_status: gaps_found
  previous_score: 4/5
  gaps_closed:
    - "Staff can log in with PIN, see the product grid filtered by category, tap products to add to cart, and adjust quantities — PIN login page is now a fully implemented Client Component (PinLoginForm) with staff selector, 4-digit PIN pad, auto-submit, error display, and redirect"
  gaps_remaining: []
  regressions: []
human_verification:
  - test: "Navigate to /pos/login on an iPad, select a staff member, enter a valid 4-digit PIN"
    expected: "Staff session cookie is set, redirect to /pos, product grid loads with staff name in top bar"
    why_human: "Requires a live Supabase instance with seeded staff records and bcrypt-hashed PINs; full flow cannot be exercised programmatically"
  - test: "At /pos/login, enter an incorrect PIN 10 times in 5 minutes"
    expected: "Account lockout message displayed; further attempts blocked until window expires"
    why_human: "Lockout behavior requires a live DB and timing; verifyStaffPin logic is unit-tested but the UI error display path for lockout needs visual confirmation"
  - test: "Complete a full sale: add products, apply discount, select EFTPOS, confirm APPROVED on the EFTPOS screen"
    expected: "SaleSummaryScreen shows correct total, GST breakdown, sale ID; product grid stock counts decrement"
    why_human: "End-to-end flow requires a seeded Supabase instance and real completeSale RPC execution"
  - test: "Tap an out-of-stock product as a staff member; enter owner PIN in the dialog"
    expected: "Product is added to cart after successful PIN verification"
    why_human: "Requires real DB with staff records and PIN hashes"
---

# Phase 3: POS Checkout Verification Report

**Phase Goal:** Staff can complete an in-store sale from product selection to payment recording, with inventory updating atomically
**Verified:** 2026-04-01T17:57:30Z
**Status:** human_needed
**Re-verification:** Yes — after gap closure (plan 03-06)

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | Staff can log in with PIN, see the product grid filtered by category, tap products to add to cart, and adjust quantities | VERIFIED | PinLoginForm (189 lines) contains staff selector buttons, 4-dot PIN indicator, 3x4 keypad, auto-submit at `pin.length === 4`, error display, and `router.push('/pos')` on success; login page is a full Server Component fetching store + staff; old stub heading is absent |
| 2 | Staff can apply a percentage or fixed-amount discount to any line item; cart recalculates GST per-line on discounted amount and shows correct subtotal, GST, and total | VERIFIED | DiscountSheet, cartReducer APPLY_LINE_DISCOUNT, calcCartTotals all implemented; 20 unit tests pass |
| 3 | For EFTPOS: full-screen confirmation asks "Did the terminal show APPROVED?" — No voids the sale; Yes records it and decrements stock atomically | VERIFIED | EftposConfirmScreen wired; YES calls handleEftposConfirm → completeSale → complete_pos_sale RPC with FOR UPDATE stock lock |
| 4 | After each completed sale the product grid reflects updated stock counts without a manual refresh | VERIFIED | revalidatePath('/pos') in completeSale + router.refresh() in POSClientShell + visibilitychange listener all wired |
| 5 | Out-of-stock products show a warning on the grid; owner override is available | VERIFIED | StockBadge renders red "Out of Stock"; ProductCard disables for staff; OutOfStockDialog shows owner bypass and staff PIN flow |

**Score:** 5/5 truths verified

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/app/(pos)/pos/login/page.tsx` | Server Component fetching store + active staff, renders PinLoginForm | VERIFIED | Contains `import 'server-only'`, `createSupabaseAdminClient`, `.from('stores')`, `.from('staff')`, `<PinLoginForm ...>`, `export const dynamic = 'force-dynamic'` |
| `src/components/pos/PinLoginForm.tsx` | Client Component with staff selector, PIN pad, auto-submit, error display | VERIFIED | 189 lines; `'use client'`, `verifyStaffPin` imported and called, `useRouter`, `router.push('/pos')`, `grid grid-cols-3`, `rounded-full` dot indicators, `selectedStaffId` state, `setPin('')` on error |
| `supabase/migrations/005_pos_rpc.sql` | complete_pos_sale RPC + cash_tendered_cents + split payment | VERIFIED (unchanged from initial) | Contains CREATE OR REPLACE FUNCTION, FOR UPDATE, OUT_OF_STOCK exception, split payment constraint |
| `src/lib/cart.ts` | CartItem, CartState, CartAction, cartReducer, calcCartTotals, applyCartDiscount, initialCartState | VERIFIED (unchanged) | All exports present; imports calcLineItem from gst.ts |
| `src/actions/orders/completeSale.ts` | Server Action with JWT verify, Zod validate, RPC call, revalidatePath | VERIFIED (unchanged) | server-only guard, jwtVerify, safeParse, rpc('complete_pos_sale'), revalidatePath('/pos') |
| `src/app/(pos)/pos/page.tsx` | Server Component with admin client, JWT verify, data fetch, POSClientShell render | VERIFIED (unchanged) | Fetches products, categories, staff, store via Promise.all |
| `src/components/pos/POSClientShell.tsx` | useReducer cart root, all overlays, handlers wired | VERIFIED (unchanged) | All 5 overlay components rendered conditionally |
| `src/components/pos/ProductGrid.tsx` | Search and category filter | VERIFIED (unchanged) | Search + SKU quick-entry wired |
| `src/components/pos/CartSummary.tsx` | calcCartTotals driven | VERIFIED (unchanged) | Calls calcCartTotals(items) |
| `src/components/pos/DiscountSheet.tsx` | Percentage/fixed toggle, reason dropdown, apply | VERIFIED (unchanged) | Computes discountCents, calls onApply |
| `src/components/pos/EftposConfirmScreen.tsx` | Full-screen, APPROVED question, YES/NO | VERIFIED (unchanged) | role="alertdialog", focus trap, isProcessing prop |
| `src/components/pos/OutOfStockDialog.tsx` | Owner bypass + staff PIN verification | VERIFIED (unchanged) | Owner button + staff PIN input; verifyStaffPin called |
| `src/actions/auth/staffPin.ts` | verifyStaffPin with bcrypt, lockout, JWT, cookie | VERIFIED (unchanged) | Full implementation: bcryptjs.compare, SignJWT, cookies().set |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/components/pos/PinLoginForm.tsx` | `src/actions/auth/staffPin.ts` | `import { verifyStaffPin }` at line 5; called in `handleSubmit` at line 30 | WIRED | Pattern `verifyStaffPin` confirmed present |
| `src/app/(pos)/pos/login/page.tsx` | `src/components/pos/PinLoginForm.tsx` | `import { PinLoginForm }` at line 3; rendered at line 33 with `storeId`, `storeName`, `staffList` props | WIRED | Pattern `PinLoginForm` confirmed present |
| `src/components/pos/PinLoginForm.tsx` | `next/navigation` | `useRouter` at line 4; `router.push('/pos')` at line 42 | WIRED | Pattern `router\.push.*pos` confirmed present |
| `pos/page.tsx` | `POSClientShell` | Server Component passes products + categories as props | WIRED (unchanged) | `<POSClientShell products={products} categories={categories} ...>` |
| `POSClientShell` | `src/lib/cart.ts` | useReducer(cartReducer, initialCartState) | WIRED (unchanged) | Confirmed in initial verification |
| `POSClientShell` | `completeSale` | handleCompleteSale calls completeSale Server Action | WIRED (unchanged) | `const result = await completeSale({ ... })` |
| `completeSale` | `complete_pos_sale` RPC | supabase.rpc('complete_pos_sale', ...) | WIRED (unchanged) | Confirmed in initial verification |
| `CartSummary` | `calcCartTotals` | Import and call | WIRED (unchanged) | Confirmed in initial verification |
| `EftposConfirmScreen` YES | `handleCompleteSale` | onConfirm prop | WIRED (unchanged) | Confirmed in initial verification |

---

## Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|-------------------|--------|
| `PinLoginForm` | `staffList` | Passed as prop from `pos/login/page.tsx`; fetched via admin client `.from('staff').select('id, name, role').eq('store_id', ...).eq('is_active', true)` | Yes — live DB query with store_id + is_active filter | FLOWING |
| `PinLoginForm` | `storeName` | Passed as prop from `pos/login/page.tsx`; fetched via `.from('stores').select('id, name').limit(1).single()` | Yes — live DB query | FLOWING |
| `ProductGrid` | `products` | Passed as prop from POSClientShell; fetched in `pos/page.tsx` via admin client | Yes — DB query with store_id filter | FLOWING (unchanged) |
| `CartSummary` | `subtotalCents, gstCents, totalCents` | `calcCartTotals(items)` — reduces over cart.items | Yes — real reducer state | FLOWING (unchanged) |
| `SaleSummaryScreen` | `items, orderId, totalCents` | completeSale response (RPC return) | Yes — real DB order_id | FLOWING (unchanged) |

---

## Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Cart GST calculations pass all unit tests | `npx vitest run src/lib/__tests__/pos-cart.test.ts` | 20 tests pass | PASS |
| completeSale Server Action auth/validation/error paths | `npx vitest run src/actions/orders/__tests__/completeSale.test.ts` | 7 tests pass | PASS |
| Full test suite green (including new phase) | `npx vitest run` | 343 passed, 6 skipped (36 files) | PASS |
| Old stub heading absent from login page | `grep "Staff PIN Login" src/app/(pos)/pos/login/page.tsx` | No output (removed) | PASS |
| verifyStaffPin imported and called in PinLoginForm | `grep "verifyStaffPin" src/components/pos/PinLoginForm.tsx` | Lines 5 and 30 | PASS |
| router.push('/pos') present in PinLoginForm | `grep "router.push" src/components/pos/PinLoginForm.tsx` | Line 42 | PASS |
| PIN auto-submit trigger present | `grep "pin.length === 4" src/components/pos/PinLoginForm.tsx` | Line 27 and 49 | PASS |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|---------|
| POS-01 | 03-06-PLAN.md | Staff sees product grid with images, categories, and search on iPad | SATISFIED | ProductGrid + CategoryFilterBar + ProductCard; login gap now closed — staff can reach the grid |
| POS-02 | Phase 3 plans | Staff can tap products to add to cart, adjust quantities | SATISFIED | ADD_PRODUCT dispatch on tap; SET_QUANTITY in CartLineItem |
| POS-03 | Phase 3 plans | Staff can apply percentage or fixed-amount discounts per line item | SATISFIED | DiscountSheet with % and $ toggle; APPLY_LINE_DISCOUNT dispatched |
| POS-04 | Phase 3 plans | Cart shows subtotal, GST breakdown, and total | SATISFIED | CartSummary calls calcCartTotals; per-line GST via calcOrderGST |
| POS-05 | Phase 3 plans | Staff selects payment method (EFTPOS or cash) | SATISFIED | PaymentMethodToggle dispatches SET_PAYMENT_METHOD |
| POS-06 | Phase 3 plans | EFTPOS confirmation step: Yes completes, No voids | SATISFIED | EftposConfirmScreen; YES → completeSale; NO → VOID_SALE |
| POS-07 | Phase 3 plans | Completed sale atomically decrements stock and creates order record | SATISFIED | complete_pos_sale RPC with SELECT FOR UPDATE + INSERT + UPDATE in single transaction |
| POS-08 | Phase 3 plans | POS re-fetches stock after each sale and on page focus | SATISFIED | revalidatePath('/pos') + router.refresh() + visibilitychange listener |
| POS-09 | Phase 3 plans | Out-of-stock warning displayed, owner can override | SATISFIED | StockBadge "Out of Stock"; ProductCard disabled for staff; OutOfStockDialog with owner bypass |
| DISC-03 | Phase 3 plans | POS staff can apply manual discounts with reason | SATISFIED | DiscountSheet reason dropdown: Staff / Damaged / Loyalty / Other; stored in CartItem.discountReason |
| DISC-04 | Phase 3 plans | GST recalculates correctly on discounted line items | SATISFIED | calcLineItem(unitPriceCents, quantity, discountCents); 20 unit tests validate correctness |

**Note on AUTH-02:** AUTH-02 (Staff can log in with 4-digit PIN) is assigned to Phase 1 in REQUIREMENTS.md, not Phase 3. It is fully satisfied end-to-end: `verifyStaffPin` server action (bcrypt, lockout, JWT) was implemented in Phase 1; the POS login UI (PinLoginForm) was completed in Phase 3 plan 06. AUTH-02 is marked `[x]` in REQUIREMENTS.md. No orphaned requirements found for Phase 3.

All 11 Phase 3 requirement IDs (POS-01 through POS-09, DISC-03, DISC-04) are SATISFIED.

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|---------|--------|
| `src/app/api/dev-login/pos/route.ts` | All | Dev-only bypass with hardcoded UUIDs | INFO | Correctly gated to `NODE_ENV !== 'production'`; does not affect production |

No blockers or warnings found in the gap-closure files. The two previously flagged FAIL spot-checks (login page is interactive; login page calls verifyStaffPin) are now PASS.

---

## Human Verification Required

### 1. Staff PIN Login Flow (End-to-End)

**Test:** With a seeded Supabase instance, navigate to `/pos/login`, select a staff member from the list, tap digits on the PIN pad to enter a valid 4-digit PIN
**Expected:** Staff session cookie (`staff_session`) is set as HttpOnly; browser redirects to `/pos`; product grid loads with store data
**Why human:** Requires live Supabase with staff rows seeded and bcrypt-hashed PINs; the redirect and cookie behavior cannot be verified without a running server

### 2. PIN Lockout UI Feedback

**Test:** At `/pos/login`, enter an incorrect PIN 10 times within 5 minutes for the same staff member
**Expected:** After the 10th failure, the error message reads "Account locked. Contact store owner." and the PIN pad becomes non-functional for that staff until the 5-minute window expires
**Why human:** Requires live DB and real timing; verifyStaffPin lockout logic is unit-tested but the UI error display path for the lockout message needs visual confirmation

### 3. Complete End-to-End Sale

**Test:** Log in as staff, add 2-3 products to cart, apply a 10% discount to one line, select EFTPOS, tap "Charge $X.XX", confirm YES on EFTPOS screen
**Expected:** SaleSummaryScreen shows correct sale ID, items list, GST breakdown, "EFTPOS" payment badge; product stock counts decrement on the grid after tapping New Sale
**Why human:** Requires live Supabase with seeded products and stock; completeSale RPC must execute against a real DB

### 4. Out-of-Stock Staff PIN Override

**Test:** As staff, tap an out-of-stock product; when OutOfStockDialog appears, enter the owner's 4-digit PIN
**Expected:** PIN is verified against the owner's DB record; product is added to cart; dialog closes
**Why human:** Requires live DB with staff records and PIN hashes

---

## Gaps Summary

No gaps remain. The one gap from the initial verification (stub PIN login page) has been closed by plan 03-06:

- `src/app/(pos)/pos/login/page.tsx` is now a substantive Server Component (34 lines) that fetches store and staff data via the admin client and passes real props to PinLoginForm
- `src/components/pos/PinLoginForm.tsx` is a substantive Client Component (189 lines) with staff selector, 4-dot PIN indicator, 3x4 keypad, auto-submit, error display with retry, and redirect on success
- All 3 key links from the plan's must_haves are wired and confirmed
- All 343 unit tests still pass (no regressions)
- The old stub heading (`<h1>Staff PIN Login</h1>`) is confirmed absent

Phase 3 goal is achieved in code. Human verification is required only to confirm behavior against a live Supabase instance.

---

_Verified: 2026-04-01T17:57:30Z_
_Verifier: Claude (gsd-verifier)_
_Re-verification: Yes — after plan 03-06 gap closure_
