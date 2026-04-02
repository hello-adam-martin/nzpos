# Milestones

## v1.0 MVP (Shipped: 2026-04-02)

**Phases completed:** 6 phases, 33 plans, 502 tests passing
**Timeline:** 2026-04-01 to 2026-04-02 (211 commits, 191 TS/TSX files, 17,423 LOC)

**Key accomplishments:**

1. **Foundation** — Next.js 16 + Tailwind v4 + Supabase scaffold with multi-tenant Postgres schema (9 tables, integer cents, RLS via custom JWT claims), dual auth (owner email + staff PIN with lockout), GST module, and PWA manifest
2. **Product Catalog** — Full product CRUD with image upload (sharp WebP), drag-and-drop categories, CSV import (500+ rows), admin data table with search/filters
3. **POS Checkout** — iPad product grid with cart, per-line discounts with GST recalc, EFTPOS confirmation step, atomic stock decrement, refresh-on-transaction sync
4. **Online Store** — Public storefront with Stripe Checkout, promo codes with rate limiting, idempotent webhooks, click-and-collect status flow (PENDING_PICKUP → READY → COLLECTED)
5. **Admin & Reporting** — Owner dashboard, order management with refunds, end-of-day cash-up with denomination breakdown, sales/GST/stock reports with CSV export
6. **Xero Integration** — OAuth connect with Vault-backed token storage, daily automated sync (Vercel Cron at 2am NZST), invoice builder with GST breakdown, retry with exponential backoff

## v1.1 Production Launch + Feature Waves (In Progress)

**Phases completed:** 4 of 5 (Phases 8-11 shipped 2026-04-02)
**Phase 7 (Production Launch):** 1/3 plans complete — DEPLOY-02/03/04 pending real infrastructure

**Key accomplishments:**

1. **Checkout Speed** — iPad barcode scanning (EAN-13/UPC-A via html5-qrcode camera overlay), screen receipt display after POS sale (store info, line items, GST breakdown, total, payment method), shared receipt data model for future printer support
2. **Notifications** — Resend email infrastructure with React Email templates, transactional triggers (online receipt, POS receipt, pickup-ready), daily summary cron with sales aggregation + low stock alerts, POS order arrival sound alerts with mute toggle
3. **Customer Accounts** — Supabase Auth customer signup/signin on storefront, order history with card list + detail view, profile with preferences, auth hook extended for customer role, middleware blocks customers from POS/admin, post-purchase account prompt, email verification + password reset
4. **Partial Refunds** — Line-item selection UI, Stripe partial refund processing, atomic stock restoration, Xero credit note generation, full refund audit trail

---
