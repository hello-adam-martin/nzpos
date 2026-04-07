---
phase: 39-comparison-page-nav-footer-seo
plan: 03
subsystem: ui
tags: [seo, open-graph, json-ld, structured-data, marketing]

requires:
  - phase: 38-add-on-detail-pages-landing-page-refresh
    provides: 5 add-on detail pages with basic Metadata (title + description)
provides:
  - Open Graph meta tags on all 5 add-on detail pages
  - JSON-LD SoftwareApplication structured data on all 5 add-on detail pages
affects: [seo, marketing, social-sharing]

tech-stack:
  added: []
  patterns: [JSON-LD SoftwareApplication schema for add-on pages, openGraph metadata pattern]

key-files:
  created: []
  modified:
    - src/app/(marketing)/add-ons/xero/page.tsx
    - src/app/(marketing)/add-ons/inventory/page.tsx
    - src/app/(marketing)/add-ons/gift-cards/page.tsx
    - src/app/(marketing)/add-ons/advanced-reporting/page.tsx
    - src/app/(marketing)/add-ons/loyalty-points/page.tsx

key-decisions:
  - "Reused existing metadata description values for OG description rather than writing separate copy"

patterns-established:
  - "JSON-LD pattern: SoftwareApplication with BusinessApplication category, Web operatingSystem, and Offer with NZD pricing"
  - "OG pattern: title mirrors metadata title, description mirrors metadata description, type website, url with canonical path"

requirements-completed: [NAV-02, NAV-03]

duration: 2min
completed: 2026-04-07
---

# Phase 39 Plan 03: Add-On SEO Summary

**Open Graph meta tags and JSON-LD SoftwareApplication structured data added to all 5 add-on detail pages with correct per-add-on NZD pricing**

## Performance

- **Duration:** 2 min
- **Started:** 2026-04-07T05:30:42Z
- **Completed:** 2026-04-07T05:32:58Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- All 5 add-on pages now have Open Graph meta tags for social media previews
- All 5 add-on pages now have JSON-LD SoftwareApplication structured data for search engine rich results
- Pricing in JSON-LD matches actual add-on pricing: Xero $9, Inventory $9, Gift Cards $14, Advanced Reporting $9, Loyalty Points $15

## Task Commits

Each task was committed atomically:

1. **Task 1: Add OG meta and JSON-LD to Xero and Inventory add-on pages** - `09d48d6` (feat)
2. **Task 2: Add OG meta and JSON-LD to Gift Cards, Advanced Reporting, and Loyalty Points pages** - `9a36bea` (feat)

## Files Created/Modified
- `src/app/(marketing)/add-ons/xero/page.tsx` - Added openGraph metadata and JSON-LD with $9/mo pricing
- `src/app/(marketing)/add-ons/inventory/page.tsx` - Added openGraph metadata and JSON-LD with $9/mo pricing
- `src/app/(marketing)/add-ons/gift-cards/page.tsx` - Added openGraph metadata and JSON-LD with $14/mo pricing
- `src/app/(marketing)/add-ons/advanced-reporting/page.tsx` - Added openGraph metadata and JSON-LD with $9/mo pricing
- `src/app/(marketing)/add-ons/loyalty-points/page.tsx` - Added openGraph metadata and JSON-LD with $15/mo pricing

## Decisions Made
- Reused existing metadata title and description values for OG fields rather than writing separate social-optimized copy -- keeps a single source of truth for page descriptions

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All 5 add-on pages now have complete SEO: title, description, Open Graph, and JSON-LD structured data
- Pages are ready for social sharing and search engine indexing with rich results

## Self-Check: PASSED

All 5 modified files confirmed on disk. Both task commits (09d48d6, 9a36bea) confirmed in git log.

---
*Phase: 39-comparison-page-nav-footer-seo*
*Completed: 2026-04-07*
