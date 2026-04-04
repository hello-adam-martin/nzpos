# Feature Research

**Domain:** Admin Platform — SaaS POS (Staff Management, Customer Management, Promo Editing, Store Settings, Admin Dashboard, Super-Admin Analytics, Billing Visibility, Merchant Impersonation)
**Researched:** 2026-04-05
**Confidence:** HIGH (existing schema verified in codebase; competitor patterns verified via WebSearch)

---

## Context: What Already Exists

These features are SHIPPED and must not be rebuilt:

- **Staff table** — `staff` table exists with `role IN ('owner', 'staff')`, `pin_hash`, `is_active`, `pin_attempts`, `pin_locked_until`. No `manager` role yet.
- **Customer accounts** — shipped in v2.0 (signup, login, order history, profile)
- **Promo creation** — `/admin/promos` page exists (create only, no edit/delete)
- **Store settings** — `/admin/settings` with branding only (name, logo, primary_color). No address, phone, IRD, receipt text, hours.
- **Admin dashboard** — `/admin/dashboard` exists (today's sales/orders — basic KPIs). No charts, no trend data, no comparison.
- **Super-admin tenant list** — `/super-admin/tenants` with suspend/unsuspend, add-on overrides, audit trail. No Stripe billing data, no analytics.

---

## Feature Landscape

### Table Stakes (Users Expect These)

These are features that any merchant or platform operator will expect as baseline functionality. Missing them makes the product feel incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Staff list with add/edit/deactivate | Standard in every POS (Square, Lightspeed, Vend all have this) | LOW | `staff` table already exists — this is UI only |
| Staff PIN reset | Staff forget PINs constantly; if only the DB can reset it, owner is blocked | LOW | Clear `pin_hash`, reset `pin_attempts`, `pin_locked_until` — no new schema |
| Role assignment (Owner/Manager/Staff) | Every POS has at least 2 tiers; manager needs void/discount permissions staff don't | MEDIUM | Requires `role` column to add `manager` CHECK constraint + permission gates on Server Actions |
| Customer list with search | Merchants need to find customers by name/email to assist with orders | LOW | `customers` table already exists from v2.0; this is a list/search UI |
| Customer order history view | Support query "show me all orders for this customer" | LOW | Join `orders` on `customer_id` — data exists, UI doesn't |
| Customer account disable/suspend | Merchants need to block abusive accounts | LOW | Flip `is_active` on customer record |
| Promo edit (code, discount, expiry) | Creating promos without being able to fix typos or adjust expiry is broken | LOW | Server Action update already follows same pattern as create; UI is a form |
| Promo delete / deactivate | Expired or mistaken promos clutter the list | LOW | Soft delete (`is_active = false`) preferred over hard delete |
| Store settings: business address + phone | Printed on receipts; required for IRD-compliant tax invoices | LOW | New columns on `stores` table; form in settings page |
| Store settings: IRD number | Required on GST tax invoices for NZ compliance (IRD rule: GST-registered businesses must show IRD number) | LOW | Single text column `ird_number` on `stores` |
| Store settings: receipt header/footer | Merchants add "Thanks for shopping!" or return policy text | LOW | Two text columns `receipt_header`, `receipt_footer` on `stores` |
| Super-admin: view tenant Stripe subscriptions | Platform operators must be able to see which add-ons a tenant pays for | MEDIUM | Stripe API: `stripe.subscriptions.list({ customer: stripeCustomerId })` — `stripe_customer_id` already on `stores` |
| Super-admin: view tenant invoices + payment status | Support needs to check if a tenant has a failed payment | MEDIUM | Stripe API: `stripe.invoices.list({ customer: stripeCustomerId })` |
| Super-admin: view payment failures | Failed payments that turn into churn must be visible | MEDIUM | Filter invoices by `status: 'open'` or `payment_intent.status: 'requires_payment_method'` |

### Differentiators (Competitive Advantage)

Features that add genuine value beyond baseline. Not expected but create loyalty.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Admin dashboard: sales trend chart (7-day/30-day) | Owner sees revenue trajectory at a glance, not just today's number | MEDIUM | Aggregate `orders` by date; recharts or lightweight chart library; Server Component data fetch |
| Admin dashboard: key metrics with comparison (vs prior period) | "Up 23% vs last week" is actionable; flat numbers aren't | MEDIUM | Two date-range queries; percentage delta calculation |
| Admin dashboard: recent orders widget | Quick visibility into last 5-10 orders without navigating to orders page | LOW | Simple query, already have order data |
| Super-admin: platform MRR calculation | Platform operator needs single number for MRR without paying for Baremetrics | HIGH | Must aggregate across all active Stripe subscriptions — either pull from Stripe API and compute, or use Stripe Sigma if budget allows. Stripe API is free but requires iterating subscriptions. |
| Super-admin: churn tracking | Know when merchants cancel and which add-ons they drop | HIGH | Track `customer.subscription.deleted` webhook events into a `churn_events` table; or pull from Stripe API with `status: 'canceled'` |
| Super-admin: add-on revenue breakdown | Which add-ons earn the most revenue? Informs pricing decisions | MEDIUM | Group active subscriptions by price/product ID; map to add-on name |
| Super-admin: new signups over time | Understand growth curve | LOW | Count `stores` by `created_at` date range — no Stripe needed |
| Merchant impersonation ("act as") | Support can debug merchant issues by seeing exactly what they see | HIGH | Secure token-based session swap; yellow banner during impersonation; full audit log; disable write operations or flag them as impersonated |
| Store settings: store hours | Storefront can show "open now" indicator; click-and-collect availability | MEDIUM | Array or JSON column for hours per day; storefront display only (no booking logic) |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Granular per-permission RBAC (50+ toggles) | "I want to control exactly what each staff member can do" | Role explosion — unmanageable matrix, high test surface, confusing UI for small-business owners who just want Owner/Manager/Staff | Three fixed roles with documented permission sets. Manager = all except billing and staff management. |
| Real-time dashboard auto-refresh | "I want to see sales updating live" | WebSocket failure modes, Supabase Realtime cost, complexity for single-operator store — the Eng review explicitly rejected this pattern | Page-level `revalidate` (60s) or manual refresh button. Explicit decision: refresh-on-transaction. |
| Customer loyalty points built into staff management | Loyalty + staff are separate concerns requested together | Scope creep — loyalty is a separate system (deferred to post-v4 in PROJECT.md) | Defer. Show order count/spend on customer profile as passive signal. |
| Impersonation with full write access | Support wants to "fix things" for the merchant | Untraceable mutations — audit log becomes ambiguous about whether merchant or support made a change | Impersonation read-only by default. Specific write actions (e.g., "reset PIN") via explicit super-admin Server Actions with forced audit logging. |
| Stripe webhook-driven MRR recalculation on every event | Always-fresh MRR in the DB | Complex event replay logic, subscription state machine errors common, webhook delivery not guaranteed | Pull-on-demand from Stripe API when super-admin loads dashboard. Cache for 5 minutes. No event-sourced MRR table needed at this scale. |
| Customer messaging / email campaigns from admin | CRM-style broadcast emails | Email deliverability, unsubscribe compliance, SPAM risk — this is a separate product concern | Xero/Mailchimp integration deferred. Show customer email on profile for manual follow-up. |

---

## Feature Dependencies

```
[Staff Management UI]
    └──requires──> [staff table — ALREADY EXISTS]
    └──requires──> [Manager role CHECK constraint migration]
                       └──requires──> [Permission gates on void/discount Server Actions]

[Customer Management UI]
    └──requires──> [customers table — ALREADY EXISTS (v2.0)]
    └──requires──> [orders.customer_id FK — ALREADY EXISTS]

[Promo Edit/Delete]
    └──requires──> [promos table — ALREADY EXISTS]
    └──requires──> [update/delete Server Actions — new, follow create pattern]

[Store Settings Expansion]
    └──requires──> [stores table migration — add address/phone/ird_number/receipt_header/receipt_footer/hours columns]
    └──enhances──> [Screen receipt — will pick up new header/footer/IRD columns automatically if receipt renderer reads them]

[Admin Dashboard Charts]
    └──requires──> [orders table — ALREADY EXISTS]
    └──requires──> [chart library — new dependency (recharts recommended, ~45kB gzipped)]

[Super-Admin Billing Visibility]
    └──requires──> [stores.stripe_customer_id — ALREADY EXISTS]
    └──requires──> [Stripe API server-side calls from super-admin routes]

[Super-Admin MRR/Churn Analytics]
    └──requires──> [Super-Admin Billing Visibility — same Stripe API access]
    └──requires──> [Aggregate query across all tenants — paginate Stripe subscriptions list]
    └──optionally──> [churn_events table for historical churn tracking]

[Merchant Impersonation]
    └──requires──> [Super-Admin auth session — ALREADY EXISTS]
    └──requires──> [Impersonation JWT: sign short-lived token with target store_id + impersonation flag]
    └──requires──> [Audit log write on impersonation start/end — super_admin_audit_log ALREADY EXISTS]
    └──conflicts──> [Write operations during impersonation — must be blocked or separately audited]
```

### Dependency Notes

- **Manager role requires migration first:** The `staff` table CHECK constraint is `role IN ('owner', 'staff')`. Adding `manager` requires a migration to expand the constraint. This is a one-liner ALTER but must precede any UI that sets role=manager.
- **Store settings expansion requires migration before UI:** The new columns (address, phone, ird_number, receipt_header, receipt_footer, store_hours) do not exist on `stores`. The settings form will fail to save without them.
- **Super-admin billing requires no migration** — `stripe_customer_id` is already on `stores`. It is Stripe API read-only.
- **MRR requires iterating all tenants:** Stripe API does not expose platform-level aggregate MRR natively. Must paginate `stripe.subscriptions.list()` with `expand: ['data.items.data.price']` across all customers, or use Stripe Sigma (paid). Compute in a Server Action and cache.

---

## MVP Definition

This is a subsequent milestone (v4.0), not an initial launch. "MVP" here means what must ship for the milestone to be considered complete vs what can be cut.

### Must Ship (v4.0 core)

- [ ] Staff management UI — add, edit, deactivate, PIN reset
- [ ] Manager role migration + permission gates on void/refund/discount Server Actions
- [ ] Customer list with search and order history view
- [ ] Customer account disable
- [ ] Promo edit (code, value, expiry, is_active toggle)
- [ ] Promo delete (soft delete)
- [ ] Store settings expansion: address, phone, IRD number, receipt header/footer
- [ ] Admin dashboard: 7-day/30-day sales chart + period comparison metrics
- [ ] Admin dashboard: recent orders widget
- [ ] Super-admin: per-tenant billing visibility (subscriptions, invoices, payment failures)
- [ ] Super-admin: platform overview metrics (total tenants, active add-ons, new signups chart)

### Add After Core (v4.1)

- [ ] Super-admin MRR/churn analytics — high complexity; validate super-admin needs this before building
- [ ] Merchant impersonation — high complexity, significant security surface; validate frequency of support requests first
- [ ] Store hours configuration — low priority until storefront needs it

### Future Consideration (v5+)

- [ ] Loyalty program integration — explicitly out of scope in PROJECT.md
- [ ] Customer email broadcast — separate product concern
- [ ] Granular RBAC with custom permissions — not justified at current tenant scale

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Staff management UI (add/edit/deactivate/PIN reset) | HIGH | LOW | P1 |
| Manager role migration + permission gates | HIGH | LOW | P1 |
| Promo edit/delete | HIGH | LOW | P1 |
| Store settings: address/phone/IRD/receipt text | HIGH | LOW | P1 |
| Customer list + search | HIGH | LOW | P1 |
| Customer order history view | HIGH | LOW | P1 |
| Admin dashboard: sales chart | HIGH | MEDIUM | P1 |
| Admin dashboard: period comparison metrics | HIGH | MEDIUM | P1 |
| Admin dashboard: recent orders widget | MEDIUM | LOW | P1 |
| Super-admin: per-tenant billing visibility | HIGH | MEDIUM | P1 |
| Super-admin: platform overview metrics (signups, active tenants) | HIGH | LOW | P1 |
| Customer account disable | MEDIUM | LOW | P1 |
| Store hours | LOW | MEDIUM | P2 |
| Super-admin: platform MRR/churn | MEDIUM | HIGH | P2 |
| Merchant impersonation | MEDIUM | HIGH | P2 |

**Priority key:**
- P1: Must ship in v4.0
- P2: Ship only if P1 complete and time permits
- P3: Future milestone

---

## Competitor Feature Analysis

| Feature | Square POS | Lightspeed/Vend | NZPOS v4.0 Approach |
|---------|------------|-----------------|---------------------|
| Staff roles | Owner / Manager / Employee (3 tiers) | Multiple custom roles with granular permissions | Owner / Manager / Staff (3 fixed tiers — avoids granularity complexity at small-biz scale) |
| Staff PIN | Yes, numeric PIN per staff | Yes, PIN or card swipe | Existing PIN auth system; management UI only |
| Customer profiles | Name, email, phone, order history | Full CRM: tags, notes, segments | Name, email, order history, account disable — sufficient for v4.0 |
| Customer search | Name or email search | Full-text, segmented | Name/email search — table stakes, low complexity |
| Promo management | Edit, deactivate, delete | Full promotion engine | Edit + soft delete — matches expectation |
| Receipt customization | Header, footer, logo | Header, footer, custom fields | Header, footer, IRD number — NZ compliance requirement |
| Admin dashboard | Revenue chart, comparison, recent orders | Advanced analytics, multi-location | 7/30-day chart + period comparison — right scope for single-location |
| Super-admin billing | N/A (customer-facing product) | N/A (customer-facing product) | Per-tenant Stripe subscription/invoice view — sufficient for support operations |
| MRR analytics | N/A (customer-facing product) | N/A (customer-facing product) | Computed from Stripe API on demand — avoid third-party analytics tool cost |
| Merchant impersonation | N/A (customer-facing product) | N/A (customer-facing product) | Short-lived impersonation JWT, read-only default, full audit trail — industry-standard pattern for SaaS support |

---

## Sources

- Stripe API: List subscriptions — https://docs.stripe.com/api/subscriptions/list
- Stripe API: Subscription invoices — https://docs.stripe.com/billing/invoices/subscription
- Stripe: SaaS analytics patterns — https://stripe.com/resources/more/saas-analytics
- Baremetrics: Advanced Stripe dashboards — https://baremetrics.com/blog/advanced-stripe-dashboards-for-subscription-management
- WorkOS: User management features for SaaS — https://workos.com/blog/user-management-features
- Clerk: User impersonation for SaaS — https://clerk.com/blog/empower-support-team-user-impersonation
- Jamie Tanna: Implementing impersonation — https://jamie.ideasasylum.com/2018/09/29/implementing-impersonation
- EnterpriseReady: RBAC for SaaS — https://www.enterpriseready.io/features/role-based-access-control/
- Lightspeed vs Square comparison (2026) — https://www.selecthub.com/pos-software/square-pos-vs-lightspeed-retail/
- ConnectPOS: POS CRM features — https://www.connectpos.com/pos-crm-customer-relationship-features/
- Existing codebase: `supabase/migrations/001_initial_schema.sql` — staff table schema (role, pin_hash, is_active)
- Existing codebase: `supabase/migrations/014_multi_tenant_schema.sql` — store_plans, stripe_customer_id
- Existing codebase: `src/app/admin/settings/page.tsx` — current settings scope (branding only)
- Existing codebase: `src/app/super-admin/tenants/page.tsx` — current super-admin scope

---

*Feature research for: NZPOS v4.0 Admin Platform*
*Researched: 2026-04-05*
