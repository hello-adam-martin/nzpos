# Phase 33: Demo POS Route & Checkout - Context

**Gathered:** 2026-04-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Visitors can use the real POS interface at `/demo/pos` — add products, apply discounts, complete a simulated EFTPOS or cash sale, and see a receipt — without creating an account or writing to the database. This phase creates the demo route, bypasses auth, reuses existing POS components with a demo mode flag, and intercepts sale completion client-side.

</domain>

<decisions>
## Implementation Decisions

### Route Architecture
- **D-01:** New route group `(demo)/demo/pos/page.tsx` — separate from the authenticated `(pos)` group. Server component fetches demo store products using `DEMO_STORE_ID` constant and admin client, passes them to the client shell.
- **D-02:** Middleware passthrough for `/demo/**` paths — add an early return in `src/middleware.ts` that skips all auth checks for routes starting with `/demo/`. No JWT, no staff session, no redirect.
- **D-03:** Layout file `(demo)/layout.tsx` — minimal viewport setup (same pattern as `(pos)/layout.tsx`), no auth providers or tenant context injection.

### Component Reuse Strategy
- **D-04:** Pass a `demoMode: boolean` prop to the existing `POSClientShell` component. When `demoMode` is true:
  - Hide barcode scanner button (`BarcodeScannerButton`)
  - Disable new order polling (`NewOrderToast`, `OrderNotificationBadge`)
  - Hide receipt email capture input on receipt screen
  - Intercept sale completion to avoid calling `completeSale` server action
- **D-05:** No forking/duplicating POSClientShell. The real POS code runs with conditional branches for demo mode. This keeps the demo always in sync with production POS behavior.
- **D-06:** `ProductGrid`, `CartPanel`, `CategoryFilterBar`, `DiscountSheet`, payment screens (`EftposConfirmScreen`, `CashEntryScreen`), and `ReceiptScreen` all work as-is — they operate on props/state, not server state.

### Sale Simulation
- **D-07:** Client-side only completion — when `demoMode` is true, `POSClientShell` builds receipt data from the current cart state (using `calcCartTotals` from `cart.ts`) without calling the `completeSale` server action. No RPC, no DB write, no stock decrement.
- **D-08:** Generate a fake order ID client-side (e.g., 8-char random hex) for the receipt display. Same visual format as real order IDs.
- **D-09:** After simulated sale, dispatch `SALE_COMPLETE` action with the locally-built receipt data. The receipt screen renders identically to a real sale.

### Demo Mode UX
- **D-10:** `POSTopBar` shows store name "Aroha Home & Gift" with a "DEMO" badge (small pill/tag). No staff name, no logout button, no mute toggle, no order notification badge.
- **D-11:** No persistent demo banner or watermark — the DEMO badge in the top bar is sufficient. The goal is to showcase the real POS experience, not to distract with demo warnings.
- **D-12:** After completing a simulated sale, the "New Sale" button on the receipt screen resets the cart to empty state (same as production behavior). Signup CTA is Phase 34 scope.

### Claude's Discretion
- Exact conditional logic placement in POSClientShell (early returns vs ternary in JSX)
- Whether to extract demo receipt builder into a helper function or inline it
- Category filter bar behavior (all categories shown by default or first selected)
- Any loading/skeleton states for the demo page initial render

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### POS Route & Page
- `src/app/(pos)/pos/page.tsx` — Production POS server page (auth, data fetching pattern to replicate for demo)
- `src/app/(pos)/layout.tsx` — POS layout (viewport setup to replicate)

### POS Components
- `src/components/pos/POSClientShell.tsx` — Main client orchestrator (add demoMode prop here)
- `src/components/pos/POSTopBar.tsx` — Top bar (conditionally hide staff/logout/mute for demo)
- `src/components/pos/BarcodeScannerButton.tsx` — Hide in demo mode
- `src/components/pos/NewOrderToast.tsx` — Disable in demo mode
- `src/components/pos/OrderNotificationBadge.tsx` — Hide in demo mode
- `src/components/pos/ReceiptScreen.tsx` — Hide email capture in demo mode

### Cart & Calculations
- `src/lib/cart.ts` — Cart state machine, calcCartTotals, calcLineItem (used for client-side receipt building)

### Sale Completion
- `src/actions/orders/completeSale.ts` — Production sale action (NOT called in demo mode)
- `src/lib/receipt.ts` — Receipt data builder (reference for client-side receipt structure)

### Auth & Middleware
- `src/middleware.ts` — Add `/demo/**` passthrough (lines ~214-263 handle POS auth)
- `src/lib/resolveAuth.ts` — Auth helpers (not used in demo route)

### Demo Store Data
- `src/lib/constants.ts` — `DEMO_STORE_ID` constant
- `supabase/migrations/032_demo_store_seed.sql` — Demo store seed data (products, categories)

### Requirements
- `.planning/REQUIREMENTS.md` — DPOS-01 through DPOS-04, DCHK-01 through DCHK-07

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `POSClientShell`: Full POS orchestrator with cart reducer, payment phases, receipt display — needs only a `demoMode` prop
- `cart.ts`: Complete cart state machine with GST calculations — all math works client-side
- `ProductGrid`, `CartPanel`, payment screens: All work with props/state, no server coupling
- `receipt.ts` / `buildReceiptData()`: Reference for receipt data shape (can replicate client-side for demo)

### Established Patterns
- Route groups: `(pos)` for POS, `(admin)` for admin — `(demo)` follows the same pattern
- Server component data fetching with admin client → pass as props to client shell
- Cart state via `useReducer(cartReducer)` — entirely client-side, no persistence
- Middleware route checks with early returns for public paths

### Integration Points
- `src/middleware.ts`: Add `/demo/**` to the early-return public paths list
- `POSClientShell.tsx`: Add `demoMode` prop, conditional logic for sale completion and feature hiding
- `POSTopBar.tsx`: Conditional rendering for demo badge vs staff info
- `ReceiptScreen.tsx`: Conditional hiding of email capture field
- New route: `src/app/(demo)/demo/pos/page.tsx` — server component fetching demo store data

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. The demo should feel like the real POS with minimal visual difference (just the DEMO badge).

</specifics>

<deferred>
## Deferred Ideas

- Signup CTA after demo sale completion — Phase 34 scope (CONV-01, CONV-02, CONV-03)
- "Try POS Demo" button on landing page — Phase 34 scope (LAND-01, LAND-02)

</deferred>

---

*Phase: 33-demo-pos-route-checkout*
*Context gathered: 2026-04-06*
