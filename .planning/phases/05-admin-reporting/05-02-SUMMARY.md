---
phase: 05-admin-reporting
plan: 02
subsystem: ui
tags: [nextjs, supabase, tailwind, dashboard, reporting]

# Dependency graph
requires:
  - phase: 05-01
    provides: Admin layout with sidebar nav and base admin page structure

provides:
  - Real admin dashboard page with server-side Supabase data fetching
  - DashboardHeroCard component for Satoshi display stat cards
  - LowStockAlertList component with error/warning color coding and empty state

affects: [05-admin-reporting, future-reporting-plans]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Server Component dashboard with auth guard and redirect pattern (matches promos/page.tsx)
    - DashboardHeroCard with font-display font-bold text-3xl and tnum tabular numerals
    - LowStockAlertList color-error for zero-stock, color-warning for at-threshold items

key-files:
  created:
    - src/components/admin/dashboard/DashboardHeroCard.tsx
    - src/components/admin/dashboard/LowStockAlertList.tsx
  modified:
    - src/app/admin/dashboard/page.tsx

key-decisions:
  - "Low-stock filter done client-side after fetching all active products (small catalog assumption, avoids complex SQL)"
  - "Orders query uses .in('status', ['completed', 'pending_pickup', 'ready', 'collected']) to exclude expired/pending"
  - "Dashboard hero card uses min-h-[96px] flex flex-col justify-between for scannability"

patterns-established:
  - "Dashboard hero cards: font-display font-bold text-3xl with fontFeatureSettings tnum"
  - "Semantic stock colors: color-error for stock=0, color-warning for stock<=threshold"
  - "Admin Server Components follow promos/page.tsx auth guard pattern"

requirements-completed: [ADMIN-01, ADMIN-06]

# Metrics
duration: 2min
completed: 2026-04-01
---

# Phase 5 Plan 02: Admin Dashboard Summary

**Admin dashboard with Supabase-backed today's sales stats, POS/online channel split, and low-stock alerts replacing placeholder page**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-04-01T09:24:20Z
- **Completed:** 2026-04-01T09:26:01Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Created `DashboardHeroCard` with Satoshi display font (30px), tabular numerals, 96px minimum height
- Created `LowStockAlertList` with color-error (zero stock) and color-warning (at-threshold) and "All products are well-stocked." empty state
- Replaced placeholder dashboard page with real Server Component fetching today's completed orders and low-stock products from Supabase

## Task Commits

Each task was committed atomically:

1. **Task 1: DashboardHeroCard and LowStockAlertList components** - `89b3930` (feat)
2. **Task 2: Dashboard page with server-side data fetching** - `45e9558` (feat)

**Plan metadata:** (docs commit below)

## Files Created/Modified

- `src/components/admin/dashboard/DashboardHeroCard.tsx` - Stat card with Satoshi display number, DM Sans label/subLabel, tnum, 96px min-h
- `src/components/admin/dashboard/LowStockAlertList.tsx` - Low stock list with semantic color coding, 10-item max, "View all" link, empty state
- `src/app/admin/dashboard/page.tsx` - Server Component: auth guard, today's orders query, low stock query, 3 hero cards + alert list

## Decisions Made

- Low-stock filtering done client-side after fetching all active products — appropriate for small catalogs, avoids complex SQL filter expressions
- Orders query includes `pending_pickup`, `ready`, `collected` alongside `completed` to capture all non-expired revenue-generating orders
- Used `force-dynamic` export to ensure fresh data on each page load (no stale cache)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Dashboard components ready for use in other parts of the admin UI if needed
- Low stock alert pattern established for inventory monitoring
- Remaining plans in Phase 05: orders list, refund flow, cash-up, reports

---
*Phase: 05-admin-reporting*
*Completed: 2026-04-01*
