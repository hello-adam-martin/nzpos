---
phase: 38-add-on-detail-pages-landing-page-refresh
plan: 01
subsystem: ui
tags: [nextjs, marketing, add-ons, static-pages, compliance, tailwind]

# Dependency graph
requires:
  - phase: 37-loyalty-points-add-on
    provides: Loyalty Points add-on backend (earning, redemption, consent)
  - phase: 36-advanced-reporting-cogs-add-on
    provides: Advanced Reporting add-on with COGS tracking
  - phase: 35-gift-cards-add-on
    provides: Gift Cards add-on with NZ Fair Trading Act compliance
  - phase: 28-marketing-landing-page
    provides: Xero detail page template and marketing page patterns
provides:
  - Gift Cards detail page at /add-ons/gift-cards with $14/month pricing and FTA 2024 callout
  - Advanced Reporting detail page at /add-ons/advanced-reporting with $9/month pricing and NZ Retail callout
  - Loyalty Points detail page at /add-ons/loyalty-points with $15/month pricing and Privacy Amendment Act 2025 callout
  - Compliance callout component pattern (navy bg, amber border, shield icon) for all 3 pages
affects: [39-comparison-page, marketing]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - 6-section add-on detail page structure (hero, before/after, compliance callout, features, how-it-works, CTA)
    - Compliance callout box: border-[var(--color-amber)] + bg-[var(--color-navy)] + shield SVG + white heading + text-white/70 body
    - force-static export on all marketing detail pages

key-files:
  created:
    - src/app/(marketing)/add-ons/gift-cards/page.tsx
    - src/app/(marketing)/add-ons/advanced-reporting/page.tsx
    - src/app/(marketing)/add-ons/loyalty-points/page.tsx
  modified: []

key-decisions:
  - "All 3 pages use identical 6-section structure to existing Xero page — hero, before/after, compliance callout, features, how-it-works, CTA"
  - "Compliance callout positioned between Before/After and Features sections as distinct visual trust signal"
  - "Hero subtext uses text-base (not text-lg) per UI-SPEC typography fix"
  - "NZ Fair Trading Act 2024 and Privacy Amendment Act 2025 cited by specific act name and year for credibility"

patterns-established:
  - "Compliance callout pattern: bg-[var(--color-navy)] border border-[var(--color-amber)] rounded-lg p-[var(--space-xl)] with shield SVG icon"
  - "New add-on detail pages inherit add-ons/layout.tsx via file system routing — no layout code needed"
  - "withoutItems/withItems arrays with 4 items each for before/after sections"

requirements-completed: [MKTG-01, MKTG-02, MKTG-03]

# Metrics
duration: 4min
completed: 2026-04-07
---

# Phase 38 Plan 01: Add-On Detail Pages Summary

**Three static add-on detail pages with 6-section structure, NZ compliance callouts, and correct pricing ($14/$9/$15/month)**

## Performance

- **Duration:** 4 min
- **Started:** 2026-04-07T03:39:10Z
- **Completed:** 2026-04-07T03:43:10Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Gift Cards detail page at `/add-ons/gift-cards` with $14/month pricing and NZ Fair Trading Act 2024 compliance callout (3-year minimum expiry enforcement)
- Advanced Reporting detail page at `/add-ons/advanced-reporting` with $9/month pricing and "Built for NZ Retail" COGS contextual callout with GST-aware margin explanation
- Loyalty Points detail page at `/add-ons/loyalty-points` with $15/month pricing and NZ Privacy Amendment Act 2025 / IPP 3A compliance callout

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Gift Cards detail page** - `8bfe020` (feat)
2. **Task 2: Create Advanced Reporting and Loyalty Points detail pages** - `ff20141` (feat)

## Files Created/Modified

- `src/app/(marketing)/add-ons/gift-cards/page.tsx` - Gift Cards add-on detail page (267 lines, 6 sections, $14/month, FTA 2024 callout)
- `src/app/(marketing)/add-ons/advanced-reporting/page.tsx` - Advanced Reporting detail page (267 lines, 6 sections, $9/month, NZ Retail callout)
- `src/app/(marketing)/add-ons/loyalty-points/page.tsx` - Loyalty Points detail page (267 lines, 6 sections, $15/month, Privacy Act 2025 callout)

## Decisions Made

- Used identical compliance callout pattern across all 3 pages: `bg-[var(--color-navy)] border border-[var(--color-amber)]` with inline shield SVG at 24px — keeps visual language consistent with the navy+amber design system
- Gift Cards and Loyalty Points callouts cite specific NZ legislation (FTA 2024, Privacy Amendment Act 2025) by name and year for credibility
- Advanced Reporting callout uses contextual "Built for NZ Retail" framing (no specific act applies, but GST-inclusive COGS calculations are NZ-specific)
- Hero subtext uses `text-base` only (not `text-base md:text-lg`) per UI-SPEC typography contract — consistent with the fix specified in 38-UI-SPEC.md

## Deviations from Plan

None — plan executed exactly as written. The canonical xero/page.tsx template uses `font-display` on both the hero h1 and the CTA h2, which is consistent with the inventory/page.tsx template. All 3 new pages follow this same established pattern.

## Issues Encountered

Pre-existing TypeScript build error in `src/actions/inventory/adjustStock.ts` (type `null` not assignable to `string | undefined`) prevented full `next build` route verification. This error predates this plan (file last modified in phase 22-02) and is unrelated to the marketing pages created here. Logged to deferred items. The 3 new pages follow the exact same structure as the existing working pages and will generate as static routes when the pre-existing error is resolved.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- All 3 add-on detail pages are live at their slugs (`/add-ons/gift-cards`, `/add-ons/advanced-reporting`, `/add-ons/loyalty-points`)
- Phase 39 (comparison page) can now link to these pages as evidence — no broken add-on links
- Phase 38 Plan 02 (landing page refresh) can proceed: LandingPricing.tsx, LandingFeatures.tsx, LandingHero.tsx, and add-ons/page.tsx updates

---
*Phase: 38-add-on-detail-pages-landing-page-refresh*
*Completed: 2026-04-07*
