---
phase: 05-admin-reporting
plan: 05
subsystem: ui
tags: [cash-sessions, cash-up, pos, admin, server-actions, supabase, tailwind]

# Dependency graph
requires:
  - phase: 05-01
    provides: resolveAuth dual-owner/staff auth, cash_sessions table type definitions, formatNZD, createSupabaseAdminClient
provides:
  - openCashSession Server Action with float entry and duplicate-session guard
  - closeCashSession Server Action with cash order aggregation, expected cash and variance calculation
  - DenominationBreakdown component with NZ notes/coins, useReducer state, 44px rows
  - CashVarianceSummary component with semantic color coding for variance
  - CashUpModal full-screen modal with open and close modes, variance display on success
  - CashSessionBanner elapsed time display for POS top bar
  - POSTopBar updated with activeSession prop and cash-up modal integration
  - CashUpAdminPageClient session history table with variance coloring
  - Admin /admin/cash-up Server Component page with staff name lookup
affects:
  - pos-checkout (POSTopBar now accepts activeSession prop)
  - admin-layout (cash-up page added to admin routes)
  - 05-06 (session history already displayed, any further reporting can reference cash_sessions)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Server Component passes data to 'use client' wrapper (CashUpAdminPageClient pattern) — avoids direct modal rendering in Server Components
    - Dual auth resolution: resolveAuth() for both owner (Supabase JWT) and staff (PIN JWT) paths
    - Staff ID resolution: maybeSingle() lookup from auth_user_id → staff.id for owner auth path

key-files:
  created:
    - src/actions/cash-sessions/openCashSession.ts
    - src/actions/cash-sessions/closeCashSession.ts
    - src/components/admin/cash-up/DenominationBreakdown.tsx
    - src/components/admin/cash-up/CashVarianceSummary.tsx
    - src/components/admin/cash-up/CashUpModal.tsx
    - src/components/admin/cash-up/CashSessionBanner.tsx
    - src/components/admin/cash-up/CashUpAdminPageClient.tsx
    - src/app/admin/cash-up/page.tsx
  modified:
    - src/components/pos/POSTopBar.tsx

key-decisions:
  - "maybeSingle() used instead of single() for staff lookup and open-session check to avoid 406 errors when no row exists"
  - "Denomination breakdown updates both cents state and dollar text field simultaneously for visual feedback"
  - "Staff name lookup uses a second query with in() filter rather than a join, matching existing codebase patterns with admin client"
  - "CashUpModal handles both open and close modes in one component to keep modal state co-located in POSTopBar and CashUpAdminPageClient"

patterns-established:
  - "Server Component data fetch + Client wrapper pattern: page.tsx fetches data, passes to CashUpAdminPageClient which manages modal state"
  - "Variance color thresholds: positive=success, 0=muted, 0-$2 short=muted, $2-$5 short=warning, >$5 short=error"

requirements-completed:
  - ADMIN-02
  - ADMIN-03

# Metrics
duration: 25min
completed: 2026-04-01
---

# Phase 05 Plan 05: Cash-Up Summary

**Cash session open/close Server Actions with expected-cash calculation from live orders, denomination breakdown UI, semantic variance display, and Server Component admin page with staff name resolution**

## Performance

- **Duration:** 25 min
- **Started:** 2026-04-01T00:00:00Z
- **Completed:** 2026-04-01T00:25:00Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments

- Server Actions for opening and closing cash sessions, with guard against duplicate open sessions and correct expected cash calculation (float + cash sales in session window)
- DenominationBreakdown with all 10 NZ denominations, useReducer state management, and auto-calculated total
- CashUpModal integrated into both POSTopBar and CashUpAdminPageClient, showing variance summary on successful close
- Admin /admin/cash-up page as Server Component fetching sessions with staff names, delegating modal state to client wrapper

## Task Commits

1. **Task 1: Cash session Server Actions (open and close)** - `05e7ea6` (feat)
2. **Task 2: Cash-up UI components, POS top bar integration, and admin page** - `2f27b53` (feat)

## Files Created/Modified

- `src/actions/cash-sessions/openCashSession.ts` - Server Action: validates float, checks no open session, resolves staff ID, inserts cash_sessions row
- `src/actions/cash-sessions/closeCashSession.ts` - Server Action: sums cash orders in session window, computes expected_cash_cents and variance_cents, updates session
- `src/components/admin/cash-up/DenominationBreakdown.tsx` - Optional collapsible NZ denomination grid, useReducer, 44px rows, auto-total callback
- `src/components/admin/cash-up/CashVarianceSummary.tsx` - Read-only variance block with semantic color coding using formatNZD
- `src/components/admin/cash-up/CashUpModal.tsx` - Full-screen modal with open/close modes, Escape key handler, variance display on success
- `src/components/admin/cash-up/CashSessionBanner.tsx` - Elapsed time banner with per-minute interval update
- `src/components/admin/cash-up/CashUpAdminPageClient.tsx` - Client wrapper: modal state, session history table, variance coloring
- `src/app/admin/cash-up/page.tsx` - Server Component: auth check, fetches last 10 sessions with staff names, passes to client wrapper
- `src/components/pos/POSTopBar.tsx` - Updated with activeSession prop, CashSessionBanner, Open Session button, CashUpModal

## Decisions Made

- Used `maybeSingle()` for staff lookup and open-session guard queries to avoid 406 errors when no matching row exists
- Denomination breakdown updates both the cents state and dollar text field simultaneously so the manual input and denomination total stay visually in sync
- Staff name lookup uses a separate `in()` query rather than a join, consistent with existing admin client patterns in the codebase
- CashUpModal handles both open and close modes in a single component so modal state can be co-located with the triggering button in POSTopBar and CashUpAdminPageClient

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Cash-up flow ready: open/close sessions work from both POS top bar and admin dashboard
- POSTopBar now accepts `activeSession` prop — POS page layout must pass the current open session (if any) to render the banner or "Open Session" button correctly
- Admin /admin/cash-up page is live at that route; AdminSidebar link to Cash-Up was added in Plan 05-01

---
*Phase: 05-admin-reporting*
*Completed: 2026-04-01*
