---
gsd_state_version: 1.0
milestone: v3.0
milestone_name: Inventory Management
status: executing
stopped_at: Completed 21-01-PLAN.md
last_updated: "2026-04-04T06:47:09.591Z"
last_activity: 2026-04-04
progress:
  total_phases: 3
  completed_phases: 0
  total_plans: 3
  completed_plans: 1
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-04)

**Core value:** A store owner can ring up a sale in-store and take an order online, from a single inventory that stays in sync, with GST handled correctly.
**Current focus:** Phase 21 — service-product-type-free-tier-simplification

## Current Position

Phase: 21 (service-product-type-free-tier-simplification) — EXECUTING
Plan: 2 of 3
Status: Ready to execute
Last activity: 2026-04-04

Progress: [░░░░░░░░░░] 0%

## Performance Metrics

**Velocity:**

- Total plans completed: 0 (v3.0)
- Average duration: — min
- Total execution time: — hours

*Updated after each plan completion*

## Accumulated Context

### Decisions

- [v3.0 research]: Service-product stock skip must live in the RPC (complete_pos_sale, complete_online_sale), not the UI — UI checks are defense-in-depth only
- [v3.0 research]: Free-tier stores keep decrementing stock silently — add-on gates management UI, not the data pipeline
- [v3.0 research]: All stock mutations go through SECURITY DEFINER RPCs (adjust_stock, complete_stocktake) — no application-layer loops
- [v3.0 research]: One migration file (024_inventory_addon.sql) for all inventory changes — partial application is a known failure mode
- [v3.0 research]: requireFeature('inventory', { requireDbCheck: true }) on all inventory mutations — JWT path only for UI rendering
- [Phase 21-01]: Used CHECK constraint for product_type (not ENUM) to allow easy future extension
- [Phase 21-01]: AddOnCard.tsx updated to use SubscriptionFeature type — prevents type divergence as features grow

### Pending Todos

None.

### Blockers/Concerns

- Phase 21 HIGH risk: modifies complete_pos_sale and complete_online_sale RPCs on the checkout hot path — read exact RPC source before writing migration
- Stocktake concurrent-sale strategy: snapshot-at-start vs "count after close" — product decision needed before Phase 22
- Staff vs owner permissions for stock adjustments — product decision needed before Phase 22

## Session Continuity

Last session: 2026-04-04T06:47:09.589Z
Stopped at: Completed 21-01-PLAN.md
Resume file: None
