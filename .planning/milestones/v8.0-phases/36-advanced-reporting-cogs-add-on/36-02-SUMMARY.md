---
phase: 36-advanced-reporting-cogs-add-on
plan: 02
subsystem: cogs-library
tags: [cogs, reporting, pure-functions, tdd, testing]
dependency_graph:
  requires: []
  provides: [src/lib/cogs.ts]
  affects: [src/app/admin/reports/cogs/page.tsx]
tech_stack:
  added: []
  patterns: [pure-function-library, tdd-red-green, integer-cents]
key_files:
  created:
    - src/lib/cogs.ts
    - src/lib/cogs.test.ts
  modified: []
decisions:
  - "SKU not available in OrderItem shape — aggregateCOGS sets sku=null; callers can hydrate if needed (plan 03)"
  - "hasCostPrice flag tracks whether cost data existed; null cost products excluded from margin totals per D-03"
  - "groupByCategory: totalMarginCents=null when NO product in category has cost price"
metrics:
  duration_seconds: 130
  completed_date: "2026-04-07"
  tasks_completed: 1
  files_created: 2
  files_modified: 0
---

# Phase 36 Plan 02: COGS Calculation Library Summary

**One-liner:** Pure-function COGS library with GST-exclusive margin calculation, category grouping, and CSV formatting — 17 tests passing via TDD.

## Objective

Create the COGS calculation library with all pure functions for aggregation, margin calculation, category grouping, and CSV formatting — with comprehensive TDD-style tests. Isolates all business logic into a testable pure-function module for consumption by Plan 03 (reports UI).

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 (RED) | Failing tests for COGS library | 9a05a72 | src/lib/cogs.test.ts |
| 1 (GREEN) | COGS calculation library implementation | 520a8af | src/lib/cogs.ts |

## Exported API

**`src/lib/cogs.ts`** exports:

| Export | Type | Purpose |
|--------|------|---------|
| `aggregateCOGS` | function | Aggregate order items + cost data into COGS line items |
| `calculateMarginPercent` | function | Gross margin % from revenue and cost cents |
| `productMarginPercent` | function | Per-product margin from GST-inclusive price and cost |
| `groupByCategory` | function | Group CogsLineItems by category with aggregated totals |
| `formatCogsCSV` | function | Map CogsLineItems to flat CSV row objects |
| `CogsLineItem` | interface | Output type for per-product COGS data |
| `CogsCategoryGroup` | interface | Output type for category-grouped totals |
| `OrderItem` | interface | Input type matching Supabase order_items query shape |
| `ProductCostData` | interface | Input type matching Supabase products query shape |

## Test Coverage

17 tests across 4 describe blocks:

- **aggregateCOGS** (6 tests): single item, null cost price, deduplication, null product_id grouping, sort order, empty array
- **calculateMarginPercent** (3 tests): normal case, zero revenue guard, negative margin
- **productMarginPercent** (2 tests): 50% margin, 0% margin
- **groupByCategory** (3 tests): multi-product aggregation, null category -> Uncategorized, all-null-cost category
- **formatCogsCSV** (3 tests): required columns, null margin_percent -> em dash, null sku -> empty string

## Deviations from Plan

**1. [Rule 2 - Design] SKU field set to null in aggregateCOGS**
- **Found during:** Task 1 implementation
- **Issue:** The `OrderItem` interface (from Supabase query shape) does not include a SKU column — SKU lives on the products table, not order_items. The plan's interface spec did not include SKU in `OrderItem`.
- **Fix:** `aggregateCOGS` sets `sku: null` for all items. Plan 03 can hydrate SKU from the product cost data query if needed (cost data has product IDs to join on).
- **Files modified:** src/lib/cogs.ts
- **Impact:** formatCogsCSV correctly shows empty string for null sku (Test 17 passes). No data loss.

## Known Stubs

None — all functions return real calculated values. No hardcoded placeholders.

## Self-Check: PASSED

- `src/lib/cogs.ts` exists and exports 5 functions + 4 types
- `src/lib/cogs.test.ts` exists with 17 passing tests
- Commit 9a05a72: RED test file
- Commit 520a8af: GREEN implementation
- `npx vitest run src/lib/cogs.test.ts` exits 0 (all 17 tests pass)
