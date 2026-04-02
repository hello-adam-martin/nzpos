# Requirements: NZPOS v1.1

**Defined:** 2026-04-02
**Core Value:** A store owner can ring up a sale in-store and take an order online, from a single inventory that stays in sync, with GST handled correctly.

## v1.1 Requirements

Requirements for the v1.1 milestone. Each maps to roadmap phases.

### Production & Deployment

- [ ] **DEPLOY-01**: Store is deployed to Vercel production with all env vars configured
- [ ] **DEPLOY-02**: Supabase production instance has migrated schema and seeded reference data
- [ ] **DEPLOY-03**: Stripe live keys configured and webhook endpoint verified in production
- [ ] **DEPLOY-04**: Product catalog imported (200+ SKUs with barcodes, categories, stock levels, images)

### Checkout Speed

- [ ] **SCAN-01**: Staff can scan EAN-13/UPC-A barcode via iPad camera to add product to cart
- [ ] **SCAN-02**: If scanned barcode has no match, error shown and search bar focused
- [ ] **RCPT-01**: Screen receipt displays after sale completion (store info, items, GST, total, payment method)
- [ ] **RCPT-02**: Receipt data model is shared between screen display and future physical printer

### Notifications

- [ ] **NOTIF-01**: Online customer receives email receipt within 60s of Stripe payment
- [ ] **NOTIF-02**: POS customer receives email receipt if email provided at checkout
- [ ] **NOTIF-03**: Customer receives pickup-ready email when order status changes to "ready"
- [ ] **NOTIF-04**: Founder receives daily summary email (sales count, revenue split, top products, stock warnings)
- [ ] **NOTIF-05**: Founder receives low stock email when product drops below reorder_threshold (batched daily)
- [ ] **NOTIF-06**: iPad plays sound when new online order arrives (within 30s)

### Customer Accounts

- [ ] **CUST-01**: Customer can create account with email/password (scoped to store)
- [ ] **CUST-02**: Customer can log in and view their order history
- [ ] **CUST-03**: Customer can update their profile (name, email, preferences)
- [ ] **CUST-04**: Auth hook extended to inject customer role and store_id into JWT
- [ ] **CUST-05**: Customer login/signup blocked on POS routes
- [ ] **CUST-06**: Customer can verify email and reset password

### Partial Refunds

- [ ] **REFUND-01**: Staff can select individual line items to refund from an order
- [ ] **REFUND-02**: Stripe processes partial refund for selected items' total amount
- [ ] **REFUND-03**: Stock restored for refunded line items via atomic RPC
- [ ] **REFUND-04**: Xero credit note generated for partial refund amount
- [ ] **REFUND-05**: Refund audit trail (items, amounts, reason) stored on order

## Future Requirements

Deferred to future releases. Tracked but not in current roadmap.

### Xero

- **XERO-01**: Xero OAuth completed with real production credentials
- **XERO-02**: Daily Xero sync verified against live Xero org

### Hardware Integration

- **HW-01**: Physical receipt printing via ESC/POS thermal printer
- **HW-02**: Integrated EFTPOS terminal via Windcave SDK

### Customer Experience

- **CX-01**: Customer can reorder a previous order with one tap
- **CX-02**: Customer receives order tracking updates

## Out of Scope

| Feature | Reason |
|---------|--------|
| Offline mode | Requires local-first architecture rewrite (v2) |
| Multi-store UI | store_id exists but no tenant management UI (v2) |
| Delivery/shipping | Click-and-collect only, shipping integration too complex for v1.1 |
| Loyalty program | Not needed for supplies store |
| Supabase Realtime | Polling sufficient for single terminal |
| Advanced analytics | Basic reporting is sufficient |
| Barcode scanning (QR) | EAN-13/UPC-A only for retail barcodes |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| DEPLOY-01 | — | Pending |
| DEPLOY-02 | — | Pending |
| DEPLOY-03 | — | Pending |
| DEPLOY-04 | — | Pending |
| SCAN-01 | — | Pending |
| SCAN-02 | — | Pending |
| RCPT-01 | — | Pending |
| RCPT-02 | — | Pending |
| NOTIF-01 | — | Pending |
| NOTIF-02 | — | Pending |
| NOTIF-03 | — | Pending |
| NOTIF-04 | — | Pending |
| NOTIF-05 | — | Pending |
| NOTIF-06 | — | Pending |
| CUST-01 | — | Pending |
| CUST-02 | — | Pending |
| CUST-03 | — | Pending |
| CUST-04 | — | Pending |
| CUST-05 | — | Pending |
| CUST-06 | — | Pending |
| REFUND-01 | — | Pending |
| REFUND-02 | — | Pending |
| REFUND-03 | — | Pending |
| REFUND-04 | — | Pending |
| REFUND-05 | — | Pending |

**Coverage:**
- v1.1 requirements: 25 total
- Mapped to phases: 0
- Unmapped: 25 (pending roadmap creation)

---
*Requirements defined: 2026-04-02*
*Last updated: 2026-04-02 after initial definition*
