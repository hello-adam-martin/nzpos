---
phase: 36-advanced-reporting-cogs-add-on
plan: "03"
subsystem: reports-ui
tags: [advanced-reporting, cogs, reports, ui, profit-margin, csv-export]
dependency_graph:
  requires: [36-01, 36-02]
  provides: [profit-margin-tab, cogs-report-ui, cogs-csv-export]
  affects:
    - src/app/admin/reports/page.tsx
    - src/components/admin/reports/ReportsPageClient.tsx
    - src/components/admin/reports/CogsReportSummaryCards.tsx
    - src/components/admin/reports/CogsReportTable.tsx
    - src/components/admin/reports/CogsCategoryBreakdown.tsx
tech_stack:
  added: []
  patterns:
    - conditional-tab-gating-via-hasAdvancedReporting
    - sortable-table-with-useState
    - collapsible-category-rows-with-Set-state
    - calculateMarginPercent-shared-denominator-pattern
key_files:
  created:
    - src/components/admin/reports/CogsReportSummaryCards.tsx
    - src/components/admin/reports/CogsReportTable.tsx
    - src/components/admin/reports/CogsCategoryBreakdown.tsx
  modified:
    - src/app/admin/reports/page.tsx
    - src/components/admin/reports/ReportsPageClient.tsx
decisions:
  - "overallMarginPercent uses calculateMarginPercent(cogsWithCostRevenue, totalCostCents) — same denominator (revenue of costed products only) as CogsReportTable tfoot to prevent inconsistency"
  - "COGS queries guarded by hasAdvancedReporting && tab=profit — no unnecessary DB queries for non-subscribers"
  - "Supabase generated types predate cost_price_cents column — cast via (data ?? []) as unknown as ProductCostRow[] following plan 01 pattern"
  - "Empty state splits no-sales from no-cost-prices-set for clearer merchant guidance"
metrics:
  duration_seconds: 264
  completed_date: "2026-04-07"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 5
---

# Phase 36 Plan 03: Profit & Margin Tab UI Summary

**One-liner:** Profit & Margin tab on Reports page with 4 summary cards, sortable per-product COGS table, collapsible category breakdown, and CSV export — all gated behind hasAdvancedReporting feature flag.

## What Was Built

Two tasks completed in sequence:

**Task 1: COGS data queries in reports server component**
- `src/app/admin/reports/page.tsx`: Added `hasAdvancedReporting` feature flag from `user.app_metadata.advanced_reporting`.
- Imported `aggregateCOGS`, `groupByCategory`, `formatCogsCSV` from `@/lib/cogs`.
- Added COGS query block gated on `hasAdvancedReporting && tab === 'profit' && orderIds.length > 0`: fetches `order_items` (product_id, product_name, quantity, line_total_cents, gst_cents), then product cost data (id, cost_price_cents, category_id, categories(name)) for unique product IDs.
- Passes `cogsData`, `cogsCategoryGroups`, `cogsCSVData`, `fromDateStr`, `toDateStr`, `hasAdvancedReporting` to `ReportsPageClient`.

**Task 2: Profit & Margin tab UI components**
- `CogsReportSummaryCards.tsx`: 4 cards in `grid grid-cols-2 md:grid-cols-4 gap-3` layout — Revenue (excl. GST), Total Cost, Gross Profit, Margin %. Color coding: Gross Profit uses success/error/muted; Margin % uses >30% success, 15-30% primary, 0-15% warning, negative error.
- `CogsReportTable.tsx`: Sortable `useState`-driven table matching `SalesSummaryTable` style (`bg-navy text-white` thead). Sortable columns: Units Sold, Revenue, Cost, Margin $, Margin %. Footer totals row. Margin % color coding per design spec.
- `CogsCategoryBreakdown.tsx`: Collapsible categories using `Set<string>` state. Chevron SVG with `rotate-90` when expanded. Product sub-rows indented with `pl-10`. All categories start collapsed.
- `ReportsPageClient.tsx`: New props added to interface. Conditional "Profit & Margin" tab button (only when `hasAdvancedReporting`). COGS summary totals computed using `calculateMarginPercent` from `@/lib/cogs` for denominator consistency. Two empty states: no-sales and no-cost-prices-set.

## Commits

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | COGS data queries in reports server component | 4a72c37 | src/app/admin/reports/page.tsx |
| 2 | Profit & Margin tab UI components | ce7e2b6 | 4 files (3 created, 1 modified) |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Supabase generated types don't include cost_price_cents**
- **Found during:** Task 1 TypeScript compile check
- **Issue:** Supabase's generated database types predate the `cost_price_cents` column added in migration `034_cogs.sql`. The `products` query returns a `SelectQueryError` type instead of the expected shape.
- **Fix:** Applied same `as unknown as ProductCostRow[]` cast pattern used in `src/app/admin/products/page.tsx` (established in Plan 01). Added inline comment documenting the reason.
- **Files modified:** src/app/admin/reports/page.tsx
- **Impact:** TypeScript compiles cleanly for all plan 03 files. Pre-existing errors in unrelated files (inventory, gift cards) are out of scope.

## Known Stubs

None. All data flows are fully wired:
- `cogsData` flows from server queries → `aggregateCOGS` → `CogsReportTable` and `CogsReportSummaryCards`
- `cogsCategoryGroups` flows from `groupByCategory(cogsData)` → `CogsCategoryBreakdown`
- `cogsCSVData` flows from `formatCogsCSV(cogsData)` → `ExportCSVButton` with dynamic filename
- `overallMarginPercent` is computed using `calculateMarginPercent(cogsWithCostRevenue, totalCostCents)` — same denominator as tfoot

## Self-Check: PASSED

- src/components/admin/reports/CogsReportSummaryCards.tsx: FOUND
- src/components/admin/reports/CogsReportTable.tsx: FOUND
- src/components/admin/reports/CogsCategoryBreakdown.tsx: FOUND
- Commit 4a72c37: FOUND
- Commit ce7e2b6: FOUND
