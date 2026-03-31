# Project Research Summary

**Project:** NZPOS — NZ Retail POS System
**Domain:** Retail POS with online storefront, NZ compliance
**Researched:** 2026-04-01
**Confidence:** HIGH (stack verified against live docs; NZ compliance from stable IRD rules; architecture from official patterns)

## Executive Summary

NZPOS is a unified retail POS and online storefront for the NZ market — three surfaces (iPad POS, public storefront, owner admin) sharing a single Postgres database, with NZ-specific compliance requirements baked into the data model from day one. The dominant expert pattern for this type of product in 2026 is a single Next.js 16 App Router application with three route-group surfaces, all mutations through Zod-validated Server Actions, and Supabase as the data + auth layer. No microservices, no message queue, no separate auth service. The architecture is deliberately monolithic for v1 to minimise ops burden on a solo developer.

The recommended approach is to build in six sequential layers: Foundation (schema + GST utilities + auth plumbing) → Product Catalog → POS surface → Online storefront → Admin operations → Integrations (Xero). This order is non-negotiable because every subsequent layer consumes the one before it — you cannot build POS checkout without a working product catalog, and you cannot build Xero sync without a working order model. The two biggest NZ differentiators are Xero integration (75%+ of NZ SMBs use it) and correct per-line GST rounding (competitors frequently get this wrong), both of which require foundational data model decisions made before feature work begins.

The primary risks are IRD compliance (GST rounding must be a tested pure function, not an afterthought), data integrity under concurrent sales (atomic Postgres transactions with row-level locking for stock decrement), and Stripe webhook idempotency (duplicate events cause double inventory decrements without an explicit deduplication guard). All three risks are preventable with patterns that must be established in the Foundation phase — retrofitting them is expensive.

---

## Key Findings

### Recommended Stack

The chosen stack (Next.js + Supabase + Stripe + Tailwind) is validated as the correct choice. No changes recommended. The most significant version-specific finding is that Next.js is currently on v16.2 (released 2026-03-18), not v14/v15 as the team may assume — scaffold with `npx create-next-app@latest` to get v16. Tailwind is now on v4 which uses a CSS-first config model (`@theme` in globals.css) incompatible with v3 tutorials. Supabase requires `@supabase/ssr` (not the deprecated `@supabase/auth-helpers-nextjs`). Staff PIN sessions use a separate custom JWT via `jose` — two auth systems coexist by design.

**Core technologies:**
- **Next.js 16.2 + React 19**: Full-stack framework — App Router provides Server Components, Server Actions, and route groups for surface isolation
- **Supabase (@supabase/supabase-js ^2.x + @supabase/ssr)**: Postgres + Auth + Storage — RLS with custom JWT claims handles multi-tenant isolation without per-row joins
- **Stripe (stripe ^17.x + @stripe/stripe-js ^4.x)**: Online payments — Stripe Checkout hosted page for storefront; NO Terminal SDK in v1
- **Tailwind CSS 4.2**: Styling — CSS-first config via `@theme`, no `tailwind.config.js`
- **Zod ^3.x**: Server Action validation — every mutation input must pass Zod parse before touching the DB
- **jose ^5.x**: Staff PIN JWT — short-lived stateless tokens, Edge Runtime compatible
- **Vitest + Playwright**: Testing — Vitest for GST calculation unit tests (IRD compliance requirement); Playwright for E2E checkout flows
- **Vercel free tier + Supabase free tier**: Deployment — zero ops for v1; upgrade Supabase to Pro before first live customer

**Do not use:** Prisma (serverless cold start overhead), NextAuth/Clerk (conflicts with Supabase Auth), Supabase Realtime for inventory (silent WebSocket failures), Stripe Terminal SDK in v1, Tailwind v3, jest (use Vitest).

### Expected Features

**Must have (table stakes for v1 launch):**
- Product catalog with SKUs, categories, images, stock counts
- GST-inclusive pricing (15%, IRD-compliant per-line rounding on discounts)
- EFTPOS recording with explicit confirmation step ("Did terminal approve?")
- Cash recording with change calculation
- Cart/checkout flow with discounts
- Atomic inventory decrement shared between POS and online
- Full refunds (with stock reversal)
- Online storefront with Stripe checkout
- Click-and-collect order workflow (PENDING_PICKUP → READY → COLLECTED)
- Staff PIN login + owner email/password auth with role separation
- End-of-day cash reconciliation report
- Tax receipts/invoices (IRD-compliant: GST number, per-line amounts, GST total)
- Promo codes (percentage + fixed, expiry)
- CSV product import (SKU-based upsert)
- Basic reporting (daily sales, top products, stock levels)
- Low stock alerts
- Xero integration (OAuth + daily sync with GST breakdown)
- Multi-tenant store_id throughout

**Should have (differentiators that justify switching from Square/Lightspeed):**
- Correct per-line GST on discounted items — IRD-compliant, competitors often wrong
- Xero integration — biggest NZ differentiator, 75%+ SMB market share
- Unified inventory (online + in-store, atomic) — genuine technical value
- iPad-native POS UX with 48px touch targets, no hardware lock-in
- Owner admin dashboard (catalog + orders + reports in one place)
- Multi-tenant SaaS architecture from day 1

**Defer to v1.1:**
- Integrated EFTPOS terminal (Verifone/Worldline SDK certification required)
- Barcode scanning
- Thermal receipt printing
- Email receipts and notifications
- Custom domain on storefront

**Defer to v2+:**
- Offline mode (local-first architecture doubles complexity)
- Loyalty/points program
- Lay-by management
- Delivery/shipping integration
- Advanced analytics/charts
- Multi-store management UI
- Customer account management
- Gift cards
- Split payments

### Architecture Approach

Single Next.js application with three route groups (`(pos)`, `(store)`, `(admin)`) sharing one Supabase database and one set of Server Actions. No microservices. All mutations through Server Actions (never client-side Supabase SDK calls). Inventory is a Postgres table with `SELECT FOR UPDATE` row-level locking — not a service. Auth is two systems: Supabase Auth email/password for owners, custom jose JWT for staff PINs. Stripe webhooks are the authoritative order creator — no DB record until `checkout.session.completed` fires. Inventory sync uses refresh-on-transaction (`revalidatePath` after Server Action) rather than Supabase Realtime WebSockets.

**Major components:**
1. **(pos)/ surface** — iPad POS UI; staff PIN auth; ephemeral React cart state; 2-step EFTPOS confirmation; Server Action for atomic sale completion
2. **(store)/ surface** — Public storefront; localStorage cart; Stripe Checkout redirect; order status polling
3. **(admin)/ surface** — Owner-only; product CRUD, order management, cash-up, reports, Xero sync
4. **Server Actions layer** — All mutations; Zod validation on every input; `store_id` always from JWT, never from client input
5. **Supabase Postgres** — Single source of truth; RLS via custom JWT claims (`store_id` + `role` embedded at login); all monetary columns as INTEGER cents
6. **Stripe webhook handler** (`/api/webhooks/stripe/route.ts`) — Idempotent via `stripe_events` deduplication table; wraps order creation + stock decrement in one Postgres transaction
7. **GST utility** (`lib/gst.ts`) — Pure function, integer cents, per-line calculation, unit-tested before use anywhere

### Critical Pitfalls

1. **GST rounding at order total instead of per line** — Use `Math.round(lineTotalCents * 15 / 115)` per line, sum line GST amounts for order total. Write as a pure function with IRD specimen test cases before any checkout code is written. Failure causes IRD audit exposure and Xero reconciliation failures.

2. **Missing store_id RLS on any table** — Enable RLS on every table in every migration. Add a CI check that queries `pg_tables` and fails if any non-system table has `rowsecurity = false`. Cross-tenant data leakage is silent — no error, wrong data returned.

3. **Stripe webhook duplicate event processing** — Insert `stripe_event_id` into a `stripe_events` table with a UNIQUE constraint as the first operation in every webhook handler. On unique violation (duplicate event), return 200 immediately. Wraps entire handler in a single Postgres transaction. Without this, duplicate events cause double stock decrements and duplicate orders.

4. **EFTPOS phantom sale** — The sale must not be persisted until staff explicitly confirms "Terminal approved" in a full-screen modal with no dismissible escape. The `awaiting_eftpos_confirmation` state must be persisted (not just React state) to survive browser refresh. Log confirmation with staff ID and timestamp for audit.

5. **Supabase RLS performance from auth.users table joins** — Use custom JWT claims (`store_id` + `role` in `raw_app_meta_data`) so RLS policies evaluate `(auth.jwt() ->> 'store_id')::uuid = store_id` with no subquery. Table joins in RLS policies add 2–11x query overhead and degrade POS performance as orders grow. Must be configured in Layer 0 — retrofitting requires rewriting all RLS policies.

**Additional pitfalls worth flagging:**
- Float currency arithmetic — all monetary values must be INTEGER cents in both Postgres schema and JS
- Xero OAuth silent sync failures — build sync result logging and proactive token-expiry notification before shipping integration
- iPad UX failures — 48px minimum touch targets, `inputMode="numeric"` on inputs, disable-on-submit for all async operations, PWA manifest for standalone display mode
- Supabase free tier inactivity pause — upgrade to Pro before first live customer

---

## Implications for Roadmap

Based on the dependency chain in ARCHITECTURE.md and pitfall phase warnings, the following phase structure is strongly recommended:

### Phase 1: Foundation
**Rationale:** Everything depends on this. Schema, auth, and GST utilities are consumed by all six subsequent layers. Custom JWT claims cannot be retrofitted without rewriting every RLS policy. Integer cent schema cannot be changed after data exists. GST function must be unit-tested before it's called anywhere.
**Delivers:** Working Supabase project with schema + RLS, custom JWT claims, Next.js scaffold with route groups, shared Zod schemas, and a battle-tested GST calculation module
**Addresses:** Multi-tenant isolation (store_id on every table), IRD-compliant GST calculation
**Avoids:** Pitfall 1 (GST rounding), Pitfall 2 (RLS bypass), Pitfall 4 (RLS performance), Pitfall 7 (float currency)

### Phase 2: Product Catalog
**Rationale:** Both POS and storefront need products in the database before they can be built or tested. CSV import belongs here because it uses the same Server Actions as manual product creation.
**Delivers:** Product CRUD with images (Supabase Storage), category management, CSV import with SKU-based upsert and preview diff
**Addresses:** Product catalog, CSV import, image upload, low stock threshold setup
**Avoids:** Pitfall 12 (CSV duplicates via SKU upsert), Pitfall 13 (compound indexes on store_id + category_id)

### Phase 3: POS Surface
**Rationale:** The core in-store workflow. Depends on products (Phase 2) and auth foundation (Phase 1). Cash-up and reporting depend on POS orders existing.
**Delivers:** Staff PIN auth, iPad product grid, cart with discounts, EFTPOS confirmation state machine, cash recording, atomic sale completion Server Action, post-sale refresh
**Addresses:** POS checkout flow, EFTPOS recording, cash recording, per-line GST on sales, staff PIN login
**Avoids:** Pitfall 5 (EFTPOS phantom sale), Pitfall 8 (Realtime WebSocket), Pitfall 11 (iPad UX), Pitfall 6 (Server Action validation)
**Uses:** `lib/gst.ts` from Phase 1; `completePOSSale` Server Action with `decrement_stock` Postgres RPC

### Phase 4: Online Storefront
**Rationale:** Depends on products (Phase 2). Promo codes depend on storefront checkout. Stripe webhook idempotency guard must be in place before any real payment is processed.
**Delivers:** Public product listing (Server Components), storefront cart (localStorage), Stripe Checkout Session creation, `checkout.session.completed` webhook with idempotency guard and atomic stock decrement, order confirmation page, click-and-collect status transitions
**Addresses:** Online storefront, Stripe checkout, promo codes, click-and-collect workflow, shared inventory
**Avoids:** Pitfall 3 (Stripe duplicate events), Pitfall 10 (click-and-collect stock not reserved at order creation), Anti-pattern (creating orders on form submit rather than webhook)

### Phase 5: Admin Operations
**Rationale:** Depends on POS orders (Phase 3) and online orders (Phase 4) existing to be meaningful. Cash-up is meaningless without POS transactions. Owner auth sits here rather than Phase 1 because admin surface is not blocking earlier phases (staff PIN covers POS; storefront is public).
**Delivers:** Owner email/password auth (Supabase Auth), order management with click-and-collect status updates, full refund handling, end-of-day cash reconciliation, basic reporting (daily sales, top products, stock levels), low stock alerts
**Addresses:** End-of-day cash reconciliation, refunds, order management, basic reporting, owner dashboard
**Avoids:** Pitfall 15 (PIN lockout with remote unlock in owner dashboard)

### Phase 6: Xero Integration
**Rationale:** No blockers within the core product — Xero sync reads order data that exists after Phases 3–5. Intentionally last because it is the most complex integration and adds no user-facing value until core product is proven.
**Delivers:** Xero OAuth connect flow (token stored in Supabase), daily sales journal sync with GST breakdown, sync result logging, proactive token-expiry notification in admin dashboard
**Addresses:** Xero integration, GST-aware accounting sync
**Avoids:** Pitfall 9 (silent Xero sync failures)

### Phase Ordering Rationale

- Layer 0 (Foundation) blocks everything — custom JWT claims, integer schema, and GST utilities cannot be bolted on after data exists
- Product catalog precedes both POS and storefront because both surfaces need real products to build against
- POS precedes admin reporting because cash-up and end-of-day reports require transaction data
- Online storefront is independent of POS but must include the Stripe webhook idempotency guard before going live
- Xero is last because it adds integration complexity to an already-complete system; its only dependency is having order data to sync
- Hardening (Vitest unit tests for GST, Playwright E2E for checkout flows, error boundaries) runs alongside all phases, not as a separate phase

### Research Flags

Phases needing deeper research during planning:
- **Phase 6 (Xero):** OAuth 2.0 scopes for Xero journal entry API, current token lifetime, and the "manual journal vs invoice batch" decision need live verification at `developer.xero.com` before implementation
- **Phase 4 (Stripe webhook):** Verify current recommended idempotency pattern at `stripe.com/docs/webhooks/best-practices` — the pattern is stable but Stripe occasionally updates recommended field names

Phases with well-documented standard patterns (skip research-phase):
- **Phase 1 (Foundation):** Next.js App Router scaffold, Supabase custom JWT claims, and Zod validation patterns are all verified against official docs
- **Phase 3 (POS):** Server Actions + Postgres transactions + `revalidatePath` pattern is canonical and well-documented
- **Phase 4 (Stripe):** Stripe Checkout + webhook handler is the standard Stripe integration path with extensive official documentation

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Core stack verified against Next.js 16.2.1 official docs (2026-03-25). Version numbers confirmed. |
| Features | MEDIUM-HIGH | IRD GST rules and NZ EFTPOS patterns are HIGH confidence (stable since 2010). Competitor feature analysis is MEDIUM (training data to mid-2025). |
| Architecture | HIGH | Patterns sourced from official Next.js, Supabase, and Stripe documentation. Engineering review decisions already made. |
| Pitfalls | MEDIUM-HIGH | GST, Stripe idempotency, Supabase RLS performance are HIGH confidence. Xero token lifetime and Supabase Auth Hooks implementation syntax need live verification. |

**Overall confidence:** HIGH for core build decisions. MEDIUM for Xero integration specifics and competitor positioning.

### Gaps to Address

- **Supabase Auth Hooks syntax for custom JWT claims:** Feature was in beta/GA transition at training cutoff. Verify implementation at `supabase.com/docs/guides/auth/custom-claims-and-role-based-access-control` before Phase 1 auth work begins.
- **Xero API scopes and journal entry format:** Verify required OAuth scopes and manual journal API endpoint at `developer.xero.com` before Phase 6. Xero OAuth 2.0 refresh token lifetime (60 days) should be confirmed.
- **Supabase free tier inactivity pause threshold:** Was 7 days at training cutoff — verify current policy at `supabase.com/pricing` and add Pro upgrade to go-live checklist.
- **IRD tax invoice simplified invoice threshold:** $50 threshold cited from training data — verify current threshold at `ird.govt.nz` before receipt/invoice feature ships.
- **NZ Privacy Act 2020 obligations for click-and-collect email:** Storing customer email for order notifications may trigger privacy policy requirements — verify scope of obligation before adding any email capture to storefront.

---

## Sources

### Primary (HIGH confidence — live docs verified by STACK researcher)
- Next.js 16.2.1 official documentation, confirmed 2026-03-25: https://nextjs.org/docs
- Next.js authentication guide (official, 2026-03-25): https://nextjs.org/docs/app/guides/authentication
- Next.js Vitest + Playwright testing guides (official, 2026-03-25): https://nextjs.org/docs/app/guides/testing/vitest
- Tailwind CSS v4 + Next.js install guide: https://tailwindcss.com/docs/installation/framework-guides/nextjs
- Next.js blog — v16.2 release (confirmed 2026-03-18): https://nextjs.org/blog

### Secondary (HIGH confidence — stable rules from authoritative sources in training data)
- IRD GST rules: 15% rate unchanged since 2010, per-line calculation method, tax invoice requirements
- Stripe webhook idempotency pattern: canonical Stripe best practice, unchanged for years
- Postgres `SELECT FOR UPDATE` for concurrent stock decrement: fundamental Postgres pattern
- Apple Human Interface Guidelines: 44pt minimum touch target recommendation (stable)
- Supabase RLS JWT claims performance: documented in Supabase blog and GitHub issues pre-cutoff

### Tertiary (MEDIUM confidence — training data only, verify before implementation)
- Xero market share in NZ: frequently cited 70–75% figure, training data to mid-2025
- Supabase Auth Hooks for custom JWT claims: feature in beta/GA transition at cutoff — verify current syntax
- Xero OAuth 2.0 token lifetime (60-day refresh token): verify at developer.xero.com
- Supabase free tier inactivity pause (7 days): verify current threshold at supabase.com/pricing
- Competitor feature sets (Square NZ, Lightspeed, Vend, POSbiz): training data to mid-2025

---
*Research completed: 2026-04-01*
*Ready for roadmap: yes*
