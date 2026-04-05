# Requirements: NZPOS v4.0

**Defined:** 2026-04-05
**Core Value:** A store owner can ring up a sale in-store and take an order online, from a single inventory that stays in sync, with GST handled correctly.

## v4.0 Requirements

Requirements for Admin Platform milestone. Each maps to roadmap phases.

### Staff Management

- [x] **STAFF-01**: Admin can view a list of all staff members with name, role, and active status
- [x] **STAFF-02**: Admin can add a new staff member with name and auto-generated or manual PIN
- [x] **STAFF-03**: Admin can edit a staff member's name and role (Owner/Manager/Staff)
- [x] **STAFF-04**: Admin can deactivate a staff member, preventing them from logging into POS
- [x] **STAFF-05**: Admin can reset a staff member's PIN, generating a new one shown once
- [x] **STAFF-06**: Manager role can process refunds and view reports but cannot manage products, staff, or settings

### Customer Management

- [x] **CUST-01**: Admin can view a paginated list of customers with name, email, and order count
- [x] **CUST-02**: Admin can search customers by name or email
- [x] **CUST-03**: Admin can view a customer's order history from the customer detail page
- [x] **CUST-04**: Admin can disable a customer account, preventing them from logging into the storefront

### Promo Management

- [x] **PROMO-01**: Admin can edit an existing promo code's discount amount, min order, max uses, and expiry date
- [x] **PROMO-02**: Admin can soft-delete a promo code, removing it from active use but preserving history

### Store Settings

- [x] **SETTINGS-01**: Admin can edit store business address and phone number from settings
- [x] **SETTINGS-02**: Admin can edit receipt header and footer text from settings
- [x] **SETTINGS-03**: Admin can view and edit the store's IRD/GST number from settings

### Admin Dashboard

- [ ] **DASH-01**: Dashboard shows a 7-day or 30-day sales trend chart
- [ ] **DASH-02**: Dashboard shows key metrics with period comparison (today vs yesterday, this week vs last week)
- [ ] **DASH-03**: Dashboard shows a recent orders widget with the last 5 orders

### Super-Admin Platform Overview

- [ ] **SA-DASH-01**: Super-admin dashboard shows total active tenants, suspended tenants, and new signups this month
- [ ] **SA-DASH-02**: Super-admin dashboard shows add-on adoption rates (% of tenants with each add-on)
- [ ] **SA-DASH-03**: Super-admin dashboard shows a signup trend chart (last 30 days)

### Super-Admin Billing Visibility

- [x] **SA-BILL-01**: Super-admin can view a tenant's active Stripe subscriptions from the tenant detail page
- [x] **SA-BILL-02**: Super-admin can view a tenant's recent invoices and payment status from the tenant detail page
- [x] **SA-BILL-03**: Super-admin can see payment failure alerts for tenants with past-due invoices

### Super-Admin Analytics (MRR/Churn)

- [ ] **SA-MRR-01**: Super-admin analytics page shows current MRR with correct normalisation of annual plans
- [ ] **SA-MRR-02**: Super-admin analytics page shows MRR trend over the last 6 months
- [ ] **SA-MRR-03**: Super-admin analytics page shows churn count (cancelled subscriptions this month)
- [ ] **SA-MRR-04**: Super-admin analytics page shows revenue breakdown by add-on
- [ ] **SA-MRR-05**: Stripe data is materialised via a sync job, not fetched live on page load

### Super-Admin User Management

- [x] **SA-USER-01**: Super-admin can view a tenant's owner email and signup date from tenant detail
- [ ] **SA-USER-02**: Super-admin can trigger a password reset email for a merchant account
- [ ] **SA-USER-03**: Super-admin can disable a merchant account, preventing login

## Future Requirements (v4.1+)

- **IMPERSONATE-01**: Super-admin can impersonate a merchant and view their admin as them (read-only or full)
- **IMPERSONATE-02**: Impersonation banner visible during impersonation with "End" button
- **IMPERSONATE-03**: All mutations during impersonation are logged in audit trail
- **STORE-HOURS-01**: Admin can set store opening hours displayed on storefront
- **BULK-01**: Bulk operations for products, orders, and customers

## Out of Scope

| Feature | Reason |
|---------|--------|
| Granular per-permission RBAC | Three fixed roles (Owner/Manager/Staff) sufficient for small business POS |
| Customer email broadcast / CRM | Separate domain, not admin management |
| Loyalty program integration | Explicitly out of scope in PROJECT.md |
| Multi-warehouse inventory | Single-store per tenant model |
| Custom API keys for merchants | No demand signal, not a developer platform |
| Write-mode merchant impersonation | Deferred to v4.1 — security design needed |
| Advanced promo rules (BOGO, tiered) | Current flat discount model sufficient |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| STAFF-01 | Phase 24 | Complete |
| STAFF-02 | Phase 24 | Complete |
| STAFF-03 | Phase 24 | Complete |
| STAFF-04 | Phase 24 | Complete |
| STAFF-05 | Phase 24 | Complete |
| STAFF-06 | Phase 24 | Complete |
| CUST-01 | Phase 25 | Complete |
| CUST-02 | Phase 25 | Complete |
| CUST-03 | Phase 25 | Complete |
| CUST-04 | Phase 25 | Complete |
| PROMO-01 | Phase 25 | Complete |
| PROMO-02 | Phase 25 | Complete |
| SETTINGS-01 | Phase 25 | Complete |
| SETTINGS-02 | Phase 25 | Complete |
| SETTINGS-03 | Phase 25 | Complete |
| DASH-01 | Phase 25 | Pending |
| DASH-02 | Phase 25 | Pending |
| DASH-03 | Phase 25 | Pending |
| SA-DASH-01 | Phase 26 | Pending |
| SA-DASH-02 | Phase 26 | Pending |
| SA-DASH-03 | Phase 26 | Pending |
| SA-BILL-01 | Phase 26 | Complete |
| SA-BILL-02 | Phase 26 | Complete |
| SA-BILL-03 | Phase 26 | Complete |
| SA-USER-01 | Phase 26 | Complete |
| SA-USER-02 | Phase 26 | Pending |
| SA-USER-03 | Phase 26 | Pending |
| SA-MRR-01 | Phase 27 | Pending |
| SA-MRR-02 | Phase 27 | Pending |
| SA-MRR-03 | Phase 27 | Pending |
| SA-MRR-04 | Phase 27 | Pending |
| SA-MRR-05 | Phase 27 | Pending |

**Coverage:**
- v4.0 requirements: 32 total
- Mapped to phases: 32
- Unmapped: 0

---
*Requirements defined: 2026-04-05*
*Last updated: 2026-04-05*
