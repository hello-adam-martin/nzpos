---
phase: 39-comparison-page-nav-footer-seo
plan: 01
subsystem: ui
tags: [comparison, seo, json-ld, open-graph, marketing, faq, feature-matrix]

requires:
  - phase: 38-add-on-detail-pages-landing-page-refresh
    provides: Add-on detail pages at /add-ons/* for feature matrix links
provides:
  - Typed comparison data file with 4 NZ POS competitors, 15 features, 6 FAQ items
  - Comparison page at /compare with sticky-column feature matrix
  - FTA-compliant pricing disclaimer with source URLs
  - JSON-LD SoftwareApplication structured data
  - OG meta tags for social sharing
affects: [39-02-nav-footer, 39-03-seo-retrofit]

tech-stack:
  added: []
  patterns: [typed-data-file-for-marketing-content, details-summary-faq-accordion, sticky-column-comparison-table]

key-files:
  created:
    - src/data/comparison.ts
    - src/app/(marketing)/compare/page.tsx
  modified: []

key-decisions:
  - "Used native details/summary for FAQ accordion — no JS dependency, matches LandingNav pattern"
  - "Selected 4 competitors (Square, Lightspeed, Shopify POS, POSbiz) covering global players and NZ-specific"
  - "15 features across 6 categories highlighting NZPOS differentiators (free core, no POS transaction fees)"
  - "Add-on features in matrix link to /add-ons/* detail pages for cross-sell"

patterns-established:
  - "Typed data file pattern: src/data/*.ts exports typed arrays for marketing page content"
  - "Sticky-column table: first column sticky left-0 z-10 with overflow-x-auto wrapper"
  - "FAQ accordion: details/summary with chevron rotation via group-open:rotate-180"

requirements-completed: [COMP-01, COMP-02, COMP-03, COMP-04, COMP-05, NAV-02, NAV-03]

duration: 4min
completed: 2026-04-07
---

# Phase 39 Plan 01: Comparison Page Summary

**Competitor comparison page at /compare with typed data file, sticky-column feature matrix (NZPOS vs Square/Lightspeed/Shopify POS/POSbiz), FTA-compliant pricing disclaimer, Why NZPOS editorial, details/summary FAQ accordion, and JSON-LD structured data**

## Performance

- **Duration:** 4 min
- **Started:** 2026-04-07T05:30:43Z
- **Completed:** 2026-04-07T05:34:31Z
- **Tasks:** 2
- **Files created:** 2

## Accomplishments
- Typed comparison data file with 4 NZ competitors, 15 features across 6 categories, 6 FAQ items, and FTA-compliant pricing disclaimer date
- Comparison page with sticky-column feature matrix, horizontal scroll on mobile, and NZPOS column visually distinguished
- Why NZPOS editorial section with 4 differentiators (NZ-built, honest pricing, dual-channel inventory, modular add-ons)
- FAQ accordion using native details/summary elements with chevron rotation animation
- Two CTA sections with signup and POS demo links
- Full SEO: OG meta tags, JSON-LD SoftwareApplication schema, descriptive title and description
- Add-on features in matrix link to their /add-ons/* detail pages (5 add-on links)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create comparison data file** - `4ff82f6` (feat)
2. **Task 2: Create comparison page with matrix, editorial, FAQ, CTAs, SEO** - `2cc3767` (feat)

## Files Created/Modified
- `src/data/comparison.ts` - Typed exports: competitors, featureCategories, features, faqItems, pricingDisclaimerDate
- `src/app/(marketing)/compare/page.tsx` - Server Component with force-static, full comparison page with all sections

## Decisions Made
- Selected 4 competitors covering the NZ POS market: Square (global, free+fees), Lightspeed (NZ-founded), Shopify POS (online-first), POSbiz (NZ-specific)
- 15 features across 6 categories (Core POS, Online Store, Inventory, NZ Compliance, Add-ons, Pricing) to highlight NZPOS strengths
- Used native details/summary for FAQ — no JS required, accessible by default, matches existing LandingNav pattern
- Feature matrix cells use checkmark/cross SVGs for booleans, text for string values, amber links for add-on features
- Pricing disclaimer uses imported pricingDisclaimerDate from data file for single-source-of-truth updates

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Known Stubs

None - all data is populated, all links point to existing pages.

## Next Phase Readiness
- /compare route ready for nav/footer linking (Plan 02)
- JSON-LD pattern established for SEO retrofit of add-on pages (Plan 03)
- Feature matrix data structure supports adding/removing competitors and features

---
*Phase: 39-comparison-page-nav-footer-seo*
*Completed: 2026-04-07*
