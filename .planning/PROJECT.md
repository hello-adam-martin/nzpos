# NZPOS

## What This Is

A custom retail POS system for NZ small businesses. Runs on an iPad tablet for in-store checkout, has a public online storefront for customers, and an admin dashboard for the owner. Built specifically for the NZ market (GST, EFTPOS, NZD). The founder's supplies store is the first customer.

## Core Value

A store owner can ring up a sale in-store and take an order online, from a single inventory that stays in sync, with GST handled correctly.

## Requirements

### Validated

- [x] GST handling (15%, tax-inclusive display, per-line rounding on discounted items) — Validated in Phase 01: Foundation
- [x] User auth (owner email/password, staff PIN login with lockout) — Validated in Phase 01: Foundation
- [x] Multi-tenant data model (store_id on all tables for future expansion) — Validated in Phase 01: Foundation

### Active

- [x] Product catalog with categories, SKUs, images, and stock tracking — Validated in Phase 02: Product Catalog
- [x] POS checkout on iPad (product grid, cart, discounts, EFTPOS/cash recording) — Validated in Phase 03: POS Checkout
- [ ] Online storefront with Stripe checkout and promo codes
- [x] Shared inventory with atomic stock decrement (no overselling) — Validated in Phase 03: POS Checkout
- [ ] End-of-day cash-up / reconciliation report
- [ ] Xero integration (OAuth, daily sales sync with GST breakdown)
- [x] CSV product import — Validated in Phase 02: Product Catalog
- [ ] Refund handling (full refund, mark order as refunded)
- [ ] Low stock alerts
- [ ] Click-and-collect order workflow (pending_pickup → ready → collected)
- [ ] Basic reporting (daily sales, top products, stock levels)
- [x] EFTPOS confirmation step (terminal approved? yes/no before completing sale) — Validated in Phase 03: POS Checkout

### Out of Scope

- Offline mode — significant complexity, requires local-first architecture (v2)
- Multi-store management UI — store_id in schema but no UI for store switching (v2)
- Delivery/shipping — click-and-collect only for v1
- Loyalty program — not needed for supplies store
- Lay-by management — not needed for supplies store
- Staff rostering — separate concern, use existing tools
- Advanced analytics / charts — basic reporting is sufficient for v1
- Integrated EFTPOS terminal — standalone terminal with manual entry for v1, software integration in v1.1
- Barcode scanning — v1.1 (html5-qrcode library)
- Receipt printing — v1.1 (ESC/POS thermal printer)
- Email receipts — v1.1

## Context

- Founder runs a short-term property management company and is launching a supplies store
- Walk-in retail is the primary business, property management supply is secondary
- NZ POS market has established players (Square, Lightspeed/Vend, POSbiz) but founder chose custom build for full ownership and potential SaaS expansion
- Design system shipped: deep navy (#1E293B) + amber (#E67E22), Satoshi + DM Sans typography (see DESIGN.md)
- CEO review accepted 5 scope expansions: multi-tenant store_id, Xero, cash-up, discounts, product images
- Eng review added: Zod validation, custom JWT claims for RLS, Vitest + Playwright, GST rounding fix, EFTPOS confirmation, refresh-on-transaction (not Realtime), Stripe order lifecycle state machine, click-and-collect status model

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
| Custom build over off-the-shelf | Full ownership, potential SaaS product, founder wants to build | — Pending |
| Next.js + Supabase + Stripe | Standard 2026 stack, well-documented, AI-friendly | — Pending |
| Multi-tenant from day 1 (store_id) | Cheap insurance vs painful migration later. AI handles query friction. | — Pending |
| Xero integration in v1 | 75% of NZ small biz use Xero. Genuine differentiator. | — Pending |
| Refresh-on-transaction over Supabase Realtime | Simpler, self-healing, no WebSocket failure mode | — Pending |
| Custom JWT claims for RLS | Avoids 2-11x performance penalty of user table joins in RLS policies | — Pending |
| Deep navy + amber design system | Professional, trustworthy, distinctive vs competitors | — Pending |
| Zod validation on all Server Actions | Security baseline, catches malformed input before DB | — Pending |
| Per-line GST on discounted amounts | IRD-compliant. Rounding per-line then sum for order total. | — Pending |
| EFTPOS confirmation step | Prevents phantom sales when terminal declines but POS records payment | — Pending |
| Click-and-collect status model | PENDING_PICKUP → READY → COLLECTED. Staff marks status in admin/POS. | — Pending |

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
*Last updated: 2026-04-01 after Phase 03 completion*
