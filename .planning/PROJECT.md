# NZPOS

## What This Is

A multi-tenant SaaS POS + online store platform for NZ small businesses. Any merchant can sign up, get a working POS and storefront on a subdomain, with email notifications included free and optional paid add-ons (Xero, inventory management). Runs on iPad for in-store checkout, public storefront for customers, admin dashboard for owners, and a super admin panel for platform operations. Built for the NZ market (GST, EFTPOS, NZD).

## Milestones Shipped

- **v1.0 MVP** — Phases 1-6 (shipped 2026-04-02): Foundation, product catalog, POS checkout, online store, admin & reporting, Xero integration
- **v2.0 SaaS Platform** — Phases 7-16 (shipped 2026-04-03): Multi-tenant, self-serve signup, billing, super admin, barcode scanning, receipts, notifications, customer accounts, partial refunds
- **v2.1 Hardening & Documentation** — Phases 17-20 (shipped 2026-04-04): Security audit, code quality, developer docs, deployment runbook, merchant onboarding
- **v3.0 Inventory Management** — Phases 21-23 (shipped 2026-04-05): Service product type, free-tier simplification, stock adjustments, stocktake, feature gating, POS/storefront integration
- **v4.0 Platform Analytics** — Phases 24-27 (shipped 2026-04-06): Staff RBAC, promo code admin, click-and-collect flow, Stripe analytics snapshots
- **v5.0 Marketing & Landing Page** — Phase 28 (shipped 2026-04-06): Hero/CTA copy rewrite, 15-feature showcase, NZ trust badges, corrected pricing, add-on detail pages
- **v6.0 Free Email Notifications** — Phases 29-31 (shipped 2026-04-06): Email notifications moved from $5/mo paid add-on to free tier across backend, admin UI, and marketing pages

## Current State

**Shipped:** v1.0 through v6.0 (2026-04-02 → 2026-04-06)

1,000+ source files, 49,000+ LOC TypeScript, 31 phases shipped across 100+ plans. Production-ready multi-tenant SaaS POS with inventory management and Xero as paid add-ons ($9/mo each), email notifications free for all stores. Landing page showcases 15 features, 2 paid add-ons, and NZ trust signals. Platform fully operational for merchant self-serve signup.

## Core Value

A store owner can ring up a sale in-store and take an order online, from a single inventory that stays in sync, with GST handled correctly.

## Requirements

### Validated

- ✓ GST handling (15%, tax-inclusive display, per-line rounding on discounted items) — v1.0
- ✓ User auth (owner email/password, staff PIN login with lockout) — v1.0
- ✓ Multi-tenant data model (store_id on all tables for future expansion) — v1.0
- ✓ Product catalog with categories, SKUs, images, and stock tracking — v1.0
- ✓ POS checkout on iPad (product grid, cart, discounts, EFTPOS/cash recording) — v1.0
- ✓ Online storefront with Stripe checkout and promo codes — v1.0
- ✓ Shared inventory with atomic stock decrement (no overselling) — v1.0
- ✓ End-of-day cash-up / reconciliation report — v1.0
- ✓ Xero integration (OAuth, daily sales sync with GST breakdown) — v1.0
- ✓ CSV product import — v1.0
- ✓ Refund handling (full refund, mark order as refunded) — v1.0
- ✓ Low stock alerts — v1.0
- ✓ Click-and-collect order workflow (pending_pickup → ready → collected) — v1.0
- ✓ Basic reporting (daily sales, top products, stock levels) — v1.0
- ✓ EFTPOS confirmation step (terminal approved? yes/no before completing sale) — v1.0
- ✓ Barcode scanning (EAN-13/UPC-A, camera overlay) — v2.0
- ✓ Screen receipts (store info, line items, GST breakdown) — v2.0
- ✓ Email notifications (order receipt, pickup-ready, daily summary, new order alert) — v2.0
- ✓ Customer accounts (signup, login, order history, profile) — v2.0
- ✓ Partial refunds (per-item, stock restore, Stripe partial refund, Xero credit note) — v2.0
- ✓ Multi-tenant infrastructure (wildcard subdomains, tenant cache, RLS isolation) — v2.0
- ✓ Merchant self-serve signup (email verification, atomic store provisioning) — v2.0
- ✓ Store setup wizard (3-step onboarding, logo upload, checklist) — v2.0
- ✓ Stripe billing (per-add-on subscriptions, feature gating, billing portal) — v2.0
- ✓ Super admin panel (tenant list, detail, suspend/unsuspend, add-on overrides, audit trail) — v2.0

- ✓ Security audit (RLS, auth, webhooks, input validation, CSP, secrets, rate limiting, audit trail) — v2.1
- ✓ Code quality & test coverage (434 tests, 80%+ coverage on critical paths, dead code removal, JSDoc) — v2.1
- ✓ Developer documentation (setup guide, env vars, architecture overview, server action inventory) — v2.1
- ✓ Deployment runbook (production Supabase, Stripe live keys, Vercel wildcard DNS, smoke test) — v2.1
- ✓ Merchant onboarding guide (signup through first sale, GST compliance explanation) — v2.1

- ✓ Service product type — `physical`/`service` column, RPCs skip stock for services, UI radio group on product form — v3.0
- ✓ Free-tier simplification — stock UI gated behind `has_inventory`, zero stock noise for free-tier stores — v3.0
- ✓ Inventory add-on core — stock tracking, manual adjustments with reason codes, stocktake with variance calculation — v3.0
- ✓ Feature gating — Stripe billing for inventory add-on, requireFeature() DB-path on mutations, JWT fast-path for UI — v3.0
- ✓ POS/Storefront stock integration — stock badges, out-of-stock blocking, sold-out states, all gated behind subscription — v3.0

- ✓ Staff RBAC (owner/manager/staff roles, role-gated server actions, admin UI filtering) — v4.0
- ✓ Customer management (search, detail page, order history, disable/enable accounts) — v4.0
- ✓ Promo code admin (edit, soft-delete, modal UI) — v4.0
- ✓ Store settings (business details, receipt customization, GST/IRD number) — v4.0
- ✓ Enhanced dashboard (7-day/30-day trend charts, period comparison, recent orders widget) — v4.0
- ✓ Super admin platform dashboard (tenant stats, signup trends, add-on adoption) — v4.0
- ✓ Super admin billing visibility (Stripe subscriptions, invoices, payment failures per tenant) — v4.0
- ✓ Super admin user management (password reset, account disable/enable) — v4.0
- ✓ Super admin analytics (MRR, churn, per-add-on revenue from materialised Stripe snapshots) — v4.0
- ✓ Marketing landing page (15-feature showcase, pricing section, NZ trust badges) — v5.0
- ✓ Email notifications moved to free tier (feature gate removal, billing cleanup, migration) — v6.0
- ✓ Marketing pages updated for 2-add-on pricing model — v6.0

### Active

(No active milestone — planning next)

### Out of Scope

- Offline mode — requires local-first architecture rewrite (v3)
- Multi-store per merchant — one store per signup for now, multi-store is v3
- Delivery/shipping — click-and-collect only
- Loyalty program — not needed for supplies store
- Lay-by management — not needed for supplies store
- Staff rostering — separate concern, use existing tools
- Advanced analytics / charts — basic reporting sufficient
- Integrated EFTPOS terminal — standalone terminal with manual entry, Windcave integration deferred
- Physical receipt printer integration — screen receipt shipped, printer when hardware purchased
- Custom domains — infrastructure ready (wildcard DNS) but UI/DNS verification not built
- White-label / remove branding — no demand signal
- Multi-plan tiers (Starter/Pro/Enterprise) — per-add-on billing is simpler
- Supabase Realtime — polling sufficient for single terminal per store
- Database-per-tenant — RLS row-level isolation scales to thousands of tenants

## Context

- Founder runs a short-term property management company and is launching a supplies store
- Walk-in retail is the primary business, property management supply is secondary
- NZ POS market has established players (Square, Lightspeed/Vend, POSbiz) but founder chose custom build for full ownership and SaaS expansion
- Design system shipped: deep navy (#1E293B) + amber (#E67E22), Satoshi + DM Sans typography (see DESIGN.md)
- v1.0 shipped 2026-04-02 with 502 tests, 211 commits, 17,423 LOC TypeScript
- v2.0 shipped 2026-04-03 with 365+ tests, 336 source files, 36,329 LOC TypeScript
- v2.1 shipped 2026-04-04 with 434 tests, 989 files, 89,000+ LOC TypeScript
- v3.0 shipped 2026-04-05 with inventory management add-on, service products, and stocktake workflows
- Platform is now multi-tenant SaaS — any NZ business can sign up at the root domain
- Pricing: free core POS/storefront/admin/email notifications, 2 paid add-ons via Stripe (Xero $9/mo, Inventory Management $9/mo)
- Super admin panel operational for platform management
- Full documentation suite: setup guide, env vars, architecture, server actions, deployment runbook, merchant guide
- CSP headers in Report-Only mode — switch to enforcing after production monitoring confirms no false positives

## Constraints

- **Tech stack:** Next.js App Router + Supabase + Stripe + Tailwind CSS. Non-negotiable (already reviewed and approved).
- **NZ compliance:** GST 15% tax-inclusive. Per-line GST calculation on discounted amounts. IRD-compliant.
- **EFTPOS:** Standalone terminal for v1 (no software integration). Manual entry with confirmation step.
- **Internet required:** No offline mode in v1. Refresh-on-transaction for inventory sync.
- **Solo developer:** Founder also runs property management business. Timeline must account for part-time availability.
- **Budget:** Minimal SaaS spend. Supabase free tier + Vercel free tier to start.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Custom build over off-the-shelf | Full ownership, potential SaaS product, founder wants to build | ✓ Good — shipped v1.0 |
| Next.js + Supabase + Stripe | Standard 2026 stack, well-documented, AI-friendly | ✓ Good — no framework blockers |
| Multi-tenant from day 1 (store_id) | Cheap insurance vs painful migration later. AI handles query friction. | ✓ Good — zero friction in practice |
| Xero integration in v1 | 75% of NZ small biz use Xero. Genuine differentiator. | ✓ Good — fully implemented |
| Refresh-on-transaction over Supabase Realtime | Simpler, self-healing, no WebSocket failure mode | ✓ Good — works for single terminal |
| Custom JWT claims for RLS | Avoids 2-11x performance penalty of user table joins in RLS policies | ✓ Good — clean RLS policies |
| Deep navy + amber design system | Professional, trustworthy, distinctive vs competitors | ✓ Good — consistent across all surfaces |
| Zod validation on all Server Actions | Security baseline, catches malformed input before DB | ✓ Good — caught bugs early |
| Per-line GST on discounted amounts | IRD-compliant. Rounding per-line then sum for order total. | ✓ Good — tested with IRD specimens |
| EFTPOS confirmation step | Prevents phantom sales when terminal declines but POS records payment | ✓ Good — no phantom sales possible |
| Click-and-collect status model | PENDING_PICKUP → READY → COLLECTED. Staff marks status in admin/POS. | ✓ Good — clean state machine |
| Integer cents throughout | No floating point math for money. All monetary columns INTEGER. | ✓ Good — zero rounding bugs |
| Staff PIN via jose JWTs (not Supabase Auth) | Independent from owner auth. 8h sessions. Fast shift changes. | ✓ Good — clean separation |
| Xero tokens in Supabase Vault | SECURITY DEFINER RPCs, not plain columns. service_role only access. | ✓ Good — tokens never in application memory |
| Tailwind v4 CSS-native config | No tailwind.config.js. @theme block in globals.css. | ⚠️ Revisit — spacing tokens caused v4 bugs |
| Per-add-on billing (not plan tiers) | Avoids upgrade cliffs, NZ market expects no-card signup | ✓ Good — clean Stripe integration |
| Row-level tenant isolation via store_id + RLS | Scales to thousands of tenants, no schema-per-tenant complexity | ✓ Good — zero isolation failures in testing |
| Custom domains deferred to v2.1 | Too complex for initial SaaS launch, lowest demand | ✓ Good — reduced scope without blocking launch |
| provision_store as SECURITY DEFINER RPC | Atomic tenant creation, service_role only, no client-side invocation | ✓ Good — clean separation |
| requireFeature() JWT/DB dual-path | JWT fast path for reads, DB fallback for critical mutations | ✓ Good — low latency with correctness guarantee |
| Super admin manual override booleans | has_xero_manual_override distinguishes admin comp from Stripe-paid | ✓ Good — clean billing separation |
| CSP Report-Only first, enforce later | Avoids breaking production with false positives on day one | ✓ Good — report-only deployed, switch when ready |
| IP-level PIN rate limiting via RPC | check_rate_limit SECURITY DEFINER RPC, not middleware | ✓ Good — works with serverless (no in-memory state) |
| CHECK constraint for product_type (not ENUM) | Allows easy future extension without migration | ✓ Good — simple ALTER for new types |
| Stock skip in RPCs, not UI | complete_pos_sale/complete_online_sale skip stock for services; UI is defense-in-depth | ✓ Good — single source of truth at DB layer |
| Append-only stock_adjustments table | INSERT+SELECT RLS only, no UPDATE/DELETE — immutable audit log | ✓ Good — tamper-proof history |
| SECURITY DEFINER RPCs for stock mutations | adjust_stock and complete_stocktake avoid app-layer loops | ✓ Good — atomic operations, no partial states |
| Free-tier silent stock decrement | Add-on gates management UI, not data pipeline — stock stays accurate | ✓ Good — data integrity preserved |
| server-only guards on all 48 Server Actions | Prevents accidental client-side import of server code | ✓ Good — build-time error if misused |
| Composite performance indexes for POS queries | product grid by store+category, orders by store+date | ✓ Good — measured improvement on large datasets |
| Single deploy.md with linear flow | One doc, top-to-bottom, no cross-references to lose | ✓ Good — followable by non-DevOps founder |
| NS delegation for wildcard DNS (not CNAME) | Vercel requires NS delegation for wildcard SSL cert | ✓ Good — documented prominently in deploy.md |
| Email notifications free (not paid add-on) | Reduces friction for new stores, email is table-stakes for any POS | ✓ Good — every store gets order confirmations out of the box |
| Keep has_email_notifications column (always true) | Backwards compatibility with existing queries, zero migration risk | ✓ Good — no breakage, clean removal possible later |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-06 after v6.0 milestone*
