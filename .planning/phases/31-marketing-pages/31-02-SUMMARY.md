---
phase: 31-marketing-pages
plan: 02
subsystem: ui
tags: [marketing, add-ons, next.js, tailwind]

# Dependency graph
requires:
  - phase: 28-marketing-landing-page
    provides: add-ons hub page with original 3-column layout
provides:
  - Add-ons hub page updated to show only 2 paid add-ons (Xero, Inventory) in centered 2-column grid
affects: [marketing, billing]

# Tech tracking
tech-stack:
  added: []
  patterns: []

key-files:
  created: []
  modified:
    - src/app/(marketing)/add-ons/page.tsx

key-decisions:
  - "Email Notifications removed from add-ons hub: it is now free (not a paid add-on)"
  - "Grid changed from 3-column to 2-column with max-w-3xl centering to match 2-add-on layout"

patterns-established: []

requirements-completed:
  - MKT-03
  - MKT-05

# Metrics
duration: 5min
completed: 2026-04-06
---

# Phase 31 Plan 02: Add-ons Hub Page Summary

**Removed Email Notifications from add-ons hub and updated grid from 3-column to centered 2-column, reflecting email as free tier**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-04-06T07:40:00Z
- **Completed:** 2026-04-06T07:45:00Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Removed Email Notifications entry from addOns array (was $5/month, now free)
- Updated metadata description to remove "email notifications" reference
- Changed grid from `md:grid-cols-3` to `md:grid-cols-2 max-w-3xl mx-auto` for centered 2-column layout
- `force-static` export preserved throughout

## Task Commits

Each task was committed atomically:

1. **Task 1: Update add-ons hub page - remove email entry, fix grid, update metadata** - `f3c7be0` (feat)

**Plan metadata:** (pending final commit)

## Files Created/Modified
- `src/app/(marketing)/add-ons/page.tsx` - Removed Email Notifications entry, updated description, changed grid to 2-column centered

## Decisions Made
- Email Notifications removed entirely from add-ons hub because email is now free for all stores (v6.0 milestone)
- Grid centering via `max-w-3xl mx-auto` matches the landing pricing section pattern for visual consistency

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Add-ons hub now correctly shows only 2 paid add-ons (Xero, Inventory)
- Phase 31 marketing pages work complete — STATE.md and ROADMAP.md updated

## Self-Check: PASSED

- FOUND: src/app/(marketing)/add-ons/page.tsx
- FOUND: commit f3c7be0

---
*Phase: 31-marketing-pages*
*Completed: 2026-04-06*
