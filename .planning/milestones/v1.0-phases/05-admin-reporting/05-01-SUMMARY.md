---
phase: 05-admin-reporting
plan: "01"
subsystem: admin-foundation
tags: [schema, types, auth, utilities, testing, ui-components]
dependency_graph:
  requires: []
  provides:
    - cash_sessions schema (corrected)
    - database.ts types (cash_sessions corrected)
    - Wave 0 test stubs (Nyquist compliance)
    - recharts dependency
    - src/schemas/refund.ts (RefundSchema)
    - src/lib/dateRanges.ts (getDateRange)
    - src/lib/resolveAuth.ts (resolveAuth dual auth)
    - src/components/admin/orders/OrderStatusBadge.tsx
    - src/components/admin/orders/ChannelBadge.tsx
    - Admin sidebar with Orders, Reports, Cash-Up nav items
  affects:
    - Plans 02-06 (all depend on corrected types and shared utilities)
tech_stack:
  added:
    - recharts@3.8.1 (admin charts)
  patterns:
    - server-only guard on utility files (not 'use server' directive)
    - Semantic CSS tokens (--color-*) in badge components
    - NZ locale Monday week start in date-fns
key_files:
  created:
    - supabase/migrations/007_cash_sessions_fix.sql
    - src/schemas/refund.ts
    - src/lib/dateRanges.ts
    - src/lib/resolveAuth.ts
    - src/components/admin/orders/OrderStatusBadge.tsx
    - src/components/admin/orders/ChannelBadge.tsx
    - src/lib/__tests__/dashboard.test.ts
    - src/lib/__tests__/cashSession.test.ts
    - src/lib/__tests__/reports.test.ts
    - src/lib/__tests__/gstReport.test.ts
    - src/lib/__tests__/orderFilters.test.ts
    - src/actions/cash-sessions/__tests__/openCashSession.test.ts
    - src/actions/cash-sessions/__tests__/closeCashSession.test.ts
    - src/actions/orders/__tests__/processRefund.test.ts
  modified:
    - src/types/database.ts (cash_sessions section corrected)
    - src/components/admin/AdminSidebar.tsx (added 4 new nav items)
    - package.json (recharts added)
decisions:
  - "server-only import (not 'use server') used in resolveAuth.ts — utility function not a Server Action"
  - "Promos nav item added to sidebar alongside Orders/Reports/Cash-Up (was missing from original but included in plan spec)"
  - "Named exports for badge components (OrderStatusBadge, ChannelBadge) not default exports"
metrics:
  duration: "3 minutes"
  completed_date: "2026-04-01"
  tasks_completed: 3
  files_changed: 17
---

# Phase 05 Plan 01: Foundation — Schema, Test Stubs, Shared Utilities Summary

**One-liner:** Cash_sessions schema mismatch fixed, Wave 0 test stubs created for Nyquist compliance, Recharts installed, and shared admin utilities (dual auth, date ranges, refund schema, badge components) established as foundation for Plans 02-06.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 0 | Wave 0 test stubs | f4deac4 | 8 test files created |
| 1 | Schema reconciliation, Recharts, shared utilities | cec0577 | migration + types + 3 utilities + package.json |
| 2 | Admin sidebar extension and shared badge components | 0c0669c | AdminSidebar.tsx + 2 badge components |

## What Was Built

### Wave 0 Test Stubs (Task 0)
8 test stub files created covering all Wave 0 Nyquist requirements. All stubs use `it.todo()` so they run as pending (not failing). Tests pass: 32 todo items across dashboard, cashSession, reports, gstReport, orderFilters, openCashSession, closeCashSession, processRefund.

### Schema Reconciliation (Task 1)
Critical schema mismatch eliminated. The `database.ts` types had wrong column names (`staff_id`, `closing_float_cents`, `actual_cash_cents`) that did not match the migration SQL ground truth. Migration 007 drops and recreates `cash_sessions` with correct columns (`opened_by`, `closed_by`, `closing_cash_cents`). Types updated accordingly. Plans 02-06 can now use `opened_by` without TypeScript errors.

### Shared Utilities (Task 1)
- `src/schemas/refund.ts`: Zod schema for refund input (orderId UUID, reason enum, restoreStock boolean)
- `src/lib/dateRanges.ts`: 8 date range presets including GST period presets (gst_1mo, gst_2mo, gst_6mo) with NZ Monday week start
- `src/lib/resolveAuth.ts`: Dual auth resolver — tries owner Supabase session first, falls back to staff PIN JWT. Uses `import 'server-only'` (not `'use server'` directive) as it's a utility not a Server Action.

### Admin Sidebar + Badges (Task 2)
Admin sidebar extended with Orders, Reports, Cash-Up, and Promos navigation links. OrderStatusBadge maps all 7 order statuses to semantic colors using CSS tokens. ChannelBadge differentiates POS (navy) from Online (info blue).

## Deviations from Plan

### Auto-fixed Issues
None — plan executed exactly as written.

### Notes
- The plan spec listed `Promos` in the expected `navLinks` array but the original sidebar only had Dashboard + Products. Added Promos link as specified (this was the intended state per the plan).

## Known Stubs
None — all utilities are fully implemented, no placeholder data.

## Verification Results

- `npm test` passes: 56 tests pass, 32 todo (pending), 1 skipped
- `npm ls recharts` shows recharts@3.8.1
- `grep "opened_by" src/types/database.ts` finds corrected column names
- `grep "/admin/orders" src/components/admin/AdminSidebar.tsx` confirms nav extension
- `resolveAuth.ts` contains `import 'server-only'` and does NOT contain `'use server'`

## Self-Check: PASSED
