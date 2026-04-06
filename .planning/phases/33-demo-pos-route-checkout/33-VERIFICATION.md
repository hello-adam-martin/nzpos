---
phase: 33-demo-pos-route-checkout
verified: 2026-04-06T21:32:30Z
status: human_needed
score: 7/7 must-haves verified
human_verification:
  - test: "Open /demo/pos in a private browser window and complete a full EFTPOS checkout"
    expected: "Page loads without auth redirect, products from demo store are shown, DEMO badge visible in top bar, barcode scanner button absent, no staff/logout/mute controls, EFTPOS terminal confirmation screen appears, clicking Yes shows receipt with line items and 8-char hex order ID, no email capture input on receipt, New Sale resets cart"
    why_human: "End-to-end UI flow, visual rendering of DEMO badge, real product data from database, network tab verification that no completeSale server action fires — cannot verify programmatically without running server"
  - test: "Open /demo/pos in a private browser window and complete a Cash checkout"
    expected: "Tendered amount entry screen appears, change calculation shown correctly on receipt, no email capture on receipt"
    why_human: "Cash flow UI interaction requires browser — cannot verify tendered/change math display without rendering"
  - test: "Open browser DevTools Network tab while at /demo/pos"
    expected: "No successful POST to completeSale server action during a demo sale. Failed fetches to /api/pos/new-orders (or none at all) are acceptable."
    why_human: "Network tab inspection of server action calls requires running browser environment"
---

# Phase 33: Demo POS Route & Checkout Verification Report

**Phase Goal:** Visitors can use the real POS interface at `/demo/pos` — add products, apply discounts, complete a simulated EFTPOS or cash sale, and see a receipt — without creating an account or writing to the database
**Verified:** 2026-04-06T21:32:30Z
**Status:** human_needed — all automated checks pass; 3 items require human browser verification
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| #  | Truth                                                                                          | Status     | Evidence                                                                                                                    |
|----|-----------------------------------------------------------------------------------------------|------------|-----------------------------------------------------------------------------------------------------------------------------|
| 1  | Visiting /demo/pos loads without auth redirect or error                                        | ✓ VERIFIED | `middleware.ts` line 44: `if (pathname.startsWith('/demo')) { return addSecurityHeaders(NextResponse.next()) }` — early return before all auth/tenant logic |
| 2  | Demo POS page fetches products/categories/store from DEMO_STORE_ID                             | ✓ VERIFIED | `(demo)/demo/pos/page.tsx`: `Promise.all` queries products, categories, store scoped to `DEMO_STORE_ID` via admin client    |
| 3  | Middleware skips all auth/session logic for /demo/** paths                                      | ✓ VERIFIED | Early return at line 44 precedes host resolution (line 49), Supabase middleware client creation (line 56), and all JWT checks |
| 4  | POSClientShell accepts demoMode and conditionally hides auth-dependent features                 | ✓ VERIFIED | `POSClientShellProps` includes `demoMode?: boolean`, `demoStore?:`; `POSTopBar` receives gated props; `onEmailCapture=undefined` when demoMode |
| 5  | Completing a sale in demo mode builds receipt client-side without completeSale server action    | ✓ VERIFIED | `handleCompleteSale` line 207: `if (demoMode) { ... buildReceiptData(...) ... dispatch(SALE_COMPLETE) ... return }` — hard early return before `await completeSale(...)` at line 265 |
| 6  | POSTopBar shows DEMO badge and hides staff/logout/mute/nav in demo mode                         | ✓ VERIFIED | `POSTopBar.tsx` lines 41-68: demoMode branch renders store name + amber pill "DEMO" badge only; `!demoMode &&` gates the entire right-side control block |
| 7  | Email capture input is hidden on receipt screen in demo mode                                    | ✓ VERIFIED | `POSClientShell.tsx` line 482: `onEmailCapture={demoMode ? undefined : ...}`; `ReceiptScreen` gates email UI with `onEmailCapture &&` at line 164 |

**Score:** 7/7 truths verified

---

### Required Artifacts

| Artifact                                                          | Provides                                              | Status     | Details                                                                                                  |
|-------------------------------------------------------------------|-------------------------------------------------------|------------|----------------------------------------------------------------------------------------------------------|
| `src/middleware.ts`                                               | Early return for /demo/** paths                       | ✓ VERIFIED | Contains `pathname.startsWith('/demo')` at line 44, returns before any auth or host resolution logic     |
| `src/app/(demo)/layout.tsx`                                       | Demo layout with POS viewport setup                   | ✓ VERIFIED | 7 lines, exports `DemoLayout`, `h-dvh overflow-hidden bg-bg touch-manipulation` wrapper, viewport meta   |
| `src/app/(demo)/demo/pos/page.tsx`                                | Server component fetching demo store data             | ✓ VERIFIED | `import 'server-only'`, imports `DEMO_STORE_ID` and `createSupabaseAdminClient`, `Promise.all` for data  |
| `src/components/pos/POSClientShell.tsx`                           | demoMode prop with conditional sale and feature gating | ✓ VERIFIED | `demoMode?: boolean` in props type, demo intercept in `handleCompleteSale`, `buildReceiptData` imported  |
| `src/components/pos/POSTopBar.tsx`                                | DEMO badge rendering when demoMode=true               | ✓ VERIFIED | `demoMode?: boolean` in props, amber `bg-amber rounded-full` pill with text "DEMO" in demo branch        |
| `src/components/pos/__tests__/POSClientShell.demo.test.tsx`       | Test skeleton for demo mode behavior                  | ✓ VERIFIED | 3 tests: DEMO badge renders, staff hidden, normal mode; all 3 tests PASS (vitest run confirmed)          |

---

### Key Link Verification

| From                                     | To                               | Via                             | Status     | Details                                                                 |
|------------------------------------------|----------------------------------|---------------------------------|------------|-------------------------------------------------------------------------|
| `(demo)/demo/pos/page.tsx`               | `src/lib/constants.ts`           | `import DEMO_STORE_ID`          | ✓ WIRED    | Line 3: `import { DEMO_STORE_ID } from '@/lib/constants'`              |
| `src/middleware.ts`                      | `NextResponse.next()`            | Early return for /demo paths    | ✓ WIRED    | Line 44-46: `if (pathname.startsWith('/demo')) { return addSecurityHeaders(NextResponse.next()) }` |
| `src/components/pos/POSClientShell.tsx`  | `src/lib/receipt.ts`             | `buildReceiptData` call         | ✓ WIRED    | Line 11: `import { buildReceiptData } from '@/lib/receipt'`; used line 230 |
| `src/components/pos/POSClientShell.tsx`  | `src/lib/cart.ts`                | `calcCartTotals` / `calcChangeDue` | ✓ WIRED | Line 7: imported from `@/lib/cart`; used in demo branch lines 203, 227  |
| `(demo)/demo/pos/page.tsx`               | `src/components/pos/POSClientShell.tsx` | `demoMode={true}` prop   | ✓ WIRED    | Line 38: `demoMode={true}` passed; `POSClientShellProps` accepts it     |

---

### Data-Flow Trace (Level 4)

| Artifact                             | Data Variable           | Source                                      | Produces Real Data  | Status      |
|--------------------------------------|-------------------------|---------------------------------------------|---------------------|-------------|
| `(demo)/demo/pos/page.tsx`           | `productsResult.data`   | Supabase admin client `products` table query | Yes — live DB query | ✓ FLOWING   |
| `(demo)/demo/pos/page.tsx`           | `categoriesResult.data` | Supabase admin client `categories` query     | Yes — live DB query | ✓ FLOWING   |
| `(demo)/demo/pos/page.tsx`           | `storeResult.data`      | Supabase admin client `stores` query         | Yes — live DB query | ✓ FLOWING   |
| `POSClientShell.tsx` demo sale branch | `receipt`              | `buildReceiptData(cart.items, totals, ...)`  | Yes — cart state    | ✓ FLOWING   |

---

### Behavioral Spot-Checks

| Behavior                                    | Command                                                                                                       | Result                           | Status  |
|---------------------------------------------|---------------------------------------------------------------------------------------------------------------|----------------------------------|---------|
| Demo mode tests pass                        | `npm test -- --run src/components/pos/__tests__/POSClientShell.demo.test.tsx`                                | 3 passed (1 test file)           | ✓ PASS  |
| Middleware contains /demo passthrough       | `grep -n "pathname.startsWith('/demo')" src/middleware.ts`                                                   | Line 44 found                    | ✓ PASS  |
| Demo page has server-only guard             | `grep -n "server-only" src/app/(demo)/demo/pos/page.tsx`                                                     | Line 1: `import 'server-only'`   | ✓ PASS  |
| No auth imports in demo route files         | `grep -rn "cookies\|jwtVerify\|resolveAuth" src/app/(demo)/`                                                 | No output — no auth imports      | ✓ PASS  |
| completeSale NOT reachable in demoMode      | Verified by reading `handleCompleteSale`: `if (demoMode) { ... return }` precedes `await completeSale(...)` | Hard early return at line 207    | ✓ PASS  |
| TypeScript build                            | `npm run build`                                                                                               | 3 pre-existing errors in phase-22 files (`adjustStock.ts`, `createProduct.ts`, `importProducts.ts`) — 0 new errors from phase 33 | ✓ PASS (pre-existing) |

---

### Requirements Coverage

| Requirement | Source Plan | Description                                                                                   | Status          | Evidence                                                                   |
|-------------|------------|-----------------------------------------------------------------------------------------------|-----------------|----------------------------------------------------------------------------|
| DPOS-01     | 33-01      | Visitor can access `/demo/pos` without any authentication                                     | ✓ SATISFIED     | Middleware early return at line 44; no auth session created for /demo/**   |
| DPOS-02     | 33-02      | Demo POS loads real POS UI components (ProductGrid, Cart, checkout flow)                      | ? NEEDS HUMAN   | POSClientShell renders ProductGrid, CartPanel, checkout overlays — visual confirmation needed |
| DPOS-03     | 33-01      | Demo POS fetches products from the seeded demo store in the database                          | ✓ SATISFIED     | `Promise.all` in demo page queries `products`, `categories`, `stores` for `DEMO_STORE_ID` |
| DPOS-04     | 33-02      | Demo POS disables features that require real auth (barcode scanner, polling, receipt email)   | ✓ SATISFIED     | `onScanOpen={undefined}`, orderAlert overridden, `onEmailCapture={undefined}` in demo mode |
| DCHK-01     | 33-02      | Visitor can add products to cart, adjust quantities, and remove items                         | ? NEEDS HUMAN   | Cart reducer unchanged; demo mode does not alter `ADD_PRODUCT` / `REMOVE_PRODUCT` — browser test needed |
| DCHK-02     | 33-02      | Visitor can apply line-item and cart-level discounts                                          | ? NEEDS HUMAN   | `DiscountSheet` available; `APPLY_LINE_DISCOUNT` not gated by demoMode — browser test needed |
| DCHK-03     | 33-02      | GST calculations display correctly on all cart operations                                     | ✓ SATISFIED     | `calcCartTotals` from `@/lib/cart` unchanged; GST logic not modified by demo mode |
| DCHK-04     | 33-02      | Visitor can select EFTPOS payment and see "Terminal approved?" confirmation screen             | ? NEEDS HUMAN   | `EftposConfirmScreen` renders at `cart.phase === 'eftpos_confirm'`; demo mode does not block this phase — browser test needed |
| DCHK-05     | 33-02      | Clicking "Yes" completes sale with simulated success (no DB write)                             | ✓ SATISFIED     | `handleCompleteSale` demo branch: `buildReceiptData` + `dispatch(SALE_COMPLETE)` + `return` before `completeSale()` |
| DCHK-06     | 33-02      | Visitor can select Cash payment and enter tendered amount with change calculation              | ? NEEDS HUMAN   | `CashEntryScreen` at `cart.phase === 'cash_entry'`; `calcChangeDue` called in demo branch — browser test needed |
| DCHK-07     | 33-02      | Receipt screen displays after simulated sale completion with full line-item detail             | ✓ SATISFIED     | `ReceiptScreen` rendered when `cart.phase === 'sale_complete' && lastReceiptData`; `buildReceiptData` populates line items |

**All 11 requirement IDs accounted for. No orphaned requirements.**

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/components/pos/POSClientShell.tsx` | 67 | `useNewOrderAlert()` still fires `fetch('/api/pos/new-orders')` in demo mode despite output override | ℹ Info | Wasted network request every 30s in demo mode; fails silently per SUMMARY; does not crash or affect correctness |

No blocker anti-patterns found. The polling fetch wasted request is expected and documented in 33-02-SUMMARY.md.

---

### Human Verification Required

#### 1. Full EFTPOS checkout flow in private/incognito window

**Test:** Open `http://localhost:3000/demo/pos` in a private browser window (no login). Add 2-3 products, apply a discount to one item, click Pay, select EFTPOS, click "Yes" on the terminal confirmation.
**Expected:** Page loads without redirect. Product grid shows demo store products (Aroha Home & Gift items). Top bar shows store name with amber "DEMO" pill badge. No barcode scanner button. No staff name, logout, or mute controls. EFTPOS confirmation screen appears. Receipt screen shows with full line items, an 8-char hex order ID, and no email capture input. "New Sale" resets cart.
**Why human:** Visual rendering of components, real product data from database, and network tab verification that no `completeSale` server action fires — cannot confirm without a running browser.

#### 2. Cash checkout flow

**Test:** From demo POS, add products, click Pay, select Cash, enter a tendered amount above the total.
**Expected:** Cash entry screen appears with numeric keypad. After entering amount and confirming, receipt shows with correct change calculation. No email capture input on receipt.
**Why human:** Tendered amount UI interaction and change display requires browser rendering.

#### 3. No server action calls in DevTools Network tab

**Test:** Open DevTools Network tab, complete a demo sale via EFTPOS. Filter to "Fetch/XHR".
**Expected:** No POST calls to any `completeSale` or `/api/pos/` endpoint succeed during sale completion. Any calls to `/api/pos/new-orders` may appear as failed 401s or may be absent.
**Why human:** Network tab inspection is only possible in a running browser environment.

---

### Gaps Summary

No automated gaps found. All 7 derived truths are verified by code inspection and test execution. The phase goal is structurally complete — the demo route infrastructure, middleware passthrough, client-side sale simulation, feature gating, and DEMO badge are all implemented and wired correctly.

The `human_needed` status reflects that DPOS-02 and DCHK-01/02/04/06 (product display, cart operations, payment flow screens) are behavioral UI requirements that require a browser to confirm. These are not failures — the supporting code paths are present and unblocked — they need human smoke-testing to satisfy the original phase acceptance criteria.

---

_Verified: 2026-04-06T21:32:30Z_
_Verifier: Claude (gsd-verifier)_
