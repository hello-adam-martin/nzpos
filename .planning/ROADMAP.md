# Roadmap: NZPOS

## Milestones

- ✅ **v1.0 MVP** — Phases 1-6 (shipped 2026-04-02). [Archive](milestones/v1.0-ROADMAP.md)
- 🚧 **v1.1 Production Launch + Feature Waves** — Phases 7-11 (in progress)
- 🔲 **v2.0 SaaS Platform** — Phases 12-16 (planned)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1-6) — SHIPPED 2026-04-02</summary>

- [x] Phase 1: Foundation (5/5 plans) — completed 2026-04-01
- [x] Phase 2: Product Catalog (5/5 plans) — completed 2026-04-01
- [x] Phase 3: POS Checkout (6/6 plans) — completed 2026-04-01
- [x] Phase 4: Online Store (7/7 plans) — completed 2026-04-01
- [x] Phase 5: Admin & Reporting (6/6 plans) — completed 2026-04-01
- [x] Phase 6: Xero Integration (4/4 plans) — completed 2026-04-01

</details>

<details>
<summary>🚧 v1.1 Production Launch + Feature Waves (Phases 7-11) — In Progress</summary>

- [ ] **Phase 7: Production Launch** — Store is live on real infrastructure with real products (1/3 plans — DEPLOY-02/03/04 pending)
- [x] **Phase 8: Checkout Speed** — Barcode scanning and screen receipts at point of sale (completed 2026-04-02)
- [x] **Phase 9: Notifications** — Automated emails and sound alert for new online orders (completed 2026-04-02)
- [x] **Phase 10: Customer Accounts** — Customers can create accounts and view order history (completed 2026-04-02)
- [x] **Phase 11: Partial Refunds** — Staff can issue partial refunds with full audit trail (completed 2026-04-02)

</details>

### v2.0 SaaS Platform

- [x] **Phase 12: Multi-Tenant Infrastructure** — Wildcard subdomain routing, schema upgrades, and tenant-isolated RLS in place (completed 2026-04-02)
- [x] **Phase 13: Merchant Self-Serve Signup** — Any NZ business can sign up and get a working POS + storefront immediately (completed 2026-04-03)
- [x] **Phase 14: Store Setup Wizard + Marketing** — Merchants onboard in under 5 minutes and a public landing page drives signups (completed 2026-04-03)
- [x] **Phase 15: Stripe Billing + Feature Gating** — Paid add-ons are purchasable, enforced server-side, and self-manageable (completed 2026-04-03)
- [ ] **Phase 16: Super Admin Panel** — Platform operator can view, manage, and support all tenants

## Phase Details

### Phase 7: Production Launch
**Goal**: The store is live on real infrastructure, processing real payments, with real products loaded
**Depends on**: Phase 6 (v1.0 complete)
**Requirements**: DEPLOY-01, DEPLOY-02, DEPLOY-03, DEPLOY-04
**Success Criteria** (what must be TRUE):
  1. The storefront and admin dashboard are accessible at the production Vercel URL
  2. A real Stripe test transaction completes end-to-end in the production environment
  3. The product catalog contains 200+ SKUs with barcodes, categories, stock levels, and images
  4. The Supabase production database has the full schema and reference data loaded
**Plans**: 3 plans
Plans:
- [x] 07-01-PLAN.md — Stripe test mode banner + production env validation script
- [x] 07-02-PLAN.md — Supabase production setup + Vercel deployment
- [x] 07-03-PLAN.md — Stripe webhook configuration + product catalog import

### Phase 8: Checkout Speed
**Goal**: Staff can scan barcodes to add products instantly and customers see a receipt after every sale
**Depends on**: Phase 7
**Requirements**: SCAN-01, SCAN-02, RCPT-01, RCPT-02
**Success Criteria** (what must be TRUE):
  1. Pointing the iPad camera at an EAN-13 or UPC-A barcode adds the matching product to the cart
  2. Scanning an unknown barcode shows a clear error and focuses the search bar for manual lookup
  3. After a POS sale completes, a screen receipt displays with store info, line items, GST breakdown, total, and payment method
  4. The receipt data model is shared with the future physical printer path (no screen-only hardcoding)
**Plans**: 3 plans
Plans:
- [x] 08-01-PLAN.md — Receipt data types, database migration, schema updates
- [x] 08-02-PLAN.md — Barcode scanner (camera overlay, Quagga2, cart integration)
- [x] 08-03-PLAN.md — Receipt screen, completeSale wiring, admin View Receipt
**UI hint**: yes

### Phase 9: Notifications
**Goal**: Customers are automatically notified at key moments and the founder stays informed without checking the admin dashboard
**Depends on**: Phase 7
**Requirements**: NOTIF-01, NOTIF-02, NOTIF-03, NOTIF-04, NOTIF-05, NOTIF-06
**Success Criteria** (what must be TRUE):
  1. An online customer receives an email receipt within 60 seconds of Stripe payment confirming
  2. A POS customer who provides their email receives an email receipt after the sale
  3. A customer receives a pickup-ready email when their order status changes to "ready"
  4. The founder receives a daily summary email covering sales count, revenue split, top products, and stock warnings
  5. The iPad plays an audible sound within 30 seconds when a new online order arrives
**Plans**: 4 plans
Plans:
- [x] 09-01-PLAN.md — Email infrastructure + React Email templates (Resend SDK, sendEmail helper, 4 templates)
- [x] 09-02-PLAN.md — Email trigger wiring (Stripe webhook, POS receipt action, pickup-ready)
- [x] 09-03-PLAN.md — Daily summary cron handler (sales aggregation, low stock, vercel.json)
- [x] 09-04-PLAN.md — Order sound alert (polling endpoint, chime, badge, mute toggle, toast)
**UI hint**: yes

### Phase 10: Customer Accounts
**Goal**: Customers can create accounts on the storefront, log in, and view their order history
**Depends on**: Phase 7
**Requirements**: CUST-01, CUST-02, CUST-03, CUST-04, CUST-05, CUST-06
**Success Criteria** (what must be TRUE):
  1. A new customer can sign up with email and password on the storefront
  2. A returning customer can log in and see all their past orders
  3. A logged-in customer can update their name, email, and preferences
  4. The JWT auth hook injects customer role and store_id so RLS policies scope data correctly
  5. Visiting POS routes while logged in as a customer results in a block or redirect (no cross-role access)
  6. A customer can verify their email and reset a forgotten password
**Plans**: 3 plans
Plans:
- [x] 10-01-PLAN.md — Database migration (customers table, auth hook, RLS policies, order-linking RPC) + middleware customer blocking
- [x] 10-02-PLAN.md — Customer auth Server Actions (signup, signin, signout, verify, reset) + auth pages
- [x] 10-03-PLAN.md — StorefrontHeader integration, account pages (orders, profile), post-purchase prompt
**UI hint**: yes

### Phase 11: Partial Refunds
**Goal**: Staff can refund individual line items from any order, with stock restored and accounting updated
**Depends on**: Phase 10
**Requirements**: REFUND-01, REFUND-02, REFUND-03, REFUND-04, REFUND-05
**Success Criteria** (what must be TRUE):
  1. Staff can select one or more line items on a completed order to refund
  2. Stripe processes a partial refund for exactly the selected items' total amount
  3. Stock for each refunded line item is atomically restored to the product's available quantity
  4. A Xero credit note is generated for the partial refund amount
  5. The order record shows a full audit trail: which items were refunded, the amount, and the reason
**Plans**: 2 plans
Plans:
- [x] 11-01-PLAN.md — Database migration, Zod schema, processPartialRefund server action + tests
- [x] 11-02-PLAN.md — Partial refund UI (item selector, multi-step flow, drawer wiring, status badge/filter)
**UI hint**: yes

### Phase 12: Multi-Tenant Infrastructure
**Goal**: Any subdomain resolves to the correct tenant store, with schema and RLS guaranteeing data isolation before any tenant-aware feature is built
**Depends on**: Phase 11 (v1.1 in progress)
**Requirements**: TENANT-01, TENANT-02, TENANT-03, TENANT-04, TENANT-05
**Success Criteria** (what must be TRUE):
  1. Navigating to {slug}.domain.tld loads the correct store's storefront without any additional configuration
  2. A request with tenant A's session JWT cannot read or write tenant B's data even with direct API calls
  3. A super admin JWT claim (`is_super_admin`) grants cross-tenant read access without bypassing field-level RLS
  4. An E2E test suite asserts cross-tenant isolation: attempting tenant A's operations with tenant B's session returns 403 or empty results
  5. The `store_plans` table and `stores.stripe_customer_id` column exist and are ready for billing data
**Plans**: 4 plans
Plans:
- [x] 12-01-PLAN.md — Schema migration (stores.slug, store_plans, branding, super_admins) + seed update + middleware admin client
- [x] 12-02-PLAN.md — Middleware rewrite for subdomain tenant resolution with in-memory TTL cache
- [x] 12-03-PLAN.md — RLS policy full rewrite (unified pattern) + super admin auth hook extension
- [x] 12-04-PLAN.md — Cross-tenant isolation test suite (Vitest 4 attack vectors + Playwright E2E) + type regeneration
**UI hint**: no

### Phase 13: Merchant Self-Serve Signup
**Goal**: A merchant can visit the signup page, enter their email and store slug, and land on a working admin dashboard within minutes
**Depends on**: Phase 12
**Requirements**: SIGNUP-01, SIGNUP-02, SIGNUP-03, SIGNUP-04, SIGNUP-05
**Success Criteria** (what must be TRUE):
  1. A new merchant completes signup and is redirected to a working admin dashboard for their provisioned store
  2. If provisioning fails mid-flight (network error, DB error), the merchant sees a "provisioning failed — retry" screen rather than an empty or broken dashboard
  3. A merchant cannot access their dashboard until their email is verified
  4. Attempting to register with a reserved slug (admin, www, api, app) returns a clear validation error before any DB write
  5. Attempting to create a second store from the same verified email is blocked with a clear message
**Plans**: 3 plans
Plans:
- [x] 13-01-PLAN.md — Provisioning RPC migration, slug validation, rate limiter, Wave 0 tests
- [x] 13-02-PLAN.md — Server Actions (ownerSignup, checkSlug, retry, resend) + middleware email gate + auth callback
- [x] 13-03-PLAN.md — Signup form UI, provisioning screen, email verification screen
**UI hint**: yes

### Phase 14: Store Setup Wizard + Marketing
**Goal**: A newly provisioned merchant can configure their store in under 5 minutes, and a public landing page explains the product to prospective merchants
**Depends on**: Phase 13
**Requirements**: SETUP-01, SETUP-02, SETUP-03, MKTG-01, MKTG-02
**Success Criteria** (what must be TRUE):
  1. A new merchant is guided through a 3-step wizard (store name/slug, logo upload, first product) immediately after email verification
  2. Skipping any or all wizard steps still results in a usable admin dashboard with no broken states
  3. The admin dashboard shows a persistent setup checklist reflecting which wizard steps have been completed
  4. The marketing landing page renders in under 2 seconds on a mobile connection (statically rendered, no client-side data fetch)
  5. A visitor on the landing page can reach the signup form in one tap/click from the hero CTA
**Plans**: 3 plans
Plans:
- [x] 14-01-PLAN.md — Schema migration, Server Actions, logo route, middleware redirect, checklist utility
- [x] 14-02-PLAN.md — Wizard UI (3 steps), dashboard checklist banner, admin settings page
- [x] 14-03-PLAN.md — Static marketing landing page (hero, features, pricing, CTAs)
**UI hint**: yes

### Phase 15: Stripe Billing + Feature Gating
**Goal**: Merchants can subscribe to paid add-ons, the platform enforces access server-side, and merchants can self-serve their billing
**Depends on**: Phase 13
**Requirements**: BILL-01, BILL-02, BILL-03, BILL-04, BILL-05, BILL-06
**Success Criteria** (what must be TRUE):
  1. A merchant can subscribe to the Xero add-on or Email Notifications add-on via Stripe Checkout and the feature activates on return without any manual step
  2. Cancelling a subscription via the Stripe Customer Portal deactivates the feature within the same session (next JWT refresh)
  3. Attempting to use a gated Server Action (Xero sync, send email) without the matching active subscription returns an authorization error regardless of UI state
  4. A merchant without an active subscription sees a contextual upgrade prompt at each gated feature rather than a generic error
  5. The admin billing page shows the current plan, which add-ons are active, and a direct link to the Stripe Customer Portal
**Plans**: 4 plans
Plans:
- [x] 15-01-PLAN.md — Migration + requireFeature utility + add-on config
- [x] 15-02-PLAN.md — Billing webhook + subscription checkout + portal Server Actions
- [x] 15-03-PLAN.md — Feature gating on Xero/email actions + UpgradePrompt component
- [x] 15-04-PLAN.md — Billing page UI + admin sidebar + human verification
**UI hint**: yes

### Phase 16: Super Admin Panel
**Goal**: The platform operator can view all tenants, inspect their status, and take corrective action without touching the database directly
**Depends on**: Phase 15
**Requirements**: SADMIN-01, SADMIN-02, SADMIN-03, SADMIN-04
**Success Criteria** (what must be TRUE):
  1. A super admin can search and paginate a list of all tenants showing store name, plan status, and created date
  2. Clicking a tenant shows full detail: subscription status, active add-ons, created date, and last active timestamp
  3. A suspended tenant's storefront and admin dashboard return a 403 or suspension notice rather than normal content
  4. A tenant suspended by mistake can be unsuspended and their data is fully intact within the 30-day window
  5. A super admin can manually activate a paid add-on for a tenant without requiring a Stripe payment
**Plans**: 4 plans
Plans:
- [ ] 16-01-PLAN.md — Migration + Server Actions (suspend, unsuspend, activate, deactivate add-on)
- [ ] 16-02-PLAN.md — Middleware extension for super admin routes + suspension page routing
- [ ] 16-03-PLAN.md — Super admin layout, sidebar, tenant list, and tenant detail UI
- [ ] 16-04-PLAN.md — Human verification of complete super admin panel
**UI hint**: yes

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|---------------|--------|-----------|
| 1. Foundation | v1.0 | 5/5 | Complete | 2026-04-01 |
| 2. Product Catalog | v1.0 | 5/5 | Complete | 2026-04-01 |
| 3. POS Checkout | v1.0 | 6/6 | Complete | 2026-04-01 |
| 4. Online Store | v1.0 | 7/7 | Complete | 2026-04-01 |
| 5. Admin & Reporting | v1.0 | 6/6 | Complete | 2026-04-01 |
| 6. Xero Integration | v1.0 | 4/4 | Complete | 2026-04-01 |
| 7. Production Launch | v1.1 | 1/3 | In Progress | — |
| 8. Checkout Speed | v1.1 | 3/3 | Complete | 2026-04-02 |
| 9. Notifications | v1.1 | 4/4 | Complete | 2026-04-02 |
| 10. Customer Accounts | v1.1 | 3/3 | Complete | 2026-04-02 |
| 11. Partial Refunds | v1.1 | 2/2 | Complete | 2026-04-02 |
| 12. Multi-Tenant Infrastructure | v2.0 | 4/4 | Complete    | 2026-04-02 |
| 13. Merchant Self-Serve Signup | v2.0 | 3/3 | Complete    | 2026-04-03 |
| 14. Store Setup Wizard + Marketing | v2.0 | 3/3 | Complete   | 2026-04-03 |
| 15. Stripe Billing + Feature Gating | v2.0 | 4/4 | Complete    | 2026-04-03 |
| 16. Super Admin Panel | v2.0 | 0/4 | Not started | — |
