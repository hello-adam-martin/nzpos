# Roadmap: NZPOS

## Milestones

- ✅ **v1.0 MVP** — Phases 1-6 (shipped 2026-04-02). [Archive](milestones/v1.0-ROADMAP.md)
- ✅ **v2.0 SaaS Platform** — Phases 7-16 (shipped 2026-04-03). [Archive](milestones/v2.0-ROADMAP.md)
- ✅ **v2.1 Hardening & Documentation** — Phases 17-20 (shipped 2026-04-04). [Archive](milestones/v2.1-ROADMAP.md)
- ✅ **v3.0 Inventory Management** — Phases 21-23 (shipped 2026-04-05). [Archive](milestones/v3.0-ROADMAP.md)
- ✅ **v4.0 Admin Platform** — Phases 24-27 (shipped 2026-04-06)
- ✅ **v5.0 Marketing & Landing Page** — Phase 28 (shipped 2026-04-06)
- 🚧 **v6.0 Free Email Notifications** — Phases 29-31 (in progress)

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
<summary>✅ v2.0 SaaS Platform (Phases 7-16) — SHIPPED 2026-04-03</summary>

- [x] Phase 7: Production Launch (3/3 plans) — completed 2026-04-02
- [x] Phase 8: Checkout Speed (3/3 plans) — completed 2026-04-02
- [x] Phase 9: Notifications (4/4 plans) — completed 2026-04-02
- [x] Phase 10: Customer Accounts (3/3 plans) — completed 2026-04-02
- [x] Phase 11: Partial Refunds (2/2 plans) — completed 2026-04-02
- [x] Phase 12: Multi-Tenant Infrastructure (4/4 plans) — completed 2026-04-02
- [x] Phase 13: Merchant Self-Serve Signup (3/3 plans) — completed 2026-04-03
- [x] Phase 14: Store Setup Wizard + Marketing (3/3 plans) — completed 2026-04-03
- [x] Phase 15: Stripe Billing + Feature Gating (4/4 plans) — completed 2026-04-03
- [x] Phase 16: Super Admin Panel (4/4 plans) — completed 2026-04-03

</details>

<details>
<summary>✅ v2.1 Hardening & Documentation (Phases 17-20) — SHIPPED 2026-04-04</summary>

- [x] Phase 17: Security Audit (5/5 plans) — completed 2026-04-03
- [x] Phase 18: Code Quality + Test Coverage (4/4 plans) — completed 2026-04-04
- [x] Phase 19: Developer Documentation (3/3 plans) — completed 2026-04-04
- [x] Phase 20: Deployment + User Documentation (2/2 plans) — completed 2026-04-04

</details>

<details>
<summary>✅ v3.0 Inventory Management (Phases 21-23) — SHIPPED 2026-04-05</summary>

- [x] Phase 21: Service Product Type + Free-Tier Simplification (3/3 plans) — completed 2026-04-04
- [x] Phase 22: Inventory Add-on Core (5/5 plans) — completed 2026-04-04
- [x] Phase 23: Feature Gating + POS/Storefront Integration (3/3 plans) — completed 2026-04-04

</details>

<details>
<summary>✅ v4.0 Admin Platform (Phases 24-27) — SHIPPED 2026-04-06</summary>

- [x] **Phase 24: Staff RBAC Foundation** — completed 2026-04-04
- [x] **Phase 25: Admin Operational UI** — completed 2026-04-05
- [x] **Phase 26: Super-Admin Billing + User Management** — completed 2026-04-05
- [x] **Phase 27: Super-Admin Analytics** — completed 2026-04-06

</details>

<details>
<summary>✅ v5.0 Marketing & Landing Page (Phase 28) — SHIPPED 2026-04-06</summary>

- [x] **Phase 28: Marketing Landing Page** — completed 2026-04-06

</details>

### v6.0 Free Email Notifications (In Progress)

**Milestone Goal:** Move email notifications from paid add-on to free tier so every store gets order confirmations, pickup alerts, and daily summaries out of the box.

- [ ] **Phase 29: Backend & Billing Cleanup** - Remove feature gates, update auth hook, migration, provisioning, Stripe billing cleanup
- [ ] **Phase 30: Admin UI & Super Admin** - Remove email from billing page, upgrade prompts, super admin actions, update tests
- [ ] **Phase 31: Marketing Pages** - Update pricing, add-ons hub, remove email detail page, update grid layout

## Phase Details

<details>
<summary>v4.0 Phase Details (shipped)</summary>

### Phase 24: Staff RBAC Foundation
**Goal**: Store owners can manage their staff roster and the system enforces role-based permissions so managers have appropriate access without owner-level control
**Depends on**: Phase 23
**Requirements**: STAFF-01, STAFF-02, STAFF-03, STAFF-04, STAFF-05, STAFF-06
**Success Criteria** (what must be TRUE):
  1. Admin can view, add, edit, deactivate, and reset PIN for any staff member from the staff management page
  2. A deactivated staff member cannot log in to the POS — their PIN is rejected immediately
  3. Manager role can process refunds and view reports but cannot access product management, staff management, or store settings
  4. After a staff member's role is changed, the new permissions take effect on their next action (stale JWT role never authorises a write)
  5. PIN reset shows the new PIN exactly once and confirms it is not recoverable after dismissal
**Plans**: 3 plans
Plans:
- [x] 24-01-PLAN.md — Foundation: DB migration, roles constant, PIN utility, Zod schemas, resolveStaffAuthVerified
- [x] 24-02-PLAN.md — Server Actions + Middleware: staff CRUD actions, manager admin access, processPartialRefund extension
- [x] 24-03-PLAN.md — Admin UI: staff page, table, modals, AdminSidebar role filtering
**UI hint**: yes

### Phase 25: Admin Operational UI
**Goal**: Admins can manage customers and promos, view an enriched dashboard with trend charts, and configure all store settings including receipt text and compliance details
**Depends on**: Phase 24
**Requirements**: CUST-01, CUST-02, CUST-03, CUST-04, PROMO-01, PROMO-02, SETTINGS-01, SETTINGS-02, SETTINGS-03, DASH-01, DASH-02, DASH-03
**Success Criteria** (what must be TRUE):
  1. Admin can search for a customer by name or email and open their detail page showing full order history
  2. Admin can disable a customer account so they cannot log in to the storefront
  3. Admin can edit an existing promo code's discount, expiry, and limits, or soft-delete it so it stops working without losing historical data
  4. Admin dashboard shows a 7-day or 30-day sales trend chart and a period-comparison row (today vs yesterday, this week vs last week)
  5. Admin dashboard shows a recent orders widget with the last 5 orders and their statuses
  6. Admin can save business address, phone, IRD/GST number, and receipt header/footer from the settings page
**Plans**: 3 plans
Plans:
- [x] 25-01-PLAN.md — Migration, store settings forms, promo edit/delete, AdminSidebar Customers link
- [x] 25-02-PLAN.md — Dashboard enhancement: sales trend chart, comparison cards, recent orders widget
- [x] 25-03-PLAN.md — Customer management: list, search, detail page, disable/enable accounts
**UI hint**: yes

### Phase 26: Super-Admin Billing + User Management
**Goal**: Super-admin can see the health of the platform at a glance and drill into any tenant's billing status, payment failures, and account details without leaving the super-admin panel
**Depends on**: Phase 24
**Requirements**: SA-DASH-01, SA-DASH-02, SA-DASH-03, SA-BILL-01, SA-BILL-02, SA-BILL-03, SA-USER-01, SA-USER-02, SA-USER-03
**Success Criteria** (what must be TRUE):
  1. Super-admin dashboard shows total active tenants, suspended tenants, new signups this month, add-on adoption rates, and a 30-day signup trend chart
  2. Super-admin can open any tenant detail page and see their active Stripe subscriptions, recent invoices with payment status, and any past-due payment failure alerts
  3. Super-admin can see a merchant's owner email and signup date from the tenant detail page
  4. Super-admin can trigger a password reset email for any merchant account from the tenant detail page
  5. Super-admin can disable a merchant account, preventing the owner from logging in
**Plans**: 3 plans
Plans:
- [x] 26-01-PLAN.md — Migration, platform dashboard (stat cards + signup trend chart), sidebar nav, analytics stub
- [x] 26-02-PLAN.md — Tenant detail: Stripe billing sections (subscriptions, invoices, payment failure banner), owner info
- [x] 26-03-PLAN.md — User management: password reset + disable/enable account actions, modals, extended TenantDetailActions
**UI hint**: yes

### Phase 27: Super-Admin Analytics
**Goal**: Super-admin can track platform revenue health through an analytics page that shows accurate MRR, churn, and per-add-on revenue drawn from a materialised Stripe snapshot — not live API calls
**Depends on**: Phase 26
**Requirements**: SA-MRR-01, SA-MRR-02, SA-MRR-03, SA-MRR-04, SA-MRR-05
**Success Criteria** (what must be TRUE):
  1. Analytics page shows current MRR with annual plans correctly normalised to monthly amounts (a $120/year plan contributes $10/month)
  2. Analytics page shows MRR trend over the last 6 months as a chart
  3. Analytics page shows churn count (cancelled subscriptions this month) and revenue breakdown by add-on
  4. Page data comes from a local Supabase snapshot table, not the live Stripe API — page loads in under 2 seconds
  5. A daily sync job populates the snapshot table; an on-demand refresh button exists but is rate-limited to once per 5 minutes
**Plans**: 2 plans
Plans:
- [x] 27-01-PLAN.md — Stripe snapshot sync: migration, sync function, cron route, server action with rate limiting
- [x] 27-02-PLAN.md — Analytics page UI: stat cards, MRR trend chart, add-on revenue chart, sync controls
**UI hint**: yes

### Phase 28: Marketing Landing Page
**Goal**: Visitors to the root domain see a landing page that accurately showcases the full NZPOS platform — all major features, all three add-ons with correct pricing, and copy that reflects a mature SaaS product rather than an MVP
**Depends on**: Phase 27
**Requirements**: MKT-01, MKT-02, MKT-03, MKT-04, MKT-05, MKT-06, MKT-07, MKT-08, MKT-09
**Success Criteria** (what must be TRUE):
  1. Visitor can read a features section listing all major shipped capabilities (POS, online store, GST, inventory management, barcode scanning, customer accounts, staff management, reporting, receipts, click-and-collect) — each with a title, description, and icon
  2. Visitor can see a pricing section listing all three add-ons (Xero $9/mo, Email Notifications $5/mo, Inventory Management $9/mo) with a clear free-tier feature list and per-add-on benefit lists
  3. Visitor reads hero copy and CTA sections that describe a mature multi-tenant SaaS POS platform, not a single-store MVP
  4. Page renders correctly on mobile, tablet, and desktop without horizontal scroll or broken layouts
  5. All sections use the project design system (deep navy #1E293B, amber #E67E22, Satoshi/DM Sans typography) with no visual regressions against DESIGN.md
**Plans**: 3 plans
Plans:
- [x] 28-01-PLAN.md — Hero/CTA copy rewrite + Nav anchor links
- [x] 28-02-PLAN.md — Features grouped rewrite (15 cards) + NZ Callout strip
- [x] 28-03-PLAN.md — Pricing fix (free tier + 3 add-ons) + page.tsx wiring

</details>

### Phase 29: Backend & Billing Cleanup
**Goal**: Email notifications work for every store without any feature gate check, billing integration, or subscription requirement — the system treats email as a core free feature
**Depends on**: Phase 28
**Requirements**: GATE-01, GATE-02, GATE-03, GATE-04, BILL-01, BILL-02, BILL-03
**Success Criteria** (what must be TRUE):
  1. A new store created via signup automatically has email notifications enabled — no subscription or manual activation required
  2. An existing store that never paid for email notifications now sends order confirmations, pickup-ready alerts, and daily summaries without any action from the owner
  3. The ADDONS config and Stripe price mappings contain only Xero and Inventory Management — email_notifications is absent
  4. Creating a Stripe checkout session for add-ons never offers email notifications as an option
  5. Stripe billing webhooks process subscription events without toggling any email_notifications feature flag
**Plans**: 2 plans
Plans:
- [x] 29-01-PLAN.md — SQL migration (data fix, column default, auth hook rewrite) + email.ts gate removal
- [x] 29-02-PLAN.md — Remove email_notifications from config, billing actions, super admin actions, env, docs, and 7 test files

### Phase 30: Admin UI & Super Admin
**Goal**: Admin and super-admin interfaces reflect that email notifications are a free built-in feature — no billing cards, upgrade prompts, or toggle actions reference email notifications
**Depends on**: Phase 29
**Requirements**: ADMIN-01, ADMIN-02, ADMIN-03, TEST-01
**Success Criteria** (what must be TRUE):
  1. Admin billing/add-ons page shows exactly two add-on cards (Xero and Inventory Management) with no trace of email notifications
  2. UpgradePrompt components throughout the admin never suggest upgrading to get email notifications
  3. Super admin activate/deactivate addon actions list only Xero and Inventory Management — email_notifications cannot be toggled
  4. All existing tests pass with email notifications treated as always-on (no feature gate assertions for email)
**Plans**: TBD
**UI hint**: yes

### Phase 31: Marketing Pages
**Goal**: Public-facing marketing pages reflect the updated pricing model where email notifications are included free with every store, and only two paid add-ons exist
**Depends on**: Phase 29
**Requirements**: MKT-01, MKT-02, MKT-03, MKT-04, MKT-05
**Success Criteria** (what must be TRUE):
  1. Landing page pricing section shows exactly two paid add-on cards (Xero and Inventory Management) in a 2-column layout
  2. The free tier feature checklist on the pricing section includes "Email notifications" as a checked item
  3. The /add-ons hub page shows exactly two add-ons — no email notifications card
  4. Navigating to /add-ons/email-notifications returns a 404 or redirects (the detail page no longer exists)
  5. Add-on grids on both landing and hub pages use a balanced 2-column layout (not a 3-column with a gap)
**Plans**: TBD
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
| 7. Production Launch | v2.0 | 3/3 | Complete | 2026-04-02 |
| 8. Checkout Speed | v2.0 | 3/3 | Complete | 2026-04-02 |
| 9. Notifications | v2.0 | 4/4 | Complete | 2026-04-02 |
| 10. Customer Accounts | v2.0 | 3/3 | Complete | 2026-04-02 |
| 11. Partial Refunds | v2.0 | 2/2 | Complete | 2026-04-02 |
| 12. Multi-Tenant Infrastructure | v2.0 | 4/4 | Complete | 2026-04-02 |
| 13. Merchant Self-Serve Signup | v2.0 | 3/3 | Complete | 2026-04-03 |
| 14. Store Setup Wizard + Marketing | v2.0 | 3/3 | Complete | 2026-04-03 |
| 15. Stripe Billing + Feature Gating | v2.0 | 4/4 | Complete | 2026-04-03 |
| 16. Super Admin Panel | v2.0 | 4/4 | Complete | 2026-04-03 |
| 17. Security Audit | v2.1 | 5/5 | Complete | 2026-04-03 |
| 18. Code Quality + Test Coverage | v2.1 | 4/4 | Complete | 2026-04-04 |
| 19. Developer Documentation | v2.1 | 3/3 | Complete | 2026-04-04 |
| 20. Deployment + User Documentation | v2.1 | 2/2 | Complete | 2026-04-04 |
| 21. Service Product Type + Free-Tier Simplification | v3.0 | 3/3 | Complete | 2026-04-04 |
| 22. Inventory Add-on Core | v3.0 | 5/5 | Complete | 2026-04-04 |
| 23. Feature Gating + POS/Storefront Integration | v3.0 | 3/3 | Complete | 2026-04-04 |
| 24. Staff RBAC Foundation | v4.0 | 3/3 | Complete | 2026-04-04 |
| 25. Admin Operational UI | v4.0 | 3/3 | Complete | 2026-04-05 |
| 26. Super-Admin Billing + User Management | v4.0 | 3/3 | Complete | 2026-04-05 |
| 27. Super-Admin Analytics | v4.0 | 2/2 | Complete | 2026-04-06 |
| 28. Marketing Landing Page | v5.0 | 3/3 | Complete | 2026-04-06 |
| 29. Backend & Billing Cleanup | v6.0 | 2/2 | Complete    | 2026-04-06 |
| 30. Admin UI & Super Admin | v6.0 | 0/? | Not started | - |
| 31. Marketing Pages | v6.0 | 0/? | Not started | - |
