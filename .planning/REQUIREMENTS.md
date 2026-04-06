# Requirements: NZPOS

**Defined:** 2026-04-06
**Core Value:** A store owner can ring up a sale in-store and take an order online, from a single inventory that stays in sync, with GST handled correctly.

## v7.0 Requirements

Requirements for POS Demo milestone. Each maps to roadmap phases.

### Demo Store Data

- [ ] **DEMO-01**: Demo store exists in DB with store name, logo, and NZ business details
- [ ] **DEMO-02**: Demo store has ~20 products across 4+ categories with realistic NZD prices (tax-inclusive)
- [ ] **DEMO-03**: Demo store products have placeholder images and valid SKUs
- [ ] **DEMO-04**: Demo store has seed migration or script that is idempotent (re-runnable)

### Demo POS Route

- [ ] **DPOS-01**: Visitor can access `/demo/pos` without any authentication
- [ ] **DPOS-02**: Demo POS loads real POS UI components (ProductGrid, Cart, checkout flow)
- [ ] **DPOS-03**: Demo POS fetches products from the seeded demo store in the database
- [ ] **DPOS-04**: Demo POS disables features that require real auth (barcode scanner, new-order polling, receipt email)

### Demo Checkout

- [ ] **DCHK-01**: Visitor can add products to cart, adjust quantities, and remove items
- [ ] **DCHK-02**: Visitor can apply line-item and cart-level discounts
- [ ] **DCHK-03**: GST calculations display correctly on all cart operations
- [ ] **DCHK-04**: Visitor can select EFTPOS payment and see the "Terminal approved?" confirmation screen
- [ ] **DCHK-05**: Clicking "Yes" on EFTPOS confirmation completes the sale with simulated success (no DB write)
- [ ] **DCHK-06**: Visitor can select Cash payment and enter tendered amount with change calculation
- [ ] **DCHK-07**: Receipt screen displays after simulated sale completion with full line-item detail

### Signup Conversion

- [ ] **CONV-01**: After completing a demo sale, visitor sees a signup CTA overlay/banner
- [ ] **CONV-02**: CTA links to the merchant signup page
- [ ] **CONV-03**: Visitor can dismiss the CTA and start a new demo sale

### Landing Page

- [ ] **LAND-01**: Landing page has a visible "Try POS Demo" button
- [ ] **LAND-02**: Button navigates to `/demo/pos`

## Future Requirements

### Online Store Demo

- **SDEMO-01**: Visitor can try the online storefront demo
- **SDEMO-02**: Storefront demo shows products from the demo store
- **SDEMO-03**: Storefront demo simulates Stripe checkout flow

### EFTPOS Integration Add-on

- **EFTPOS-01**: Automatic EFTPOS terminal syncing (Windcave integration) as paid add-on
- **EFTPOS-02**: Demo showcases manual vs automatic EFTPOS comparison

## Out of Scope

| Feature | Reason |
|---------|--------|
| Online storefront demo | POS demo only for v7.0 — storefront demo is future |
| Real payment processing in demo | Demo simulates payment, never touches Stripe |
| Demo user accounts / saved sessions | Each visit is ephemeral, no persistence needed |
| Demo analytics / reporting | POS checkout flow only, not admin features |
| Windcave EFTPOS integration | Future paid add-on, not part of demo build |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| DEMO-01 | — | Pending |
| DEMO-02 | — | Pending |
| DEMO-03 | — | Pending |
| DEMO-04 | — | Pending |
| DPOS-01 | — | Pending |
| DPOS-02 | — | Pending |
| DPOS-03 | — | Pending |
| DPOS-04 | — | Pending |
| DCHK-01 | — | Pending |
| DCHK-02 | — | Pending |
| DCHK-03 | — | Pending |
| DCHK-04 | — | Pending |
| DCHK-05 | — | Pending |
| DCHK-06 | — | Pending |
| DCHK-07 | — | Pending |
| CONV-01 | — | Pending |
| CONV-02 | — | Pending |
| CONV-03 | — | Pending |
| LAND-01 | — | Pending |
| LAND-02 | — | Pending |

**Coverage:**
- v7.0 requirements: 20 total
- Mapped to phases: 0
- Unmapped: 20

---
*Requirements defined: 2026-04-06*
*Last updated: 2026-04-06 after initial definition*
