---
phase: 38-add-on-detail-pages-landing-page-refresh
plan: "02"
subsystem: marketing
tags: [landing-page, pricing, features, add-ons, catalog]
dependency_graph:
  requires: []
  provides:
    - landing-pricing-5-add-ons
    - landing-features-grow-your-business
    - landing-hero-5-add-on-reference
    - add-ons-catalog-5-cards
  affects:
    - src/app/(marketing)/page.tsx
    - src/app/(marketing)/add-ons/page.tsx
tech_stack:
  added: []
  patterns:
    - data-array-split-for-3+2-grid
    - feature-group-extension
key_files:
  created: []
  modified:
    - src/app/(marketing)/components/LandingPricing.tsx
    - src/app/(marketing)/components/LandingFeatures.tsx
    - src/app/(marketing)/components/LandingHero.tsx
    - src/app/(marketing)/add-ons/page.tsx
decisions:
  - Refactored LandingPricing add-on cards into a data array split by slice(0,3) / slice(3) for 3+2 grid — cleaner than duplication
  - Used same gift/chart/star SVG icons across both LandingFeatures (24px) and catalog page (32px) for visual consistency
  - Hero copy addition is minimal ("5 optional add-ons when you need them") — appended to existing sentence, no structural change
metrics:
  duration: "~4.5 minutes"
  completed: "2026-04-07"
  tasks_completed: 2
  tasks_total: 2
  files_changed: 4
---

# Phase 38 Plan 02: Landing Page & Catalog Refresh Summary

**One-liner:** Landing page pricing/features/hero updated to showcase all 5 paid add-ons; /add-ons catalog expanded to 5 cards in 3+2 grid.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Expand LandingPricing to 5 add-ons with 3+2 grid | 9de3cd0 | LandingPricing.tsx |
| 2 | Update LandingFeatures, LandingHero, and add-ons catalog | a49e53d | LandingFeatures.tsx, LandingHero.tsx, add-ons/page.tsx |

## What Was Built

### LandingPricing.tsx
- Refactored add-on data into a `const addOns` array (5 entries)
- 3+2 grid layout: top row (`md:grid-cols-3`, `max-w-5xl`) shows Xero, Inventory, Gift Cards; bottom row (`md:grid-cols-2`, `max-w-3xl`) shows Advanced Reporting, Loyalty Points
- Added Gift Cards ($14/mo), Advanced Reporting ($9/mo), Loyalty Points ($15/mo) cards
- Free core card and GST footer preserved unchanged
- Card design identical to prior implementation

### LandingFeatures.tsx
- Added 5th feature group "Grow Your Business" after "Stay Compliant"
- Three new feature cards: Gift Cards (gift box icon), Advanced Reporting (bar chart icon), Loyalty Points (star icon)
- All icons: inline SVG, 24px, stroke-width 2, Lucide-style — matching existing pattern

### LandingHero.tsx
- Subtext updated: added "5 optional add-ons when you need them." appended to existing sentence
- No structural changes — h1, CTAs, iPad mockup all unchanged

### add-ons/page.tsx
- Expanded from 2 to 5 add-ons in the data array
- Same 3+2 grid pattern as LandingPricing
- Catalog icons: 32px (matching existing Xero/Inventory icons)
- Metadata description updated to name all 5 add-ons
- CTA section unchanged

## Deviations from Plan

None — plan executed exactly as written.

## Build Status

Compilation: Success (`✓ Compiled successfully in 4.4s`)

Pre-existing TypeScript error in `src/actions/inventory/adjustStock.ts` (phase 22 artifact — Type 'null' not assignable to 'string | undefined') — not caused by this plan, deferred.

## Known Stubs

None — all 5 add-on cards link to existing detail pages (xero, inventory from prior phases; gift-cards, advanced-reporting, loyalty-points from plan 38-01).

## Self-Check: PASSED
