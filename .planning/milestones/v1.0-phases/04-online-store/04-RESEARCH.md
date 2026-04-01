# Phase 4: Online Store - Research

**Researched:** 2026-04-01
**Domain:** Next.js App Router storefront, Stripe Checkout, Supabase, cart state, webhook idempotency
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Storefront Layout & Browsing**
- D-01: Responsive product card grid. Each card shows image, product name, price (NZD), and Add to Cart button. Cards link to full detail page.
- D-02: Horizontal category pill/tab bar at top of product grid. "All" shown by default. Tapping a category filters the grid.
- D-03: Full product detail page at `/products/[slug]` — large image, full description, stock status, Add to Cart button. Server-rendered for SEO.
- D-04: Persistent search bar in storefront header. Searches product name + SKU. Always visible.
- D-05: Sold-out products display "Sold Out" badge and Add to Cart button is disabled.

**Cart & Checkout Flow**
- D-06: Slide-out cart drawer triggered by cart icon in header. Drawer displays items, quantities, promo code input, subtotal/GST/total, and Checkout button. No separate cart page.
- D-07: Cart persisted in localStorage. Survives page refreshes. Guest checkout only (no customer accounts).
- D-08: Stripe Checkout hosted page (redirect). Server Action creates Checkout Session, then redirects.
- D-09: Promo code entered in cart drawer before redirecting to Stripe. Discount applied server-side when creating the Checkout Session.
- D-10: Post-checkout: Stripe redirects to `/order/[id]/confirmation` page.
- D-11: Customer email collected by Stripe Checkout (required field). Stored on order record.

**Click-and-Collect Workflow**
- D-12: All online orders are click-and-collect. No delivery in v1.
- D-13: Order status page at `/order/[id]` showing current status.
- D-14: Email notification sent when staff marks order READY. Uses transactional email (Resend recommended — Claude's discretion on service).
- D-15: Status transitions managed by owner in admin (Phase 5 builds full admin UI). Phase 4 creates data model, status enum, transition Server Actions.
- D-15b: Lightweight "Pickups" tab on POS screen showing PENDING_PICKUP and READY orders. Staff taps "Collected" to complete.

**Promo Code Management**
- D-16: Dedicated `/admin/promos` page. Owner creates codes with type, value, min order, max uses, expiry.
- D-17: Specific inline error messages: "Code expired", "Minimum order $X required", "Code has reached its usage limit", "Invalid code".
- D-18: Max uses is total cap (not per-customer). Rate limiting at 10 validations per minute per IP.
- D-19: Promo codes apply to cart total (order-level discount). GST recalculated on discounted total using existing GST module.

**Webhook & Idempotency**
- D-20: Stripe webhook handler at `/api/webhooks/stripe`. Handles `checkout.session.completed`.
- D-21: `stripe_events` table with unique constraint on Stripe event ID. Duplicate deliveries silently ignored.
- D-22: Order lifecycle: PENDING → COMPLETED (webhook) or EXPIRED (session timeout). Then PENDING_PICKUP → READY → COLLECTED.

### Claude's Discretion
- Product card grid column count and breakpoints
- Cart drawer animation and close behavior
- Search implementation (client-side filter vs server query)
- Order confirmation page layout
- Email notification service choice and template design
- Storefront header/footer layout and navigation items
- Product slug generation strategy
- Empty state designs
- Mobile responsive breakpoints for the storefront

### Deferred Ideas (OUT OF SCOPE)
- Shipping/delivery support — out of scope for v1. Note for v2 backlog.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| STORE-01 | Public storefront displays products with images, categories, search | Server Components with Supabase query, category pill filter, search in header |
| STORE-02 | Product detail pages are server-rendered for SEO | Next.js dynamic route with `generateStaticParams` or force-dynamic; SSR confirmed for view-source indexability |
| STORE-03 | Customer can add products to cart and proceed to Stripe Checkout | localStorage cart + Context, Server Action creates Checkout Session, redirect |
| STORE-04 | Customer can apply promo codes (percentage or fixed, with validation) | validatePromoCode Server Action, rate limiting via in-memory or Upstash, DB lookup |
| STORE-05 | Stripe webhook confirms payment, atomically decrements stock, creates order | Route Handler at `/api/webhooks/stripe`, `req.text()` for raw body, RPC for atomic decrement |
| STORE-06 | Webhook is idempotent (stripe_events dedup table with unique constraint) | Insert into stripe_events with unique constraint on Stripe event ID; catch unique_violation error |
| STORE-07 | Order lifecycle: PENDING → COMPLETED or EXPIRED | Order created as PENDING on Checkout Session creation; updated to COMPLETED/EXPIRED in webhook handler |
| STORE-08 | Out-of-stock products show "Sold Out" and cannot be added to cart | `stock_quantity <= 0` check at product fetch; disabled Add to Cart state in client |
| STORE-09 | Click-and-collect: PENDING_PICKUP → READY → COLLECTED status flow | updateOrderStatus Server Action with allowed transition map; POS Pickups tab reads these statuses |
| DISC-01 | Owner can create promo codes (type, value, min order, max uses, expiry) | `/admin/promos` page + createPromoCode Server Action + existing promo_codes table |
| DISC-02 | Online store validates promo codes with rate limiting (10/min per IP) | In-memory Map rate limiter (no Redis dependency for free tier); headers() to get IP |
</phase_requirements>

---

## Summary

Phase 4 builds the public-facing online storefront on top of the existing product catalog and order infrastructure from Phases 1–3. All database tables are already defined (`orders`, `order_items`, `promo_codes`, `stripe_events`). The primary technical work is: (1) building the storefront UI with Server Components, (2) implementing a localStorage cart with React Context, (3) creating a Stripe Checkout Session Server Action, (4) handling the Stripe webhook idempotently, and (5) wiring up the click-and-collect status flow.

The most complex areas are the Stripe webhook handler (raw body requirement, idempotency via `stripe_events` table, atomic stock decrement) and the cart state management (localStorage persistence across page refreshes with React Context + useReducer). The existing `complete_pos_sale` RPC pattern is the direct template for the online equivalent — a new `complete_online_sale` RPC is needed that handles promo code redemption atomically.

There are two pre-existing schema discrepancies that must be resolved in Wave 0: (1) `database.ts` says `discount_type: 'percent'` but the actual migration SQL uses `'percentage'`; (2) `database.ts` says `use_count` but the actual column in SQL is `current_uses`. These affect every promo code query and must be corrected before implementation.

**Primary recommendation:** Build in waves: Wave 0 = schema fixes + migration + RPC. Wave 1 = storefront read path (Server Components, product listing, detail page). Wave 2 = cart + Checkout Session creation. Wave 3 = webhook + order fulfillment. Wave 4 = promo codes + admin. Wave 5 = click-and-collect POS Pickups tab.

---

## Standard Stack

### Core (already installed — no new installs required for core flow)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next | 16.2.1 | Server Components, Server Actions, Route Handlers | App Router provides SSR for SEO (STORE-02); Server Actions eliminate checkout API routes |
| stripe (node) | ^21.0.1 | Server-side: create Checkout Sessions, verify webhooks | Already installed; ^17+ API confirmed current |
| @stripe/stripe-js | ^9.0.1 | Client-side Stripe.js load (not needed for hosted Checkout redirect) | Already installed; not used client-side since hosted redirect approach |
| @supabase/supabase-js | ^2.101.1 | DB queries for products, orders, promos | Already installed |
| zod | ^4.3.6 | Validate Server Action inputs | Already installed; v4 API-compatible with v3 |
| date-fns | ^4.1.0 | Date formatting for order display, expiry checks | Already installed |

### New Dependencies Required

| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| resend | ^4.x | Transactional email for READY pickup notification | Developer-friendly, 3,000 free emails/month (100/day), first-class Next.js support. Alternative: Supabase Edge Function + SMTP — more complex. Resend is Claude's discretion call per D-14. |

**Version verification:**
```bash
npm view resend version
# Current: 4.x (verify before install)
```

**Installation:**
```bash
npm install resend
```

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Resend | Supabase Edge Function + SMTP | Edge Function adds Deno/Supabase CLI complexity. Resend has React Email templates. |
| In-memory rate limiter | Upstash Redis + @upstash/ratelimit | Upstash adds a paid dependency. In-memory Map works for single-instance Vercel functions at this traffic scale. |
| localStorage cart | Zustand persist | Zustand is cleaner but adds a dependency. React Context + useReducer + useEffect localStorage sync achieves the same at zero cost. |

---

## Architecture Patterns

### Recommended Project Structure (Phase 4 additions)

```
src/
├── app/
│   ├── (store)/
│   │   ├── layout.tsx             # EXPAND: add StorefrontHeader, CartProvider
│   │   ├── page.tsx               # Product listing with category filter (Server Component)
│   │   ├── products/
│   │   │   └── [slug]/
│   │   │       └── page.tsx       # Product detail page (Server Component, SEO)
│   │   └── order/
│   │       └── [id]/
│   │           ├── page.tsx       # Order status page (Server Component)
│   │           └── confirmation/
│   │               └── page.tsx   # Post-Stripe confirmation page
│   ├── admin/
│   │   └── promos/
│   │       └── page.tsx           # Promo code management
│   ├── api/
│   │   └── webhooks/
│   │       └── stripe/
│   │           └── route.ts       # Stripe webhook Route Handler
│   └── (pos)/
│       └── pickups/
│           └── page.tsx           # NEW: POS Pickups tab (D-15b)
├── actions/
│   ├── orders/
│   │   ├── completeSale.ts        # Existing
│   │   ├── createCheckoutSession.ts  # NEW: creates Stripe Checkout Session
│   │   └── updateOrderStatus.ts   # NEW: PENDING_PICKUP → READY → COLLECTED
│   └── promos/
│       ├── createPromoCode.ts     # NEW: admin creates promo code
│       └── validatePromoCode.ts   # NEW: storefront validates code (rate-limited)
├── components/
│   └── store/
│       ├── StorefrontHeader.tsx   # Sticky nav, cart icon with count
│       ├── CategoryPillBar.tsx    # Horizontal category filter
│       ├── StoreProductCard.tsx   # Image, name, price, Add to Cart
│       ├── StoreProductGrid.tsx   # Responsive grid wrapper
│       ├── CartDrawer.tsx         # Slide-out drawer (desktop) / bottom sheet (mobile)
│       ├── CartLineItem.tsx       # Cart item row
│       ├── CartSummary.tsx        # Subtotal, discount, GST, total
│       ├── PromoCodeInput.tsx     # Input + Apply Code button + error/success
│       ├── OrderConfirmation.tsx  # Post-Stripe success
│       ├── SoldOutBadge.tsx       # Red badge overlay
│       └── StockNotice.tsx        # "Only N left" warning
├── contexts/
│   └── CartContext.tsx            # NEW: React Context + useReducer + localStorage
├── lib/
│   ├── gst.ts                     # Existing — reuse for online cart calculations
│   ├── cart.ts                    # Existing POS cart — reference only, not imported
│   ├── money.ts                   # Existing — NZD display formatting
│   └── stripe.ts                  # NEW: singleton Stripe client
└── supabase/
    └── migrations/
        └── 006_online_store.sql   # NEW: product slug column, complete_online_sale RPC, indexes
```

### Pattern 1: Storefront Server Component Data Fetching

**What:** Product listing pages are React Server Components that query Supabase directly. No `useEffect`, no client-side fetch for initial data.

**When to use:** All read-only storefront pages (product listing, product detail, order status).

**Example:**
```typescript
// src/app/(store)/page.tsx
// Source: Next.js App Router docs — Server Components

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'

export default async function StorePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; q?: string }>
}) {
  const { category, q } = await searchParams
  const cookieStore = await cookies()

  // Storefront uses anon key (public data — no auth required)
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )

  let query = supabase
    .from('products')
    .select('id, name, slug, price_cents, image_url, stock_quantity, reorder_threshold, category_id')
    .eq('is_active', true)
    .order('name')

  if (category && category !== 'all') {
    query = query.eq('category_id', category)
  }
  if (q) {
    query = query.or(`name.ilike.%${q}%,sku.ilike.%${q}%`)
  }

  const { data: products } = await query
  // ...
}
```

**Important:** Storefront queries use the anon key (public data). No RLS restriction needed for product reads — products are public. Owner's `store_id` must be embedded in the query or configured as a global storefront setting.

### Pattern 2: localStorage Cart with React Context

**What:** Client-side cart state lives in React Context with useReducer. Persisted to localStorage on every state change. Loaded from localStorage on mount.

**When to use:** All storefront cart operations — add, remove, quantity changes, promo application.

**Example:**
```typescript
// src/contexts/CartContext.tsx
'use client'
import { createContext, useContext, useReducer, useEffect } from 'react'
import { calcLineItem, calcOrderGST } from '@/lib/gst'

// Types — mirrors POS CartItem but without POS-specific fields
export type StoreCartItem = {
  productId: string
  productName: string
  unitPriceCents: number
  quantity: number
  lineTotalCents: number
  gstCents: number
  imageUrl: string | null
}

type CartState = {
  items: StoreCartItem[]
  promoCode: string | null
  promoDiscountCents: number
  promoType: 'percentage' | 'fixed' | null
}

// ...reducer...

const CART_STORAGE_KEY = 'nzpos_store_cart'

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, initialState)

  // Hydrate from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY)
      if (saved) dispatch({ type: 'HYDRATE', payload: JSON.parse(saved) })
    } catch { /* corrupt storage — ignore */ }
  }, [])

  // Persist to localStorage on every change
  useEffect(() => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(state))
  }, [state])

  return <CartContext.Provider value={{ state, dispatch }}>{children}</CartContext.Provider>
}
```

**Critical:** CartProvider must be a Client Component (has `'use client'` directive) and must wrap the `(store)` layout. Products fetched server-side; cart state is client-side. These two layers must not be mixed.

### Pattern 3: Stripe Checkout Session Server Action

**What:** Server Action validates the cart server-side, applies promo discount, creates a Stripe Checkout Session, and returns the URL for client-side redirect.

**When to use:** When customer clicks "Proceed to Checkout" in the cart drawer.

**Example:**
```typescript
// src/actions/orders/createCheckoutSession.ts
'use server'
import 'server-only'
import Stripe from 'stripe'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function createCheckoutSession(cartItems: StoreCartItem[], promoCode?: string) {
  // 1. Re-fetch product prices from DB — never trust client prices
  // 2. Validate promo code if provided
  // 3. Create PENDING order record in Supabase (gets our order ID)
  // 4. Create Stripe Checkout Session with line_items
  // 5. Return { url } for client redirect

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    currency: 'nzd',
    line_items: lineItems,
    customer_email: undefined, // Stripe Checkout collects email
    metadata: { order_id: orderId, store_id: storeId },
    success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/order/${orderId}/confirmation?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/`,
    // No tax_rates — prices are GST-inclusive, pass unit_amount as the
    // total inclusive price. Do NOT apply Stripe Tax on top.
  })

  return { url: session.url }
}
```

**Critical GST note:** Prices in this system are already GST-inclusive. Pass `unit_amount` as the full price (e.g., $10.00 GST-inclusive = 1000 cents). Do NOT configure Stripe Tax or add `tax_rates` — this would double-charge GST. GST calculation for internal records uses `src/lib/gst.ts`, not Stripe's tax engine.

### Pattern 4: Stripe Webhook Route Handler

**What:** Route Handler at `/api/webhooks/stripe` receives webhook events. Uses `req.text()` (not `req.json()`) to get raw body for signature verification.

**When to use:** STORE-05, STORE-06 — the core payment confirmation path.

**Example:**
```typescript
// src/app/api/webhooks/stripe/route.ts
import { headers } from 'next/headers'
import Stripe from 'stripe'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(req: Request) {
  // CRITICAL: Use req.text() NOT req.json() — Stripe signature verification
  // requires the original unmodified body string
  const rawBody = await req.text()
  const headersList = await headers()
  const signature = headersList.get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch {
    return new Response('Webhook signature verification failed', { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    await handleCheckoutComplete(event.id, session)
  }

  return new Response('ok', { status: 200 })
}

async function handleCheckoutComplete(eventId: string, session: Stripe.Checkout.Session) {
  const supabase = createSupabaseAdminClient()

  // Idempotency: attempt insert into stripe_events with unique event ID
  // If it already exists, the insert fails with unique_violation — silently ignore
  const { error: dedupError } = await supabase
    .from('stripe_events')
    .insert({ stripe_event_id: eventId, type: 'checkout.session.completed' })

  if (dedupError) {
    // unique_violation = already processed — safe to ignore
    if (dedupError.code === '23505') return
    throw dedupError
  }

  // Call atomic RPC to decrement stock and mark order complete
  await supabase.rpc('complete_online_sale', {
    p_order_id: session.metadata!.order_id,
    p_stripe_session_id: session.id,
    p_stripe_payment_intent_id: session.payment_intent as string,
    p_customer_email: session.customer_details?.email ?? null,
  })
}
```

**Do not use `export const config = { api: { bodyParser: false } }`** — that's the Pages Router pattern. App Router Route Handlers do not auto-parse the body; `req.text()` is correct and sufficient.

### Pattern 5: In-Memory Rate Limiter for Promo Validation

**What:** A module-level Map tracks validation attempts per IP. Resets on function cold start. Sufficient for this traffic level without Redis.

**When to use:** `validatePromoCode` Server Action (DISC-02).

**Example:**
```typescript
// src/lib/rateLimit.ts
const attempts = new Map<string, { count: number; resetAt: number }>()

export function checkRateLimit(ip: string, maxPerMinute: number): boolean {
  const now = Date.now()
  const entry = attempts.get(ip)

  if (!entry || now > entry.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + 60_000 })
    return true // allowed
  }

  if (entry.count >= maxPerMinute) return false // blocked

  entry.count++
  return true // allowed
}
```

**Limitation:** In-memory state is per function instance. On Vercel, multiple instances can run concurrently, so the same IP could hit 10 req/min on each instance. Acceptable for v1 — a determined attacker could bypass, but brute-forcing promo codes still requires many requests. Upgrade path: swap Map for Upstash Redis if abuse is observed.

### Pattern 6: Product Slug

**What:** Products need a URL-safe slug for `/products/[slug]` routes (D-03). The `products` table has no slug column — one must be added in migration 006.

**Strategy:** Auto-generate from product name at creation time. Slugify: lowercase, replace spaces/special chars with hyphens, deduplicate with numeric suffix if needed.

**Implementation:** Add `slug TEXT UNIQUE` to products table in migration 006. Generate slug in `createProduct` Server Action using a simple utility. For existing products, generate in migration.

```typescript
// src/lib/slugify.ts
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
```

### Anti-Patterns to Avoid

- **Using `req.json()` in webhook handler:** Stripe signature verification requires the raw body string. `req.json()` parses it first, breaking the signature check.
- **Trusting client cart prices:** Always re-fetch product prices from DB in `createCheckoutSession`. A malicious client could send modified prices.
- **Adding Stripe Tax on top of GST-inclusive prices:** NZ prices include GST. Adding Stripe Tax would charge customers 15% GST again on top.
- **Importing POS CartItem types into the store cart:** The two carts have different shapes (POS has EFTPOS phase, discount reasons, etc.). Maintain separate types.
- **Server Component importing CartContext:** CartContext is Client-side only. Pass server-fetched data down as props to Client Components.
- **Mutation in Route Handler without admin client:** Webhook RPC needs admin client (bypasses RLS) — same pattern as `completeSale.ts`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Stripe webhook signature verification | Custom HMAC verification | `stripe.webhooks.constructEvent()` | Stripe SDK handles timing-safe comparison, timestamp tolerance (300s window), all edge cases |
| Stripe Checkout UI | Custom card form | Stripe Checkout hosted page | PCI compliance, Apple Pay/Google Pay automatic, zero frontend card code |
| GST calculation | New formula | `src/lib/gst.ts` — `gstFromInclusiveCents`, `calcLineItem`, `calcOrderGST` | IRD-compliant formula already implemented and tested |
| Money formatting | `toLocaleString()` calls | `src/lib/money.ts` | Consistent NZD display already implemented |
| Promo discount distribution | Custom math | `applyCartDiscount()` from `src/lib/cart.ts` | Pro-rata with last-item rounding absorb already handles exact-total invariant |
| Atomic stock decrement | Application-level lock | Supabase RPC with `SELECT FOR UPDATE` | Same pattern as `complete_pos_sale` — prevents overselling under concurrency |
| Order dedup | Application-level check | `stripe_events` table unique constraint + Postgres `23505` error code | DB constraint is the only reliable idempotency guarantee (no race condition) |

**Key insight:** The webhook handler has a hard requirement: idempotency must be guaranteed at the DB layer, not application layer. Two parallel webhook deliveries of the same event can both pass an application-level "does this event exist?" check before either inserts. The DB unique constraint is the only correct solution.

---

## Schema & Type Issues (MUST FIX in Wave 0)

Two pre-existing discrepancies between the migration SQL and `src/types/database.ts` affect Phase 4 directly.

### Issue 1: `discount_type` value mismatch

- **Migration SQL (`001_initial_schema.sql`):** `CHECK (discount_type IN ('percentage', 'fixed'))`
- **TypeScript types (`database.ts`):** `discount_type: 'percent' | 'fixed'`
- **Impact:** Every promo code insert/read using the TypeScript types will have a type error. The actual DB value is `'percentage'` — the types are wrong.
- **Fix:** Update `database.ts` promo_codes `discount_type` to `'percentage' | 'fixed'`.

### Issue 2: `current_uses` vs `use_count` column name mismatch

- **Migration SQL:** `current_uses INTEGER NOT NULL DEFAULT 0`
- **TypeScript types:** `use_count: number`
- **Impact:** Any Supabase query using `.select('use_count')` on promo_codes will fail at runtime.
- **Fix:** Update `database.ts` promo_codes to use `current_uses` column name.

### Issue 3: `stripe_events` table structure mismatch

- **Migration SQL:** `id TEXT PRIMARY KEY` (Stripe event ID IS the PK), `store_id` column exists, no `processed` boolean.
- **TypeScript types:** `id: string` (UUID), `stripe_event_id: string`, `processed: boolean`.
- **Impact:** The idempotency dedup logic described in D-21 assumes inserting a record with the Stripe event ID. The migration uses the event ID directly as the PK. The types file adds a separate UUID + `stripe_event_id` field.
- **Fix:** Either update the migration to match the types (add UUID PK + `stripe_event_id` unique field + `processed` column) OR update types to match migration. Recommended: update migration to match types (more flexible — allows marking as processed without delete).

### Issue 4: `orders.payment_method` — missing 'split' in migration

- **Migration SQL:** `CHECK (payment_method IN ('eftpos', 'cash', 'stripe'))`
- **TypeScript types / Zod:** includes `'split'`
- **Impact:** Split payment orders would fail the DB constraint.
- **Fix:** Migration 006 should alter the check constraint to add `'split'` (or use a separate migration).

---

## Common Pitfalls

### Pitfall 1: Stripe Webhook Raw Body

**What goes wrong:** Using `await req.json()` in the webhook Route Handler. Stripe signature verification fails, returning 400. All webhooks fail silently.

**Why it happens:** Developers familiar with REST APIs reach for `req.json()`. App Router parses nothing by default — but calling `.json()` internally calls `.text()` then `JSON.parse()`. The problem is you've consumed the stream and can't get the original string back.

**How to avoid:** Always use `const rawBody = await req.text()` in the webhook handler. This is the only correct approach for Stripe signature verification in App Router.

**Warning signs:** Stripe webhook logs showing 400 responses with "No signatures found matching the expected signature for payload."

### Pitfall 2: Storefront Store ID Hard-coding

**What goes wrong:** The storefront is public (no auth) but Supabase products are scoped per `store_id`. Without auth context, the storefront has no way to know which store's products to show.

**Why it happens:** The multi-tenant schema assumes RLS extracts `store_id` from JWT. But the storefront has no JWT.

**How to avoid:** For v1 (single store), embed the store ID as an env var (`NEXT_PUBLIC_STORE_ID` or server-only `STORE_ID`). The storefront query explicitly filters `.eq('store_id', process.env.STORE_ID)`. This is the correct v1 approach — multi-tenant discovery is deferred.

**Warning signs:** Product listing page returns all products from all stores, or returns zero results.

### Pitfall 3: Server Component / Client Component Boundary in Cart

**What goes wrong:** Attempting to use `useCartContext()` in a Server Component, causing a build error ("Hooks can only be called inside function components").

**Why it happens:** The storefront layout is a Server Component, but the cart is client-side state. Developers try to pass cart state from layout to children.

**How to avoid:** Wrap the entire `(store)` layout body in a `<CartProvider>` that is a Client Component. Product data flows server → client as props. Cart state lives entirely client-side in Context. These two trees do not share mutable state.

**Warning signs:** Build errors about hooks in server context, or hydration mismatches.

### Pitfall 4: Promo Code GST Recalculation

**What goes wrong:** Applying a promo discount to the subtotal but recalculating GST incorrectly — either not recalculating at all, or recalculating on the pre-discount amount.

**Why it happens:** D-19 specifies GST is recalculated on the discounted total. The existing `calcLineItem` is per-line on discounted amounts. For an order-level promo, the discount must be pro-rata distributed across lines first (same as `applyCartDiscount` in `cart.ts`), then GST recalculated per line.

**How to avoid:** Reuse the `applyCartDiscount()` function from `src/lib/cart.ts` — it already implements pro-rata distribution with last-item rounding absorb. Call `calcCartTotals()` after to get the correct total and GST.

**Warning signs:** GST amount in the order record doesn't match `Math.round(total_cents * 3 / 23)`, or the sum of line GSTs doesn't equal the order GST.

### Pitfall 5: Order Status Race Condition on Webhook Replay

**What goes wrong:** Stripe replays a `checkout.session.completed` event. The webhook handler processes it again, creating a duplicate order or decrementing stock twice.

**Why it happens:** Stripe guarantees at-least-once delivery. The same event can arrive multiple times within seconds or minutes.

**How to avoid:** The `stripe_events` table unique constraint on the event ID is the only correct solution. The webhook handler attempts `INSERT INTO stripe_events (id) VALUES ($eventId)` and catches `unique_violation` (Postgres error code `23505`). If caught, return 200 without processing. **Never** check "does this order exist?" as the dedup mechanism — two concurrent webhook calls can both pass that check.

**Warning signs:** Duplicate orders in the DB, stock going negative after a single sale.

### Pitfall 6: Checkout Session Price Trust

**What goes wrong:** The Server Action that creates the Checkout Session reads prices from the cart items sent by the client, rather than re-fetching from the DB.

**Why it happens:** Convenient to pass cart items directly from the client to the Server Action.

**How to avoid:** Always re-fetch `price_cents` from the DB using the product IDs from the cart. Only trust product IDs from the client. All prices, GST calculations, and totals are computed server-side from trusted DB data.

**Warning signs:** A customer manually modifies cart localStorage to set price to $0.01, proceeds to checkout successfully.

### Pitfall 7: Next.js searchParams Promise in App Router

**What goes wrong:** Accessing `searchParams.category` directly in a Server Component page causes a build error in Next.js 15+.

**Why it happens:** Next.js 15 made `searchParams` (and `params`) async — they return Promises. The old synchronous access pattern breaks.

**How to avoid:** Await searchParams: `const { category } = await searchParams` where `searchParams: Promise<{ category?: string }>` is the prop type.

**Warning signs:** TypeScript error "Property 'category' does not exist on type 'Promise<...>'"

---

## Code Examples

### Create a Stripe Checkout Session (Server Action)

```typescript
// src/actions/orders/createCheckoutSession.ts
'use server'
import 'server-only'
import Stripe from 'stripe'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { calcLineItem, calcOrderGST } from '@/lib/gst'
import { applyCartDiscount } from '@/lib/cart'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function createCheckoutSession(
  cartProductIds: { productId: string; quantity: number }[],
  promoCodeId?: string
) {
  const supabase = createSupabaseAdminClient()
  const storeId = process.env.STORE_ID!

  // Re-fetch prices from DB — never trust client prices
  const { data: products } = await supabase
    .from('products')
    .select('id, name, price_cents, stock_quantity, image_url')
    .in('id', cartProductIds.map(i => i.productId))
    .eq('store_id', storeId)
    .eq('is_active', true)

  // Check stock
  for (const item of cartProductIds) {
    const product = products?.find(p => p.id === item.productId)
    if (!product || product.stock_quantity < item.quantity) {
      return { error: 'out_of_stock', productId: item.productId }
    }
  }

  // Build cart items with GST
  let cartItems = cartProductIds.map(item => {
    const product = products!.find(p => p.id === item.productId)!
    const { lineTotal, gst } = calcLineItem(product.price_cents, item.quantity, 0)
    return { productId: item.productId, productName: product.name,
             unitPriceCents: product.price_cents, quantity: item.quantity,
             discountCents: 0, lineTotalCents: lineTotal, gstCents: gst }
  })

  // Apply promo discount if provided
  let promoDiscountCents = 0
  if (promoCodeId) {
    // fetch promo and apply discount...
    cartItems = applyCartDiscount(cartItems, promoDiscountCents)
  }

  const totalCents = cartItems.reduce((s, i) => s + i.lineTotalCents, 0)
  const gstCents = calcOrderGST(cartItems.map(i => i.gstCents))

  // Create PENDING order
  const { data: order } = await supabase
    .from('orders')
    .insert({ store_id: storeId, channel: 'online', status: 'pending',
              subtotal_cents: totalCents, gst_cents: gstCents,
              total_cents: totalCents, discount_cents: promoDiscountCents,
              payment_method: 'stripe' })
    .select('id')
    .single()

  // Stripe line items — prices are GST-inclusive, no Stripe Tax
  const lineItems = cartItems.map(item => ({
    price_data: {
      currency: 'nzd',
      product_data: { name: item.productName },
      unit_amount: item.lineTotalCents,  // total for this line, GST-inclusive
    },
    quantity: 1,  // quantity already factored into lineTotalCents
  }))

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    currency: 'nzd',
    line_items: lineItems,
    metadata: { order_id: order!.id, store_id: storeId },
    success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/order/${order!.id}/confirmation?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/`,
    customer_creation: 'always',  // captures email in customer object
  })

  return { url: session.url }
}
```

### Stripe Webhook (Idempotent)

```typescript
// src/app/api/webhooks/stripe/route.ts
import { headers } from 'next/headers'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(req: Request) {
  const rawBody = await req.text()  // MUST use .text(), not .json()
  const headersList = await headers()
  const sig = headersList.get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return new Response('Signature verification failed', { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const supabase = createSupabaseAdminClient()
    // Insert stripe_events row — unique constraint deduplicates
    const { error } = await supabase.from('stripe_events')
      .insert({ stripe_event_id: event.id, type: event.type })
    if (error?.code === '23505') {
      // Already processed — idempotent 200
      return new Response('ok', { status: 200 })
    }
    if (error) return new Response('DB error', { status: 500 })
    await supabase.rpc('complete_online_sale', { /* ... */ })
  }

  return new Response('ok', { status: 200 })
}
```

### In-Memory Rate Limiter

```typescript
// src/lib/rateLimit.ts
const store = new Map<string, { count: number; resetAt: number }>()

export function isRateLimited(key: string, max: number, windowMs = 60_000): boolean {
  const now = Date.now()
  const entry = store.get(key)
  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return false
  }
  if (entry.count >= max) return true
  entry.count++
  return false
}
```

### Get Client IP in Server Action

```typescript
// src/actions/promos/validatePromoCode.ts
'use server'
import { headers } from 'next/headers'
import { isRateLimited } from '@/lib/rateLimit'

export async function validatePromoCode(code: string, cartTotalCents: number) {
  const headersList = await headers()
  const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'

  if (isRateLimited(`promo:${ip}`, 10, 60_000)) {
    return { error: 'rate_limited' }
  }
  // ... DB lookup ...
}
```

---

## Migration 006: Online Store

The following changes are needed in `supabase/migrations/006_online_store.sql`:

```sql
-- 1. Add slug column to products
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS slug TEXT;

-- Generate slugs for existing products (Wave 0)
UPDATE public.products
SET slug = regexp_replace(lower(name), '[^a-z0-9]+', '-', 'g')
WHERE slug IS NULL;

-- Add unique constraint and NOT NULL after backfill
ALTER TABLE public.products ALTER COLUMN slug SET NOT NULL;
CREATE UNIQUE INDEX products_store_slug_unique ON public.products(store_id, slug);

-- 2. Fix stripe_events table to match TypeScript types
-- (Recreate with correct structure if migration 001 created the wrong version)
-- Add processed column and stripe_event_id unique constraint
ALTER TABLE public.stripe_events ADD COLUMN IF NOT EXISTS processed BOOLEAN NOT NULL DEFAULT false;
CREATE UNIQUE INDEX IF NOT EXISTS stripe_events_event_id_unique ON public.stripe_events(stripe_event_id);

-- 3. Add min_order_cents to promo_codes (may already exist — check migration 001)
-- Already exists in migration 001

-- 4. complete_online_sale RPC (atomic: decrement stock + create order items + update order)
CREATE OR REPLACE FUNCTION public.complete_online_sale(
  p_order_id UUID,
  p_stripe_session_id TEXT,
  p_stripe_payment_intent_id TEXT,
  p_customer_email TEXT
) RETURNS void
SECURITY DEFINER
LANGUAGE plpgsql AS $$
BEGIN
  -- Lock order row
  PERFORM id FROM public.orders WHERE id = p_order_id FOR UPDATE;

  -- Decrement stock for each line item (SELECT FOR UPDATE on products)
  UPDATE public.products p
  SET stock_quantity = stock_quantity - oi.quantity
  FROM public.order_items oi
  WHERE oi.order_id = p_order_id
    AND p.id = oi.product_id;

  -- Check for negative stock (raise exception to rollback)
  IF EXISTS (
    SELECT 1 FROM public.products p
    JOIN public.order_items oi ON oi.product_id = p.id
    WHERE oi.order_id = p_order_id AND p.stock_quantity < 0
  ) THEN
    RAISE EXCEPTION 'OUT_OF_STOCK';
  END IF;

  -- Update order to completed + pickup flow
  UPDATE public.orders
  SET status = 'pending_pickup',
      stripe_session_id = p_stripe_session_id,
      stripe_payment_intent_id = p_stripe_payment_intent_id,
      customer_email = COALESCE(p_customer_email, customer_email),
      updated_at = now()
  WHERE id = p_order_id;
END;
$$;
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Pages Router API routes for webhooks | App Router Route Handlers | Next.js 13+ | Different raw body access pattern — use `req.text()` |
| Stripe.js custom Elements | Stripe Checkout hosted page | Stripe 2021+ | Zero frontend card code, automatic Apple Pay/Google Pay |
| `@supabase/auth-helpers-nextjs` | `@supabase/ssr` | 2023 | Already using correct package — do not import old package |
| `searchParams.property` synchronous | `await searchParams` (Promise) | Next.js 15 | Must await in Server Components |
| Manual body parser config in webhooks | None needed in App Router | Next.js 13+ | App Router does not auto-parse bodies |

**Deprecated/outdated:**
- `export const config = { api: { bodyParser: false } }` — Pages Router only. Do not add to App Router Route Handlers.
- `@supabase/auth-helpers-nextjs` — replaced by `@supabase/ssr`. Already correct in this codebase.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| Node.js | Build/runtime | Yes | v22.22.0 | — |
| Next.js dev server | Development | Yes | 16.2.1 (package.json) | — |
| Stripe SDK (stripe) | Checkout Session, webhook | Yes | ^21.0.1 (installed) | — |
| Resend SDK | Pickup notification email | No | Not installed | Install: `npm install resend` |
| Stripe CLI | Local webhook testing | No | Not found | Use `npx stripe` or test via Stripe dashboard webhook replay |
| Supabase local | DB migrations | Not verified | — | Use Supabase cloud dev instance |

**Missing dependencies with no fallback:**
- Stripe CLI for local webhook testing — needed to test the webhook handler locally. Install via `brew install stripe/stripe-cli/stripe` or use `npx stripe`. Not blocking for implementation but required for testing.

**Missing dependencies with fallback:**
- Resend — install `npm install resend`. No fallback needed; email notification is non-blocking for order flow.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest ^4.1.2 |
| Config file | `vitest.config.ts` (exists, jsdom environment) |
| Quick run command | `npm test` |
| Full suite command | `npm test -- --reporter=verbose` |

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| STORE-03 | Cart add/remove/quantity/total calculates correctly | unit | `npm test -- src/lib/storeCart.test.ts` | No — Wave 0 |
| STORE-04 | Promo code discount math (percentage + fixed) | unit | `npm test -- src/lib/promoDiscount.test.ts` | No — Wave 0 |
| STORE-05/06 | Webhook handler: valid event processes; duplicate event is no-op | unit | `npm test -- src/app/api/webhooks/stripe/webhook.test.ts` | No — Wave 0 |
| STORE-06 | Idempotency: second webhook call with same event ID returns 200 and does not double-decrement | unit | same as above | No — Wave 0 |
| DISC-02 | Rate limiter: 11th call within 60s returns rate_limited | unit | `npm test -- src/lib/rateLimit.test.ts` | No — Wave 0 |
| DISC-01 | CreatePromoCodeSchema validation rejects invalid inputs | unit | `npm test -- src/schemas/order.test.ts` | No — Wave 0 |
| STORE-08 | Sold-out: stock_quantity=0 disables add-to-cart in StoreProductCard | component | `npm test -- src/components/store/StoreProductCard.test.tsx` | No — Wave 0 |
| E2E | Full checkout flow: add to cart → promo → Stripe redirect → webhook → confirmation | e2e | `npm run test:e2e -- tests/store-checkout.spec.ts` | No — Wave 0 |

### Sampling Rate
- **Per task commit:** `npm test`
- **Per wave merge:** `npm test -- --reporter=verbose`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/lib/storeCart.test.ts` — covers STORE-03 (cart state, totals, GST)
- [ ] `src/lib/promoDiscount.test.ts` — covers STORE-04 (percentage + fixed promo math)
- [ ] `src/lib/rateLimit.test.ts` — covers DISC-02 (rate limiter window logic)
- [ ] `src/app/api/webhooks/stripe/webhook.test.ts` — covers STORE-05, STORE-06
- [ ] `src/components/store/StoreProductCard.test.tsx` — covers STORE-08 (sold out state)
- [ ] `tests/store-checkout.spec.ts` — E2E checkout flow (requires Stripe test mode + local webhook)

---

## Open Questions

1. **Store ID configuration for public storefront**
   - What we know: The schema requires `store_id` on every product query. The storefront has no auth context.
   - What's unclear: Is the store ID hardcoded in an env var, or does the domain map to a store?
   - Recommendation: Use `STORE_ID` server-side env var for v1. Single-store deployment assumption. Document in `.env.local.example`.

2. **Stripe webhook secret for local development**
   - What we know: Stripe webhook signature verification requires `STRIPE_WEBHOOK_SECRET` from the Stripe dashboard.
   - What's unclear: Whether a local Stripe CLI listener is set up.
   - Recommendation: Wave 0 task should document the local dev setup using `stripe listen --forward-to localhost:3000/api/webhooks/stripe`.

3. **Order confirmation page URL structure**
   - What we know: D-10 specifies `/order/[id]/confirmation`. The Stripe `success_url` passes `?session_id={CHECKOUT_SESSION_ID}`.
   - What's unclear: Should the confirmation page verify the session against the order ID, or trust the route parameter?
   - Recommendation: Verify that `session.metadata.order_id === routeParam` in the confirmation page Server Component.

4. **Email notification timing for READY status**
   - What we know: D-14 requires an email when order is marked READY.
   - What's unclear: Should the email send synchronously in the Server Action, or queued?
   - Recommendation: Send synchronously from the `updateOrderStatus` Server Action when `newStatus === 'ready'`. Resend SDK call is fast (<200ms). No queuing needed for v1.

---

## Project Constraints (from CLAUDE.md)

| Directive | Impact on Phase 4 |
|-----------|-------------------|
| Next.js 16 App Router — non-negotiable | All routes use Server Components; Server Actions for mutations |
| Supabase — non-negotiable | All DB operations via Supabase JS client; admin client for webhook RPC |
| Stripe Checkout hosted page (not Elements) | No custom card UI; redirect approach confirmed |
| No Supabase Realtime | Storefront shows stock status at page load; no WebSocket updates |
| No Prisma | Direct Supabase JS client queries only |
| GST 15% tax-inclusive | Do not add Stripe Tax on top; pass inclusive prices to Stripe |
| Integer cents throughout | All monetary values as integers; no floats anywhere |
| Tailwind v4 CSS-native | No tailwind.config.js; @theme block in globals.css |
| Zod v4 (^4.3.6 installed) | Use `z.safeParse()`; API compatible with Zod 3 patterns |
| No customer accounts in v1 | Guest checkout only; no sign-up flow for storefront |
| Vitest (not Jest) | All unit tests use Vitest |
| Playwright (not Cypress) | E2E tests use Playwright |
| DESIGN.md governs all UI | Read DESIGN.md + 04-UI-SPEC.md before any component work |
| Always read DESIGN.md before visual/UI decisions | Component colors, spacing, typography from DESIGN.md |

---

## Sources

### Primary (HIGH confidence)
- Official Stripe webhook docs (constructEvent pattern): https://docs.stripe.com/payments/checkout/use-manual-tax-rates
- Stripe webhook App Router pattern verified: https://kitson-broadhurst.medium.com/next-js-app-router-stripe-webhook-signature-verification-ea9d59f3593f
- CLAUDE.md — project stack constraints (authoritative)
- `src/types/database.ts` — existing DB types (direct code inspection)
- `supabase/migrations/001_initial_schema.sql` — authoritative schema (direct code inspection)
- `src/lib/gst.ts` — GST module (direct code inspection)
- `src/lib/cart.ts` — existing cart patterns (direct code inspection)
- `src/actions/orders/completeSale.ts` — atomic RPC pattern (direct code inspection)

### Secondary (MEDIUM confidence)
- Stripe GST inclusive NZ — Stripe docs verified tax-inclusive behavior for NZD: https://docs.stripe.com/billing/taxes/tax-rates
- Resend free tier (3,000/month, 100/day): https://resend.com/pricing
- Next.js rate limiting patterns: https://nextjsweekly.com/blog/rate-limiting-server-actions
- Stripe Checkout + Next.js Server Actions 2025: https://dev.to/sameer_saleem/the-ultimate-guide-to-stripe-nextjs-2026-edition-2f33

### Tertiary (LOW confidence)
- In-memory rate limiter viability for Vercel multi-instance — community pattern, not official docs. Sufficient for v1 low-traffic, upgrade path to Upstash if needed.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages already installed, versions verified from package.json
- Architecture: HIGH — patterns derived from existing codebase (completeSale.ts, cart.ts, gst.ts)
- Stripe webhook pattern: HIGH — verified against official Stripe docs and App Router guide
- Pitfalls: HIGH — schema bugs found by direct code inspection; webhook raw body from official sources
- Rate limiting: MEDIUM — in-memory approach is community-standard for low-traffic apps

**Research date:** 2026-04-01
**Valid until:** 2026-05-01 (stable stack; Stripe API versions don't change frequently)
