# Roadmap: NZPOS

## Overview

Six sequential phases build the complete NZ retail POS system. The order is non-negotiable: each layer consumes the one before it. Foundation establishes the schema, auth plumbing, and GST utilities that every subsequent phase depends on. Product Catalog provides the inventory both surfaces need. POS Checkout and Online Store deliver the two revenue channels in parallel-ready sequence. Admin & Reporting makes the owner's job manageable. Xero Integration completes the NZ accounting loop. The result: a store owner can ring up a sale in-store and take an order online, from a single inventory, with GST handled correctly.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation** - Scaffold, schema, auth plumbing, GST module, Zod schemas, CI/CD, PWA manifest
- [ ] **Phase 2: Product Catalog** - Owner CRUD for products and categories, image uploads, CSV import
- [x] **Phase 3: POS Checkout** - Staff PIN auth, iPad product grid, cart with discounts, EFTPOS confirmation, atomic sale (completed 2026-04-01)
- [ ] **Phase 4: Online Store** - Public storefront, Stripe checkout, promo codes, webhooks, click-and-collect
- [ ] **Phase 5: Admin & Reporting** - Owner dashboard, order management, refunds, cash-up, reporting, low stock alerts
- [ ] **Phase 6: Xero Integration** - OAuth connect, daily sales sync, GST breakdown, token management

## Phase Details

### Phase 1: Foundation
**Goal**: The technical skeleton is in place — every subsequent phase builds on a proven, secure base
**Depends on**: Nothing (first phase)
**Requirements**: FOUND-01, FOUND-02, FOUND-03, FOUND-04, FOUND-05, FOUND-06, FOUND-07, AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, DEPLOY-01, DEPLOY-02
**Success Criteria** (what must be TRUE):
  1. Next.js app scaffolds cleanly, deploys to Vercel, and Supabase migrations run via CI without manual steps
  2. Owner can sign up with email/password; staff can log in with a 4-digit PIN; wrong PIN locks out after 10 attempts in 5 minutes
  3. RLS policies prevent any row from being returned unless the JWT's store_id matches — verified by a failing test that queries with a mismatched store_id
  4. GST calculation module returns IRD-correct values for a suite of test cases including discounted line items and fractional-cent rounding
  5. iPad can install the app as a PWA (standalone fullscreen, home screen icon visible)
**Plans:** 3/5 plans executed
Plans:
- [x] 01-01-PLAN.md — Scaffold Next.js 16 with dependencies, Tailwind v4 design system, Vitest
- [x] 01-02-PLAN.md — Supabase schema, RLS policies, custom JWT auth hook, client utilities
- [x] 01-03-PLAN.md — GST calculation module (TDD), money formatting, Zod validation schemas
- [x] 01-04-PLAN.md — Owner signup/signin, staff PIN auth with lockout, middleware, seed data
- [x] 01-05-PLAN.md — PWA manifest with icons, GitHub Actions CI/CD pipeline
**UI hint**: yes

### Phase 2: Product Catalog
**Goal**: The owner can build and maintain the store's product inventory through the admin UI
**Depends on**: Phase 1
**Requirements**: PROD-01, PROD-02, PROD-03, PROD-04, PROD-05, PROD-06
**Success Criteria** (what must be TRUE):
  1. Owner can create a product with name, SKU, price, category, stock quantity, and reorder threshold; product appears immediately in the admin product list
  2. Owner can upload a product image; image displays in the admin product list
  3. Owner can edit any product field and deactivate a product; deactivated products no longer appear in active listings
  4. Owner can import a CSV of 500+ products; duplicates (by SKU) are skipped with a preview diff shown before committing
  5. Owner can create, rename, and reorder product categories
**Plans:** 2/5 plans executed
Plans:
- [x] 02-01-PLAN.md — Infrastructure setup, admin shell, and category CRUD with drag-and-drop
- [x] 02-02-PLAN.md — Product CRUD Server Actions and image upload with sharp resize
- [x] 02-03-PLAN.md — Product list page with data table, search, filters, and form drawer
- [x] 02-04-PLAN.md — CSV import: parsing, validation, batch import, and 3-step UI flow
- [x] 02-05-PLAN.md — Gap closure: wire CSVImportFlow into ProductsPageClient (PROD-04)
**UI hint**: yes

### Phase 3: POS Checkout
**Goal**: Staff can complete an in-store sale from product selection to payment recording, with inventory updating atomically
**Depends on**: Phase 2
**Requirements**: POS-01, POS-02, POS-03, POS-04, POS-05, POS-06, POS-07, POS-08, POS-09, DISC-03, DISC-04
**Success Criteria** (what must be TRUE):
  1. Staff can log in with PIN, see the product grid filtered by category, tap products to add to cart, and adjust quantities
  2. Staff can apply a percentage or fixed-amount discount to any line item; the cart recalculates GST per-line on the discounted amount and shows the correct subtotal, GST, and total
  3. For EFTPOS: a full-screen confirmation step asks "Did the terminal show APPROVED?" — answering No voids the sale; answering Yes records it and decrements stock atomically
  4. After each completed sale the product grid reflects updated stock counts without a manual refresh
  5. Out-of-stock products show a warning on the grid; owner override is available to respond anyway
**Plans:** 6/6 plans complete
Plans:
- [x] 03-01-PLAN.md — Cart logic module (TDD), Supabase RPC migration, completeSale Server Action
- [x] 03-02-PLAN.md — POS page Server Component, product grid with categories, search, stock badges
- [x] 03-03-PLAN.md — Cart panel with line items, quantity controls, summary, payment toggle, pay button
- [x] 03-04-PLAN.md — Discount sheet, EFTPOS confirmation, cash entry, out-of-stock override, sale summary + full wiring
- [x] 03-05-PLAN.md — Integration testing, edge case fixes, visual verification checkpoint
- [x] 03-06-PLAN.md — Gap closure: build PIN login UI (staff selector, PIN pad, form submission)
**UI hint**: yes

### Phase 4: Online Store
**Goal**: Customers can browse products, checkout with Stripe, and collect their order in-store; inventory stays in sync with the POS
**Depends on**: Phase 2
**Requirements**: STORE-01, STORE-02, STORE-03, STORE-04, STORE-05, STORE-06, STORE-07, STORE-08, STORE-09, DISC-01, DISC-02
**Success Criteria** (what must be TRUE):
  1. Public storefront loads server-rendered product pages with images and categories; pages are indexable (view-source shows product content)
  2. Customer can add products to cart, apply a valid promo code, and be redirected to Stripe Checkout; invalid or expired codes show an error
  3. After Stripe payment succeeds, stock decrements atomically and an order record is created; replaying the same Stripe event a second time does not create a duplicate order or decrement stock again
  4. Sold-out products display "Sold Out" and cannot be added to cart by any customer
  5. Staff can update a click-and-collect order through PENDING_PICKUP -> READY -> COLLECTED; the status is visible to the owner in the admin order list
**Plans:** 4/7 plans executed
Plans:
- [x] 04-01-PLAN.md — Schema fixes, online store migration, server utilities, Wave 0 test stubs
- [x] 04-02-PLAN.md — Cart context with localStorage persistence, storefront layout and header
- [x] 04-03-PLAN.md — Product listing page, product detail page, category pills, search, sold-out handling
- [x] 04-04-PLAN.md — Promo code CRUD admin page, validate Server Action with rate limiting
- [ ] 04-05-PLAN.md — Cart drawer UI components, createCheckoutSession Server Action
- [ ] 04-06-PLAN.md — Click-and-collect status transitions, POS Pickups tab with navigation
- [ ] 04-07-PLAN.md — Stripe webhook handler with idempotency, order confirmation and status pages
**UI hint**: yes

### Phase 5: Admin & Reporting
**Goal**: The owner has a single place to manage orders, handle end-of-day reconciliation, view sales performance, and process refunds
**Depends on**: Phase 3, Phase 4
**Requirements**: ADMIN-01, ADMIN-02, ADMIN-03, ADMIN-04, ADMIN-05, ADMIN-06, ADMIN-07, REF-01, REF-02
**Success Criteria** (what must be TRUE):
  1. Owner dashboard shows today's sales total and order count split by channel (POS vs online), and flags any products below their reorder threshold
  2. Owner can run end-of-day cash-up: report shows totals by payment method, expected cash vs actual float entered, and the variance
  3. Owner can view a sales report for any date range showing daily totals, top products by revenue, and current stock levels
  4. Owner can view GST period summary with per-line breakdown suitable for IRD filing
  5. Owner can process a full refund on any order; refunded orders appear with refund status in the order list and in reporting
**Plans**: TBD
**UI hint**: yes

### Phase 6: Xero Integration
**Goal**: Daily sales sync to Xero runs automatically so the owner's accounting is always current without manual data entry
**Depends on**: Phase 5
**Requirements**: XERO-01, XERO-02, XERO-03, XERO-04, XERO-05, XERO-06
**Success Criteria** (what must be TRUE):
  1. Owner can connect their Xero account via OAuth from the admin dashboard; tokens are stored in Supabase Vault (not plain columns)
  2. Previous day's sales sync to Xero automatically overnight as a single invoice with correct GST breakdown; sync appears in the admin sync log with success/fail status and invoice ID
  3. Owner can trigger a manual sync from the dashboard and see the result immediately
  4. If the Xero token expires or the connection breaks, the admin dashboard shows a visible warning and the owner can reconnect without contacting support
**Plans**: TBD
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 3/5 | In Progress|  |
| 2. Product Catalog | 2/5 | In Progress|  |
| 3. POS Checkout | 6/6 | Complete   | 2026-04-01 |
| 4. Online Store | 3/7 | In Progress|  |
| 5. Admin & Reporting | 0/TBD | Not started | - |
| 6. Xero Integration | 0/TBD | Not started | - |
