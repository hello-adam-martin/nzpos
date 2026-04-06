---
gsd_state_version: 1.0
milestone: v7.0
milestone_name: POS Demo
status: executing
stopped_at: Completed 34-02-PLAN.md
last_updated: "2026-04-06T09:56:18.635Z"
last_activity: 2026-04-06
progress:
  total_phases: 3
  completed_phases: 2
  total_plans: 5
  completed_plans: 4
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-06)

**Core value:** A store owner can ring up a sale in-store and take an order online, from a single inventory that stays in sync, with GST handled correctly.
**Current focus:** Phase 34 — signup-conversion-landing-page

## Current Position

Phase: 34 (signup-conversion-landing-page) — EXECUTING
Plan: 2 of 2
Status: Ready to execute
Last activity: 2026-04-06

[==========          ] 0% — 0/3 phases complete

## Performance Metrics

**Velocity:**

- Total plans completed: 0 (v7.0)
- Average duration: ~15 min (based on prior history)
- Total execution time: 0 min

*Updated after each plan completion*

## Accumulated Context

### Decisions

- requireFeature() JWT/DB dual-path pattern established for all add-on gating
- has_email_notifications column kept (always true) for backwards compatibility
- Add-on pricing post-v6.0: Xero $9/mo, Inventory Management $9/mo (2 paid add-ons)
- Design system: deep navy (#1E293B) + amber (#E67E22), Satoshi + DM Sans
- Demo approach: real demo store in DB, real POS code, completeSale intercepted in demo mode
- Session isolation via client-side cart (already useReducer), no DB writes in demo mode
- Demo seed script must be idempotent (re-runnable without duplicates)
- Barcode scanner, new-order polling, and receipt email disabled in demo mode (DPOS-04)
- [Phase 32-demo-store-seed]: Synthetic auth.users row with matching UUID satisfies owner_auth_id FK without real login account
- [Phase 32-demo-store-seed]: DEMO_STORE_ID constant in src/lib/constants.ts for zero-query demo store identification
- [Phase 33]: Middleware passthrough for /demo/** placed at position 1.5 before host resolution — skips all auth and tenant logic for demo visitors
- [Phase 33-demo-pos-route-checkout]: demoMode prop uses hook override pattern (call unconditionally, override return values), not conditional hook calls
- [Phase 33-demo-pos-route-checkout]: Demo sale intercept returns early before completeSale, no router.refresh() in demo path
- [Phase 34]: Ghost button uses border-white/70 on navy for secondary CTA per DESIGN.md D-08 ghost button pattern

### Pending Todos

None.

### Blockers/Concerns

None.

## Session Continuity

Last session: 2026-04-06T09:56:18.621Z
Stopped at: Completed 34-02-PLAN.md
Resume file: None
