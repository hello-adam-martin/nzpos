# NZPOS

## What This Is

A custom retail POS system for NZ small businesses. Runs on an iPad tablet for in-store checkout, has a public online storefront for customers, and an admin dashboard for the owner. Built specifically for the NZ market (GST, EFTPOS, NZD). The founder's supplies store is the first customer.

## Current State

**Shipped:** v1.0 MVP (2026-04-02), v1.1 feature waves (2026-04-02)

The complete v1 is built and tested: 191 source files, 17,423 LOC TypeScript, 502 tests passing. All 6 phases shipped across 33 plans. v1.1 added barcode scanning, screen receipts, email notifications, customer accounts, and partial refunds (Phases 8-11 complete). Phase 7 (production deploy) partially complete — DEPLOY-02/03/04 still pending real infrastructure.

**Known gaps:** Xero integration requires live OAuth credentials for final UAT. Customer accounts require live Supabase for UAT. Production deploy (Supabase, Stripe live keys, catalog import) not yet completed. All automated tests pass.

## Current Milestone: v2.0 SaaS Platform

**Goal:** Transform NZPOS from a single-store app into a multi-tenant SaaS platform where any NZ small business can sign up for free and optionally pay for premium add-ons.

**Target features:**
- Multi-tenant infrastructure (tenant provisioning, store isolation, wildcard subdomain routing, tenant resolution middleware)
- Merchant self-serve signup (sign up, create store, get a working POS + storefront immediately)
- Store setup wizard (logo, categories, initial products, storefront branding)
- Feature gating + Stripe subscriptions (free core POS/storefront/admin, paid add-ons)
- Custom domains (paid add-on, merchants bring their own domain)
- Marketing landing page (public site explaining the product, signup CTA)
- Super admin panel (manage all tenants, monitor usage, handle support)

**Pricing model:** Free core (POS checkout, storefront, basic admin/reports, customer accounts, partial refunds). Paid add-ons via Stripe subscriptions: Xero integration, email notifications, custom domains.

**Approach:** SaaS transformation. Multi-tenant first, then self-serve onboarding, then billing/gating, then public launch.

## Core Value

A store owner can ring up a sale in-store and take an order online, from a single inventory that stays in sync, with GST handled correctly.

## Requirements

### Validated

- [x] GST handling (15%, tax-inclusive display, per-line rounding on discounted items) — v1.0
- [x] User auth (owner email/password, staff PIN login with lockout) — v1.0
- [x] Multi-tenant data model (store_id on all tables for future expansion) — v1.0
- [x] Product catalog with categories, SKUs, images, and stock tracking — v1.0
- [x] POS checkout on iPad (product grid, cart, discounts, EFTPOS/cash recording) — v1.0
- [x] Online storefront with Stripe checkout and promo codes — v1.0
- [x] Shared inventory with atomic stock decrement (no overselling) — v1.0
- [x] End-of-day cash-up / reconciliation report — v1.0
- [x] Xero integration (OAuth, daily sales sync with GST breakdown) — v1.0
- [x] CSV product import — v1.0
- [x] Refund handling (full refund, mark order as refunded) — v1.0
- [x] Low stock alerts — v1.0
- [x] Click-and-collect order workflow (pending_pickup → ready → collected) — v1.0
- [x] Basic reporting (daily sales, top products, stock levels) — v1.0
- [x] EFTPOS confirmation step (terminal approved? yes/no before completing sale) — v1.0

### Active

See `.planning/REQUIREMENTS.md` for v2.0 requirements with REQ-IDs.

### Out of Scope

- Offline mode — significant complexity, requires local-first architecture (v2)
- Multi-store management UI — store_id in schema but no UI for store switching (v2)
- Delivery/shipping — click-and-collect only for v1
- Loyalty program — not needed for supplies store
- Lay-by management — not needed for supplies store
- Staff rostering — separate concern, use existing tools
- Advanced analytics / charts — basic reporting is sufficient for v1
- Integrated EFTPOS terminal — standalone terminal with manual entry, Windcave integration deferred (TODOS.md)
- Physical receipt printer integration — screen receipt in v1.1, printer when hardware purchased
- Repeat order button — deferred until customer accounts have real usage data
- Supabase Realtime — polling sufficient for single terminal

## Context

- Founder runs a short-term property management company and is launching a supplies store
- Walk-in retail is the primary business, property management supply is secondary
- NZ POS market has established players (Square, Lightspeed/Vend, POSbiz) but founder chose custom build for full ownership and potential SaaS expansion
- Design system shipped: deep navy (#1E293B) + amber (#E67E22), Satoshi + DM Sans typography (see DESIGN.md)
- v1.0 shipped 2026-04-02 with 502 tests passing, 211 commits, 17,423 LOC TypeScript

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
*Last updated: 2026-04-03 after v2.0 milestone start*
