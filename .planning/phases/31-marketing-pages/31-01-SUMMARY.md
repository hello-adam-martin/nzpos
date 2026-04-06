---
phase: 31-marketing-pages
plan: 01
subsystem: ui
tags: [nextjs, tailwind, marketing, pricing]

# Dependency graph
requires:
  - phase: 30-admin-ui-super-admin
    provides: email_notifications removed from admin/super-admin UI
  - phase: 29-backend-billing-cleanup
    provides: email_notifications removed as paid add-on from billing backend
provides:
  - Landing pricing section showing only 2 paid add-ons (Xero, Inventory Management)
  - Email notifications in free tier checklist on landing page
  - Centered 2-column add-on grid layout on landing page
  - /add-ons/email-notifications route deleted (returns 404)
affects: [31-marketing-pages-02]

# Tech tracking
tech-stack:
  added: []
  patterns: []

key-files:
  created: []
  modified:
    - src/app/(marketing)/components/LandingPricing.tsx
  deleted:
    - src/app/(marketing)/add-ons/email-notifications/page.tsx

key-decisions:
  - "Email notifications added to free tier checklist as 7th item after Reporting"
  - "Add-on grid switched from md:grid-cols-3 to md:grid-cols-2 with max-w-3xl mx-auto for visual balance"
  - "Email notifications detail page deleted — Next.js 404 is sufficient, no redirect needed"

patterns-established: []

requirements-completed: [MKT-01, MKT-02, MKT-04, MKT-05]

# Metrics
duration: 5min
completed: 2026-04-06
---

# Phase 31 Plan 01: Landing Pricing - Email Free Tier + Grid Fix Summary

**Landing pricing updated to show 2 paid add-ons in centered 2-column grid with email notifications moved to free tier checklist, and email detail page deleted**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-04-06T07:33:55Z
- **Completed:** 2026-04-06T07:38:30Z
- **Tasks:** 2
- **Files modified:** 1 modified, 1 deleted

## Accomplishments

- Added "Email notifications" as 7th item in free tier checklist in LandingPricing.tsx
- Removed Email Notifications add-on card (was linked to /add-ons/email-notifications at $5/month)
- Changed add-on grid from `md:grid-cols-3` to `md:grid-cols-2` with `max-w-3xl mx-auto` centering
- Deleted `src/app/(marketing)/add-ons/email-notifications/` directory entirely

## Task Commits

Each task was committed atomically:

1. **Task 1: Update LandingPricing.tsx - remove email card, add to free tier, fix grid** - `153d834` (feat)
2. **Task 2: Delete email-notifications detail page** - `240fb6f` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `src/app/(marketing)/components/LandingPricing.tsx` - Added email notifications to free tier array, removed email add-on card, updated grid to 2-column centered layout
- `src/app/(marketing)/add-ons/email-notifications/page.tsx` - DELETED (directory removed)

## Decisions Made

- Email notifications added as last item in free tier checklist (after "Reporting") — consistent checkmark SVG style
- Grid constraint: `max-w-3xl` (768px) keeps 2-column cards visually balanced within the 1200px container
- No redirect from /add-ons/email-notifications — Next.js built-in 404 is appropriate

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Landing pricing section is complete and consistent with v6.0 pricing model
- Ready for 31-02 to complete the add-ons hub page updates (already committed in parallel)

## Self-Check

Checking created files and commits exist:

- [x] `153d834` commit exists (LandingPricing update)
- [x] `240fb6f` commit exists (email-notifications deletion)
- [x] `src/app/(marketing)/components/LandingPricing.tsx` modified
- [x] `src/app/(marketing)/add-ons/email-notifications/` deleted

## Self-Check: PASSED

---
*Phase: 31-marketing-pages*
*Completed: 2026-04-06*
