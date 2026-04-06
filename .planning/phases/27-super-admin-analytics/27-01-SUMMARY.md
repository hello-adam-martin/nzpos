---
phase: 27-super-admin-analytics
plan: 01
subsystem: database, infra, api
tags: [stripe, supabase, vitest, vercel-cron, mrr, analytics, server-actions]

requires:
  - phase: 26-super-admin-billing-user-management
    provides: super-admin auth pattern (is_super_admin), existing cron infrastructure, createSupabaseAdminClient

provides:
  - platform_analytics_snapshots table with RLS (super-admin read, service-role write)
  - analytics_sync_metadata table for rate limiting and staleness tracking
  - syncStripeSnapshot shared function with normaliseMrrCents (annual/12 normalisation, trialing=$0)
  - Vercel Cron route /api/cron/stripe-snapshot-sync with CRON_SECRET auth
  - triggerStripeSync server action with super-admin auth + 5-min rate limit
  - 18 unit tests covering all MRR calculation and sync logic

affects: [27-02-analytics-ui]

tech-stack:
  added: []
  patterns:
    - "syncStripeSnapshot shared function callable from both cron and server action"
    - "Rate limiting via analytics_sync_metadata.last_synced_at timestamp in DB"
    - "snapshot_month scoped deletes to preserve historical rows across months"
    - "Addon type resolution via PRICE_TO_FEATURE[price.id].replace('has_', '')"

key-files:
  created:
    - supabase/migrations/030_analytics_snapshot.sql
    - src/lib/stripe/syncStripeSnapshot.ts
    - src/lib/stripe/syncStripeSnapshot.test.ts
    - src/app/api/cron/stripe-snapshot-sync/route.ts
    - src/actions/super-admin/triggerStripeSync.ts
  modified:
    - vercel.json

key-decisions:
  - "maxDuration=60 on cron route (not 300 like xero-sync) — Hobby plan serverless function limit"
  - "Shared sync function pattern: both cron and server action call syncStripeSnapshot() — single source of truth"
  - "Rate limit implemented via analytics_sync_metadata DB row (not in-memory) — works across serverless instances"
  - "Delete scoped to snapshot_month = currentMonth before reinsert — preserves historical data"
  - "vi.hoisted() pattern required for Vitest mocks that reference top-level variables in factory functions"

patterns-established:
  - "syncStripeSnapshot: delete current month, insert fresh rows, upsert metadata timestamp"
  - "Cron route: import server-only + CRON_SECRET check + call shared fn + return Response.json"
  - "Server action with rate limiting: auth check -> DB timestamp check -> run fn -> revalidatePath"

requirements-completed: [SA-MRR-05, SA-MRR-01, SA-MRR-02, SA-MRR-03, SA-MRR-04]

duration: 18min
completed: 2026-04-06
---

# Phase 27 Plan 01: Stripe Snapshot Sync Infrastructure Summary

**Materialised Stripe analytics pipeline: DB tables with RLS, shared sync function with annual MRR normalisation, Vercel Cron route, and rate-limited on-demand server action with 18 unit tests**

## Performance

- **Duration:** 18 min
- **Started:** 2026-04-06T13:45:38Z
- **Completed:** 2026-04-06T14:04:00Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Created `platform_analytics_snapshots` table with all D-06 columns (current_period_start, current_period_end, discount_amount, snapshot_month) and super-admin read RLS
- Built `syncStripeSnapshot` shared function with `normaliseMrrCents` pure helper — annual plans divided by 12, trialing subscriptions excluded ($0 MRR), addon_type resolved from PRICE_TO_FEATURE
- Added `/api/cron/stripe-snapshot-sync` Vercel Cron route following established xero-sync pattern with maxDuration=60 for Hobby plan compatibility
- Added `triggerStripeSync` server action with super-admin auth, 5-minute rate limit via DB metadata row, retryAfter timestamp in response
- 18 unit tests covering all MRR calculation paths, addon resolution, timestamp conversion, discount extraction, delete scoping

## Task Commits

1. **Task 1: Migration + sync function + unit tests** - `451c98b` (feat)
2. **Task 2: Cron route + server action + vercel.json** - `aa0bfe3` (feat)

**Plan metadata:** (this commit)

## Files Created/Modified

- `supabase/migrations/030_analytics_snapshot.sql` - Creates platform_analytics_snapshots and analytics_sync_metadata tables with RLS
- `src/lib/stripe/syncStripeSnapshot.ts` - Shared sync function with normaliseMrrCents export and full sync logic
- `src/lib/stripe/syncStripeSnapshot.test.ts` - 18 unit tests for all sync logic paths
- `src/app/api/cron/stripe-snapshot-sync/route.ts` - Vercel Cron GET handler with CRON_SECRET auth
- `src/actions/super-admin/triggerStripeSync.ts` - On-demand sync server action with auth and rate limiting
- `vercel.json` - Added 4th cron entry at 0 15 * * * (3am NZT)

## Decisions Made

- **maxDuration=60 not 300:** xero-sync uses 300s but that was a planning oversight — Hobby plan caps all functions at 60s. Used 60 here.
- **Shared function pattern:** Single `syncStripeSnapshot` function called by both cron and server action avoids duplication and drift.
- **Rate limit via DB, not in-memory:** Serverless functions have no shared memory — analytics_sync_metadata row provides the timestamp check that works across all instances.
- **vi.hoisted() for Vitest mock factories:** Variables referenced in vi.mock() factories must use vi.hoisted() to avoid hoisting initialization errors.

## Deviations from Plan

None - plan executed exactly as written. The only adjustment was recognizing the pre-existing `processRefund` test failures (3 tests failing before this plan due to `cookies()` context issue) — confirmed pre-existing and out of scope.

## Issues Encountered

- **Vitest hoisting error:** `vi.mock` factory functions cannot access top-level `vi.fn()` variables directly — they get hoisted above variable initialization. Fixed by using `vi.hoisted()` to create the mock functions, ensuring they're initialized before the factory runs.

## User Setup Required

None - no external service configuration required beyond existing CRON_SECRET env var.

## Next Phase Readiness

- Snapshot table and sync infrastructure complete — Plan 02 (analytics UI) can build the page reading from `platform_analytics_snapshots`
- `triggerStripeSync` server action ready for the refresh button component
- `analytics_sync_metadata.last_synced_at` ready for "Last synced X ago" display

---
*Phase: 27-super-admin-analytics*
*Completed: 2026-04-06*
