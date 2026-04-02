---
phase: 09-notifications
plan: "03"
subsystem: notifications/cron
tags: [cron, email, daily-summary, low-stock, vercel, date-fns-tz]
dependency_graph:
  requires: ["09-01"]
  provides: [daily-summary-cron]
  affects: [vercel.json, founder-email-flow]
tech_stack:
  added: []
  patterns: [cron-handler, timezone-aware-queries, fire-and-await-email]
key_files:
  created:
    - src/app/api/cron/daily-summary/route.ts
    - src/app/api/cron/__tests__/daily-summary.test.ts
  modified:
    - vercel.json
decisions:
  - "Stores table address/phone columns (added in migration 010) fetched and passed to DailySummaryEmail — empty string fallback for stores without data"
  - "Low stock filter done in JS (not Supabase filter) because Supabase JS SDK lacks column-to-column comparisons; acceptable for single store with <1000 products"
  - "date-fns-tz toZonedTime/fromZonedTime mocked in tests to avoid timezone environment coupling"
metrics:
  duration: "5 minutes"
  completed: "2026-04-02T09:11:08Z"
  tasks_completed: 2
  tasks_total: 2
  files_created: 2
  files_modified: 1
requirements:
  - NOTIF-04
  - NOTIF-05
---

# Phase 09 Plan 03: Daily Summary Cron Handler Summary

Daily summary cron handler queries yesterday's NZ-timezone sales data and sends the founder a morning briefing email via Resend, including revenue by payment method, top 5 products, and low stock warnings in a single email.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Daily summary cron handler + vercel.json | f530378 | src/app/api/cron/daily-summary/route.ts, vercel.json |
| 2 | Unit tests for daily summary cron handler | 0aec963 | src/app/api/cron/__tests__/daily-summary.test.ts |

## What Was Built

### Task 1: Daily Summary Cron Handler

`src/app/api/cron/daily-summary/route.ts` — GET handler that:

1. Authenticates via CRON_SECRET Bearer token (same pattern as expire-orders)
2. Validates FOUNDER_EMAIL env var is configured
3. Computes yesterday's date boundaries in `Pacific/Auckland` timezone using `date-fns-tz`
4. Queries orders table for completed/pending_pickup/ready/collected orders in the window
5. Aggregates revenue by payment method — normalizes 'stripe'/'card'/'online' to 'Online', 'eftpos' to 'EFTPOS', 'cash' to 'Cash'
6. Queries order_items with joined orders filter for top product aggregation
7. Fetches products with non-null reorder_threshold, filters in JS for stock <= threshold
8. Awaits `sendEmail` (cron can block — no user waiting) with DailySummaryEmail

`vercel.json` — added third cron entry at `0 19 * * *` (UTC 19:00 = NZST 07:00).

### Task 2: Unit Tests

6 tests covering:
- Auth rejection (wrong CRON_SECRET → 401)
- Missing FOUNDER_EMAIL → 500 without sending
- Correct sales aggregation: totalSales=3, totalRevenueCents=7000, EFTPOS/Cash/Online breakdown
- Zero-sale day still sends email (per D-13)
- Low stock items correctly populated (name, currentStock, reorderThreshold)
- Above-threshold products correctly excluded from lowStockItems

## Verification

- `npx vitest run src/app/api/cron/__tests__/` — 6/6 tests pass
- `npx tsc --noEmit` — no source-file TypeScript errors
- `vercel.json` has 3 cron entries (xero-sync at 13:00, expire-orders at 14:00, daily-summary at 19:00)
- Pacific/Auckland timezone used for NZ date boundary computation

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing prop] DailySummaryEmail requires storeAddress and storePhone**
- **Found during:** Task 1
- **Issue:** The plan's interface definition omitted `storeAddress` and `storePhone`, but the actual DailySummaryEmail.tsx component (built in 09-01) includes both props as required. The stores table gained these columns in migration 010.
- **Fix:** Added `address, phone` to the store SELECT query; passed them to DailySummaryEmail with empty string fallback for stores that haven't populated these fields yet.
- **Files modified:** src/app/api/cron/daily-summary/route.ts
- **Commit:** f530378

## Known Stubs

None — the handler is fully wired. The FOUNDER_EMAIL, CRON_SECRET, and RESEND_* env vars must be configured in Vercel for the cron to operate in production (documented in the env var requirements, not a code stub).

## Self-Check: PASSED

- [x] `src/app/api/cron/daily-summary/route.ts` exists
- [x] `src/app/api/cron/__tests__/daily-summary.test.ts` exists
- [x] `vercel.json` contains `/api/cron/daily-summary` at `0 19 * * *`
- [x] Commits f530378 and 0aec963 exist
- [x] All 6 tests pass
