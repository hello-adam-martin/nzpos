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

---
