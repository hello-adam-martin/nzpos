# Phase 3: POS Checkout - Context

**Gathered:** 2026-04-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Staff can complete an in-store sale from product selection to payment recording, with inventory updating atomically. This includes: staff PIN login, product grid with search and category filtering, cart with quantity adjustment and discounts, payment (EFTPOS, cash, or split), atomic stock decrement, and post-sale summary. The POS runs as a fullscreen iPad PWA.

</domain>

<decisions>
## Implementation Decisions

### Cart State & Interactions
- **D-01:** Persistent search bar above the product grid. Filters products by name or SKU as staff types.
- **D-02:** Re-tapping a product already in cart increments its quantity by 1. Standard POS convention for fast checkout.
- **D-03:** SKU quick-entry text field available alongside the search bar. Staff can type a SKU to add a product directly without browsing the grid.
- **D-04:** "All" category shown by default (no filter). Tapping a category filters the grid.

### Discount Workflow
- **D-05:** No discount cap or approval step. Staff can apply any discount amount. Owner reviews discount patterns via reports.
- **D-06:** Both per-line and whole-cart discounts supported. Per-line discounts applied to individual items. Whole-cart discount applies a percentage or fixed amount across the entire order.
- **D-07:** Discount reason is optional. Dropdown with options: Staff / Damaged / Loyalty / Other — but staff can skip it.

### Discount GST Distribution
- **D-08:** Whole-cart discount GST distribution is Claude's discretion. Must be IRD-compliant — pro-rata by line total is the expected approach.

### Sale Completion Flow
- **D-09:** After sale completes, show a full-screen sale summary with items, total, payment method, and sale ID. Staff taps "New Sale" to reset cart and return to POS grid.
- **D-10:** Cash payment requires staff to enter amount tendered. POS calculates and displays change due.
- **D-11:** Split payments supported — staff can split a sale across cash and EFTPOS. Split UX is Claude's discretion (sequential or side-by-side).

### Stock & Edge Cases
- **D-12:** Out-of-stock override requires owner PIN. Staff sees out-of-stock product but cannot add it — must call owner who enters their PIN to override.
- **D-13:** Exact stock count displayed on product grid cards (e.g., "3 left") with color coding: green (in stock), amber (low stock ≤ reorder threshold), red (out of stock).
- **D-14:** Stock data auto-refreshes after each completed sale (revalidatePath) AND on page/tab focus (handles stock changes from admin or online store).
- **D-15:** Atomic stock decrement with conflict detection. If two terminals sell the last unit simultaneously, the second sale fails with "Out of stock" error — sale must be voided. Uses Supabase RPC with stock check inside transaction.

### Claude's Discretion
- Cart state management approach (React state vs localStorage persistence)
- Whole-cart discount GST distribution method (must be IRD-compliant)
- Split payment UI approach (sequential entry vs side-by-side fields)
- Product grid empty state (when search/filter returns no results)
- Cart empty state design
- Keyboard/numpad behavior for quantity and discount inputs on iPad

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Design System
- `DESIGN.md` — Full design system (navy #1E293B + amber #E67E22, Satoshi + DM Sans typography, spacing scale, POS touch targets, motion rules)

### UI Specification
- `.planning/phases/03-pos-checkout/03-UI-SPEC.md` — Detailed visual/interaction contract for POS checkout surface (layout, typography, color, spacing, component specs)

### Schemas & Types
- `src/schemas/order.ts` — OrderItemSchema and CreateOrderSchema with discount_cents, payment_method enum, channel enum
- `src/schemas/product.ts` — Product Zod schemas (CreateProductSchema, UpdateProductSchema)
- `src/types/database.ts` — Database types for all tables

### GST Module
- `src/lib/gst.ts` — GST calculation: gstFromInclusiveCents, calcLineItem, calcOrderGST. Per-line on discounted amounts, Math.round(cents * 3/23)

### Auth
- `src/app/(pos)/pos/login/page.tsx` — Existing POS staff PIN login page
- `src/app/(pos)/layout.tsx` — POS layout with touch-manipulation, bg-bg, no-scale viewport

### Server Actions
- `src/actions/products/` — Existing Server Action patterns (createProduct, updateProduct, deactivateProduct, importProducts)
- `src/actions/auth/` — Auth Server Action patterns with Zod validation

### Project Context
- `.planning/REQUIREMENTS.md` — POS-01 through POS-09, DISC-03, DISC-04 requirements
- `.planning/phases/01-foundation/01-CONTEXT.md` — Phase 1 decisions (auth, GST, money-in-cents)
- `.planning/phases/02-product-catalog/02-CONTEXT.md` — Phase 2 decisions (product CRUD, image upload, categories)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/gst.ts` — gstFromInclusiveCents, calcLineItem, calcOrderGST — ready to use for cart GST calculations
- `src/lib/money.ts` — Money formatting utilities (cents to display NZD)
- `src/schemas/order.ts` — OrderItemSchema and CreateOrderSchema already defined
- `src/schemas/product.ts` — Product schemas for validation
- `src/lib/supabase/server.ts` — Server-side Supabase client
- `src/lib/supabase/client.ts` — Browser-side Supabase client
- `src/actions/products/` — Server Action patterns to follow for order creation
- `src/components/admin/` — AdminSidebar, category and product components (patterns to reference for POS components)

### Established Patterns
- Server Actions with Zod validation (z.safeParse() before DB operations)
- Supabase client via @supabase/ssr for App Router
- Tailwind v4 CSS-native config with @theme block in globals.css
- Route groups: (admin), (pos), (store) — POS checkout goes in (pos)
- Money stored as integer cents, display formatting via money.ts
- Staff PIN auth via jose JWT (staff_session cookie, 8h expiry)

### Integration Points
- `src/app/(pos)/pos/page.tsx` — Current placeholder, needs full POS checkout implementation
- `src/app/(pos)/layout.tsx` — POS layout wrapper (touch-manipulation, viewport lock)
- Products table — query products with stock, price, images for the grid
- Categories table — query for category filter bar
- Orders table — insert completed sales
- Order_items table — insert line items
- Staff sessions — verify staff identity for sale attribution
- Supabase Storage — product image URLs for grid display

</code_context>

<specifics>
## Specific Ideas

- SKU quick-entry field makes the POS usable even before barcode scanning is implemented (v2)
- Sale summary screen provides a moment for staff to verify before resetting — reduces errors
- Cash tendered + change calculation is essential for a real POS — staff need to know change amount
- Split payments are common in NZ retail (customer pays $20 cash, rest on EFTPOS)
- Owner PIN override for out-of-stock prevents staff from overselling but allows flexibility when owner is present
- Exact stock counts on cards help staff advise customers ("we have 3 left")

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-pos-checkout*
*Context gathered: 2026-04-01*
