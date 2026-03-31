# Architecture Patterns

**Domain:** Retail POS with online storefront (NZ compliance)
**Project:** NZPOS — Next.js App Router + Supabase + Stripe
**Researched:** 2026-04-01
**Confidence:** HIGH (well-established stack, patterns verified against official docs in training)

---

## Recommended Architecture

### System Overview

Single Next.js application with three route-group UI surfaces sharing one Supabase database,
one Stripe account, and one set of Server Actions. No separate services, no microservices.

```
┌─────────────────────────────────────────────────────────────┐
│                     Next.js App (Vercel)                    │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │  (pos)/      │  │  (store)/    │  │  (admin)/        │  │
│  │  POS Tablet  │  │  Storefront  │  │  Admin Dashboard │  │
│  │  iPad UI     │  │  Public      │  │  Owner+Staff     │  │
│  └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘  │
│         │                 │                    │            │
│         └─────────────────┴────────────────────┘            │
│                           │                                 │
│              ┌────────────▼────────────┐                    │
│              │     Server Actions       │                    │
│              │  (Zod-validated, all    │                    │
│              │   mutations go here)    │                    │
│              └────────────┬────────────┘                    │
│                           │                                 │
│         ┌─────────────────┼──────────────────┐             │
│         │                 │                  │             │
│  ┌──────▼──────┐  ┌───────▼──────┐  ┌───────▼──────┐      │
│  │  Supabase   │  │    Stripe    │  │    Xero      │      │
│  │  (Postgres  │  │  (Payments,  │  │  (Accounting │      │
│  │   + Auth    │  │   Webhooks)  │  │   OAuth)     │      │
│  │   + RLS)    │  └──────────────┘  └──────────────┘      │
│  └─────────────┘                                           │
└─────────────────────────────────────────────────────────────┘
```

### Route Group Structure

```
app/
  (pos)/
    layout.tsx          -- PIN auth gate, tablet viewport lock
    pos/
      page.tsx          -- Product grid + cart
      checkout/
        page.tsx        -- Payment method, EFTPOS confirmation, receipt
  (store)/
    layout.tsx          -- Public layout, no auth
    page.tsx            -- Storefront home / product grid
    products/
      [slug]/
        page.tsx        -- Product detail
    cart/
      page.tsx          -- Cart (client state)
    checkout/
      page.tsx          -- Stripe Checkout redirect or embedded
    orders/
      [id]/
        page.tsx        -- Order confirmation / click-and-collect status
  (admin)/
    layout.tsx          -- Owner auth gate (email/password session)
    dashboard/
      page.tsx          -- Daily summary
    products/
      page.tsx          -- Product list
      new/page.tsx
      [id]/edit/page.tsx
    orders/
      page.tsx          -- All orders (POS + online)
    reports/
      page.tsx          -- Daily sales, top products, stock
    cash-up/
      page.tsx          -- End-of-day reconciliation
    xero/
      page.tsx          -- OAuth connect + sync status
  api/
    webhooks/
      stripe/
        route.ts        -- Stripe webhook handler (stock decrement, order state)
      xero/
        route.ts        -- Xero webhook (optional, for token refresh)
```

---

## Component Boundaries

| Component | Responsibility | Communicates With | Auth |
|-----------|---------------|-------------------|------|
| POS Surface `(pos)/` | In-store checkout UI on iPad. Product grid, cart, discounts, EFTPOS confirmation, cash recording | Server Actions → Supabase | Staff PIN (custom JWT claim) |
| Storefront Surface `(store)/` | Public product browse and purchase. Cart (client), Stripe Checkout, order tracking | Server Actions → Supabase; Stripe Checkout redirect | None (public) |
| Admin Surface `(admin)/` | Inventory management, order management, reporting, cash-up, Xero sync | Server Actions → Supabase; Xero OAuth | Owner session (Supabase Auth email/password) |
| Server Actions | All mutations and sensitive reads. Zod validation on every input. RLS via custom JWT claims | Supabase SDK (server), Stripe SDK, Xero API | Inherits from surface calling them |
| Supabase Database | Postgres with RLS. Single source of truth for products, orders, stock, stores | Server Actions (server SDK); webhooks (service role) | RLS policies keyed on store_id + role claim |
| Stripe | Payment processing for online storefront. Webhooks drive order state transitions | api/webhooks/stripe/route.ts | Webhook signature verification |
| Xero OAuth | Accounting sync. Token stored in Supabase. Daily batch push from Server Action | Admin surface triggers sync; cron or manual | Owner OAuth token scoped to store |
| Inventory Engine | Not a separate service — a set of Server Actions + DB functions that handle atomic stock decrement | Called by POS checkout action AND Stripe webhook | Service role for webhook, staff JWT for POS |

### What Does NOT Have Its Own Service

- No separate inventory microservice — stock is Postgres with `FOR UPDATE` row-level locking
- No separate auth service — Supabase Auth with custom JWT claims covers all three surfaces
- No message queue — refresh-on-transaction pattern eliminates need for event streaming
- No dedicated reporting service — Postgres queries via Server Actions

---

## Data Flow

### POS Sale Flow

```
iPad (POS surface)
  → User selects products, applies discount
  → Cart is client state (React useState / useReducer)
  → Cashier taps "Charge"
  → Staff selects payment method (EFTPOS or Cash)
  → If EFTPOS: confirmation screen shown ("Did terminal approve?")
  → On confirm: Server Action `completePOSSale(cart, paymentMethod)`
      → Zod validates input
      → Postgres transaction:
          BEGIN
            INSERT INTO orders (store_id, type='pos', status='completed', ...)
            INSERT INTO order_items (order_id, product_id, qty, unit_price, gst_amount, ...)
            UPDATE products SET stock_qty = stock_qty - qty WHERE id = product_id
              AND stock_qty >= qty   -- guard against oversell
          COMMIT
      → Returns { orderId, receipt }
  → UI refreshes product grid (re-fetch, not Realtime)
  → v1.1: receipt print via ESC/POS
```

### Online Storefront Sale Flow

```
Customer (Storefront surface)
  → Browses products (Server Components, fresh reads from Supabase)
  → Cart in localStorage / client state (no DB cart in v1)
  → Proceeds to checkout
  → Server Action `createStripeCheckoutSession(cartItems)`
      → Validates stock availability (read-check only, not reserved)
      → Creates Stripe Checkout Session with line items + metadata
      → Returns { sessionUrl }
  → Browser redirects to Stripe-hosted checkout
  → Customer completes payment on Stripe
  → Stripe redirects to /orders/[id]?session_id=...
  → Stripe webhook fires → POST /api/webhooks/stripe
      → Verifies signature
      → On checkout.session.completed:
          Postgres transaction:
            INSERT INTO orders (store_id, type='online', status='pending_pickup', ...)
            INSERT INTO order_items (...)
            UPDATE products SET stock_qty = stock_qty - qty WHERE ... AND stock_qty >= qty
          If stock guard fails → log conflict, notify admin (v1: log only)
      → Returns 200 to Stripe
  → Order confirmation page polls order status (simple fetch loop, no Realtime)
```

### Inventory Sync Pattern

```
Source of truth: products.stock_qty in Postgres

POS sale    ──→ Server Action  ──→ Postgres tx (stock decrement)
Online sale ──→ Stripe webhook ──→ Postgres tx (stock decrement)
Refund      ──→ Server Action  ──→ Postgres tx (stock increment)
Admin edit  ──→ Server Action  ──→ Postgres (direct update)

Reads:
  POS grid     ──→ Server Component → Supabase query (on each page load / manual refresh)
  Storefront   ──→ Server Component → Supabase query (on each page load, ISR optional)
  Admin stock  ──→ Server Component → Supabase query
```

No event streaming. No Supabase Realtime subscription. Freshness comes from page load and post-mutation revalidation (`revalidatePath` in Server Actions).

### Admin / Reporting Flow

```
Admin dashboard
  → Server Component fetches aggregated data via Supabase queries
  → No caching on reports (always fresh)
  → Cash-up: Server Action reads all POS sales for today, groups by payment method
  → Xero sync: Server Action reads yesterday's orders, formats journal entries, POSTs to Xero API
```

### Auth Flow

```
Owner (admin surface):
  → Email + password → Supabase Auth → session cookie
  → Supabase Auth sets custom JWT claim: { role: 'owner', store_id: 'xxx' }
  → RLS policies check auth.jwt() ->> 'store_id' and auth.jwt() ->> 'role'

Staff (POS surface):
  → PIN entry → Server Action validates PIN against staff table
  → Server Action issues short-lived custom JWT: { role: 'staff', store_id: 'xxx', staff_id: 'yyy' }
  → Stored in sessionStorage on tablet
  → RLS policies allow staff JWT to read products, insert orders

Public (storefront):
  → No auth session
  → Storefront reads via anon Supabase key with RLS allowing SELECT on published products
  → Order INSERT via service-role in webhook (bypasses RLS after signature verification)
```

---

## Patterns to Follow

### Pattern 1: Route Groups for Surface Isolation

**What:** Use Next.js route groups `(pos)`, `(store)`, `(admin)` to co-locate layouts, auth middleware, and viewport config per surface without affecting URL paths.

**When:** Any time a single app serves multiple audiences with different auth/layout requirements.

**Why:** Avoids a single giant layout.tsx trying to conditionally render for three contexts. Each surface has its own `layout.tsx` with its own auth check (middleware can also enforce).

```typescript
// app/(pos)/layout.tsx
export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,    // prevent accidental zoom on tablet
}

export default async function POSLayout({ children }) {
  const session = await getPOSSession()  // verifies staff JWT
  if (!session) redirect('/pos/login')
  return <POSShell>{children}</POSShell>
}
```

### Pattern 2: Server Actions as the Only Mutation Path

**What:** All writes go through Server Actions (`'use server'` functions). No client-side Supabase SDK calls for mutations. No API routes for mutations.

**When:** Always.

**Why:** Centralises Zod validation, RLS bypass decisions, and business logic (GST rounding, stock guards) in one place. Easier to audit. Avoids RLS policy complexity on the client path.

```typescript
// actions/pos/completeSale.ts
'use server'
import { z } from 'zod'
import { createServerClient } from '@supabase/ssr'

const CompleteSaleSchema = z.object({
  storeId: z.string().uuid(),
  items: z.array(z.object({
    productId: z.string().uuid(),
    qty: z.number().int().positive(),
    unitPriceCents: z.number().int().positive(),
    discountCents: z.number().int().min(0),
  })),
  paymentMethod: z.enum(['eftpos', 'cash']),
})

export async function completePOSSale(input: unknown) {
  const data = CompleteSaleSchema.parse(input)  // throws ZodError → caught by boundary
  // ... Postgres transaction
}
```

### Pattern 3: Postgres Transactions for Atomic Stock Decrement

**What:** Use a Supabase RPC (Postgres function) or a series of statements inside a Supabase transaction for stock decrement to prevent overselling.

**When:** Any order completion — POS or online.

**Why:** Two concurrent sales of the last unit must not both succeed. Postgres row-level locking (`SELECT ... FOR UPDATE`) inside a transaction handles this correctly.

```sql
-- supabase/migrations/xxx_decrement_stock.sql
CREATE OR REPLACE FUNCTION decrement_stock(
  p_product_id uuid,
  p_qty integer,
  p_store_id uuid
) RETURNS void AS $$
BEGIN
  UPDATE products
  SET stock_qty = stock_qty - p_qty
  WHERE id = p_product_id
    AND store_id = p_store_id
    AND stock_qty >= p_qty;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'insufficient_stock' USING ERRCODE = 'P0001';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Pattern 4: Custom JWT Claims for RLS (not user table joins)

**What:** Embed `store_id` and `role` directly in the JWT at sign-in time, not looked up via a join in every RLS policy.

**When:** Always — this is a performance and correctness requirement from the Eng review.

**Why:** Supabase's default auth.users lookup in RLS policies adds 2-11x query overhead. Custom claims via a Postgres hook (or Auth hook in Supabase) make RLS policies simple and fast.

```sql
-- RLS policy example using custom claim
CREATE POLICY "staff can read their store products"
  ON products FOR SELECT
  USING (store_id = (auth.jwt() ->> 'store_id')::uuid);
```

### Pattern 5: Stripe Webhook as the Authoritative Online Order Creator

**What:** Do not create the order record in Supabase when the customer submits the checkout form. Create it only when the `checkout.session.completed` webhook fires.

**When:** Online storefront checkout path always.

**Why:** The redirect back to your site can fail, be blocked, or be spoofed. The webhook is the guaranteed signal that Stripe has captured the money. This is the standard Stripe pattern for order fulfillment.

### Pattern 6: GST Rounding Per Line

**What:** Calculate GST on each line item individually using the discounted line amount, then sum line totals for the order total. Do not calculate GST on the order total.

**When:** All order types — POS and online.

**Why:** IRD compliance. NZ GST is tax-inclusive at 15% (rate = 3/23 of inclusive price). Rounding differences compound when done at order level.

```typescript
// lib/gst.ts
export function gstFromInclusivePrice(inclusiveCents: number): number {
  // GST fraction of a tax-inclusive price: 3/23
  return Math.round(inclusiveCents * 3 / 23)
}

export function calcLineItem(unitPriceCents: number, qty: number, discountCents: number) {
  const lineTotal = unitPriceCents * qty - discountCents
  const gst = gstFromInclusivePrice(lineTotal)
  const excl = lineTotal - gst
  return { lineTotal, gst, excl }
}
```

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Client-Side Supabase Mutations

**What:** Using the Supabase JS client in browser code to INSERT/UPDATE records.

**Why bad:** Bypasses Zod validation, business logic (GST, stock guards), and centralised audit trail. RLS alone is not a substitute for server-side business logic validation.

**Instead:** All mutations through Server Actions, even simple ones.

### Anti-Pattern 2: Creating Orders on Checkout Form Submit (not webhook)

**What:** Writing the order to the database when the user clicks "Pay" on your site.

**Why bad:** Payment may not complete. You'll have phantom unpaid orders and incorrect stock decrements. Refund logic becomes complex.

**Instead:** Create a Stripe Checkout Session, redirect customer, create the order only in the webhook handler.

### Anti-Pattern 3: Supabase Realtime for Inventory Sync

**What:** Subscribing to Supabase Realtime channels to push stock updates to the POS.

**Why bad:** WebSocket connection failures are silent on tablets. If the subscription drops, the POS shows stale stock with no indication. Requires reconnection logic, fallback polling, and increases complexity. Already explicitly rejected in Eng review.

**Instead:** Refresh product grid after each completed sale via `revalidatePath` + re-fetch on focus.

### Anti-Pattern 4: Shared Cart State Across Surfaces

**What:** Storing cart state in the database or a shared context accessible to all three surfaces.

**Why bad:** POS cart and storefront cart have completely different lifecycles, data shapes, and auth contexts. Coupling them creates unnecessary complexity.

**Instead:** POS cart is ephemeral React state (cleared after sale). Storefront cart is localStorage. Neither is persisted to the database until order completion.

### Anti-Pattern 5: Single Flat `app/` Route Structure

**What:** Mixing POS, storefront, and admin routes at the same level without route groups.

**Why bad:** Cannot apply different layouts and auth middleware per surface. Leads to conditional logic in layout.tsx that grows unmanageable.

**Instead:** Route groups `(pos)`, `(store)`, `(admin)` from day one. Filesystem layout mirrors product surfaces.

### Anti-Pattern 6: User Table Joins in RLS Policies

**What:** `auth.uid() IN (SELECT id FROM staff WHERE store_id = ...)` inside RLS policies.

**Why bad:** Executes on every query. 2-11x performance penalty. Eng review explicitly flagged this.

**Instead:** Custom JWT claims with `store_id` and `role` embedded at auth time.

---

## Database Schema Sketch

Core tables and their relationships (not exhaustive — migrations will expand).

```
stores
  id, name, gst_number, timezone, created_at

products
  id, store_id*, name, slug, description, price_cents, stock_qty,
  category_id, sku, image_url, is_published, low_stock_threshold, created_at

categories
  id, store_id*, name, sort_order

orders
  id, store_id*, type (pos|online), status (completed|pending_pickup|ready|collected|refunded),
  customer_email, subtotal_cents, gst_cents, total_cents,
  payment_method (eftpos|cash|stripe), stripe_session_id,
  promo_code_id, created_at

order_items
  id, order_id*, product_id*, qty, unit_price_cents,
  discount_cents, line_total_cents, gst_cents

staff
  id, store_id*, name, pin_hash, role (owner|staff), is_active

promo_codes
  id, store_id*, code, discount_type (percent|fixed), discount_value,
  min_order_cents, max_uses, use_count, expires_at, is_active

xero_tokens
  id, store_id*, access_token (encrypted), refresh_token (encrypted),
  expires_at, tenant_id

cash_ups
  id, store_id*, date, expected_cash_cents, actual_cash_cents, notes, created_by
```

`*` = has store_id for multi-tenant RLS. Every table includes store_id, enforced via RLS from day one.

---

## Build Order (Dependencies)

Build order follows dependency chains — each layer must exist before the layers that consume it.

### Layer 0: Foundation (blocks everything)

1. **Supabase project + schema** — products, orders, order_items, staff, stores tables with RLS
2. **Custom JWT claims** — Auth hook embedding store_id + role
3. **Next.js project scaffold** — route groups, Tailwind, shared UI primitives
4. **Zod schemas** — shared validation types used by Server Actions
5. **GST utility functions** — `lib/gst.ts`, unit tested before used anywhere

*Nothing else can be built reliably until Layer 0 is complete.*

### Layer 1: Product Catalog (blocks POS, storefront, reporting)

6. **Product CRUD Server Actions** — create, update, delete, set stock
7. **Admin products UI** — list, create/edit form, image upload
8. **CSV import** — uses same Server Actions as manual create

*Both POS and storefront need products in the database to build against.*

### Layer 2: POS Surface (blocks cash-up, end-of-day reports)

9. **Staff PIN auth** — custom JWT issuance, session storage on tablet
10. **POS product grid** — read products, category filter
11. **POS cart** — client state, line items, discount input
12. **EFTPOS confirmation step** — payment method selector + confirmation modal
13. **POS checkout Server Action** — `completePOSSale`, atomic stock decrement
14. **Post-sale refresh** — `revalidatePath` after successful sale

*Cash-up and reporting depend on orders existing, which requires POS to be functional.*

### Layer 3: Online Storefront (blocks Stripe webhook, online orders in reports)

15. **Public product listing** — Server Components, ISR optional
16. **Product detail pages** — slug routing
17. **Storefront cart** — localStorage
18. **Stripe Checkout Session** — Server Action `createCheckoutSession`
19. **Stripe webhook handler** — `checkout.session.completed` → order + stock decrement
20. **Order confirmation page** — poll order status
21. **Click-and-collect status** — PENDING_PICKUP → READY → COLLECTED transitions

*Promo codes depend on storefront checkout existing.*

### Layer 4: Admin Operations (blocks Xero, reporting)

22. **Owner email/password auth** — Supabase Auth session, admin layout gate
23. **Order management** — list all orders, filter by type/status, mark click-and-collect status
24. **Refund handling** — Server Action, stock increment, order status update
25. **Cash-up / end-of-day** — Server Action aggregates today's POS sales by payment method
26. **Basic reporting** — daily sales, top products, stock levels (Postgres queries)
27. **Low stock alerts** — query on admin dashboard load

### Layer 5: Integrations (no blockers within core product)

28. **Xero OAuth** — connect flow, token storage
29. **Xero daily sync** — Server Action reads orders, formats journal entries, pushes to Xero API
30. **Promo codes** — create/manage in admin, apply in storefront checkout

### Layer 6: Hardening (runs alongside, not blocking)

- Vitest unit tests for GST utilities, stock decrement logic, Zod schemas
- Playwright E2E for POS checkout, online checkout, admin order management
- Error boundaries on all three surfaces
- Sentry or equivalent error tracking

---

## Scalability Considerations

This is a single-tenant v1 for one store. Multi-tenant is schema-ready (store_id everywhere) but not UI-ready.

| Concern | At 1 store (now) | At 10 stores (v2) | At 100 stores |
|---------|-----------------|-------------------|---------------|
| Database | Supabase free tier, single Postgres instance | Supabase Pro, connection pooling via PgBouncer | Possibly read replicas or per-region |
| Auth | Supabase Auth, single project | Same project, store_id RLS isolation | May need separate auth tenant per region |
| Stripe | Single Stripe account for one merchant | Per-merchant Stripe account or Stripe Connect | Stripe Connect (platform model) |
| Xero | One OAuth token per store | Token per store already in schema | Same pattern |
| Inventory contention | Negligible at 1 store | FOR UPDATE locking handles concurrent sales | May need queue for flash sales |

---

## Key Architectural Decisions (from Eng Review)

These are already made — documenting for phase context:

| Decision | Implication for Build |
|----------|----------------------|
| Refresh-on-transaction, not Realtime | No WebSocket setup needed. `revalidatePath` after Server Action is sufficient. |
| Custom JWT claims for RLS | Auth hook must be configured before any RLS policy is written. Layer 0 dependency. |
| Zod on all Server Actions | Zod schemas become a shared library, not per-action. Write them in Layer 0. |
| EFTPOS confirmation step | POS checkout is a 2-step UI: "process on terminal" → "did it approve?" → complete sale. |
| Per-line GST rounding | GST utility must be tested before being used in any order path (POS or online). |
| Stripe webhook as authoritative order creator | No order DB record until webhook fires. Means the /orders/[id] page must handle "order pending" state gracefully. |
| Multi-tenant store_id from day 1 | Every migration, every RLS policy, every Server Action must scope to store_id. Not optional to defer. |

---

## Sources

- Next.js App Router documentation (route groups, Server Actions, `revalidatePath`) — HIGH confidence
- Supabase Auth custom JWT claims / Auth hooks — HIGH confidence (official Supabase feature)
- Stripe Checkout webhook pattern (`checkout.session.completed` as order trigger) — HIGH confidence (Stripe official best practice)
- Postgres `SELECT FOR UPDATE` for concurrent stock decrement — HIGH confidence (standard Postgres pattern)
- NZ IRD GST calculation (3/23 of tax-inclusive price) — HIGH confidence (IRD published guidance)
- Project engineering review decisions (refresh-on-transaction, custom JWT, Zod) — HIGH confidence (documented in PROJECT.md)
