# Roadmap: NZPOS

## Milestones

- ✅ **v1.0 MVP** — Phases 1-6 (shipped 2026-04-02). [Archive](milestones/v1.0-ROADMAP.md)
- ✅ **v2.0 SaaS Platform** — Phases 7-16 (shipped 2026-04-03). [Archive](milestones/v2.0-ROADMAP.md)
- ✅ **v2.1 Hardening & Documentation** — Phases 17-20 (shipped 2026-04-04). [Archive](milestones/v2.1-ROADMAP.md)
- 🚧 **v3.0 Inventory Management** — Phases 21-23 (in progress)

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

### v3.0 Inventory Management (In Progress)

**Milestone Goal:** Add inventory management as a paid add-on (stock tracking, adjustments, stocktake) and introduce service-type products that skip stock checks. Without the add-on, merchants sell freely with no stock numbers shown.

- [x] **Phase 21: Service Product Type + Free-Tier Simplification** — Modify checkout-critical RPCs for service products; clean up free-tier stock clutter (completed 2026-04-04)
- [x] **Phase 22: Inventory Add-on Core** — Manual stock adjustments with audit log, stocktake sessions with variance calculation (completed 2026-04-04)
- [ ] **Phase 23: Feature Gating + POS/Storefront Integration** — Wire inventory billing gate, surface stock badges and sold-out states in POS and storefront

## Phase Details

### Phase 21: Service Product Type + Free-Tier Simplification
**Goal**: Service products sell without stock checks everywhere, and free-tier stores have no stock clutter in their UI
**Depends on**: Phase 20
**Requirements**: PROD-01, PROD-02, PROD-03, PROD-04, FREE-01, FREE-02, FREE-03, POS-04
**Success Criteria** (what must be TRUE):
  1. Admin can set a product as "physical" or "service" from the product create/edit form
  2. Selling a service product 100 times in POS or online does not change its stock_quantity
  3. Refunding a service product does not restore any stock quantity
  4. Importing products via CSV with a product_type column sets the type correctly without touching stock_quantity unless an explicit flag is present
  5. A store without the inventory add-on sees no stock quantities, low-stock badges, or out-of-stock warnings anywhere in admin, POS, or storefront — products sell freely
**Plans**: 3 plans
Plans:
- [x] 21-01-PLAN.md — Database migration + TypeScript types + addon config (foundation)
- [x] 21-02-PLAN.md — Server actions: product CRUD, CSV import, refund guards, checkout stock check
- [x] 21-03-PLAN.md — UI gating: admin form, data table, dashboard, reports, POS, storefront
**UI hint**: yes

### Phase 22: Inventory Add-on Core
**Goal**: Merchants with the inventory add-on can manually adjust stock with reason codes and run a stocktake with variance calculation
**Depends on**: Phase 21
**Requirements**: STOCK-01, STOCK-02, STOCK-03, STOCK-04, STOCK-05, TAKE-01, TAKE-02, TAKE-03, TAKE-04, TAKE-05
**Success Criteria** (what must be TRUE):
  1. Admin can adjust stock for a physical product, selecting a reason code and optional notes, and the change is reflected immediately in stock levels
  2. Every stock mutation (sale, refund, manual adjustment, stocktake commit) appears as a row in the adjustment history, filterable by product, date range, and reason code
  3. Admin can create a stocktake session (full or filtered by category), enter counted quantities, and see variance (counted vs system) for each product before committing
  4. Committing a stocktake atomically adjusts all stock quantities and records "stocktake" reason adjustments for all variance lines
  5. Admin can use the barcode scanner to look up a product during stocktake count entry
**Plans**: 5 plans
Plans:
- [x] 22-01-PLAN.md — Database migration + Zod schemas + TypeScript types + Wave 0 test scaffolds
- [x] 22-02-PLAN.md — Server actions: stock adjustment, history, stock levels
- [x] 22-03-PLAN.md — Server actions: stocktake session lifecycle (create, update, commit, discard)
- [x] 22-04-PLAN.md — UI: Inventory page, Stock Levels tab, Adjustment drawer, History tab, sidebar + product form updates
- [x] 22-05-PLAN.md — UI: Stocktakes tab, stocktake session page (Count + Review), barcode integration
**UI hint**: yes

### Phase 23: Feature Gating + POS/Storefront Integration
**Goal**: The inventory add-on is purchasable via Stripe, all inventory mutations are gated behind the subscription, and POS/storefront surfaces stock status when the add-on is active
**Depends on**: Phase 22
**Requirements**: GATE-01, GATE-02, GATE-03, GATE-04, GATE-05, POS-01, POS-02, POS-03
**Success Criteria** (what must be TRUE):
  1. A store owner can subscribe to the inventory add-on via the billing portal and immediately gain access to stock management features
  2. All inventory Server Actions (adjust stock, create/commit stocktake) reject requests from stores without an active inventory subscription, using the DB path for mutation checks
  3. POS product grid shows in-stock / low-stock / out-of-stock badges for physical products when inventory add-on is active
  4. POS blocks adding an out-of-stock physical product to the cart when inventory add-on is active; service products are always addable
  5. Storefront shows "sold out" and disables add-to-cart for out-of-stock physical products when add-on is active
  6. Super admin can manually override inventory add-on status per store from the super admin panel
**Plans**: 3 plans
Plans:
- [ ] 23-00-PLAN.md — Wave 0: Test scaffolds for POS ProductCard and storefront AddToCartButton
- [ ] 23-01-PLAN.md — Billing checkout enum, super admin wiring, billing page query/flagMap, success banner
- [ ] 23-02-PLAN.md — Inventory upgrade wall, page gate, POS/storefront/GATE-01 verification
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
| 21. Service Product Type + Free-Tier Simplification | v3.0 | 3/3 | Complete    | 2026-04-04 |
| 22. Inventory Add-on Core | v3.0 | 5/5 | Complete    | 2026-04-04 |
| 23. Feature Gating + POS/Storefront Integration | v3.0 | 0/3 | Not started | - |
