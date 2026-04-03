# NZPOS

## What This Is

A multi-tenant SaaS POS + online store platform for NZ small businesses. Any merchant can sign up, get a working POS and storefront on a subdomain, and optionally subscribe to paid add-ons (Xero, email notifications). Runs on iPad for in-store checkout, public storefront for customers, admin dashboard for owners, and a super admin panel for platform operations. Built for the NZ market (GST, EFTPOS, NZD).

## Current Milestone: v2.1 Hardening & Documentation

**Goal:** Comprehensive code review, security audit, and full documentation coverage to prepare for production deployment, merchant onboarding, and future developer contributions.

**Target features:**
- Security audit (OWASP top 10, RLS policy review, auth flow verification, input validation)
- Code quality review (dead code removal, consistency, error handling, performance)
- Test coverage gap analysis and filling
- API & architecture documentation (Server Actions, Route Handlers, data flow)
- Developer documentation (setup guide, architecture overview, env vars, contribution guide)
- User-facing documentation (merchant onboarding guide, admin manual)
- Deployment runbook (production Supabase, Stripe live, Vercel config, monitoring)
- Inline documentation for complex business logic (GST, Xero sync, tenant provisioning)

## Current State

**Shipped:** v1.0 MVP (2026-04-02), v2.0 SaaS Platform (2026-04-03)

336 source files, 36,329 LOC TypeScript, 365+ tests passing. 16 phases shipped across 66 plans (33 v1.0, 33 v2.0).

**v2.0 delivered:** Multi-tenant infrastructure with wildcard subdomain routing and RLS isolation. Self-serve merchant signup with email verification. Store setup wizard and marketing landing page. Stripe billing with per-add-on subscriptions and feature gating. Super admin panel with tenant management, suspension enforcement, and audit trail. Barcode scanning, screen receipts, email notifications, customer accounts, and partial refunds.

**Known gaps:** Production deploy (Supabase prod, Stripe live keys, catalog import) not yet completed — DEPLOY-02/03/04 pending. Xero/customer accounts require live Supabase for final UAT. MKTG-01/02 built but not formally checked off. Human UAT pending for phases 11 and 16.

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

### Active

(Milestone v2.1 — requirements being defined)

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
- Custom domains — deferred to v2.1, infrastructure ready but UI/DNS verification not built
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
- Platform is now multi-tenant SaaS — any NZ business can sign up at the root domain
- Pricing: free core POS/storefront/admin, paid add-ons via Stripe (Xero, email notifications)
- Super admin panel operational for platform management

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
*Last updated: 2026-04-04 after v2.1 milestone started*
