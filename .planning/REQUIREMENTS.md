# Requirements: NZPOS

**Defined:** 2026-04-01
**Core Value:** A store owner can ring up a sale in-store and take an order online, from a single inventory that stays in sync, with GST handled correctly.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Foundation

- [x] **FOUND-01**: Next.js 16 project scaffolded with App Router, Tailwind v4, Supabase client
- [x] **FOUND-02**: Supabase schema deployed with all tables, store_id on every table, indexes
- [x] **FOUND-03**: Custom JWT claims configured (store_id + role in app_metadata)
- [x] **FOUND-04**: RLS policies enforce tenant isolation on all tables
- [x] **FOUND-05**: GST calculation module (per-line on discounted amounts, IRD-compliant) with unit tests
- [x] **FOUND-06**: Zod validation schemas for all entity types
- [x] **FOUND-07**: Money stored as integer cents throughout, display formatting in UI only

### Authentication

- [x] **AUTH-01**: Owner can sign up with email and password via Supabase Auth
- [x] **AUTH-02**: Staff can log in with 4-digit PIN (bcrypt hashed, fast shift changes)
- [x] **AUTH-03**: Staff PIN lockout after 10 failed attempts in 5 minutes
- [x] **AUTH-04**: Owner has full access (admin, POS, reports). Staff has POS-only access.
- [x] **AUTH-05**: Route-level middleware enforces role-based access (/pos = staff+owner, /admin = owner only)

### Product Catalog

- [x] **PROD-01**: Owner can create products with name, SKU, barcode, price (cents), category, stock, reorder threshold
- [x] **PROD-02**: Owner can upload product images via Supabase Storage
- [x] **PROD-03**: Owner can edit and deactivate products
- [ ] **PROD-04**: Owner can import products from CSV (batch processing for 500+ rows, skip duplicates)
- [x] **PROD-05**: Product images display in POS grid and online store
- [ ] **PROD-06**: Categories can be created, edited, and reordered

### POS Checkout

- [ ] **POS-01**: Staff sees product grid with images, categories, and search on iPad
- [ ] **POS-02**: Staff can tap products to add to cart, adjust quantities
- [ ] **POS-03**: Staff can apply percentage or fixed-amount discounts per line item
- [ ] **POS-04**: Cart shows subtotal, GST breakdown (per-line on discounted amounts), and total
- [ ] **POS-05**: Staff selects payment method (EFTPOS or cash)
- [ ] **POS-06**: EFTPOS confirmation step: "Did the terminal show APPROVED?" Yes completes sale, No voids
- [ ] **POS-07**: Completed sale atomically decrements stock and creates order record
- [ ] **POS-08**: POS re-fetches stock after each sale and on page focus (no stale data)
- [ ] **POS-09**: Out-of-stock warning displayed, owner can override

### Online Store

- [ ] **STORE-01**: Public storefront displays products with images, categories, search
- [ ] **STORE-02**: Product detail pages are server-rendered for SEO
- [ ] **STORE-03**: Customer can add products to cart and proceed to Stripe Checkout
- [ ] **STORE-04**: Customer can apply promo codes (percentage or fixed, with validation)
- [ ] **STORE-05**: Stripe webhook confirms payment, atomically decrements stock, creates order
- [ ] **STORE-06**: Webhook is idempotent (stripe_events dedup table with unique constraint)
- [ ] **STORE-07**: Order lifecycle: PENDING → COMPLETED (on webhook) or EXPIRED (session timeout)
- [ ] **STORE-08**: Out-of-stock products show "Sold Out" and cannot be added to cart
- [ ] **STORE-09**: Click-and-collect: PENDING_PICKUP → READY → COLLECTED status flow

### Discounts & Promos

- [ ] **DISC-01**: Owner can create promo codes with type (percentage/fixed), value, min order, max uses, expiry
- [ ] **DISC-02**: Online store validates promo codes with rate limiting (10/min per IP)
- [ ] **DISC-03**: POS staff can apply manual discounts with reason (staff, damaged, loyalty)
- [ ] **DISC-04**: GST recalculates correctly on discounted line items

### Reporting & Admin

- [ ] **ADMIN-01**: Dashboard shows today's sales total, order count, by channel (POS vs online)
- [ ] **ADMIN-02**: End-of-day cash-up report: totals by payment method, expected vs actual cash, variance
- [ ] **ADMIN-03**: Cash sessions tracked (opening float, close time, closed by)
- [ ] **ADMIN-04**: Basic sales reports: daily totals, top products, stock levels
- [ ] **ADMIN-05**: GST period summary with breakdown for filing
- [ ] **ADMIN-06**: Low stock alerts on dashboard when products hit reorder threshold
- [ ] **ADMIN-07**: Order list with status, channel, payment method, staff, date

### Xero Integration

- [ ] **XERO-01**: Owner can connect Xero via OAuth 2.0 flow
- [ ] **XERO-02**: Daily automated sync pushes previous day's sales as a single Xero invoice with GST breakdown
- [ ] **XERO-03**: Xero sync log tracks every attempt (success/fail/invoice ID/error)
- [ ] **XERO-04**: Owner can trigger manual sync from admin dashboard
- [ ] **XERO-05**: Token refresh handled automatically; admin notified if Xero disconnects
- [ ] **XERO-06**: Tokens stored in Supabase Vault (not plain DB columns)

### Refunds

- [ ] **REF-01**: Owner can process full refund (marks order as refunded)
- [ ] **REF-02**: Refunded orders visible in reporting with refund status

### Deployment

- [x] **DEPLOY-01**: CI/CD via GitHub Actions: test → deploy to Vercel → Supabase migrations
- [x] **DEPLOY-02**: iPad PWA: manifest, icons, fullscreen mode, installable

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### EFTPOS Integration
- **EFTPOS-01**: Software integration with Windcave or Stripe Terminal (auto-send amount to terminal)

### Mobile Enhancements
- **MOB-01**: Barcode scanning via device camera (html5-qrcode, UPC/EAN-13)
- **MOB-02**: Receipt printing via ESC/POS thermal printer
- **MOB-03**: Email receipts to customers

### Offline Mode
- **OFF-01**: PWA service worker caching of product data
- **OFF-02**: Local-first checkout queue with sync on reconnect

### Analytics
- **ANA-01**: Dashboard analytics charts (sales trends, category breakdown)
- **ANA-02**: Stock adjustment audit log

### Multi-Store
- **MULTI-01**: Store switching UI for multi-tenant operators
- **MULTI-02**: Self-serve onboarding for new stores

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Delivery/shipping | Click-and-collect only for v1. Delivery adds shipping logic, courier integration. |
| Loyalty program | Not needed for supplies store. Add if customer demand emerges. |
| Lay-by management | Not needed for supplies store. NZ-specific, add in v2 if validated. |
| Staff rostering | Separate concern. Use existing tools (Deputy, Tanda). |
| Customer accounts (v1) | Online customers check out as guests. Accounts deferred to v1.1. |
| Partial refunds | Full refund only in v1. Partial refunds need their own data model + Xero credit notes. |
| Real-time inventory via WebSocket | Refresh-on-transaction is simpler and sufficient for 1-2 terminals. |

## Traceability

| REQ-ID | Phase | Status |
|--------|-------|--------|
| FOUND-01 | Phase 1 | Complete |
| FOUND-02 | Phase 1 | Complete |
| FOUND-03 | Phase 1 | Complete |
| FOUND-04 | Phase 1 | Complete |
| FOUND-05 | Phase 1 | Complete |
| FOUND-06 | Phase 1 | Complete |
| FOUND-07 | Phase 1 | Complete |
| AUTH-01 | Phase 1 | Complete |
| AUTH-02 | Phase 1 | Complete |
| AUTH-03 | Phase 1 | Complete |
| AUTH-04 | Phase 1 | Complete |
| AUTH-05 | Phase 1 | Complete |
| DEPLOY-01 | Phase 1 | Complete |
| DEPLOY-02 | Phase 1 | Complete |
| PROD-01 | Phase 2 | Complete |
| PROD-02 | Phase 2 | Complete |
| PROD-03 | Phase 2 | Complete |
| PROD-04 | Phase 2 | Pending |
| PROD-05 | Phase 2 | Complete |
| PROD-06 | Phase 2 | Pending |
| POS-01 | Phase 3 | Pending |
| POS-02 | Phase 3 | Pending |
| POS-03 | Phase 3 | Pending |
| POS-04 | Phase 3 | Pending |
| POS-05 | Phase 3 | Pending |
| POS-06 | Phase 3 | Pending |
| POS-07 | Phase 3 | Pending |
| POS-08 | Phase 3 | Pending |
| POS-09 | Phase 3 | Pending |
| DISC-03 | Phase 3 | Pending |
| DISC-04 | Phase 3 | Pending |
| STORE-01 | Phase 4 | Pending |
| STORE-02 | Phase 4 | Pending |
| STORE-03 | Phase 4 | Pending |
| STORE-04 | Phase 4 | Pending |
| STORE-05 | Phase 4 | Pending |
| STORE-06 | Phase 4 | Pending |
| STORE-07 | Phase 4 | Pending |
| STORE-08 | Phase 4 | Pending |
| STORE-09 | Phase 4 | Pending |
| DISC-01 | Phase 4 | Pending |
| DISC-02 | Phase 4 | Pending |
| ADMIN-01 | Phase 5 | Pending |
| ADMIN-02 | Phase 5 | Pending |
| ADMIN-03 | Phase 5 | Pending |
| ADMIN-04 | Phase 5 | Pending |
| ADMIN-05 | Phase 5 | Pending |
| ADMIN-06 | Phase 5 | Pending |
| ADMIN-07 | Phase 5 | Pending |
| REF-01 | Phase 5 | Pending |
| REF-02 | Phase 5 | Pending |
| XERO-01 | Phase 6 | Pending |
| XERO-02 | Phase 6 | Pending |
| XERO-03 | Phase 6 | Pending |
| XERO-04 | Phase 6 | Pending |
| XERO-05 | Phase 6 | Pending |
| XERO-06 | Phase 6 | Pending |
