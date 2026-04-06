# Phase 33: Demo POS Route & Checkout - Research

**Researched:** 2026-04-06
**Domain:** Next.js App Router route groups, middleware passthrough, React component prop gating, client-side sale simulation
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** New route group `(demo)/demo/pos/page.tsx` — separate from `(pos)` group. Server component fetches demo store products using `DEMO_STORE_ID` constant and admin client, passes them to the client shell.
- **D-02:** Middleware passthrough for `/demo/**` paths — add an early return in `src/middleware.ts` that skips all auth checks for routes starting with `/demo/`.
- **D-03:** Layout file `(demo)/layout.tsx` — minimal viewport setup, same pattern as `(pos)/layout.tsx`, no auth providers or tenant context injection.
- **D-04:** Pass a `demoMode: boolean` prop to the existing `POSClientShell` component. When `demoMode` is true: hide `BarcodeScannerButton`, disable `NewOrderToast`/`OrderNotificationBadge`, hide receipt email capture, intercept sale completion.
- **D-05:** No forking/duplicating `POSClientShell`. Real POS code runs with conditional branches.
- **D-06:** `ProductGrid`, `CartPanel`, `CategoryFilterBar`, `DiscountSheet`, `EftposConfirmScreen`, `CashEntryScreen`, `ReceiptScreen` all work as-is — props/state only.
- **D-07:** Client-side only completion — when `demoMode=true`, build receipt from cart state using `calcCartTotals` from `cart.ts`. No RPC, no DB write, no stock decrement.
- **D-08:** Generate a fake order ID client-side (8-char random hex) for receipt display.
- **D-09:** After simulated sale, dispatch `SALE_COMPLETE` with locally-built receipt data. Receipt screen renders identically to real sale.
- **D-10:** `POSTopBar` shows store name "Aroha Home & Gift" with a "DEMO" badge (small pill/tag). No staff name, no logout button, no mute toggle, no order notification badge.
- **D-11:** No persistent demo banner or watermark — DEMO badge in top bar is sufficient.
- **D-12:** After completing a simulated sale, "New Sale" button resets cart to empty. Signup CTA is Phase 34 scope.

### Claude's Discretion

- Exact conditional logic placement in `POSClientShell` (early returns vs ternary in JSX)
- Whether to extract demo receipt builder into a helper function or inline it
- Category filter bar behavior (all categories shown by default or first selected)
- Any loading/skeleton states for the demo page initial render

### Deferred Ideas (OUT OF SCOPE)

- Signup CTA after demo sale completion (Phase 34: CONV-01, CONV-02, CONV-03)
- "Try POS Demo" button on landing page (Phase 34: LAND-01, LAND-02)

</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DPOS-01 | Visitor can access `/demo/pos` without any authentication | Middleware early-return for `/demo/**` before all auth checks (see Middleware Analysis section) |
| DPOS-02 | Demo POS loads real POS UI components (ProductGrid, Cart, checkout flow) | `POSClientShell` accepts `demoMode` prop; all child components are props-only |
| DPOS-03 | Demo POS fetches products from the seeded demo store in the database | `DEMO_STORE_ID = '00000000-0000-4000-a000-000000000099'` in `src/lib/constants.ts`; admin client query on server component |
| DPOS-04 | Demo POS disables features that require real auth (barcode scanner, new-order polling, receipt email) | Conditional branches on `demoMode` prop in `POSClientShell` and `POSTopBar` |
| DCHK-01 | Visitor can add products to cart, adjust quantities, and remove items | `cartReducer` is entirely client-side; no changes needed |
| DCHK-02 | Visitor can apply line-item and cart-level discounts | `DiscountSheet` + `APPLY_LINE_DISCOUNT` / `APPLY_CART_DISCOUNT` actions — no server coupling |
| DCHK-03 | GST calculations display correctly on all cart operations | `calcCartTotals` and `calcLineItem` in `cart.ts` / `gst.ts` — pure client functions |
| DCHK-04 | Visitor can select EFTPOS payment and see "Terminal approved?" confirmation screen | `EftposConfirmScreen` renders when `cart.phase === 'eftpos_confirm'` — no changes |
| DCHK-05 | Clicking "Yes" on EFTPOS confirmation completes sale with simulated success (no DB write) | Replace `completeSale` call with client-side receipt builder when `demoMode=true` |
| DCHK-06 | Visitor can select Cash payment and enter tendered amount with change calculation | `CashEntryScreen` renders when `cart.phase === 'cash_entry'` — no changes |
| DCHK-07 | Receipt screen displays after simulated sale with full line-item detail | Dispatch `SALE_COMPLETE` with locally-built `ReceiptData`; `ReceiptScreen` renders identically |

</phase_requirements>

---

## Summary

Phase 33 is primarily a component integration and route plumbing phase, not a greenfield build. The entire POS checkout flow — product grid, cart reducer, GST calculation, payment screens, receipt — already exists and works correctly. The work is: (1) open a new route group `(demo)` with a public page that bypasses middleware auth, (2) add a single `demoMode: boolean` prop to `POSClientShell` and gate the three auth-dependent features behind it, and (3) implement a thin client-side sale simulator that builds `ReceiptData` from cart state without calling the `completeSale` server action.

The middleware analysis reveals a critical architectural point: the current middleware is subdomain-scoped. The `/demo/**` passthrough must be inserted **before** the subdomain resolution logic at section 4, specifically when `isRoot` is true. The demo route lives on the root domain (marketing site), not on a store subdomain, so the existing public root-domain path already permits it — but the explicit guard at line 70 (`if pathname.startsWith('/pos') || pathname.startsWith('/admin')`) does NOT block `/demo`. This means the root domain middleware path already passes `/demo/**` through. **However**, an explicit early-return for `/demo/**` should still be added for clarity and future safety.

The `buildReceiptData` factory in `src/lib/receipt.ts` is the exact shape `ReceiptScreen` needs. The demo sale simulator can call this same function client-side with a synthetic `store` object (hard-coded demo store details fetched on the server and passed as props) and a random 8-char hex order ID.

**Primary recommendation:** Add `demoMode` prop to `POSClientShell`, insert `/demo/**` early-return in middleware, create `(demo)/demo/pos/page.tsx` as a server component that fetches demo products with the admin client, and implement a `buildDemoReceiptData` helper (or inline `buildReceiptData` equivalent) in the client shell.

---

## Standard Stack

This phase uses no new libraries. Everything required is already installed.

### Core (already in project)
| Library | Version | Purpose | Role in Phase 33 |
|---------|---------|---------|-----------------|
| Next.js | 16.2 | App Router, Server Components, middleware | Route group, server data fetch, middleware passthrough |
| React | 19 | UI rendering | `demoMode` prop threading, conditional rendering |
| `@supabase/supabase-js` | ^2.x | Admin client for DB queries | Fetch demo store products/categories server-side |
| `server-only` | latest | Prevent server code on client | Already used in `(pos)/pos/page.tsx` — replicate pattern |
| TypeScript | 5.x | Type safety | Extend `POSClientShellProps` with `demoMode` |

### No New Dependencies
All required code is in `src/lib/cart.ts`, `src/lib/receipt.ts`, `src/lib/constants.ts`, and the existing POS component tree.

**Installation:** None required.

---

## Architecture Patterns

### Recommended File Structure (new files only)
```
src/app/(demo)/
├── layout.tsx                  # Viewport setup — copy of (pos)/layout.tsx
└── demo/
    └── pos/
        └── page.tsx            # Server component: fetches demo store data, renders POSClientShell
```

**Modified files:**
```
src/middleware.ts                # Add /demo/** early-return (before isRoot block or within it)
src/components/pos/
├── POSClientShell.tsx           # Add demoMode prop, gate features, override handleCompleteSale
└── POSTopBar.tsx                # Add demoMode prop, render DEMO badge variant
src/components/pos/ReceiptScreen.tsx   # Suppress onEmailCapture in demo mode (already gated by prop — verify)
```

### Pattern 1: Next.js Route Groups for Public Demo Route
**What:** A `(demo)` route group creates a separate layout context. The URL `/demo/pos` is public — no session cookie, no staff JWT, no tenant resolution.
**When to use:** Anytime a route needs fundamentally different auth/layout requirements from the existing `(pos)` or `(admin)` groups.
**Example:**
```typescript
// src/app/(demo)/layout.tsx
export const metadata = {
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no',
}

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return <div className="h-dvh overflow-hidden bg-bg touch-manipulation">{children}</div>
}
```

### Pattern 2: Middleware Early Return for Public Paths
**What:** Add an early return for `/demo/**` before all auth logic. Since the demo lives on the root domain (not a subdomain), it never reaches the subdomain resolver.
**Critical insight from code review:** The middleware's `isRoot` block at line 69-75 already passes through non-`/pos`/`/admin` paths via `createSupabaseMiddlewareClient`. However, calling `createSupabaseMiddlewareClient` still creates a Supabase client and refreshes the session — which is unnecessary for the demo. An explicit early return before the `isRoot` block is cleaner and avoids any session side-effects.
**Example:**
```typescript
// Insert BEFORE the isRoot check (after webhook passthrough, before subdomain logic)
// Place after line 40 (webhook check) and before line 43 (host resolution):
if (pathname.startsWith('/demo')) {
  return addSecurityHeaders(NextResponse.next())
}
```

### Pattern 3: demoMode Prop Gating in POSClientShell
**What:** Add `demoMode?: boolean` to `POSClientShellProps`. Conditionally skip auth-dependent features and override sale completion.
**Key branches to add:**
```typescript
// 1. Skip useNewOrderAlert entirely when demoMode
const { unreadCount, toast, isMuted, toggleMute } = demoMode
  ? { unreadCount: 0, toast: null, isMuted: false, toggleMute: () => {} }
  : useNewOrderAlert()

// 2. Override handleCompleteSale for demo mode
async function handleCompleteSale(cashTenderedCents?: number, splitCash?: number) {
  if (demoMode) {
    // Build receipt client-side, no server call
    const fakeOrderId = Array.from(crypto.getRandomValues(new Uint8Array(4)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
    const totals = calcCartTotals(cart.items)
    const paymentMethod: 'eftpos' | 'cash' | 'split' =
      splitCash != null && splitCash > 0 ? 'split' : cart.paymentMethod ?? 'eftpos'
    const receipt = buildReceiptData({
      orderId: fakeOrderId,
      store: demoStore,   // passed as prop from server component
      staffName: 'Demo',
      items: cart.items,
      totals,
      paymentMethod,
      cashTenderedCents: cashTenderedCents ?? splitCash,
      changeDueCents: cashTenderedCents ? calcChangeDue(totals.totalCents, cashTenderedCents) : undefined,
    })
    setLastReceiptData(receipt)
    dispatch({ type: 'SALE_COMPLETE', orderId: fakeOrderId })
    return
  }
  // ... existing completeSale logic unchanged
}
```

### Pattern 4: Demo Server Component Data Fetch
**What:** Replicate the `(pos)/pos/page.tsx` pattern without any auth. Fetch products/categories for `DEMO_STORE_ID` and pass to `POSClientShell`.
**Example:**
```typescript
// src/app/(demo)/demo/pos/page.tsx
import 'server-only'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { DEMO_STORE_ID } from '@/lib/constants'
import { POSClientShell } from '@/components/pos/POSClientShell'

export default async function DemoPosPage() {
  const supabase = createSupabaseAdminClient()

  const [productsResult, categoriesResult, storeResult] = await Promise.all([
    supabase
      .from('products')
      .select('*')
      .eq('store_id', DEMO_STORE_ID)
      .eq('is_active', true)
      .order('name'),
    supabase
      .from('categories')
      .select('*')
      .eq('store_id', DEMO_STORE_ID)
      .order('sort_order'),
    supabase
      .from('stores')
      .select('id, name, address, phone, gst_number')
      .eq('id', DEMO_STORE_ID)
      .single(),
  ])

  return (
    <POSClientShell
      products={productsResult.data ?? []}
      categories={categoriesResult.data ?? []}
      staffName="Demo"
      staffRole="staff"
      storeName={storeResult.data?.name ?? 'Aroha Home & Gift'}
      storeId={DEMO_STORE_ID}
      staffList={[]}
      hasInventory={false}
      demoMode={true}
      demoStore={storeResult.data ?? { name: 'Aroha Home & Gift', address: null, phone: null, gst_number: null }}
    />
  )
}
```

### Anti-Patterns to Avoid
- **Calling `useNewOrderAlert` unconditionally then ignoring its output:** The hook sets up polling intervals. In demo mode, skip the hook entirely or return a no-op object — do not let it start polling.
- **Checking `demoMode` inside `handleCompleteSale` after `await completeSale`:** The early return for demo mode must be BEFORE calling `completeSale`, since `completeSale` is `'use server'` and requires auth. Calling it without a valid staff session would throw.
- **Duplicating POSClientShell into a DemoPOSClientShell:** D-05 locks this as forbidden. The real POS code runs with conditional branches.
- **Router.refresh() in demo handleCompleteSale:** Production `handleCompleteSale` calls `router.refresh()` after sale to update stock counts. In demo mode, skip this call — there is no stock to refresh and it creates unnecessary overhead.
- **Placing the `/demo/**` middleware passthrough after subdomain resolution:** The demo page is on the root domain. If the passthrough is placed after the subdomain check, a no-subdomain request for `/demo/**` would reach the subdomain resolver and get a 404 rewrite (`/not-found`). The passthrough must be placed before or within the `isRoot` block.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| GST calculation for demo receipt | Custom tax math | `calcCartTotals` + `calcLineItem` from `cart.ts` | Already IRD-compliant, tested, handles per-line rounding |
| Receipt data structure | Custom shape | `buildReceiptData` from `receipt.ts` | `ReceiptScreen` is typed against `ReceiptData` — same struct required |
| Random order ID | UUID library | `crypto.getRandomValues` (Web Crypto API) | Built into browser, no import needed, 8-char hex is sufficient for display |
| Category filtering | New filter component | `CategoryFilterBar` (already exists) | Works purely on props; zero changes needed |
| Cart state management | New demo cart | Existing `cartReducer` + `useReducer` | The full cart state machine is already client-side; zero server coupling |

**Key insight:** This phase's complexity budget is almost entirely in the conditional wiring, not in building new functionality.

---

## Existing Code Analysis

### POSClientShell — What Changes

Current props (from code review):
```typescript
type POSClientShellProps = {
  products: ProductRow[]
  categories: CategoryRow[]
  staffName: string
  staffRole: 'owner' | 'staff'
  storeName: string
  storeId: string
  staffList: StaffRow[]
  hasInventory: boolean
}
```

Required additions:
```typescript
  demoMode?: boolean
  demoStore?: { name: string; address: string | null; phone: string | null; gst_number: string | null }
```

**`demoStore` is needed** because `buildReceiptData` requires store contact details (address, phone, gst_number) for the receipt footer. The server component already fetches this data — pass it as a prop rather than re-fetching client-side.

### POSTopBar — What Changes

Current props include: `storeName`, `staffName`, `onLogout`, `activeSession`, `onScanOpen`, `scanDisabled`, `unreadOrderCount`, `isMuted`, `onToggleMute`.

In demo mode:
- Show `storeName` + DEMO badge instead of full navigation
- Omit `onScanOpen` (no barcode scanner)
- Omit `onLogout` (no logout button)
- Omit `onToggleMute` (no mute button)
- Omit `OrderNotificationBadge` (no new-order polling)
- No cash session (no `activeSession`, no `CashUpModal`)

**Option A:** Add `demoMode?: boolean` to `POSTopBarProps` and use conditional rendering inline.
**Option B:** Pass `demoMode` from shell, which already omits these callbacks by not passing them.

Option A is cleaner — the top bar renders its own conditional UI. The DEMO badge needs explicit markup regardless.

### ReceiptScreen — Email Capture

`ReceiptScreen` already gates email capture via `{mode === 'pos' && onEmailCapture && ...}`. In demo mode, simply do not pass `onEmailCapture` to `ReceiptScreen`. No change to `ReceiptScreen.tsx` required.

Confirm: in `POSClientShell`, the `ReceiptScreen` receives:
```tsx
onEmailCapture={async (email) => {
  await sendPosReceipt({ orderId: lastReceiptData.orderId, email })
}}
```
In demo mode, pass `onEmailCapture={undefined}` (or omit it) — the existing conditional `{mode === 'pos' && onEmailCapture && ...}` suppresses the input. **No change to `ReceiptScreen.tsx`.**

### Visibility Change Handler (Stock Refresh)

`POSClientShell` has a `visibilitychange` listener that calls `router.refresh()` when the tab becomes visible. In demo mode, this is harmless (the demo page is public and a refresh just re-fetches products), but `router.refresh()` causes a full server re-render. Consider guarding it with `if (!demoMode)`. This is a discretion call — either is acceptable.

### useNewOrderAlert Hook

The hook polls for new orders every 30 seconds. In demo mode:
- It has no store context (the demo page has no staff session, no storeId in middleware headers)
- The hook likely makes a server action/API call that would fail without auth

**Risk:** If `useNewOrderAlert` makes an authenticated API call internally, it will fail silently in demo mode but still cause 30-second polling attempts. This must be suppressed.

**Recommendation:** Gate the hook call:
```typescript
// Call hooks unconditionally (React rules) but disable polling behavior
const alertState = useNewOrderAlert()
const { unreadCount, toast, isMuted, toggleMute } = demoMode
  ? { unreadCount: 0, toast: null, isMuted: false, toggleMute: () => {} }
  : alertState
```

Wait — React rules of hooks prohibit conditional hook calls. The above is correct (hook is called always, but its output is ignored in demo mode). However, if the hook itself starts a polling `useEffect`, that effect still runs. The cleanest solution is to check what `useNewOrderAlert` does internally and add a `disabled` param, OR accept that it polls but fails silently.

**Actual recommendation:** Add `disabled?: boolean` parameter to `useNewOrderAlert` if it polls. If the hook is simple, just ignore its output in demo mode. Either way, the UI is correct.

---

## Middleware Analysis

**Current middleware structure (from code review):**

1. Line 39: Webhook early return → passes through
2. Line 43-46: Host resolution (isRoot determination)
3. Line 49-65: Super-admin routes on root domain
4. Line 68-75: Root domain block — **critically, line 70 blocks `/pos` and `/admin` but NOT `/demo`**
5. Line 77-112: Subdomain resolution
6. Lines 120+: Admin, POS, storefront route handling

**For `/demo/pos` on root domain:**
- `isRoot = true` (running on `localhost` or root domain)
- Line 70: `pathname.startsWith('/pos')` → false, `pathname.startsWith('/admin')` → false → NOT blocked
- Line 73: `createSupabaseMiddlewareClient` is called (session refresh attempted, but that's harmless for unauthenticated visitors)
- Line 74: `return addSecurityHeaders(response)` → passes through

**Conclusion:** Without any middleware change, `/demo/pos` on root domain ALREADY passes through. However, D-02 explicitly requires adding a passthrough. Add it early in the middleware for clarity and to avoid the unnecessary `createSupabaseMiddlewareClient` call.

**Recommended placement:** After the webhook early return (line 40), before the host resolution block:
```typescript
// Demo routes — public, no auth, no tenant resolution
if (pathname.startsWith('/demo')) {
  return addSecurityHeaders(NextResponse.next())
}
```

This is safe because it is after the webhook check but before any auth or subdomain logic.

---

## Common Pitfalls

### Pitfall 1: React Hooks Called Conditionally
**What goes wrong:** `if (demoMode) return; useNewOrderAlert()` — React throws "Hooks called in different order" error.
**Why it happens:** React hooks must be called in the same order on every render.
**How to avoid:** Always call the hook, then conditionally use its return value. Or add a `disabled` param that makes the hook a no-op internally.
**Warning signs:** Runtime error "Rendered more hooks than during the previous render."

### Pitfall 2: `completeSale` Called in Demo Mode
**What goes wrong:** The `'use server'` action `completeSale` calls `resolveStaffAuth()`, which reads `cookies().get('staff_session')`. In demo mode there is no cookie — returns `null` → sale fails with auth error.
**Why it happens:** `handleCompleteSale` is called by both EFTPOS confirm and cash complete handlers. If the demo check is missing or in the wrong branch, the real action is called.
**How to avoid:** Put the `if (demoMode)` check as the FIRST thing in `handleCompleteSale`, before any `await` calls.
**Warning signs:** Console shows "Not authenticated" error after demo sale attempt.

### Pitfall 3: Middleware Subdomain Redirect for `/demo/**`
**What goes wrong:** If the middleware passthrough is placed AFTER subdomain resolution, a root-domain `/demo/pos` request reaches line 77 where the host has no slug, `admin.from('stores').select().eq('slug', '')` returns null, and the middleware rewrites to `/not-found`.
**Why it happens:** The subdomain resolver assumes all non-root requests are store subdomains. Root domain requests are meant to be handled in the `isRoot` block.
**How to avoid:** Place the `/demo/**` early return before the `isRoot` block, OR confirm it is inside the `isRoot` block. Either works — before the block is cleaner.
**Warning signs:** `/demo/pos` shows a 404 "store not found" page.

### Pitfall 4: `router.refresh()` Unnecessary in Demo Mode
**What goes wrong:** After simulated sale completion, `router.refresh()` triggers a full Next.js server re-render. In production this is needed to update stock counts. In demo mode it's harmless but adds latency and an unnecessary Supabase admin client call.
**Why it happens:** The production `handleCompleteSale` always calls `router.refresh()` at the end.
**How to avoid:** Guard with `if (!demoMode) router.refresh()`.
**Warning signs:** Network tab shows a fetch to the demo page after each sale completion.

### Pitfall 5: `demoStore` Prop Shape Mismatch
**What goes wrong:** `buildReceiptData` expects `store: { name, address: string | null, phone: string | null, gst_number: string | null }`. If `storeResult.data` is null (demo store missing from DB), the receipt footer renders empty strings — not a crash, but ugly.
**Why it happens:** Demo store may not be seeded in the environment.
**How to avoid:** Provide a hard-coded fallback: `storeResult.data ?? { name: 'Aroha Home & Gift', address: '123 Demo St, Wellington', phone: null, gst_number: null }`. The DEMO_STORE_ID migration (Phase 32) guarantees presence in production, but local envs may need seeding.
**Warning signs:** Receipt shows blank store name/address.

### Pitfall 6: `staffList` Prop Required by `OutOfStockDialog`
**What goes wrong:** `POSClientShell` passes `staffList` to `OutOfStockDialog` for PIN override. In demo mode, `staffList=[]` is passed. If `hasInventory=false` (which it should be for demo), the out-of-stock dialog never triggers — so an empty `staffList` is safe.
**Why it happens:** The dialog only shows when `hasInventory && product.stock_quantity === 0` and `staffRole !== 'owner'`. With `hasInventory=false`, this condition is never met.
**How to avoid:** Pass `hasInventory={false}` to demo POSClientShell (verified in Pattern 4 example above). The out-of-stock flow is completely suppressed.
**Warning signs:** Demo shows out-of-stock dialog prompting for PIN (would require `hasInventory=true` and stock=0 products).

---

## Code Examples

### Demo Receipt Builder (client-side)
```typescript
// Inside POSClientShell, in the demo branch of handleCompleteSale:
// Source: src/lib/receipt.ts — buildReceiptData (same function used in production)
import { buildReceiptData, calcChangeDue } from '@/lib/receipt'
import { calcCartTotals } from '@/lib/cart'

// Generate fake order ID (Web Crypto — no import needed)
const fakeOrderId = Array.from(crypto.getRandomValues(new Uint8Array(4)))
  .map(b => b.toString(16).padStart(2, '0'))
  .join('')

const totals = calcCartTotals(cart.items)
const paymentMethod: 'eftpos' | 'cash' | 'split' =
  splitCash != null && splitCash > 0 ? 'split' : (cart.paymentMethod ?? 'eftpos')

const changeDue = cashTenderedCents != null && cashTenderedCents > totals.totalCents
  ? calcChangeDue(totals.totalCents, cashTenderedCents)
  : undefined

const receipt = buildReceiptData({
  orderId: fakeOrderId,
  store: demoStore,
  staffName: 'Demo',
  items: cart.items,
  totals,
  paymentMethod,
  cashTenderedCents,
  changeDueCents: changeDue,
})

setLastReceiptData(receipt)
if (cashTenderedCents != null) setLastCashTenderedCents(cashTenderedCents)
dispatch({ type: 'SALE_COMPLETE', orderId: fakeOrderId })
// NOTE: No router.refresh() in demo mode
return
```

### DEMO Badge in POSTopBar
```tsx
// In POSTopBar when demoMode=true — replace full nav/staff section:
{demoMode ? (
  <div className="flex items-center gap-3">
    <span className="font-display font-bold text-white text-lg">{storeName}</span>
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-amber text-white tracking-wide">
      DEMO
    </span>
  </div>
) : (
  // existing full top bar content
)}
```

---

## Environment Availability

Step 2.6: SKIPPED — this phase is purely code changes with no new external dependencies. All required tools (Next.js, Supabase admin client, Vitest) are already installed and operational.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.x + @testing-library/react 16.x |
| Config file | `vitest.config.mts` |
| Quick run command | `npm test` (runs `vitest run`) |
| Full suite command | `npm run test:coverage` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DPOS-01 | `/demo/pos` accessible without auth | manual smoke | N/A — middleware, browser test | ❌ Wave 0 (Playwright) |
| DPOS-02 | Real POS components render in demo mode | unit | `npm test -- --reporter=verbose` | ❌ Wave 0 |
| DPOS-03 | Demo store products fetched (DEMO_STORE_ID) | manual smoke | N/A — requires live Supabase | ❌ manual |
| DPOS-04 | Barcode/polling/email hidden in demo mode | unit | `npm test -- --reporter=verbose` | ❌ Wave 0 |
| DCHK-01 | Add/adjust/remove cart items | unit (existing cart.ts tests cover reducer) | `npm test` | existing coverage via cart.ts |
| DCHK-02 | Line-item and cart-level discounts | unit (existing) | `npm test` | existing coverage |
| DCHK-03 | GST correct on all cart operations | unit (existing gst.ts coverage) | `npm test` | existing coverage |
| DCHK-04 | EFTPOS confirm screen renders | unit (POSClientShell demo) | `npm test -- --reporter=verbose` | ❌ Wave 0 |
| DCHK-05 | Simulated EFTPOS — no DB write, receipt shown | unit (mock completeSale not called) | `npm test -- --reporter=verbose` | ❌ Wave 0 |
| DCHK-06 | Cash entry + change calculation | unit (existing calcChangeDue tests) | `npm test` | existing coverage |
| DCHK-07 | Receipt displays after demo sale | unit | `npm test -- --reporter=verbose` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npm test`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/components/pos/__tests__/POSClientShell.demo.test.tsx` — covers DPOS-02, DPOS-04, DCHK-04, DCHK-05, DCHK-07
  - Test: `demoMode=true` renders without crashing
  - Test: barcode scanner button not present when `demoMode=true`
  - Test: `completeSale` server action not called when `demoMode=true` (spy/mock)
  - Test: `SALE_COMPLETE` dispatched after demo EFTPOS confirm
  - Test: receipt data contains fake orderId after demo cash complete

**Note on existing coverage:** `DCHK-01` through `DCHK-03` and `DCHK-06` are covered by existing `cart.ts` and `gst.ts` unit tests. The cart reducer and GST math don't change in this phase.

*(DPOS-01 and DPOS-03 require a running environment — mark as manual smoke tests in phase verification.)*

---

## Sources

### Primary (HIGH confidence)
- Direct code inspection — `src/components/pos/POSClientShell.tsx` (lines 1-483)
- Direct code inspection — `src/middleware.ts` (lines 1-296, full analysis)
- Direct code inspection — `src/lib/cart.ts` — `calcCartTotals`, `buildReceiptData`, `calcChangeDue`
- Direct code inspection — `src/lib/receipt.ts` — `ReceiptData` type, `buildReceiptData` factory
- Direct code inspection — `src/lib/constants.ts` — `DEMO_STORE_ID = '00000000-0000-4000-a000-000000000099'`
- Direct code inspection — `src/components/pos/POSTopBar.tsx` — full props interface
- Direct code inspection — `src/components/pos/ReceiptScreen.tsx` — email capture gate at line 164
- Direct code inspection — `src/app/(pos)/pos/page.tsx` — server component pattern to replicate

### Secondary (MEDIUM confidence)
- Next.js App Router route groups documentation — route group creates layout isolation without affecting URL
- React Rules of Hooks — hooks must be called unconditionally; confirmed by React 19 docs

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all tech is already in use, no new dependencies
- Architecture: HIGH — all canonical files read, patterns extracted from existing code
- Pitfalls: HIGH — derived from direct code inspection, not speculation
- Middleware analysis: HIGH — full middleware file reviewed, root domain path confirmed

**Research date:** 2026-04-06
**Valid until:** 2026-05-06 (stable codebase, no fast-moving dependencies)
