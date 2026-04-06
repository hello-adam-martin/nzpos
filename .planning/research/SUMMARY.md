# Project Research Summary

**Project:** NZPOS v8.0 — Add-On Catalog Expansion
**Domain:** Multi-tenant SaaS POS — paid feature add-ons for NZ small retail merchants
**Researched:** 2026-04-06
**Confidence:** HIGH

---

## Executive Summary

NZPOS enters v8.0 as a fully operational multi-tenant SaaS POS with two paid add-ons already live (Xero at $9/mo, Inventory at $9/mo) and a complete billing pipeline built on Stripe subscriptions, Supabase RLS, and JWT-based feature gating. The v8.0 milestone adds new paid add-ons to grow MRR. The research confirms that the highest-opportunity add-ons for NZ small retail are Gift Cards ($14/mo), Advanced Reporting/COGS ($9/mo), and Loyalty Points ($15/mo) — in that build priority. All three are well below competitor pricing (Marsello charges NZ$100/mo for loyalty alone; Square charges A$49/mo; Lightspeed bundles these into plans starting at NZ$89/mo), giving NZPOS a strong price advantage in the NZ market.

The architecture requires no foundational changes. Every new add-on follows a proven four-step pattern: schema migration with RLS policies, config registration in `src/config/addons.ts`, Server Actions guarded by `requireFeature()`, and admin UI pages behind the feature gate. The existing `complete_pos_sale` and `complete_online_sale` RPCs are the key integration points for Loyalty and Gift Card redemption — hooks added inside these SECURITY DEFINER RPCs keep all side effects atomic. Purchase Orders is deferred to v8.1 or later due to high build complexity and dependency on Inventory Management adoption in production.

The primary risk in this milestone is NZ-specific compliance. Two legal requirements are non-negotiable and time-sensitive: the Fair Trading (Gift Card Expiry) Amendment Act 2024 (effective 16 March 2026, weeks before this build) mandates a 3-year minimum gift card expiry enforced by a DB check constraint; and the Privacy Act 2020 (with 2025 amendments taking effect 1 May 2026) requires privacy notices before any CRM or loyalty data collection. Gift card revenue must be modelled as deferred liability — it must never be recorded in the `orders` table at issuance. Violating this corrupts Xero sync and overstates GST payable from the first transaction. These compliance requirements cannot be retrofitted and must be built correctly in the first schema migration of Phase 1.

---

## Key Findings

### Recommended Stack

The existing stack (Next.js 16.2, Supabase, Stripe, Tailwind CSS v4) requires no changes for v8.0. The add-on billing infrastructure is already production-ready. Each new add-on adds one Stripe Price ID (env var), one boolean column per add-on to `store_plans`, and a rewrite of the `custom_access_token_hook` to inject the new JWT claim. The `requireFeature()` utility handles both JWT fast-path (reads) and DB-path (mutations) gating out of the box.

**Core technologies:**
- Next.js 16.2 + React 19: Full-stack framework with App Router Server Components and Server Actions — already in production, no changes needed
- Supabase (Postgres + Auth + RLS): JWT custom claims via `custom_access_token_hook` drive all feature gating — scales cleanly to 20+ add-ons without architectural change
- Stripe Subscriptions: One Price ID per add-on; webhook routes through `PRICE_TO_FEATURE` map; idempotency via `stripe_processed_events` table is required before any new add-on billing is wired up
- `requireFeature()` utility: JWT fast-path for page renders, DB-path for all mutations — this is the single gating mechanism; no add-on should create its own check

### Expected Features

**Must have (table stakes for v8.0 MRR):**
- Gift Cards ($14/mo) — every competitor offers this; NZ law change (March 2026) makes NZ-compliant digital gift cards a genuine differentiator; standalone, no add-on dependencies
- Advanced Reporting / COGS ($9/mo) — orders and line items already exist in the DB; adding `cost_price_cents` to products unlocks margin reports with minimal build complexity

**Should have (strong demand, v8.1):**
- Loyalty Points ($15/mo) — proven willingness to pay at much higher price points; NZPOS has existing customer accounts (zero friction vs. standalone tools like Marsello); requires a POS customer lookup UX change that needs design iteration

**Defer (v8.1 or v9.0):**
- Purchase Orders ($9/mo) — high complexity, hard dependency on Inventory Management adoption, multiple new tables and an RPC change; build after Loyalty and COGS validate the add-on demand model

**Explicitly out of scope (anti-features):**
- SMS marketing (NZ short-code costs NZ$275/mo — uneconomical at this price point)
- Booking/appointments (separate product category, out of POS scope)
- Loyalty VIP tiers (unnecessary complexity for NZ micro-retailers in v1)
- Physical gift card printing or EFTPOS tap-to-redeem (deferred hardware integration)

### Architecture Approach

The add-on integration architecture is a mature, defined four-step pipeline. No new patterns need to be invented. Every add-on plugs into the same flow: (1) schema migration with `store_plans` boolean columns plus new add-on tables with RLS; (2) config registration in `addons.ts`; (3) `requireFeature()`-guarded Server Actions; (4) gated admin UI pages. The two most critical integration points are the `complete_pos_sale` and `complete_online_sale` RPCs — both Loyalty (earn points) and Gift Cards (redemption) hook into these via optional parameters that call SECURITY DEFINER sub-functions. Keeping all side effects inside the RPC boundary is mandatory for atomicity.

**Major components:**
1. `store_plans` table — single source of truth for all feature flags; JWT hook reads it and injects boolean claims at login; add one column per new add-on
2. `requireFeature()` utility — JWT fast-path for read gates; DB-path for mutation gates; all add-ons use this, never custom permission checks
3. Add-on-specific tables and RPCs — each add-on owns its schema, all tables with `store_id` RLS, all mutations via SECURITY DEFINER RPCs
4. `src/config/addons.ts` — central config registry for `SubscriptionFeature` type, Stripe Price IDs, webhook routing map, and billing UI metadata
5. `/api/webhooks/stripe/billing` — single webhook handler for all subscription lifecycle events; must have idempotency via `stripe_processed_events` table before new add-ons go live

### Critical Pitfalls

1. **Gift card sale recorded as revenue instead of deferred liability** — gift card issuance must never write to the `orders` table. It writes to a separate `gift_cards` table. Only redemption creates an order. Xero sync must explicitly exclude gift card issuance rows. Violation corrupts GST accounting and Xero sync from day one and is unrecoverable without manual intervention.

2. **Gift card expiry under 3 years (NZ law violation)** — hard-code a DB check constraint: `expires_at >= issued_at + INTERVAL '3 years'`. The UI must offer only "3 years" or "No expiry." Expiry date must appear prominently in the gift card confirmation email. Penalty: up to $30,000 per offence under the Fair Trading Act 2024.

3. **Stripe webhook duplicate processing** — add a `stripe_processed_events` table and check event ID before processing any webhook. Wrap the idempotency insert and `store_plans` update in a single DB transaction. Audit the existing webhook handler before adding any new add-on event handling.

4. **New add-on tables without RLS policies** — every migration that creates a new table must include `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` and `store_id`-scoped policies in the same migration file. Cross-tenant isolation test must be in acceptance criteria for every phase with a new table.

5. **Privacy Act notice missing from loyalty/CRM data collection** — any customer-facing enrollment flow must display a privacy notice before collecting data. The Privacy Amendment Act 2025 (IPP 3A, effective 1 May 2026) adds indirect collection notification obligations. A customer data deletion workflow is required. This is a legal requirement, not optional polish.

---

## Implications for Roadmap

The dependency graph and compliance requirements drive a clear phase order. Gift Cards and COGS are both standalone (no add-on dependencies), compliance requirements for Gift Cards are fully documented, and the architecture integration pattern is identical for all add-ons. Loyalty follows because it requires a POS UX change (customer lookup step) that needs its own design iteration and because the `complete_pos_sale` hook pattern will have been validated in Phase 1. Purchase Orders is last due to high complexity and inventory dependency.

### Phase 1: Gift Cards Add-On

**Rationale:** The NZ Fair Trading Act change (effective 16 March 2026) makes this the most time-sensitive add-on. It is standalone with no add-on dependencies. The deferred liability data model is the most important architectural decision in the whole milestone — establish it correctly before any other add-on can reference gift card concepts. Highest compliance risk if done wrong; medium build complexity.

**Delivers:** Digital gift card issuance and code delivery; balance tracking; POS and storefront redemption; NZ Fair Trading Act compliance (3-year minimum expiry check constraint, prominent expiry display in confirmation email); Xero sync exclusion for issuance events; merchant admin at `/admin/gift-cards` and `/admin/gift-cards/settings`.

**Addresses:** Table stakes feature (every competitor offers it); NZ legal compliance is a genuine differentiator; $14/mo new MRR per subscribing merchant.

**Avoids:** Pitfall 1 (deferred liability data model — separate from `orders` table), Pitfall 2 (3-year expiry check constraint and UI), Pitfall 4 (webhook idempotency — audit existing handler first as pre-task), Pitfall 5 (RLS on new tables).

**Research flag:** Standard pattern for this codebase. Architecture and compliance requirements are fully documented in ARCHITECTURE.md and PITFALLS.md. No phase-level research needed.

---

### Phase 2: Advanced Reporting / COGS Add-On

**Rationale:** Lowest build risk of any add-on. The existing `orders` and `order_items` tables already contain all needed data. The only schema addition is `cost_price_cents` on the `products` table. No RPC changes to sale completion flows. Follows the existing analytics snapshot cron pattern exactly. Generates MRR alongside Phase 1 with minimal downside.

**Delivers:** `cost_price_cents` column on products; margin% display in product admin; COGS report by date range; snapshot cron job following the existing 030_analytics_snapshot.sql model; merchant admin at `/admin/reports`.

**Addresses:** Universal merchant need for margin data; $9/mo new MRR; strong price advantage over Square (A$109/mo equivalent) and Lightspeed (bundled at NZ$89+/mo).

**Avoids:** Pitfall 5 (RLS on any new snapshot tables), Pitfall 6 from ARCHITECTURE.md (store_id filter on all analytics queries — cross-tenant isolation test in acceptance criteria).

**Research flag:** Standard pattern. No research needed. Cron job follows existing model exactly.

---

### Phase 3: Loyalty Points Add-On

**Rationale:** High merchant demand and the strongest price advantage vs. competitors (Marsello NZ$100/mo, Square A$49/mo). However, it requires a UX change to the POS checkout flow — an optional customer lookup step before completing a sale. This is a riskier change than Phase 1 or 2 and needs design consideration. Building after Gift Cards means the `complete_pos_sale` RPC extension pattern will already have been validated in production (gift card redemption hook uses the same approach).

**Delivers:** `loyalty_accounts`, `loyalty_transactions`, `loyalty_settings` tables; `earn_loyalty_points` and `redeem_loyalty_points` SECURITY DEFINER RPCs; optional customer lookup step in POS cart before checkout; points balance displayed and redeemable in online storefront checkout; privacy notice in enrollment flow; `(store_id, customer_email)` composite unique constraint to prevent cross-store contamination; merchant admin at `/admin/loyalty`.

**Addresses:** Must-have competitive feature; $15/mo new MRR; integrates with existing customer accounts (zero friction vs. competitors requiring separate loyalty signup).

**Avoids:** Pitfall 3 (no cash-out path; points-only discount system to stay below financial regulation threshold), Pitfall 7 (Privacy Act notice in enrollment — effective 1 May 2026 for IPP 3A), Pitfall 8 from PITFALLS.md (composite unique constraint on `store_id` + email), Pitfall 5 (RLS on new loyalty tables).

**Research flag:** The POS customer lookup UX change may benefit from a lightweight design spike to avoid disrupting the existing fast-checkout flow for cash customers who have no loyalty account.

---

### Phase 4: Purchase Orders Add-On (v8.1 or later)

**Rationale:** High complexity and a hard dependency on Inventory Management adoption in production. Defer until Phases 1-3 are live and generating MRR. The `receive_stock_against_po` RPC modifies stock counts — this is the most risk-bearing operation in the milestone after gift card accounting. Build with the operational learnings from earlier add-on phases.

**Delivers:** `suppliers`, `purchase_orders`, `purchase_order_lines`, `supplier_products` tables; `receive_stock_against_po` SECURITY DEFINER RPC; admin UI at `/admin/suppliers` and `/admin/purchase-orders`; PO PDF/email generation; auto-stock-increment on receive event.

**Prerequisite:** Merchant must have `has_inventory = true` (gate enforced at subscription time via prerequisite check).

**Research flag:** Server-side PDF generation for PO documents has no existing pattern in this codebase and will need research before planning begins.

---

### Phase Ordering Rationale

- Gift Cards first: NZ law compliance is time-sensitive and the deferred liability data model is the most consequential accounting decision in the whole milestone — establish it before anything else.
- COGS second: Zero architectural risk, immediate MRR, uses no new patterns — validates the add-on delivery pipeline with minimal downside.
- Loyalty third: Highest demand and best price advantage, but requires POS flow changes; building after Phase 1 means the `complete_pos_sale` hook extension pattern has been proven in production.
- Purchase Orders last: Two-table dependency chain plus stock-system RPC changes justify caution; build with accumulated learnings.

### Research Flags

**Needs deeper research during planning:**
- Phase 3 (Loyalty): POS customer lookup UX — how to add customer search to the fast-checkout flow without creating friction for the majority of cash transactions that have no loyalty customer.
- Phase 4 (Purchase Orders): Server-side PDF generation approach for PO documents (no existing pattern in codebase).

**Standard patterns (skip research-phase):**
- Phase 1 (Gift Cards): Architecture fully defined in ARCHITECTURE.md; compliance requirements fully documented in PITFALLS.md; four-step add-on integration pattern is established.
- Phase 2 (COGS Reporting): Follows existing analytics snapshot cron pattern at `030_analytics_snapshot.sql` exactly.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Existing production stack; add-on architecture derived from direct codebase analysis of `src/config/addons.ts`, `requireFeature.ts`, and migration files |
| Features | MEDIUM | Competitor pricing verified via official pages (Square, Lightspeed, Marsello); NZ willingness-to-pay at $9–15/mo estimated from market proxies, not direct survey data |
| Architecture | HIGH | Derived from direct codebase analysis of existing add-on pipeline, not speculation; four-step integration pattern is proven across two live add-ons |
| Pitfalls | HIGH | NZ legal compliance confirmed against official NZ legislation; Stripe idempotency confirmed against Stripe official docs; gift card accounting confirmed against IRD guidance (April 2025) |

**Overall confidence:** HIGH

### Gaps to Address

- **Merchant willingness-to-pay validation:** Research used AU/NZ competitor pricing as proxy. No direct NZ merchant survey data. Validate pricing with first live merchant before committing — $9/mo across all add-ons is a safer fallback if $14–15/mo shows conversion friction.
- **Stripe webhook idempotency state in current codebase:** PITFALLS.md flags that the existing `/api/webhooks/stripe/billing/route.ts` may not have a `stripe_processed_events` table. Audit this before Phase 1 begins — this is a blocker for any new add-on billing work, not a nice-to-have.
- **Privacy Amendment Act 2025 (IPP 3A) timing:** Takes effect 1 May 2026. If Loyalty (Phase 3) ships before that date, Privacy Act 2020 requirements apply; if after, the stricter indirect collection notification rules apply. Build to the stricter standard regardless to avoid a second round of compliance work.
- **`complete_pos_sale` RPC current complexity:** Both Gift Cards (Phase 1, redemption) and Loyalty (Phase 3, earn points) add hooks to this RPC. Read the current RPC before Phase 1 planning begins to understand existing complexity and estimate integration risk accurately.

---

## Sources

### Primary (HIGH confidence)
- Existing NZPOS codebase (direct analysis, 2026-04-06): `src/config/addons.ts`, `src/lib/requireFeature.ts`, `/api/webhooks/stripe/billing/route.ts`, Supabase migrations 019–030
- Fair Trading (Gift Card Expiry) Amendment Act 2024 — official NZ legislation, effective 16 March 2026
- Privacy Act 2020 (IPP 1, IPP 3, IPP 5) — official NZ legislation
- Privacy Amendment Act 2025 (IPP 3A) — effective 1 May 2026
- IRD tax treatment of gift cards (Affinity Accounting, April 2025) — GST recognised at redemption, not issuance
- Next.js 16.2.1 official docs (confirmed 2026-03-25)

### Secondary (MEDIUM confidence)
- Square AU/NZ pricing pages (verified 2026-04-06) — loyalty A$49/mo, Retail Plus A$109/mo
- Lightspeed Retail NZ pricing (verified 2026-04-06) — Basic NZ$89/mo, all features bundled
- Marsello pricing (NZD, verified 2026-04-06) — loyalty NZ$100–200/mo
- Shopify POS Pro pricing — US$89/mo for omnichannel features
- NRS Advanced Data — US$14.95/mo analytics add-on (US reference for analytics price sensitivity)
- Stripe webhook idempotency best practices (Stripe official docs + community sources)
- NZ Commerce Commission gift card guidance (comcom.govt.nz)

### Tertiary (LOW confidence)
- NZ small-business willingness-to-pay at $9–15/mo add-on price points — inferred from competitor pricing and NZ market size, not direct survey data; validate before launch

---

*Research completed: 2026-04-06*
*Ready for roadmap: yes*
