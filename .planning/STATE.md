---
gsd_state_version: 1.0
milestone: v3.0
milestone_name: Inventory Management
status: executing
stopped_at: Completed 22-01-PLAN.md
last_updated: "2026-04-04T08:16:18.585Z"
last_activity: 2026-04-04
progress:
  total_phases: 3
  completed_phases: 1
  total_plans: 8
  completed_plans: 4
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-04)

**Core value:** A store owner can ring up a sale in-store and take an order online, from a single inventory that stays in sync, with GST handled correctly.
**Current focus:** Phase 22 — inventory-add-on-core

## Current Position

Phase: 22 (inventory-add-on-core) — EXECUTING
Plan: 2 of 5
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
- [Phase 21-02]: Used (item as any).products?.product_type cast in refund actions — Supabase generated types don't model nested FK join, cast is safe because the join is explicitly declared in the select string
- [Phase 21-02]: createCheckoutSession uses \!== 'service' guard (not === 'physical') — future product types default to physical behavior without code change
- [Phase 21]: ProductGrid added as intermediate hasInventory carrier in POS component chain
- [Phase 21]: StoreProductCard uses hasInventory === true (strict) to avoid false truthy on undefined for free-tier
- [Phase 22]: append-only RLS on stock_adjustments uses separate INSERT and SELECT policies (no UPDATE/DELETE) — enforces immutable audit log at DB level
- [Phase 22]: restore_stock upgraded from sql to plpgsql language to INSERT stock_adjustments on refund — service_role-only GRANT from migration 021 preserved

### Pending Todos

None.

### Blockers/Concerns

- Phase 21 HIGH risk: modifies complete_pos_sale and complete_online_sale RPCs on the checkout hot path — read exact RPC source before writing migration
- Stocktake concurrent-sale strategy: snapshot-at-start vs "count after close" — product decision needed before Phase 22
- Staff vs owner permissions for stock adjustments — product decision needed before Phase 22

## Session Continuity

Last session: 2026-04-04T08:16:18.582Z
Stopped at: Completed 22-01-PLAN.md
Resume file: None
