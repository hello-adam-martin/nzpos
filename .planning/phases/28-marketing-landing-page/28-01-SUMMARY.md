---
phase: 28-marketing-landing-page
plan: 01
subsystem: ui
tags: [marketing, copy, landing-page, nav]

# Dependency graph
requires:
  - phase: 28-marketing-landing-page
    provides: existing LandingHero, LandingCTA, LandingNav components
provides:
  - Updated hero copy reflecting mature SaaS platform
  - Updated CTA copy with confident tone
  - Nav anchor links to features and pricing sections
affects: [28-02, 28-03]

# Tech tracking
tech-stack:
  added: []
  patterns: []

key-files:
  created: []
  modified:
    - src/app/(marketing)/components/LandingHero.tsx
    - src/app/(marketing)/components/LandingCTA.tsx
    - src/app/(marketing)/components/LandingNav.tsx

key-decisions:
  - "Copy-only changes, zero structural modifications to components"

patterns-established: []

requirements-completed: [MKT-06, MKT-07, MKT-08, MKT-09]

# Metrics
duration: 3min
completed: 2026-04-06
---

# Phase 28 Plan 01: Hero, CTA, and Nav Copy Rewrite Summary

**Rewrote hero/CTA from MVP-era "POS for retailers" to confident SaaS "retail platform for Kiwi businesses" tone, added Features/Pricing anchor links to nav**

## Performance

- **Duration:** 3 min
- **Started:** 2026-04-06T03:02:13Z
- **Completed:** 2026-04-06T03:05:15Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Hero H1 updated to "The retail platform built for Kiwi businesses." reflecting 27 shipped phases
- Hero sub-copy updated to "Sell in-store and online from one dashboard. GST handled correctly on every transaction."
- CTA H2 updated to "Your shop, running smarter." with "No credit card needed." added to supporting line
- Nav now has Features (#features) and Pricing (#pricing) anchor links on both desktop and mobile

## Task Commits

Each task was committed atomically:

1. **Task 1: Rewrite LandingHero copy and LandingCTA copy** - `0e559b7` (feat)
2. **Task 2: Add anchor links to LandingNav** - `c17c174` (feat)

## Files Created/Modified
- `src/app/(marketing)/components/LandingHero.tsx` - Updated H1 and sub-copy for mature SaaS messaging
- `src/app/(marketing)/components/LandingCTA.tsx` - Updated H2 and supporting line with confident tone
- `src/app/(marketing)/components/LandingNav.tsx` - Added Features and Pricing anchor links (desktop + mobile)

## Decisions Made
None - followed plan as specified

## Deviations from Plan
None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Nav anchor links ready for #features and #pricing section IDs (to be added in plan 02/03)
- Hero and CTA copy aligned with mature platform messaging for the full marketing page

## Self-Check: PASSED

- FOUND: src/app/(marketing)/components/LandingHero.tsx
- FOUND: src/app/(marketing)/components/LandingCTA.tsx
- FOUND: src/app/(marketing)/components/LandingNav.tsx
- FOUND: 28-01-SUMMARY.md
- FOUND: commit 0e559b7
- FOUND: commit c17c174

---
*Phase: 28-marketing-landing-page*
*Completed: 2026-04-06*
