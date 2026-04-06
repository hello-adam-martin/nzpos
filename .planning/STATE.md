---
gsd_state_version: 1.0
milestone: v8.0
milestone_name: Add-On Catalog Expansion
status: executing
stopped_at: Completed 37-02-PLAN.md
last_updated: "2026-04-06T20:36:22.552Z"
last_activity: 2026-04-06
progress:
  total_phases: 3
  completed_phases: 2
  total_plans: 18
  completed_plans: 14
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-06)

**Core value:** A store owner can ring up a sale in-store and take an order online, from a single inventory that stays in sync, with GST handled correctly.
**Current focus:** Phase 37 — loyalty-points-add-on

## Current Position

Phase: 37 (loyalty-points-add-on) — EXECUTING
Plan: 4 of 7
Status: Ready to execute
Last activity: 2026-04-06

Progress: [░░░░░░░░░░] 0%

## Performance Metrics

**Velocity:**

- Total plans completed: 0 (v8.0)
- Average duration: ~15 min (based on prior history)
- Total execution time: 0 min

*Updated after each plan completion*

## Accumulated Context

### Decisions

- requireFeature() JWT/DB dual-path pattern is the single gating mechanism for all add-ons
- Gift card issuance must write to a separate `gift_cards` table — never to `orders` (deferred liability)
- NZ Fair Trading Act 2024: 3-year minimum gift card expiry enforced by DB check constraint
- Privacy Amendment Act 2025 (IPP 3A, effective 1 May 2026): build loyalty enrollment to stricter standard regardless of ship date
- Webhook idempotency via `stripe_processed_events` must be audited before Phase 35 billing work
- Add-on pricing: Xero $9/mo, Inventory $9/mo, Gift Cards $14/mo (new), COGS $9/mo (new), Loyalty $15/mo (new)
- [Phase 35]: Wave 0 test stubs use expect(true).toBe(false) RED pattern — 16 stubs across 2 files for gift card utilities and cart state machine
- [Phase 35]: gift_cards table separate from orders — gift card issuance is deferred liability, not revenue
- [Phase 35]: CONSTRAINT gift_card_expiry_3yr enforces NZ Fair Trading Act 2024 3-year minimum at DB layer
- [Phase 35]: GIFT-11 verified: Xero sync excludes gift cards inherently — gift_cards table never queried in xero or cron paths
- [Phase 35]: Auto-split: giftCardAmountCents = Math.min(balanceCents, totalCents) — gift card always applied first, remainder to EFTPOS/Cash
- [Phase 35]: redeem_gift_card RPC called after complete_pos_sale — order created first, redemption second; redemption failure warns but does not void sale
- [Phase 35-gift-cards-add-on]: listGiftCards returns only last 4 digits of code in list view — full code only in getGiftCard detail response
- [Phase 35]: Partial gift card in Stripe Checkout: negative line item reduces session total — simpler than Stripe Coupons API
- [Phase 35]: redeem_gift_card RPC takes p_gift_card_id UUID not p_code — look up by code first, then pass UUID
- [Phase 35]: Full-cover gift card in createCheckoutSession: placeholder stripe_session_id='gift_card_{order.id}' for complete_online_sale RPC call
- [Phase 36]: Wave 0 RED stubs use nested describe block for has_advanced_reporting, matching existing xero test style; costPrice.test.ts validates schema-level acceptance with pure Zod parsing
- [Phase 36]: aggregateCOGS sets sku=null since OrderItem shape does not include SKU column; plan 03 can hydrate from product cost data
- [Phase 36-advanced-reporting-cogs-add-on]: cost_price_cents is GST-exclusive (supplier cost before tax) — enforced by UI label (excl. GST)
- [Phase 36-advanced-reporting-cogs-add-on]: NULL cost_price_cents means not entered yet — margin shows --- in the product table
- [Phase 36-advanced-reporting-cogs-add-on]: overallMarginPercent uses calculateMarginPercent(cogsWithCostRevenue, totalCostCents) — same denominator as CogsReportTable tfoot for consistency
- [Phase 36-advanced-reporting-cogs-add-on]: COGS queries gated by hasAdvancedReporting && tab=profit — no unnecessary DB queries for non-subscribers
- [Phase 37-loyalty-points-add-on]: Wave 0 RED stubs use expect(true).toBe(false) pattern — matches Phase 35/36 Wave 0 convention across 5 files, 32 stubs
- [Phase 37-loyalty-points-add-on]: loyalty_settings uses separate table (Option B) for clean upsert and future extensibility
- [Phase 37-loyalty-points-add-on]: earn/redeem loyalty RPCs are SECURITY DEFINER, service_role only; redeem_loyalty_points uses SELECT FOR UPDATE for concurrency safety
- [Phase 37-02]: LoyaltySettingsCard split as client component (not inlined in page.tsx) — proper Next.js server/client boundary

### Pending Todos

None.

### Blockers/Concerns

- Audit `/api/webhooks/stripe/billing/route.ts` for `stripe_processed_events` idempotency table before Phase 35 begins (research flagged this as potential blocker)
- Read `complete_pos_sale` RPC before Phase 35 planning — both Gift Cards (redemption) and Loyalty (earn) hook into it

## Session Continuity

Last session: 2026-04-06T20:36:22.549Z
Stopped at: Completed 37-02-PLAN.md
Resume file: None
