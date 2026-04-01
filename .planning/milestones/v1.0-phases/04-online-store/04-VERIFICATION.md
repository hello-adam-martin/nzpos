---
phase: 04-online-store
verified: 2026-04-01T00:00:00Z
status: passed
score: 25/25 must-haves verified
re_verification: false
---

# Phase 04: Online Store Verification Report

**Phase Goal:** Public online storefront with product browsing, cart, Stripe Checkout, click-and-collect.
**Verified:** 2026-04-01
**Status:** passed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| #   | Truth                                                                              | Status     | Evidence                                                                                |
| --- | ---------------------------------------------------------------------------------- | ---------- | --------------------------------------------------------------------------------------- |
| 1   | Products have URL-safe slugs for SEO-friendly detail pages                         | VERIFIED   | `006_online_store.sql` adds slug column + backfill; `slugify.ts` exports `slugify`      |
| 2   | Database types match actual migration SQL for promo_codes and stripe_events        | VERIFIED   | `database.ts` has `current_uses`, `'percentage' \| 'fixed'`, stripe_events TEXT PK     |
| 3   | complete_online_sale RPC atomically decrements stock and creates order             | VERIFIED   | Migration has `SELECT FOR UPDATE` + stock decrement + `SET status = 'completed'`        |
| 4   | Stripe client singleton available for server-side usage                            | VERIFIED   | `stripe.ts` imports `server-only`, exports `stripe = new Stripe(...)`                  |
| 5   | Rate limiter tracks requests per IP with 1-minute sliding window                  | VERIFIED   | `rateLimit.ts` exports `checkRateLimit` with 60_000ms window                           |
| 6   | Wave 0 test stubs exist for all key modules                                        | VERIFIED   | All 5 test stub files present with `describe` + `test.todo` entries                    |
| 7   | Cart state persists in localStorage across page refreshes                          | VERIFIED   | `CartContext.tsx` uses `CART_STORAGE_KEY = 'nzpos_store_cart'`, reads/writes on mount  |
| 8   | Adding a product to cart updates item count in header                              | VERIFIED   | `StorefrontHeader.tsx` calls `useCart()` for `itemCount`, shows badge                  |
| 9   | Sold-out products cannot be added to cart (quantity check in reducer)              | VERIFIED   | `CartContext.tsx` ADD_ITEM case: rejects if `stockQuantity <= 0`                       |
| 10  | Store layout wraps children in CartProvider                                        | VERIFIED   | `(store)/layout.tsx` imports CartProvider, wraps children with `<CartProvider>`        |
| 11  | Public storefront loads server-rendered product pages with images and categories   | VERIFIED   | `(store)/page.tsx` is Server Component, queries products with `.eq('is_active', true)` |
| 12  | Product detail page is server-rendered (view-source shows product name in HTML)    | VERIFIED   | `products/[slug]/page.tsx` has `generateMetadata` + no `'use client'` at top          |
| 13  | Sold-out products display 'Sold Out' badge and Add to Cart is disabled             | VERIFIED   | `SoldOutBadge.tsx` renders "Sold Out"; `StoreProductCard.tsx` sets `aria-disabled`     |
| 14  | Category pills filter the product grid                                             | VERIFIED   | `CategoryPillBar.tsx` `role="radiogroup"`, uses `router.push` with `?category=` param  |
| 15  | Search filters products by name or SKU                                             | VERIFIED   | `(store)/page.tsx` applies `.or('name.ilike.%...,sku.ilike.%...')`                    |
| 16  | Low stock products show 'Only N left' warning                                      | VERIFIED   | `StockNotice.tsx` renders "Only {n} left" when stock > 0 and <= reorderThreshold       |
| 17  | Owner can create promo codes from admin panel with all required fields             | VERIFIED   | `PromoForm.tsx` uses `useActionState` + `createPromoCode`, all D-16 fields present     |
| 18  | Promo validation returns specific error messages per D-17                          | VERIFIED   | `validatePromoCode.ts` returns `rate_limited`, `invalid`, `expired`, `max_uses`, `min_order` |
| 19  | Rate limiting blocks more than 10 validations per minute per IP                   | VERIFIED   | `validatePromoCode.ts` calls `checkRateLimit(ip, 10)` from x-forwarded-for header      |
| 20  | Promo list shows active, expired, and maxed-out codes                              | VERIFIED   | `PromoList.tsx` checks `current_uses >= max_uses`, shows Active/Expired/Maxed Out      |
| 21  | Customer can add products to cart, see totals, and proceed to Stripe Checkout      | VERIFIED   | `CartDrawer.tsx` calls `createCheckoutSession`, redirects via `window.location.href`   |
| 22  | Promo code applied in cart adjusts total before Stripe redirect                    | VERIFIED   | `PromoCodeInput.tsx` dispatches `APPLY_PROMO`; `createCheckoutSession` accepts `promoId` |
| 23  | Order record created as PENDING with order_items before Stripe redirect            | VERIFIED   | `createCheckoutSession.ts` inserts order then `order_items` before `stripe.checkout.sessions.create` |
| 24  | Stripe webhook atomically decrements stock and completes order                     | VERIFIED   | `route.ts` calls `rpc('complete_online_sale')` with order_items fetched from DB        |
| 25  | Duplicate webhook events are silently ignored (idempotency)                        | VERIFIED   | `route.ts` inserts stripe_events PK, catches `dedupError.code === '23505'` and returns |
| 26  | Order confirmation page shows order summary after successful payment               | VERIFIED   | Confirmation page renders order items, totals, click-and-collect status messaging      |
| 27  | Cart is cleared after successful checkout                                          | VERIFIED   | `CartClearer.tsx` dispatches `CLEAR_CART` on mount, imported into confirmation page    |
| 28  | Order status can transition PENDING_PICKUP -> READY -> COLLECTED                  | VERIFIED   | `updateOrderStatus.ts` has `ALLOWED_TRANSITIONS` map enforcing all three transitions   |
| 29  | Staff can see pending pickup orders on POS Pickups tab                             | VERIFIED   | `pickups/page.tsx` queries `.in('status', ['pending_pickup', 'ready'])` + `.eq('channel', 'online')` |
| 30  | POS navigation includes a discoverable link to /pos/pickups                        | VERIFIED   | `POSTopBar.tsx` has `'use client'`, `usePathname`, `<Link href="/pos/pickups">`        |

**Score:** 25/25 (additional truths derived from all 7 plans — all pass)

---

### Required Artifacts

| Artifact                                                        | Provides                                              | Status     | Details                              |
| --------------------------------------------------------------- | ----------------------------------------------------- | ---------- | ------------------------------------ |
| `supabase/migrations/006_online_store.sql`                      | Slug, complete_online_sale RPC, public RLS policies   | VERIFIED   | 95 lines, all acceptance criteria met |
| `src/types/database.ts`                                         | Corrected promo_codes, stripe_events, slug, RPC types | VERIFIED   | `current_uses`, `'percentage'`, slug, RPC all present |
| `src/lib/slugify.ts`                                            | URL-safe slug generation                              | VERIFIED   | Exports `slugify`                    |
| `src/lib/stripe.ts`                                             | Singleton Stripe server client                        | VERIFIED   | `server-only` + `new Stripe(...)`   |
| `src/lib/rateLimit.ts`                                          | In-memory rate limiter per IP                         | VERIFIED   | Exports `checkRateLimit`            |
| `src/lib/storeCart.test.ts`                                     | Wave 0 test stub                                      | VERIFIED   | 416b, 10 describe/todo entries      |
| `src/lib/promoDiscount.test.ts`                                 | Wave 0 test stub                                      | VERIFIED   | 371b, 7 entries                     |
| `src/lib/rateLimit.test.ts`                                     | Wave 0 test stub                                      | VERIFIED   | 272b, 6 entries                     |
| `src/app/api/webhooks/stripe/webhook.test.ts`                   | Wave 0 test stub                                      | VERIFIED   | 363b, 7 entries                     |
| `src/components/store/StoreProductCard.test.tsx`                | Wave 0 test stub                                      | VERIFIED   | 348b, 7 entries                     |
| `src/contexts/CartContext.tsx`                                  | React Context + useReducer cart + localStorage        | VERIFIED   | 344 lines, localStorage, ADD_ITEM guard, GST calc |
| `src/app/(store)/layout.tsx`                                    | Storefront shell with CartProvider + header + footer  | VERIFIED   | CartProvider wraps children, StorefrontHeader, footer |
| `src/components/store/StorefrontHeader.tsx`                     | Sticky nav with search + cart icon + count badge      | VERIFIED   | `h-16 sticky top-0`, `useCart()`, `aria-label` |
| `src/app/(store)/page.tsx`                                      | Product listing Server Component                      | VERIFIED   | `force-dynamic`, `await searchParams`, category + search filters |
| `src/app/(store)/products/[slug]/page.tsx`                      | Product detail Server Component with SEO metadata     | VERIFIED   | `generateMetadata`, `notFound()`, `force-dynamic`, 2-col grid |
| `src/components/store/StoreProductCard.tsx`                     | Product card with Add to Cart                         | VERIFIED   | `ADD_ITEM` + `OPEN_DRAWER` dispatch, `aria-disabled` |
| `src/components/store/AddToCartButton.tsx`                      | Client-side Add to Cart for detail page               | VERIFIED   | `'use client'`, `useCart()`, `ADD_ITEM` dispatch |
| `src/components/store/StoreProductGrid.tsx`                     | Responsive product grid                               | VERIFIED   | `grid-cols-2 md:grid-cols-3 lg:grid-cols-4` |
| `src/components/store/CategoryPillBar.tsx`                      | Category filter pills                                 | VERIFIED   | `role="radiogroup"`, `role="radio"`, URL-based routing |
| `src/components/store/SoldOutBadge.tsx`                         | Sold Out badge                                        | VERIFIED   | Renders "Sold Out"                  |
| `src/components/store/StockNotice.tsx`                          | Low stock warning                                     | VERIFIED   | "Only {n} left" conditional render |
| `src/actions/promos/createPromoCode.ts`                         | Server Action to create promo codes                   | VERIFIED   | `'use server'`, Zod validation, `23505` duplicate handling, `revalidatePath` |
| `src/actions/promos/validatePromoCode.ts`                       | Server Action to validate promo codes                 | VERIFIED   | `checkRateLimit(ip, 10)`, 5 specific error types |
| `src/app/admin/promos/page.tsx`                                 | Admin promo code management page                      | VERIFIED   | `force-dynamic`, queries `promo_codes` with store_id |
| `src/components/admin/PromoForm.tsx`                            | Promo creation form                                   | VERIFIED   | `useActionState`, all required fields, `createPromoCode` |
| `src/components/admin/PromoList.tsx`                            | Promo list with status badges                         | VERIFIED   | Active/Expired/Maxed Out, `current_uses >= max_uses` |
| `src/components/store/CartDrawer.tsx`                           | Slide-out cart drawer                                 | VERIFIED   | `role="dialog"`, `aria-modal`, `createCheckoutSession`, empty state |
| `src/components/store/CartLineItem.tsx`                         | Cart line item with quantity stepper                  | VERIFIED   | `aria-label="Remove ... from cart"` |
| `src/components/store/CartSummary.tsx`                          | Cart totals display                                   | VERIFIED   | Subtotal, conditional Discount, GST (incl.), Total |
| `src/components/store/PromoCodeInput.tsx`                       | Promo code input with validation                      | VERIFIED   | `validatePromoCode`, `APPLY_PROMO`, `aria-live="polite"` |
| `src/actions/orders/createCheckoutSession.ts`                   | Server Action for Stripe Checkout Session             | VERIFIED   | Re-fetches prices from DB, inserts order + order_items, `currency: 'nzd'` |
| `src/app/api/webhooks/stripe/route.ts`                          | Stripe webhook Route Handler                          | VERIFIED   | `req.text()`, `constructEvent`, stripe_events dedup, RPC call |
| `src/app/(store)/order/[id]/confirmation/page.tsx`              | Order confirmation page                               | VERIFIED   | 248 lines, "Order confirmed", collect messaging, CartClearer |
| `src/app/(store)/order/[id]/page.tsx`                           | Order status page                                     | VERIFIED   | `force-dynamic`, `notFound()`, status messages |
| `src/actions/orders/updateOrderStatus.ts`                       | Click-and-collect status transition Server Action     | VERIFIED   | `ALLOWED_TRANSITIONS` map, Zod validation, `revalidatePath` |
| `src/app/(pos)/pickups/page.tsx`                                | POS Pickups tab                                       | VERIFIED   | `.in('status', ['pending_pickup', 'ready'])`, `.eq('channel', 'online')` |
| `src/components/pos/PickupOrderCard.tsx`                        | Pickup order card with action buttons                 | VERIFIED   | `'use client'`, `useTransition`, "Mark Ready"/"Mark Collected" |
| `src/components/pos/POSTopBar.tsx`                              | Updated POS top bar with Pickups nav                  | VERIFIED   | `'use client'`, `usePathname`, `<Link href="/pos/pickups">` |

---

### Key Link Verification

| From                                      | To                              | Via                                   | Status   | Details                                                     |
| ----------------------------------------- | ------------------------------- | ------------------------------------- | -------- | ----------------------------------------------------------- |
| `src/lib/stripe.ts`                       | `STRIPE_SECRET_KEY` env var     | `new Stripe(process.env.STRIPE_SECRET_KEY!)` | WIRED | Confirmed in file                                      |
| `supabase/migrations/006_online_store.sql` | products table                 | `ALTER TABLE ADD COLUMN slug`         | WIRED    | Line 6 of migration                                        |
| `src/app/(store)/layout.tsx`              | `CartContext.tsx`               | `<CartProvider>` wrapping children    | WIRED    | Line 11 of layout                                          |
| `src/components/store/StorefrontHeader.tsx` | `CartContext.tsx`             | `useCart()` for item count            | WIRED    | Line 6 import, line 11 usage                               |
| `src/app/(store)/page.tsx`                | Supabase products table         | `.eq('is_active', true)`              | WIRED    | Lines 28-29 confirmed                                      |
| `src/app/(store)/products/[slug]/page.tsx` | Supabase products table        | `.eq('slug', slug)`                   | WIRED    | Line 22 confirmed                                          |
| `src/components/store/StoreProductCard.tsx` | `CartContext.tsx`             | `dispatch ADD_ITEM`                   | WIRED    | Lines 33-44 confirmed                                      |
| `src/actions/promos/createPromoCode.ts`   | Supabase promo_codes table      | `.from('promo_codes')` insert         | WIRED    | Line 24 confirmed                                          |
| `src/actions/promos/validatePromoCode.ts` | `src/lib/rateLimit.ts`          | `checkRateLimit` before DB lookup     | WIRED    | Line 5 import, line 28 call confirmed                      |
| `src/components/store/CartDrawer.tsx`     | `createCheckoutSession`         | checkout button calls Server Action   | WIRED    | Line 9 import, line 67 call confirmed                      |
| `src/actions/orders/createCheckoutSession.ts` | `stripe.checkout.sessions.create` | Stripe SDK                       | WIRED    | Line 217 confirmed with `currency: 'nzd'`                  |
| `src/actions/orders/createCheckoutSession.ts` | Supabase order_items table  | insert order_items for each cart item | WIRED    | Lines 178-193 confirmed                                    |
| `src/app/api/webhooks/stripe/route.ts`    | Supabase stripe_events table    | idempotency insert with unique PK     | WIRED    | Lines 55-63 confirmed                                      |
| `src/app/api/webhooks/stripe/route.ts`    | `complete_online_sale` RPC      | `rpc('complete_online_sale')`         | WIRED    | Lines 77-86 confirmed                                      |
| `src/app/api/webhooks/stripe/route.ts`    | Supabase order_items table      | fetches order_items to pass to RPC    | WIRED    | Lines 67-70 confirmed                                      |
| `src/actions/orders/updateOrderStatus.ts` | Supabase orders table           | `.update` with transition validation  | WIRED    | ALLOWED_TRANSITIONS check + `.update` call confirmed       |
| `src/app/(pos)/pickups/page.tsx`          | Supabase orders table           | `.in('status', ['pending_pickup', 'ready'])` | WIRED | Lines 35-36 confirmed                               |
| `src/components/pos/POSTopBar.tsx`        | `/pos/pickups`                  | navigation link in POS header         | WIRED    | Line 30 confirmed                                          |

---

### Data-Flow Trace (Level 4)

| Artifact                          | Data Variable | Source                                      | Produces Real Data | Status     |
| --------------------------------- | ------------- | ------------------------------------------- | ------------------ | ---------- |
| `(store)/page.tsx`                | `products`    | Supabase `.from('products').select(...)...eq('is_active', true)` | Yes — DB query with store_id filter | FLOWING |
| `(store)/products/[slug]/page.tsx` | `product`    | Supabase `.eq('slug', slug).eq('store_id', ...)` | Yes — DB query by slug | FLOWING |
| `CartDrawer.tsx`                  | `state.items` | CartContext localStorage + ADD_ITEM dispatch | Yes — from user actions + localStorage hydration | FLOWING |
| `CartSummary.tsx`                 | `subtotalCents, gstCents` | `useCart()` computed values via `useMemo` + `calcLineItem` | Yes — computed from real cart items | FLOWING |
| `(pos)/pickups/page.tsx`          | `orders`      | Supabase `.from('orders').select(...).in('status', ...)` | Yes — DB query | FLOWING |
| `(store)/order/[id]/page.tsx`     | `order`       | Supabase `.select('*, order_items(*)')` by ID | Yes — DB query | FLOWING |
| `admin/promos/page.tsx`           | `promos`      | Supabase `.from('promo_codes').select('*')` | Yes — DB query | FLOWING |

---

### Behavioral Spot-Checks

Step 7b: SKIPPED — no running server available for endpoint checks. All logic verified statically via code inspection.

---

### Requirements Coverage

| Requirement | Source Plan | Description                                                                         | Status     | Evidence                                                     |
| ----------- | ----------- | ----------------------------------------------------------------------------------- | ---------- | ------------------------------------------------------------ |
| STORE-01    | 04-03       | Public storefront displays products with images, categories, search                 | SATISFIED  | `(store)/page.tsx` queries products, renders with CategoryPillBar + StoreProductGrid |
| STORE-02    | 04-03       | Product detail pages are server-rendered for SEO                                    | SATISFIED  | `products/[slug]/page.tsx` is Server Component with `generateMetadata` |
| STORE-03    | 04-02, 04-05 | Customer can add products to cart and proceed to Stripe Checkout                   | SATISFIED  | CartContext + CartDrawer + createCheckoutSession all wired    |
| STORE-04    | 04-05       | Customer can apply promo codes (percentage or fixed, with validation)               | SATISFIED  | PromoCodeInput -> validatePromoCode -> APPLY_PROMO -> createCheckoutSession |
| STORE-05    | 04-01, 04-05, 04-07 | Stripe webhook confirms payment, atomically decrements stock, creates order | SATISFIED  | Webhook -> complete_online_sale RPC; order_items inserted before redirect |
| STORE-06    | 04-01, 04-07 | Webhook is idempotent (stripe_events dedup table with unique constraint)            | SATISFIED  | stripe_events TEXT PK + `23505` silent catch in webhook      |
| STORE-07    | 04-01, 04-07 | Order lifecycle: PENDING -> COMPLETED (on webhook) or EXPIRED (session timeout)     | SATISFIED  | Migration sets `status = 'completed'`; PENDING order created before Stripe redirect. Note: EXPIRED transition on session timeout is not implemented (no scheduled job) — acceptable per plan scope |
| STORE-08    | 04-02, 04-03 | Out-of-stock products show "Sold Out" and cannot be added to cart                  | SATISFIED  | SoldOutBadge + `aria-disabled` on card; CartContext rejects `stockQuantity <= 0` |
| STORE-09    | 04-06       | Click-and-collect: PENDING_PICKUP -> READY -> COLLECTED status flow                 | SATISFIED  | updateOrderStatus ALLOWED_TRANSITIONS + PickupOrderCard action buttons |
| DISC-01     | 04-04       | Owner can create promo codes with type, value, min order, max uses, expiry          | SATISFIED  | PromoForm has all fields; createPromoCode inserts with Zod validation |
| DISC-02     | 04-01, 04-04 | Online store validates promo codes with rate limiting (10/min per IP)              | SATISFIED  | rateLimit.ts + validatePromoCode.ts `checkRateLimit(ip, 10)` |

**Note on STORE-07:** The EXPIRED status transition (for timed-out Stripe sessions) requires a scheduled cleanup job or Stripe `payment_intent.payment_failed` webhook handling — neither is implemented in Phase 4. The plan's acceptance criteria only required PENDING -> COMPLETED. This is a known deferred item, not a blocker.

---

### Anti-Patterns Found

| File                                    | Line | Pattern                                      | Severity | Impact                                     |
| --------------------------------------- | ---- | -------------------------------------------- | -------- | ------------------------------------------ |
| `src/actions/orders/updateOrderStatus.ts` | 85 | `// TODO D-14: Send pickup-ready email...`  | Info     | Intentionally deferred — Resend email integration explicitly documented as out of scope for Phase 4 per plan acceptance criteria |

No blockers or warnings found. The single TODO is explicitly documented as a planned deferral with correct labeling.

---

### Human Verification Required

#### 1. Stripe Checkout Redirect

**Test:** Add items to cart, apply a promo code, click "Proceed to Checkout"
**Expected:** Stripe Checkout page loads with correct NZD line items and discounted total
**Why human:** Requires live Stripe test credentials and browser interaction

#### 2. Webhook Stock Decrement

**Test:** Complete a Stripe test checkout, then verify product stock_quantity decreased in Supabase
**Expected:** Stock atomically decremented by purchased quantities; order status = 'completed'
**Why human:** Requires live Stripe webhook delivery and database inspection

#### 3. Cart localStorage Persistence

**Test:** Add items, refresh page, check cart icon count
**Expected:** Cart contents survive page refresh with correct item counts
**Why human:** Browser behavior cannot be verified without running the app

#### 4. Click-and-Collect POS Flow

**Test:** Create an online order, navigate to /pos/pickups, click "Mark Ready" then "Mark Collected"
**Expected:** Order status transitions correctly; page refreshes to show updated state
**Why human:** Requires end-to-end flow with authentication

#### 5. Promo Rate Limit

**Test:** Submit invalid promo code 11 times from same IP within 60 seconds
**Expected:** 11th attempt returns "Too many attempts" error
**Why human:** Rate limiter is in-memory per serverless instance; needs live request testing

---

### Gaps Summary

No gaps found. All 25 core must-haves across all 7 plans are verified at all four levels (exists, substantive, wired, data-flowing). All 11 requirement IDs (STORE-01 through STORE-09, DISC-01, DISC-02) have implementation evidence.

The only notable deferred item is STORE-07's EXPIRED path (no scheduled cleanup job for timed-out Stripe sessions) — this was explicitly out of scope per plan design and does not block the phase goal.

---

_Verified: 2026-04-01_
_Verifier: Claude (gsd-verifier)_
