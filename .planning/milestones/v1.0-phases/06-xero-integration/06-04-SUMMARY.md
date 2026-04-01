---
phase: 06-xero-integration
plan: "04"
subsystem: api, ui, infra
tags: [xero, cron, vercel, server-action, sync, react]

# Dependency graph
requires:
  - phase: 06-03
    provides: executeDailySyncWithRetry, executeManualSync, XeroSyncLogEntry types
  - phase: 06-02
    provides: Integrations page shell, xero_connections table, XeroSyncButton placeholder
provides:
  - Vercel Cron job configured for daily 2am NZST Xero sync
  - Cron route /api/cron/xero-sync with CRON_SECRET auth and retry-via-executeDailySyncWithRetry
  - triggerManualSync Server Action for owner-triggered sync
  - XeroSyncButton client component with loading/success/error states
  - XeroSyncLog data table with status badges and empty state
  - Fully wired Integrations page replacing Plan 02 placeholders
affects: [future-xero-maintenance, admin-integrations-page]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Vercel Cron secured with CRON_SECRET Bearer token validation
    - Per-store cron iteration with isolated error handling (one failure does not block others)
    - Auto-clear success feedback after 5s via setTimeout
    - Tabular numbers via fontFeatureSettings tnum for monetary columns

key-files:
  created:
    - src/app/api/cron/xero-sync/route.ts
    - src/actions/xero/triggerManualSync.ts
    - src/components/admin/integrations/XeroSyncButton.tsx
    - src/components/admin/integrations/XeroSyncLog.tsx
    - vercel.json
  modified:
    - src/app/admin/integrations/page.tsx

key-decisions:
  - "maxDuration=300 on cron route to accommodate retry backoff delays; may need reduction for Vercel Hobby plan"
  - "Manual sync uses executeManualSync (no retry) — owner can manually retry from UI if needed"
  - "XeroSyncLog success message auto-clears after 5s; error persists until next action"

patterns-established:
  - "Cron route pattern: verify CRON_SECRET Bearer, query all connected stores, iterate with per-store error isolation"
  - "Manual sync Server Action: auth check -> executeManualSync -> revalidatePath -> return result"

requirements-completed: [XERO-02, XERO-03, XERO-04, XERO-05]

# Metrics
duration: ~30min
completed: 2026-04-02
---

# Phase 6 Plan 04: Xero Sync Triggers and UI Summary

**Vercel Cron route with CRON_SECRET auth calls executeDailySyncWithRetry for all connected stores at 1pm UTC (2am NZST); manual sync button with live loading/feedback states and sync history table complete the Integrations page**

## Performance

- **Duration:** ~30 min
- **Started:** 2026-04-02
- **Completed:** 2026-04-02
- **Tasks:** 2 auto + 1 human-verify checkpoint (approved)
- **Files modified:** 6

## Accomplishments

- Vercel Cron job configured (`0 13 * * *`) targeting `/api/cron/xero-sync`; secured with `CRON_SECRET` Bearer token; iterates all `xero_connections` where status=connected, calls `executeDailySyncWithRetry` per store with isolated error handling
- `triggerManualSync` Server Action authenticates owner via Supabase, calls `executeManualSync`, revalidates `/admin/integrations` path
- `XeroSyncButton` renders idle/loading/success/error states; success auto-clears after 5s; error persists; hidden when not connected
- `XeroSyncLog` shows full sync history table (status badges, NZD totals, invoice numbers, error messages) or "No syncs yet" empty state when logs array is empty
- Plan 02 inline placeholder sync rendering fully replaced by dedicated components

## Task Commits

1. **Task 1: Cron route, manual sync Server Action, vercel.json** - `d1a89aa` (feat)
2. **Task 2: XeroSyncButton and XeroSyncLog wired into Integrations page** - `042e5ad` (feat)
3. **Task 3: Visual verification** - APPROVED by user (no commit — checkpoint only)

## Files Created/Modified

- `src/app/api/cron/xero-sync/route.ts` - GET handler; CRON_SECRET auth; iterates connected stores; calls executeDailySyncWithRetry; maxDuration=300
- `src/actions/xero/triggerManualSync.ts` - Server Action; owner auth; executeManualSync; revalidatePath
- `src/components/admin/integrations/XeroSyncButton.tsx` - Client component; idle/loading/success/error states; 5s auto-clear
- `src/components/admin/integrations/XeroSyncLog.tsx` - Data table; status badges; empty state; tnum tabular numbers
- `vercel.json` - Cron job: `"path": "/api/cron/xero-sync"`, `"schedule": "0 13 * * *"`
- `src/app/admin/integrations/page.tsx` - Replaced placeholder sync section with XeroSyncButton and XeroSyncLog

## Decisions Made

- `maxDuration=300` on cron route to accommodate retry backoff delays (1min, 5min, 15min across 3 attempts); Vercel Hobby plan maxDuration is 60s so retry delays may need reducing if deployed on Hobby tier
- Manual sync uses `executeManualSync` (no retry) — owner can manually retry from UI; retry reserved for automated overnight cron
- Error feedback persists until next sync action; success auto-clears after 5s to reduce noise

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

**CRON_SECRET environment variable required in Vercel dashboard.**

The cron route validates `Authorization: Bearer <CRON_SECRET>`. This must be set in:
- Vercel project settings → Environment Variables → `CRON_SECRET` (any strong random string, e.g., `openssl rand -hex 32`)
- Also set in `.env.local` for local testing if needed

Vercel Cron is configured and will call `/api/cron/xero-sync` at 1pm UTC daily once the project is deployed.

## Next Phase Readiness

Phase 6 (Xero Integration) is now complete:
- XERO-01: OAuth connect with Vault token storage (Plan 02)
- XERO-02: Daily automated sync via Vercel Cron (this plan)
- XERO-03: Manual sync trigger from admin dashboard (this plan)
- XERO-04: Sync log with status/invoice tracking (this plan)
- XERO-05: Disconnect banner on token expiry (Plan 02)
- XERO-06: GST breakdown in invoice (Plan 03)

All six Xero requirements are implemented. The complete NZ retail POS system (Phases 1-6) is now feature-complete for v1.0.

---
*Phase: 06-xero-integration*
*Completed: 2026-04-02*
