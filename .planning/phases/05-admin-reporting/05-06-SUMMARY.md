---
phase: 05-admin-reporting
plan: "06"
subsystem: admin-reports
tags: [reports, recharts, gst, csv-export, papaparse]
dependency_graph:
  requires: ["05-01"]
  provides: ["/admin/reports page", "SalesBarChart", "GSTSummaryBlock", "ExportCSVButton"]
  affects: [admin-sidebar]
tech_stack:
  added: [recharts, papaparse]
  patterns: [server-component-data-fetching, two-query-pattern, csv-blob-download]
key_files:
  created:
    - src/app/admin/reports/page.tsx
    - src/app/admin/reports/loading.tsx
    - src/components/admin/reports/ReportsPageClient.tsx
    - src/components/admin/reports/ReportDateRangePicker.tsx
    - src/components/admin/reports/SalesSummaryTable.tsx
    - src/components/admin/reports/SalesBarChart.tsx
    - src/components/admin/reports/ChannelBreakdownChart.tsx
    - src/components/admin/reports/GSTSummaryBlock.tsx
    - src/components/admin/reports/ExportCSVButton.tsx
    - src/components/admin/reports/TopProductsTable.tsx
    - src/components/admin/reports/StockLevelsTable.tsx
  modified: []
decisions:
  - "Two-query approach for order_items joins: fetch order IDs from orders table first, then query order_items with .in('order_id', orderIds) — avoids broken cross-table .eq('orders.store_id') filter in Supabase JS v2"
  - "GST summary computed from orders.gst_cents not order_items to avoid double-counting"
  - "GST per-line detail only fetched when tab=gst (lazy loading reduces query load)"
  - "recharts installed (was in package.json but missing from node_modules)"
  - "ExportCSVButton auto-converts _cents keys to _dollars for human-readable CSV output"
metrics:
  duration: "~15 minutes"
  completed_date: "2026-04-01"
  tasks_completed: 4
  files_created: 11
---

# Phase 05 Plan 06: Reports Page Summary

## One-liner

Full-featured /admin/reports page with Recharts bar/donut charts, GST period summaries with per-line detail, date range presets including NZ GST filing periods, and papaparse CSV export for all report sections.

## What Was Built

### Task 1: Reports Server Component with data queries (commit: 3e56536)
- `src/app/admin/reports/page.tsx` — Server Component with auth check, date range parsing (preset + custom from/to), 5 Supabase queries
- Uses safe two-query approach for order_items (query orderIds from orders first, then .in('order_id', orderIds))
- GST summary computed from orders.gst_cents (not order_items — avoids double-counting per Pitfall #3)
- GST per-line detail fetched lazily only when tab=gst
- `src/app/admin/reports/loading.tsx` — skeleton with pulsing placeholders

### Task 2: Report shell, date picker, and summary tables (commit: 5f2d8f8)
- `ReportsPageClient.tsx` — 'use client' shell with Sales / GST Summary tabs, empty states
- `ReportDateRangePicker.tsx` — 9 presets (Today through GST 6-month + Custom Range), active preset navy fill pill
- `SalesSummaryTable.tsx` — daily grouped rows, footer totals, font-mono for amounts
- `TopProductsTable.tsx` — top 10 products by revenue, navy header
- `StockLevelsTable.tsx` — stock with color coding (red=0, warning=<=threshold)

### Task 3: Charts (commit: e89829f)
- `SalesBarChart.tsx` — Recharts BarChart, navy bars (#1E293B), rounded top (radius=[4,4,0,0]), 240px height, no grid lines, custom tooltip
- `ChannelBreakdownChart.tsx` — Recharts PieChart donut (innerRadius=50, outerRadius=80), navy for POS, info-blue (#3B82F6) for Online, legend with formatNZD

### Task 4: GST Summary and CSV Export (commit: e27eeff)
- `GSTSummaryBlock.tsx` — Summary/Per-line Detail tabs with navy fill pill toggle, refund amounts shown separately
- `ExportCSVButton.tsx` — Papa.unparse, auto-converts _cents keys to _dollars, Blob/anchor download, bg-amber styling, inline SVG icon

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] recharts missing from node_modules**
- **Found during:** TypeScript compilation check after Task 4
- **Issue:** recharts was listed in package.json but not installed in node_modules (likely missing `npm install` run)
- **Fix:** Ran `npm install recharts --legacy-peer-deps`
- **Commit:** bc3090c

**2. [Rule 1 - Bug] Implicit any type on YAxis tickFormatter**
- **Found during:** TypeScript check after installing recharts
- **Issue:** `(v) => '$' + (v / 100).toFixed(0)` had implicit `any` on `v` parameter
- **Fix:** Added explicit `(v: number)` type annotation
- **Files modified:** src/components/admin/reports/SalesBarChart.tsx
- **Commit:** bc3090c

## Known Stubs

None. All report sections are wired to real Supabase data queries. The GST per-line detail section will show an empty state message if no completed orders exist in the period — this is correct behavior, not a stub.

## Self-Check: PASSED
