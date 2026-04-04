# Milestones

## v2.1 Hardening & Documentation (Shipped: 2026-04-04)

**Phases completed:** 4 phases, 14 plans, 20 tasks

**Key accomplishments:**

- Systematic security audit of 336-file NZPOS codebase producing 23 classified findings across 9 domains — 2 Critical, 14 High, 7 Low — with orders_public_read IDOR and 13 missing .env.example vars as top priorities
- Migration 021
- CSP Report-Only headers on all middleware responses, complete .env.example with 13 previously undocumented env vars, and server-only guards on three admin-client files
- IP-level PIN rate limiting via check_rate_limit RPC plus server-only defense-in-depth on 46 Server Action files, completing all 14 SEC requirements
- All 48 Server Action files now have server-only guards, anonymous order enumeration IDOR fully closed by dropping the RLS policy, and documentation corrected to 48 Server Actions
- Database types updated
- One-liner:
- Value exports (export keyword removed, values still used internally):
- Standardized error handling (zero error.message leaks), full JSDoc coverage on 17 lib/action files, and composite performance indexes for POS product grid and order queries
- docs/setup.md (7-step clone-to-running guide with lvh.me, Stripe CLI, and 6-item troubleshooting) and docs/env-vars.md (all 24 env vars in 9 grouped tables) created from scratch
- 48 Server Actions documented across 10 domains with name, auth requirement, Zod input schema summary, and one-line description in docs/server-actions.md
- Conversational 8-section merchant guide covering signup, setup wizard, first product, POS sale, and online order, with IRD-compliant GST worked examples and legal disclaimer.

---

## v2.0 SaaS Platform (Shipped: 2026-04-03)

**Phases completed:** 10 phases, 33 plans, 44 tasks

**Key accomplishments:**

- Stripe test mode banner wired into admin and storefront layouts via Server Component env detection, plus a 7-check CLI env validator that catches localhost URLs, placeholder values, weak secrets, and missing webhook config
- 1. [Rule 1 - Bug] Fixed Zod record() call syntax
- Quagga2 camera overlay with EAN-13/UPC-A decode, store-scoped barcode lookup, batch mode, beep/haptics, and search-focus fallback wired into the POS shell.
- 1. [Rule 1 - Bug] Fixed null type mismatch in RPC call
- 1. [Rule 1 - Bug] Class-based constructor mock for Resend
- NOTIF-01 — Online receipt (Stripe webhook):
- 1. [Rule 2 - Missing prop] DailySummaryEmail requires storeAddress and storePhone
- 30-second polling system with audible chime, amber badge on Pickups nav link, and slide-up toast using useNewOrderAlert hook wired into POSClientShell
- One-liner:
- One-liner:
- One-liner:
- Postgres migration for refunds/refund_items tables with RLS, PartialRefundSchema with line-item validation, and processPartialRefund server action handling Stripe partial refunds, atomic stock restore, Xero credit notes (graceful), and order status auto-upgrade
- Per-item refund selection UI with quantity spinners, Select All toggle, payment-method-specific confirmation messages, EFTPOS terminal confirmation step (navy overlay matching sale pattern), partially_refunded status badge and filter — wired into OrderDetailDrawer replacing the full-refund-only RefundConfirmationStep
- One-liner:
- Subdomain-based tenant resolution middleware using slug lookup with 5-min TTL cache, injecting x-store-id/x-store-slug headers for all downstream Server Actions via resolveAuth.ts.
- One-liner:
- Comprehensive D-16 security test suite with 10 Vitest RLS attack-vector tests and 7 Playwright E2E subdomain routing tests, plus regenerated database.ts with store_plans and super_admins.
- Atomic provision_store SECURITY DEFINER RPC, Zod slug validation with 26 reserved words, and in-memory IP rate limiter (5/hour) — tested foundations for merchant signup
- Complete server-side signup pipeline: ownerSignup with rate limiting + provision_store RPC + orphan cleanup, checkSlugAvailability, retryProvisioning, PKCE callback route with subdomain redirect, and email_confirmed_at gate in middleware
- Three merchant signup screens (form + provisioning + email verification) with slug availability check, step animation, and subdomain redirect — complete self-serve signup flow end-to-end
- Migration + 4 Server Actions + SVG-aware logo upload + pure checklist utility + middleware setup redirect, with 36 passing unit tests
- 11 wizard components + dashboard checklist + settings page + updateBranding Server Action + storefront branding wiring per D-16
- Root landing page (`src/app/page.tsx`):
- requireFeature() JWT/DB dual-path guard + addons config + auth hook migration injecting xero/email_notifications/custom_domain claims from store_plans
- Stripe billing webhook handler + subscription checkout + billing portal Server Actions, with 21 unit tests covering all lifecycle events, idempotency, trial periods, and auth guards
- One-liner:
- One-liner:
- Suspension columns + manual override tracking + super_admin_actions audit table with four Server Actions (suspend/unsuspend/activateAddon/deactivateAddon) fully tested via TDD
- 1. [Rule 1 - Bug] Middleware tests broken by cached-path suspension check
- 1. [Rule 1 - Bug] Fixed React form action type mismatch on unsuspendTenant

---

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
