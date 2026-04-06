---
gsd_state_version: 1.0
milestone: v8.0
milestone_name: Add-On Catalog Expansion
status: executing
stopped_at: Completed 35-01-PLAN.md
last_updated: "2026-04-06T12:06:40.885Z"
last_activity: 2026-04-06
progress:
  total_phases: 3
  completed_phases: 0
  total_plans: 6
  completed_plans: 2
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-06)

**Core value:** A store owner can ring up a sale in-store and take an order online, from a single inventory that stays in sync, with GST handled correctly.
**Current focus:** Phase 35 — gift-cards-add-on

## Current Position

Phase: 35 (gift-cards-add-on) — EXECUTING
Plan: 3 of 6
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

### Pending Todos

None.

### Blockers/Concerns

- Audit `/api/webhooks/stripe/billing/route.ts` for `stripe_processed_events` idempotency table before Phase 35 begins (research flagged this as potential blocker)
- Read `complete_pos_sale` RPC before Phase 35 planning — both Gift Cards (redemption) and Loyalty (earn) hook into it

## Session Continuity

Last session: 2026-04-06T12:06:40.882Z
Stopped at: Completed 35-01-PLAN.md
Resume file: None
