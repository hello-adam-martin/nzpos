# Phase 4: Online Store - Context

**Gathered:** 2026-04-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Customers can browse products on a public storefront, add items to cart, apply promo codes, checkout via Stripe, and collect their order in-store. Inventory stays in sync with the POS through atomic stock decrements. Owner can create and manage promo codes from the admin panel.

</domain>

<decisions>
## Implementation Decisions

### Storefront Layout & Browsing
- **D-01:** Responsive product card grid. Each card shows image, product name, price (NZD), and Add to Cart button. Cards link to full detail page.
- **D-02:** Horizontal category pill/tab bar at top of product grid. "All" shown by default. Tapping a category filters the grid. Mirrors POS category pattern from Phase 3.
- **D-03:** Full product detail page at `/products/[slug]` — large image, full description, stock status, Add to Cart button. Server-rendered for SEO (STORE-02).
- **D-04:** Persistent search bar in storefront header. Searches product name + SKU. Always visible, not hidden behind an icon.
- **D-05:** Sold-out products display "Sold Out" badge and Add to Cart button is disabled (STORE-08).

### Cart & Checkout Flow
- **D-06:** Slide-out cart drawer triggered by cart icon in header. Header shows item count badge. Drawer displays items, quantities, promo code input field, subtotal/GST/total, and Checkout button. No separate cart page.
- **D-07:** Cart persisted in localStorage. Survives page refreshes and browser close. Guest checkout only (no customer accounts per Out of Scope).
- **D-08:** Stripe Checkout hosted page (redirect). Zero PCI scope. Server Action creates a Stripe Checkout Session with line items and any promo discount, then redirects customer. Supports Apple Pay/Google Pay automatically.
- **D-09:** Promo code entered in the cart drawer before redirecting to Stripe. Discount applied server-side when creating the Checkout Session. Customer sees adjusted total in cart before leaving the site.
- **D-10:** Post-checkout: Stripe redirects to a `/order/[id]/confirmation` page showing order summary, "Collect in-store" instructions, and order status.
- **D-11:** Customer email collected by Stripe Checkout (required field). Stored on the order record for notification purposes.

### Click-and-Collect Workflow
- **D-12:** All online orders are click-and-collect by default. No delivery option in v1. Checkout flow states "Collect in-store" — no selection step needed.
- **D-13:** Order status page at `/order/[id]` shows current status (PENDING → COMPLETED → PENDING_PICKUP → READY → COLLECTED). Accessible via confirmation page link and email links.
- **D-14:** Email notification sent when staff marks order as READY for pickup. Email contains link to order status page. Uses a simple transactional email (implementation approach is Claude's discretion — Supabase Edge Function, Resend, or similar).
- **D-15:** Status transitions managed by owner in admin order list (Phase 5 builds the full admin UI). Phase 4 creates the data model, status enum, and transition Server Actions.
- **D-15b:** Lightweight "Pickups" tab on POS screen showing pending pickup orders (filtered to PENDING_PICKUP and READY statuses). Staff taps an order to see summary, then taps "Collected" to mark it complete. Keeps staff in POS — no admin access needed for day-to-day pickup handling.

### Promo Code Management
- **D-16:** Dedicated `/admin/promos` page. Owner creates codes with: code string, type (percentage/fixed), discount value, minimum order amount (cents), maximum total uses, expiry date. List view shows active/expired/maxed-out codes.
- **D-17:** Specific inline error messages on storefront promo validation: "Code expired", "Minimum order $X required", "Code has reached its usage limit", "Invalid code". Not generic errors.
- **D-18:** Max uses is a total cap (not per-customer — no customer accounts in v1). Rate limiting at 10 validations per minute per IP prevents brute-force code guessing (DISC-02).
- **D-19:** Promo codes apply to the cart total (order-level discount), not per-line. GST recalculated on the discounted total using the existing GST module's pro-rata distribution.

### Webhook & Idempotency
- **D-20:** Stripe webhook handler at `/api/webhooks/stripe`. Listens for `checkout.session.completed` event. On receipt: validates signature, checks `stripe_events` dedup table, atomically decrements stock and creates order record (STORE-05, STORE-06).
- **D-21:** `stripe_events` table with unique constraint on Stripe event ID. Duplicate webhook deliveries are silently ignored — no duplicate orders or stock decrements (STORE-06).
- **D-22:** Order lifecycle: PENDING (on Checkout Session creation) → COMPLETED (on webhook confirmation) or EXPIRED (if Stripe session times out). Then PENDING_PICKUP → READY → COLLECTED for click-and-collect flow (STORE-07, STORE-09).

### Claude's Discretion
- Product card grid column count and breakpoints (responsive)
- Cart drawer animation and close behavior
- Search implementation (client-side filter vs server query)
- Order confirmation page layout
- Email notification service choice and template design
- Storefront header/footer layout and navigation items
- Product slug generation strategy
- Empty state designs (no products, no search results, empty cart)
- Mobile responsive breakpoints for the storefront

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Design System
- `DESIGN.md` — Full design system (navy #1E293B + amber #E67E22, Satoshi + DM Sans typography, spacing scale, motion rules, max content width 1200px)

### UI Specification
- `.planning/phases/04-online-store/04-UI-SPEC.md` — Visual/interaction contract for storefront surface (typography, color, spacing, component specs)

### Schemas & Types
- `src/schemas/order.ts` — CreateOrderSchema (channel: 'online', click-and-collect statuses), CreatePromoCodeSchema, OrderItemSchema
- `src/schemas/product.ts` — Product Zod schemas
- `src/types/database.ts` — Database types for all tables

### GST Module
- `src/lib/gst.ts` — GST calculation: gstFromInclusiveCents, calcLineItem, calcOrderGST. Per-line on discounted amounts.

### Existing Store Route
- `src/app/(store)/layout.tsx` — Existing minimal store layout (needs expansion)

### Existing Server Actions
- `src/actions/orders/completeSale.ts` — POS sale completion pattern (reference for online order creation)
- `src/actions/products/` — Product query patterns

### Auth & Middleware
- `src/lib/supabase/` — Supabase client utilities
- `src/app/(pos)/layout.tsx` — POS layout pattern (reference for store layout)

### Project Context
- `.planning/REQUIREMENTS.md` — STORE-01 through STORE-09, DISC-01, DISC-02 requirements
- `.planning/phases/01-foundation/01-CONTEXT.md` — Phase 1 decisions (auth, GST, money-in-cents)
- `.planning/phases/02-product-catalog/02-CONTEXT.md` — Phase 2 decisions (product structure, images, categories)
- `.planning/phases/03-pos-checkout/03-CONTEXT.md` — Phase 3 decisions (cart patterns, payment, stock management)
- `CLAUDE.md` — Tech stack decisions (Stripe Checkout hosted, not Elements; no Supabase Realtime)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/gst.ts` — GST calculation module, reuse for online order GST computation
- `src/lib/cart.ts` — POS cart reducer pattern. Online cart needs a separate implementation (different state machine — no EFTPOS/cash phases) but can reference the type patterns
- `src/schemas/order.ts` — CreateOrderSchema already supports `channel: 'online'` and all click-and-collect statuses. CreatePromoCodeSchema already defined.
- `src/lib/money.ts` — Money formatting utilities for NZD display

### Established Patterns
- Server Actions with Zod validation (all actions in `src/actions/`)
- Supabase RPC for atomic operations (used in `completeSale.ts` for stock decrement)
- Tailwind v4 CSS-native config with @theme block in globals.css
- Route groups: `(pos)` for POS, `(store)` for storefront, `admin` for admin

### Integration Points
- `src/app/(store)/` — Storefront routes live here (layout already exists)
- `src/app/admin/` — Admin promo management page goes here
- `src/app/api/` — Stripe webhook route handler goes here
- `src/actions/orders/` — Online order creation Server Action goes alongside completeSale.ts

</code_context>

<specifics>
## Specific Ideas

No specific references — open to standard approaches.

</specifics>

<deferred>
## Deferred Ideas

- **Shipping/delivery support** — Customer wanted shipping options alongside click-and-collect. Out of scope for v1 per REQUIREMENTS.md. Adds shipping logic, address collection, courier integration. Note for v2 backlog.

</deferred>

---

*Phase: 04-online-store*
*Context gathered: 2026-04-01*
