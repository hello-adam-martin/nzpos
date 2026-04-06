# Requirements: NZPOS

**Defined:** 2026-04-06
**Core Value:** A store owner can ring up a sale in-store and take an order online, from a single inventory that stays in sync, with GST handled correctly.

## v8.0 Requirements

Requirements for v8.0 Add-On Catalog Expansion. Each maps to roadmap phases.

### Gift Cards

- [x] **GIFT-01**: Merchant can enable the Gift Cards add-on ($14/mo) via Stripe subscription
- [ ] **GIFT-02**: Merchant can create gift card products with configurable denominations
- [x] **GIFT-03**: Customer can purchase a digital gift card on the storefront (generates unique code)
- [ ] **GIFT-04**: Customer receives gift card code and expiry date via email after purchase
- [ ] **GIFT-05**: Gift card expiry is enforced at minimum 3 years per NZ Fair Trading Act 2024
- [x] **GIFT-06**: Staff can redeem a gift card as payment method during POS checkout (enter code, validate balance)
- [ ] **GIFT-07**: Customer can redeem a gift card during online storefront checkout
- [ ] **GIFT-08**: Gift card supports partial redemption with remaining balance tracked
- [ ] **GIFT-09**: Gift card issuance is recorded as deferred liability (not revenue), GST deferred to redemption
- [ ] **GIFT-10**: Merchant can view gift card list with balances, status, and transaction history in admin
- [ ] **GIFT-11**: Gift card issuance is excluded from Xero sales sync (deferred liability, not revenue)

### Advanced Reporting / COGS

- [ ] **COGS-01**: Merchant can enable the Advanced Reporting add-on ($9/mo) via Stripe subscription
- [ ] **COGS-02**: Merchant can set cost price per product in the product admin form
- [ ] **COGS-03**: Merchant can view profit margin percentage per product in the product list
- [ ] **COGS-04**: Merchant can generate a COGS report by date range showing revenue, cost, and margin
- [ ] **COGS-05**: Merchant can view a profit-by-category breakdown report
- [ ] **COGS-06**: Merchant can export COGS reports as CSV

### Loyalty Points

- [ ] **LOYAL-01**: Merchant can enable the Loyalty Points add-on ($15/mo) via Stripe subscription
- [ ] **LOYAL-02**: Merchant can configure points-per-dollar earn rate in loyalty settings
- [ ] **LOYAL-03**: Merchant can configure points-to-dollar redemption rate in loyalty settings
- [ ] **LOYAL-04**: Staff can look up a customer by name or email during POS checkout (optional step)
- [ ] **LOYAL-05**: Customer earns loyalty points automatically on completed POS sales when identified
- [ ] **LOYAL-06**: Customer earns loyalty points automatically on completed online orders when logged in
- [ ] **LOYAL-07**: Customer can view their points balance on their account profile page
- [ ] **LOYAL-08**: Customer can redeem points as a discount during online checkout
- [ ] **LOYAL-09**: Staff can apply a customer's points as a discount during POS checkout
- [ ] **LOYAL-10**: Merchant can view customer loyalty balances and transaction history in admin
- [ ] **LOYAL-11**: Privacy notice is displayed to customers before loyalty enrollment

## Future Requirements

Deferred to v8.1 or later. Tracked but not in current roadmap.

### Purchase Orders / Supplier Management

- **PO-01**: Merchant can manage suppliers (name, contact, products supplied)
- **PO-02**: Merchant can create and send purchase orders to suppliers
- **PO-03**: Merchant can receive stock against a purchase order (auto-increment inventory)

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| SMS marketing | NZ short-code costs NZ$275/mo — uneconomical at add-on price point |
| Loyalty VIP tiers (Bronze/Silver/Gold) | Unnecessary complexity for NZ micro-retailers; add in v2 if demanded |
| Physical gift card printing | Requires card vendor, MOQ, setup fees — digital only |
| Gift card tap-to-redeem via EFTPOS | Windcave integration deferred; manual code entry |
| Booking/appointments | Separate product category, outside POS scope |
| Email campaign blasts (CRM) | Deliverability is a separate SaaS concern; use Mailchimp/Klaviyo |
| Loyalty points cash-out | NZ FMA registration risk if points are cash-convertible |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| GIFT-01 | Phase 35 | Complete |
| GIFT-02 | Phase 35 | Pending |
| GIFT-03 | Phase 35 | Complete |
| GIFT-04 | Phase 35 | Pending |
| GIFT-05 | Phase 35 | Pending |
| GIFT-06 | Phase 35 | Complete |
| GIFT-07 | Phase 35 | Pending |
| GIFT-08 | Phase 35 | Pending |
| GIFT-09 | Phase 35 | Pending |
| GIFT-10 | Phase 35 | Pending |
| GIFT-11 | Phase 35 | Pending |
| COGS-01 | Phase 36 | Pending |
| COGS-02 | Phase 36 | Pending |
| COGS-03 | Phase 36 | Pending |
| COGS-04 | Phase 36 | Pending |
| COGS-05 | Phase 36 | Pending |
| COGS-06 | Phase 36 | Pending |
| LOYAL-01 | Phase 37 | Pending |
| LOYAL-02 | Phase 37 | Pending |
| LOYAL-03 | Phase 37 | Pending |
| LOYAL-04 | Phase 37 | Pending |
| LOYAL-05 | Phase 37 | Pending |
| LOYAL-06 | Phase 37 | Pending |
| LOYAL-07 | Phase 37 | Pending |
| LOYAL-08 | Phase 37 | Pending |
| LOYAL-09 | Phase 37 | Pending |
| LOYAL-10 | Phase 37 | Pending |
| LOYAL-11 | Phase 37 | Pending |

**Coverage:**
- v8.0 requirements: 28 total
- Mapped to phases: 28
- Unmapped: 0 ✓

---
*Requirements defined: 2026-04-06*
*Last updated: 2026-04-06 after roadmap creation — all 28 requirements mapped*
