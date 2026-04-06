---
gsd_state_version: 1.0
milestone: v7.0
milestone_name: POS Demo
status: verifying
stopped_at: Phase 33 context gathered
last_updated: "2026-04-06T08:59:54.320Z"
last_activity: 2026-04-06
progress:
  total_phases: 3
  completed_phases: 1
  total_plans: 1
  completed_plans: 1
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-06)

**Core value:** A store owner can ring up a sale in-store and take an order online, from a single inventory that stays in sync, with GST handled correctly.
**Current focus:** Phase 32 — demo-store-seed

## Current Position

Phase: 33
Plan: Not started
Status: Phase complete — ready for verification
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

### Pending Todos

None.

### Blockers/Concerns

None.

## Session Continuity

Last session: 2026-04-06T08:59:54.317Z
Stopped at: Phase 33 context gathered
Resume file: .planning/phases/33-demo-pos-route-checkout/33-CONTEXT.md
