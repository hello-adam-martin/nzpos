# Roadmap: NZPOS

## Milestones

- ✅ **v1.0 MVP** — Phases 1-6 (shipped 2026-04-02). [Archive](milestones/v1.0-ROADMAP.md)
- 🚧 **v1.1 Production Launch + Feature Waves** — Phases 7-11 (in progress)

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

### v1.1 Production Launch + Feature Waves

- [ ] **Phase 7: Production Launch** — Store is live on real infrastructure with real products
- [ ] **Phase 8: Checkout Speed** — Barcode scanning and screen receipts at point of sale
- [ ] **Phase 9: Notifications** — Automated emails and sound alert for new online orders
- [ ] **Phase 10: Customer Accounts** — Customers can create accounts and view order history
- [ ] **Phase 11: Partial Refunds** — Staff can issue partial refunds with full audit trail

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
**Plans**: TBD

### Phase 8: Checkout Speed
**Goal**: Staff can scan barcodes to add products instantly and customers see a receipt after every sale
**Depends on**: Phase 7
**Requirements**: SCAN-01, SCAN-02, RCPT-01, RCPT-02
**Success Criteria** (what must be TRUE):
  1. Pointing the iPad camera at an EAN-13 or UPC-A barcode adds the matching product to the cart
  2. Scanning an unknown barcode shows a clear error and focuses the search bar for manual lookup
  3. After a POS sale completes, a screen receipt displays with store info, line items, GST breakdown, total, and payment method
  4. The receipt data model is shared with the future physical printer path (no screen-only hardcoding)
**Plans**: TBD
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
**Plans**: TBD

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
**Plans**: TBD
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
**Plans**: TBD

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|---------------|--------|-----------|
| 1. Foundation | v1.0 | 5/5 | Complete | 2026-04-01 |
| 2. Product Catalog | v1.0 | 5/5 | Complete | 2026-04-01 |
| 3. POS Checkout | v1.0 | 6/6 | Complete | 2026-04-01 |
| 4. Online Store | v1.0 | 7/7 | Complete | 2026-04-01 |
| 5. Admin & Reporting | v1.0 | 6/6 | Complete | 2026-04-01 |
| 6. Xero Integration | v1.0 | 4/4 | Complete | 2026-04-01 |
| 7. Production Launch | v1.1 | 0/? | Not started | — |
| 8. Checkout Speed | v1.1 | 0/? | Not started | — |
| 9. Notifications | v1.1 | 0/? | Not started | — |
| 10. Customer Accounts | v1.1 | 0/? | Not started | — |
| 11. Partial Refunds | v1.1 | 0/? | Not started | — |
