---
phase: 22-inventory-add-on-core
plan: "01"
subsystem: inventory
tags: [database, migration, zod, types, testing]
dependency_graph:
  requires: []
  provides: [stock_adjustments table, stocktake_sessions table, stocktake_lines table, adjust_stock RPC, complete_stocktake RPC, AdjustStockSchema, CreateStocktakeSchema, UpdateStocktakeLineSchema, Wave 0 test scaffolds]
  affects: [complete_pos_sale RPC, complete_online_sale RPC, restore_stock RPC]
tech_stack:
  added: []
  patterns: [SECURITY DEFINER RPC for atomic mutations, append-only RLS (INSERT+SELECT only), Zod enum for reason code validation]
key_files:
  created:
    - supabase/migrations/025_inventory_core.sql
    - src/schemas/inventory.ts
    - src/schemas/__tests__/inventory.test.ts
    - src/actions/inventory/__tests__/adjustStock.test.ts
    - src/actions/inventory/__tests__/getAdjustmentHistory.test.ts
    - src/actions/inventory/__tests__/createStocktakeSession.test.ts
    - src/actions/inventory/__tests__/updateStocktakeLine.test.ts
    - src/actions/inventory/__tests__/commitStocktake.test.ts
  modified:
    - src/types/database.ts
decisions:
  - append-only RLS on stock_adjustments uses separate INSERT and SELECT policies (no UPDATE/DELETE) — enforces immutable audit log at DB level
  - complete_stocktake inserts stock_adjustments for every counted line even when delta=0 — provides a complete audit record of what was verified
  - restore_stock upgraded from sql to plpgsql language to support DECLARE/RETURNING/INSERT — same service_role-only GRANT from migration 021 is preserved
metrics:
  duration_minutes: 4
  completed_date: "2026-04-04"
  tasks_completed: 3
  files_changed: 9
---

# Phase 22 Plan 01: Inventory Core Foundation Summary

**One-liner:** Database foundation for inventory management — stock_adjustments audit table, stocktake_sessions/lines tables, adjust_stock and complete_stocktake SECURITY DEFINER RPCs, updated sale/refund RPCs, Zod schemas, TypeScript types, and Wave 0 test scaffolds.

## What Was Built

Three tasks completed in full:

**Task 1: Zod schemas and reason code enums**
Created `src/schemas/inventory.ts` with:
- `MANUAL_REASON_CODES` (6 user-selectable codes), `SYSTEM_REASON_CODES` (3 auto-set), `ALL_REASON_CODES` union
- `REASON_CODE_LABELS` display map for all 9 reason codes
- `AdjustStockSchema` — only accepts MANUAL_REASON_CODES (system codes rejected at validation layer)
- `CreateStocktakeSchema` — scope enum with refine validation (category scope requires category_id)
- `UpdateStocktakeLineSchema` — counted_quantity must be >= 0 integer
- 25 unit tests, all passing

**Task 2: Migration 025 and TypeScript types**
Created `supabase/migrations/025_inventory_core.sql` with:
- `stock_adjustments` table — append-only (INSERT+SELECT RLS only, no UPDATE/DELETE)
- `stocktake_sessions` and `stocktake_lines` tables — standard tenant isolation RLS
- 8 indexes for query performance
- `adjust_stock` SECURITY DEFINER RPC — atomically updates products.stock_quantity + inserts audit row
- `complete_stocktake` SECURITY DEFINER RPC — loops over counted lines, updates stock, inserts audit rows, marks session committed
- `restore_stock` RPC upgraded to plpgsql — now also inserts stock_adjustments row with reason='refund'
- `complete_pos_sale` and `complete_online_sale` — both updated to INSERT stock_adjustments rows on stock decrement
- All 5 stock mutation paths now log to stock_adjustments (STOCK-02)
- Added `stock_adjustments`, `stocktake_sessions`, `stocktake_lines` types + `adjust_stock`, `complete_stocktake` function types in `src/types/database.ts`
- TypeScript compiles cleanly

**Task 3: Wave 0 test scaffolds**
Created 5 test scaffold files in `src/actions/inventory/__tests__/`:
- Each imports from `@/schemas/inventory`
- Each has real (non-todo) schema validation tests
- Each has `.todo()` stubs for server action behavior (filled in Plans 02 and 03)
- 14 real tests passing, 25 stubs documented

## Verification Results

| Check | Result |
|-------|--------|
| `vitest run src/schemas/__tests__/inventory.test.ts` | 25 passed |
| `vitest run src/actions/inventory/__tests__` | 14 passed, 25 todo |
| `tsc --noEmit` | 0 errors |
| INSERT INTO stock_adjustments count in migration | 5 (>= 4 required) |
| UPDATE/DELETE policies on stock_adjustments | 0 (append-only enforced) |

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — this plan creates schema foundations (migration, types, schemas, test scaffolds). No UI components with placeholder data.

## Self-Check: PASSED

**Files exist:**
- supabase/migrations/025_inventory_core.sql: FOUND
- src/schemas/inventory.ts: FOUND
- src/schemas/__tests__/inventory.test.ts: FOUND
- src/actions/inventory/__tests__/adjustStock.test.ts: FOUND
- src/actions/inventory/__tests__/getAdjustmentHistory.test.ts: FOUND
- src/actions/inventory/__tests__/createStocktakeSession.test.ts: FOUND
- src/actions/inventory/__tests__/updateStocktakeLine.test.ts: FOUND
- src/actions/inventory/__tests__/commitStocktake.test.ts: FOUND
- src/types/database.ts: FOUND (modified)

**Commits exist:**
- 578db35: feat(22-01): create inventory Zod schemas and reason code enums
- 63d87ef: feat(22-01): create migration 025_inventory_core.sql and update TypeScript types
- 2bd224b: test(22-01): add Wave 0 test scaffolds for all inventory server actions
