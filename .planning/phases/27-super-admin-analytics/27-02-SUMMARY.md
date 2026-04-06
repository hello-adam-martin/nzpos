---
phase: 27-super-admin-analytics
plan: 02
subsystem: ui
tags: [recharts, react, next.js, supabase, analytics, mrr, tailwind]

requires:
  - phase: 27-super-admin-analytics plan 01
    provides: platform_analytics_snapshots table, analytics_sync_metadata, triggerStripeSync server action

provides:
  - MrrTrendChart: Recharts AreaChart with amber stroke/gradient, 6-month MRR data, empty state
  - AddonRevenueChart: Recharts horizontal BarChart with navy bars, dynamic height, empty state
  - AnalyticsSyncControls: refresh button with loading/cooldown/success/error states, countdown, rate limit
  - AnalyticsContent: client wrapper with transition-opacity dimming during sync, stat cards grid, charts
  - Analytics page at /super-admin/analytics reading exclusively from snapshot table

affects: []

tech-stack:
  added: []
  patterns:
    - "Server component data fetching with Promise.all for parallel queries"
    - "Client wrapper (AnalyticsContent) receives pre-computed data from server component — all interactivity in client"
    - "onSyncStart/onSyncComplete callbacks thread sync state from AnalyticsSyncControls up through AnalyticsContent"
    - "transition-opacity on data section for sync dimming, controls remain fully visible"

key-files:
  created:
    - src/components/super-admin/MrrTrendChart.tsx
    - src/components/super-admin/AddonRevenueChart.tsx
    - src/components/super-admin/AnalyticsSyncControls.tsx
    - src/components/super-admin/AnalyticsContent.tsx
  modified:
    - src/app/super-admin/analytics/page.tsx

key-decisions:
  - "AnalyticsSyncControls accepts onSyncStart optional prop to trigger page dimming before sync response arrives"
  - "Add-on revenue grouping done in JS (not SQL GROUP BY) — Supabase JS client query limitation"
  - "addonRevenueData sorted by MRR descending for visual clarity"

patterns-established:
  - "Analytics page: server component fetches all data via Promise.all, passes as props to client AnalyticsContent wrapper"
  - "Sync controls: onSyncStart sets isSyncing=true before await; onSyncComplete sets false + router.refresh()"

requirements-completed: [SA-MRR-01, SA-MRR-02, SA-MRR-03, SA-MRR-04, SA-MRR-05]

duration: 12min
completed: 2026-04-06
---

# Phase 27 Plan 02: Analytics UI Summary

**Analytics page with Recharts MRR trend + add-on revenue charts, stat cards, and sync controls with rate-limit countdown — all data from snapshot table, no live Stripe calls**

## Performance

- **Duration:** 12 min
- **Started:** 2026-04-06T01:52:36Z
- **Completed:** 2026-04-06T02:04:00Z
- **Tasks:** 2 (Task 3 is checkpoint — awaiting human verification)
- **Files modified:** 5

## Accomplishments

- Built MrrTrendChart cloning SignupTrendChart with amber (#E67E22) AreaChart stroke/gradient (mrrGradient ID, no collision), 240px height, NZD tooltip formatting, empty state
- Built AddonRevenueChart with vertical layout (horizontal bars), navy (#1E293B) fill, dynamic height, rounded right bar ends, empty state
- Built AnalyticsSyncControls with idle/loading/cooldown/success/error states, 5-min countdown timer (mm:ss format), formatDistanceToNow display, aria-busy/aria-disabled, role=status/alert banners
- Built AnalyticsContent client wrapper with transition-opacity dimming during sync (D-12), 3-col stat cards grid (DashboardHeroCard), MRR trend chart, add-on revenue chart
- Replaced analytics page placeholder with full server component querying platform_analytics_snapshots via Promise.all for all 6+ queries; no live Stripe API calls

## Task Commits

1. **Task 1: Chart components + sync controls** - `f58a5bd` (feat)
2. **Task 2: Analytics page server component + AnalyticsContent wrapper** - `72d77a2` (feat)

**Plan metadata:** (this commit)

*Task 3: Visual verification checkpoint — awaiting human review*

## Files Created/Modified

- `src/components/super-admin/MrrTrendChart.tsx` - Recharts AreaChart, amber gradient, 240px, NZD Y-axis, empty state, figcaption
- `src/components/super-admin/AddonRevenueChart.tsx` - Recharts vertical BarChart, navy bars, dynamic height, empty state, figcaption
- `src/components/super-admin/AnalyticsSyncControls.tsx` - Refresh button FSM, countdown timer, success/error banners, aria attributes
- `src/components/super-admin/AnalyticsContent.tsx` - Client wrapper with dimming state, stat cards, all charts, sync controls
- `src/app/super-admin/analytics/page.tsx` - Server component: 6+ parallel queries, annual MRR normalisation (via mrr_cents), add-on grouping in JS

## Decisions Made

- **onSyncStart optional prop:** Added to AnalyticsSyncControls so AnalyticsContent can set `isSyncing=true` immediately when refresh starts (before server response), providing instant visual feedback.
- **JS-side add-on grouping:** Supabase JS client doesn't support GROUP BY, so addon_type grouping done by iterating rows in JS and accumulating mrr_cents per type.
- **addonRevenueData sorted descending:** Sorted by MRR value before passing to chart for visual clarity (highest revenue add-on at top).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added onSyncStart prop to AnalyticsSyncControls**
- **Found during:** Task 2 (AnalyticsContent.tsx implementation)
- **Issue:** Plan spec shows AnalyticsContent calling `onSyncStart` to set `isSyncing=true`, but the AnalyticsSyncControls interface in Task 1 only had `onSyncComplete`. Without `onSyncStart`, the page couldn't dim immediately when the button is clicked.
- **Fix:** Added optional `onSyncStart?: () => void` to AnalyticsSyncControls props interface, called before the triggerStripeSync await.
- **Files modified:** src/components/super-admin/AnalyticsSyncControls.tsx
- **Verification:** TypeScript clean, prop flows correctly from AnalyticsContent down to controls
- **Committed in:** 72d77a2 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 2 — missing critical prop for correct D-12 implementation)
**Impact on plan:** Fix required for D-12 page-dimming to work correctly. No scope creep.

## Issues Encountered

None beyond the auto-fix above.

## User Setup Required

None - no external service configuration required beyond existing setup.

## Next Phase Readiness

- Analytics page complete at /super-admin/analytics — awaiting Task 3 visual verification checkpoint
- All SA-MRR-01 through SA-MRR-05 requirements implemented
- Pre-existing processRefund test failures (3 tests) are out of scope — documented in Plan 01 SUMMARY

---
*Phase: 27-super-admin-analytics*
*Completed: 2026-04-06*
