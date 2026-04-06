# Roadmap: NZPOS

## Milestones

- ✅ **v1.0 MVP** — Phases 1-6 (shipped 2026-04-02). [Archive](milestones/v1.0-ROADMAP.md)
- ✅ **v2.0 SaaS Platform** — Phases 7-16 (shipped 2026-04-03). [Archive](milestones/v2.0-ROADMAP.md)
- ✅ **v2.1 Hardening & Documentation** — Phases 17-20 (shipped 2026-04-04). [Archive](milestones/v2.1-ROADMAP.md)
- ✅ **v3.0 Inventory Management** — Phases 21-23 (shipped 2026-04-05). [Archive](milestones/v3.0-ROADMAP.md)
- ✅ **v4.0 Admin Platform** — Phases 24-27 (shipped 2026-04-06). [Archive](milestones/v4.0-ROADMAP.md)
- ✅ **v5.0 Marketing & Landing Page** — Phase 28 (shipped 2026-04-06). [Archive](milestones/v5.0-ROADMAP.md)
- ✅ **v6.0 Free Email Notifications** — Phases 29-31 (shipped 2026-04-06). [Archive](milestones/v6.0-ROADMAP.md)
- 🚧 **v7.0 POS Demo** — Phases 32-34 (in progress)

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

- [x] Phase 24: Staff RBAC Foundation (3/3 plans) — completed 2026-04-04
- [x] Phase 25: Admin Operational UI (3/3 plans) — completed 2026-04-05
- [x] Phase 26: Super-Admin Billing + User Management (3/3 plans) — completed 2026-04-05
- [x] Phase 27: Super-Admin Analytics (2/2 plans) — completed 2026-04-06

</details>

<details>
<summary>✅ v5.0 Marketing & Landing Page (Phase 28) — SHIPPED 2026-04-06</summary>

- [x] Phase 28: Marketing Landing Page (3/3 plans) — completed 2026-04-06

</details>

<details>
<summary>✅ v6.0 Free Email Notifications (Phases 29-31) — SHIPPED 2026-04-06</summary>

- [x] Phase 29: Backend & Billing Cleanup (2/2 plans) — completed 2026-04-06
- [x] Phase 30: Admin UI & Super Admin (2/2 plans) — completed 2026-04-06
- [x] Phase 31: Marketing Pages (2/2 plans) — completed 2026-04-06

</details>

### v7.0 POS Demo

- [x] **Phase 32: Demo Store Seed** - Pre-seeded NZ retail store with ~20 products, categories, and placeholder images in the database (completed 2026-04-06)
- [ ] **Phase 33: Demo POS Route & Checkout** - Unauthenticated `/demo/pos` running real POS code with simulated sale completion
- [ ] **Phase 34: Signup Conversion & Landing Page** - Post-sale CTA overlay and "Try POS Demo" entry point on the landing page

## Phase Details

### Phase 32: Demo Store Seed
**Goal**: A realistic NZ retail demo store exists in the database, ready for the demo POS to query
**Depends on**: Nothing (data prerequisite)
**Requirements**: DEMO-01, DEMO-02, DEMO-03, DEMO-04
**Success Criteria** (what must be TRUE):
  1. A demo store record exists with a NZ business name, logo, and valid store details
  2. The store has ~20 products spread across at least 4 categories with NZD tax-inclusive prices
  3. Every product has a placeholder image URL and a valid SKU
  4. Running the seed script twice produces the same result with no duplicate records
**Plans:** 1/1 plans complete
Plans:
- [x] 32-01-PLAN.md — SQL migration + constants + SVG placeholders for demo store seed

### Phase 33: Demo POS Route & Checkout
**Goal**: Visitors can use the real POS interface at `/demo/pos` — add products, apply discounts, complete a simulated EFTPOS or cash sale, and see a receipt — without creating an account or writing to the database
**Depends on**: Phase 32
**Requirements**: DPOS-01, DPOS-02, DPOS-03, DPOS-04, DCHK-01, DCHK-02, DCHK-03, DCHK-04, DCHK-05, DCHK-06, DCHK-07
**Success Criteria** (what must be TRUE):
  1. Visiting `/demo/pos` in an incognito browser loads the full POS product grid with no login prompt
  2. Products from the seeded demo store appear in the grid, grouped by category
  3. Adding items to the cart, adjusting quantities, and removing items works correctly with live GST breakdown
  4. Applying a line-item or cart-level discount recalculates GST and totals correctly
  5. Selecting EFTPOS shows the "Terminal approved?" confirmation screen; clicking Yes shows a receipt with full line-item detail — no database record is written
  6. Selecting Cash shows a tendered-amount entry with correct change calculation; completing the sale shows a receipt
**Plans:** 1 plan
Plans:
- [ ] 32-01-PLAN.md — SQL migration + constants + SVG placeholders for demo store seed
**UI hint**: yes

### Phase 34: Signup Conversion & Landing Page
**Goal**: Visitors who complete a demo sale are prompted to sign up, and prospective merchants on the landing page can discover and enter the demo in one click
**Depends on**: Phase 33
**Requirements**: CONV-01, CONV-02, CONV-03, LAND-01, LAND-02
**Success Criteria** (what must be TRUE):
  1. After a simulated sale completes, a signup CTA overlay or banner appears on the receipt screen
  2. Clicking the CTA navigates to the merchant signup page
  3. Dismissing the CTA returns to a fresh demo session with an empty cart
  4. The landing page has a clearly visible "Try POS Demo" button that navigates to `/demo/pos`
**Plans:** 1 plan
Plans:
- [ ] 32-01-PLAN.md — SQL migration + constants + SVG placeholders for demo store seed
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
| 29. Backend & Billing Cleanup | v6.0 | 2/2 | Complete | 2026-04-06 |
| 30. Admin UI & Super Admin | v6.0 | 2/2 | Complete | 2026-04-06 |
| 31. Marketing Pages | v6.0 | 2/2 | Complete | 2026-04-06 |
| 32. Demo Store Seed | v7.0 | 1/1 | Complete   | 2026-04-06 |
| 33. Demo POS Route & Checkout | v7.0 | 0/? | Not started | - |
| 34. Signup Conversion & Landing Page | v7.0 | 0/? | Not started | - |
