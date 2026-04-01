---
phase: 06-xero-integration
plan: 01
subsystem: database, api
tags: [xero, xero-node, supabase-vault, date-fns-tz, nz-timezone, gst, oauth]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: createSupabaseAdminClient, server-only guard pattern, Integer cents convention
  - phase: 05-admin-reporting
    provides: admin layout pattern, Supabase RLS with app_metadata store_id

provides:
  - supabase/migrations/008_xero_integration.sql — xero_connections and xero_sync_log tables with vault RPC
  - src/lib/xero/types.ts — shared TypeScript interfaces for all Xero modules
  - src/lib/xero/vault.ts — getXeroTokens, saveXeroTokens, deleteXeroTokens via Supabase Vault
  - src/lib/xero/client.ts — getAuthenticatedXeroClient with pre-call token refresh
  - src/lib/xero/dates.ts — getNZDayBoundaries, getNZTodayBoundaries (Pacific/Auckland)
  - src/lib/xero/buildInvoice.ts — buildDailyInvoice, buildCreditNote Xero API builders
  - 33 passing tests covering NZ timezone DST transitions and invoice structure

affects: [06-02, 06-03, 06-04, xero-oauth, xero-sync, xero-admin-ui]

# Tech tracking
tech-stack:
  added:
    - xero-node@14.0.0 (Xero official SDK)
    - date-fns-tz@3.2.0 (NZ timezone boundary calculation)
  patterns:
    - Supabase Vault RPC pattern (SECURITY DEFINER, service_role only, no plain token columns)
    - Pre-call token refresh with rotating refresh token write-back
    - NZ timezone day boundaries via toZonedTime/fromZonedTime from Pacific/Auckland
    - Xero invoice amounts in dollars not cents (divide by 100)
    - Zero-amount line item omission before sending to Xero API

key-files:
  created:
    - supabase/migrations/008_xero_integration.sql
    - src/lib/xero/types.ts
    - src/lib/xero/vault.ts
    - src/lib/xero/client.ts
    - src/lib/xero/dates.ts
    - src/lib/xero/buildInvoice.ts
    - src/lib/xero/__tests__/dates.test.ts
    - src/lib/xero/__tests__/buildInvoice.test.ts
  modified:
    - package.json (added xero-node, date-fns-tz)

key-decisions:
  - "LineAmountTypes.Inclusive enum value is 'Inclusive' (not 'INCLUSIVE') in xero-node — tests corrected to match actual SDK enum"
  - "NZ DST April 2026 transition: midnight of 2026-04-05 is in NZDT context (UTC+13) = 2026-04-04T11:00:00Z — fromZonedTime uses the offset at the local time, not the reference time"
  - "client.ts: disconnect-on-refresh-failure updates xero_connections.status directly via admin client (not via vault RPC) for simplicity"
  - "buildInvoice.ts: LineAmountTypes.Inclusive cast as unknown to avoid TypeScript type conflict with xero-node Invoice/CreditNote union type"

patterns-established:
  - "Vault pattern: all Xero tokens stored via Supabase Vault RPC functions; no access_token or refresh_token columns in any table"
  - "Server-only guard: vault.ts and client.ts import 'server-only' to prevent accidental client-side usage"
  - "Cents-to-dollars: Xero API amounts are dollars — divide _cents values by 100 in buildInvoice.ts"
  - "NZ timezone: always use Pacific/Auckland with date-fns-tz toZonedTime/fromZonedTime for day boundary calculation"

requirements-completed: [XERO-06]

# Metrics
duration: 5min
completed: 2026-04-02
---

# Phase 06 Plan 01: Xero Foundation — DB Migration and Core Library Modules Summary

**Vault-backed Xero token storage with service-role RPCs, NZ timezone day boundaries tested across DST transitions, and ACCREC invoice builder with OUTPUT2 tax type**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-04-02T07:57:42Z
- **Completed:** 2026-04-02T08:02:26Z
- **Tasks:** 2 tasks (Task 2 used TDD flow: RED → GREEN)
- **Files modified:** 10 (8 created, 2 modified)

## Accomplishments

- Created `008_xero_integration.sql` with xero_connections and xero_sync_log tables, 3 vault RPC functions (get/upsert/delete), RLS policies, and updated_at trigger — tokens never stored in plain columns
- Implemented 5 Xero library modules (types, vault, client, dates, buildInvoice) with correct imports, server-only guards, and authenticated client factory with refresh token rotation
- 33 tests passing: 9 date boundary tests covering NZDT/NZST periods and April/September DST transitions, 24 invoice builder tests confirming ACCREC structure, cents-to-dollars conversion, zero-item omission, and ACCRECCREDIT credit notes

## Task Commits

1. **Task 1: Install dependencies and create database migration** - `f17fde6` (feat)
2. **Task 2 RED: Failing tests for dates and buildInvoice** - `966d1dc` (test)
3. **Task 2 GREEN: Implement all 6 library modules** - `64e3b4c` (feat)

## Files Created/Modified

- `supabase/migrations/008_xero_integration.sql` — xero_connections + xero_sync_log tables, 3 vault RPC functions, RLS, trigger
- `src/lib/xero/types.ts` — XeroTokenSet, XeroConnection, XeroSyncLogEntry, DailySalesData, XeroSettings interfaces
- `src/lib/xero/vault.ts` — getXeroTokens, saveXeroTokens, deleteXeroTokens using createSupabaseAdminClient
- `src/lib/xero/client.ts` — getAuthenticatedXeroClient with 5-min expiry check and refresh token rotation
- `src/lib/xero/dates.ts` — getNZDayBoundaries (previous NZ day) and getNZTodayBoundaries (midnight to now)
- `src/lib/xero/buildInvoice.ts` — buildDailyInvoice (ACCREC, 3 payment method lines) and buildCreditNote (ACCRECCREDIT)
- `src/lib/xero/__tests__/dates.test.ts` — 9 NZ timezone tests including DST April/September transitions
- `src/lib/xero/__tests__/buildInvoice.test.ts` — 24 invoice structure and credit note tests
- `package.json` — xero-node@14.0.0, date-fns-tz@3.2.0 added

## Decisions Made

- **LineAmountTypes enum:** xero-node uses `'Inclusive'` (capitalized, not `'INCLUSIVE'`). Tests corrected; cast via `as unknown` in implementation to avoid TypeScript type conflict with xero-node's Invoice/CreditNote union types.
- **DST transition test correction:** April 2026 DST end — `fromZonedTime` uses the UTC offset at the local midnight of the previous day (NZDT = UTC+13), not the offset at the reference time (NZST = UTC+12). Initial test expectation was wrong; implementation is correct.
- **Refresh failure handling:** On token refresh failure, `client.ts` directly calls `supabase.from('xero_connections').update({ status: 'disconnected' })` via admin client rather than going through vault RPC — no vault RPC exists for this status update; direct update is appropriate.

## Deviations from Plan

None — plan executed exactly as written. The DST test correction was fixing a wrong test assumption, not a logic bug in the implementation.

## Issues Encountered

- **DST April test expectation was wrong:** Initial test expected `2026-04-04T12:00:00.000Z` for midnight of 2026-04-05 but the actual value was `2026-04-04T11:00:00.000Z`. Investigation confirmed the implementation is correct — midnight of 2026-04-05 in Pacific/Auckland uses NZDT context (UTC+13) because the clocks haven't yet gone back at midnight. Test corrected to match verified behavior.
- **LineAmountTypes.Inclusive = 'Inclusive':** Tests initially expected `'INCLUSIVE'` but the actual xero-node enum value is `'Inclusive'`. Corrected tests to use the actual SDK value.

## Known Stubs

None — all functions have complete implementations. vault.ts and client.ts depend on external services (Supabase Vault RPC and Xero OAuth) which aren't testable without integration setup — this is expected for server-only modules.

## Next Phase Readiness

- All Xero library modules are ready for use in OAuth callback (06-02), daily sync (06-03), and admin UI (06-04)
- Vault RPC functions need to run against actual Supabase with vault extension enabled (migration 008 must be applied)
- Env vars required before any Xero calls work: XERO_CLIENT_ID, XERO_CLIENT_SECRET, XERO_REDIRECT_URI, CRON_SECRET

## Self-Check: PASSED

- All 8 created files confirmed present on disk
- All 3 task commits confirmed in git log (f17fde6, 966d1dc, 64e3b4c)
- Final metadata commit: 3202ae8

---
*Phase: 06-xero-integration*
*Completed: 2026-04-02*
