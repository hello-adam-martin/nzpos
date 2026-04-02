# Requirements: NZPOS v2.0

**Defined:** 2026-04-03
**Core Value:** A store owner can ring up a sale in-store and take an order online, from a single inventory that stays in sync, with GST handled correctly.

## v2.0 Requirements

Requirements for the v2.0 SaaS Platform milestone. Each maps to roadmap phases.

### Multi-Tenant Infrastructure

- [ ] **TENANT-01**: Wildcard subdomain routing resolves {slug}.domain.tld to the correct store
- [ ] **TENANT-02**: Schema supports multi-tenant SaaS (stores.slug, store_plans table, stripe_customer_id)
- [ ] **TENANT-03**: RLS policies enforce tenant isolation via JWT claims (not middleware headers)
- [ ] **TENANT-04**: Super admin JWT claim (is_super_admin) bypasses store-scoped RLS where needed
- [ ] **TENANT-05**: Cross-tenant isolation verified with E2E tests (tenant A cannot access tenant B data)

### Merchant Signup

- [ ] **SIGNUP-01**: Merchant can sign up with email and password and get a provisioned store automatically
- [ ] **SIGNUP-02**: Store provisioning is atomic (auth user + store + staff + store_plans in one transaction)
- [ ] **SIGNUP-03**: Merchant must verify email before accessing the dashboard
- [ ] **SIGNUP-04**: Reserved slugs (admin, www, api, app, etc.) are blocked during signup
- [ ] **SIGNUP-05**: Signup is rate-limited (1 store per verified email, throttled requests)

### Store Setup & Onboarding

- [ ] **SETUP-01**: Merchant completes a 3-step setup wizard (store name/slug, logo, first product)
- [ ] **SETUP-02**: Every wizard step is skippable
- [ ] **SETUP-03**: Admin dashboard shows a persistent setup completion checklist

### Marketing

- [ ] **MKTG-01**: Public marketing landing page with hero, pricing, and signup CTA
- [ ] **MKTG-02**: Landing page is mobile-optimised and statically rendered for fast load

### Billing & Feature Gating

- [ ] **BILL-01**: Merchant can subscribe to paid add-ons (Xero, Email Notifications) via Stripe Checkout
- [ ] **BILL-02**: Stripe subscription state syncs to store_plans via dedicated billing webhook endpoint
- [ ] **BILL-03**: Feature gating is enforced server-side (requireFeature() on all Xero + email Server Actions)
- [ ] **BILL-04**: Gated features show contextual upgrade prompts in the UI
- [ ] **BILL-05**: Merchant can manage billing via Stripe Customer Portal (cancel, payment method, invoices)
- [ ] **BILL-06**: Admin billing page shows current plan, active add-ons, and portal link

### Super Admin

- [ ] **SADMIN-01**: Super admin can view a paginated, searchable list of all tenants
- [ ] **SADMIN-02**: Super admin can view tenant detail (plan, subscription status, created date, last active)
- [ ] **SADMIN-03**: Super admin can suspend and unsuspend a tenant with 30-day recovery window
- [ ] **SADMIN-04**: Super admin can manually override a tenant's plan (comp free add-ons)

## Future Requirements

Deferred to future releases. Tracked but not in current roadmap.

### Custom Domains

- **DOMAIN-01**: Merchant can add a custom domain as a paid add-on
- **DOMAIN-02**: DNS verification UX with polling and status display
- **DOMAIN-03**: Canonical redirect from subdomain to custom domain once active

### Production Deploy (carried from v1.1)

- **DEPLOY-02**: Supabase production instance has migrated schema and seeded reference data
- **DEPLOY-03**: Stripe live keys configured and webhook endpoint verified in production
- **DEPLOY-04**: Product catalog imported (200+ SKUs with barcodes, categories, stock levels, images)

### Hardware Integration

- **HW-01**: Physical receipt printing via ESC/POS thermal printer
- **HW-02**: Integrated EFTPOS terminal via Windcave SDK

### Customer Experience

- **CX-01**: Customer can reorder a previous order with one tap
- **CX-02**: Customer receives order tracking updates

### Advanced SaaS

- **SAAS-01**: Tenant impersonation for super admin support debugging
- **SAAS-02**: Per-tenant usage metrics in super admin
- **SAAS-03**: Email drip onboarding sequences

## Out of Scope

| Feature | Reason |
|---------|--------|
| Offline mode | Requires local-first architecture rewrite (v3) |
| Multi-store per merchant | One store per signup for v2.0, multi-store is v3 |
| Database-per-tenant | Row-level isolation via store_id + RLS scales to thousands of tenants |
| White-label / remove branding | Premature — no demand signal |
| Multi-plan tiers (Starter/Pro/Enterprise) | Per-add-on billing is simpler and avoids upgrade cliffs |
| Free trial with credit card | NZ SMB market expects no-card signup (Square model) |
| Subdomain slug changes | Slug is immutable after creation; display name is editable |
| Live storefront preview in wizard | High complexity, defer to v3 |
| Delivery/shipping | Click-and-collect only |
| Supabase Realtime | Polling sufficient for single terminal per store |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| TENANT-01 | — | Pending |
| TENANT-02 | — | Pending |
| TENANT-03 | — | Pending |
| TENANT-04 | — | Pending |
| TENANT-05 | — | Pending |
| SIGNUP-01 | — | Pending |
| SIGNUP-02 | — | Pending |
| SIGNUP-03 | — | Pending |
| SIGNUP-04 | — | Pending |
| SIGNUP-05 | — | Pending |
| SETUP-01 | — | Pending |
| SETUP-02 | — | Pending |
| SETUP-03 | — | Pending |
| MKTG-01 | — | Pending |
| MKTG-02 | — | Pending |
| BILL-01 | — | Pending |
| BILL-02 | — | Pending |
| BILL-03 | — | Pending |
| BILL-04 | — | Pending |
| BILL-05 | — | Pending |
| BILL-06 | — | Pending |
| SADMIN-01 | — | Pending |
| SADMIN-02 | — | Pending |
| SADMIN-03 | — | Pending |
| SADMIN-04 | — | Pending |

**Coverage:**
- v2.0 requirements: 25 total
- Mapped to phases: 0
- Unmapped: 25

---
*Requirements defined: 2026-04-03*
*Last updated: 2026-04-03 after initial definition*
