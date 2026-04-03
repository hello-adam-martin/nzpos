---
phase: 14-store-setup-wizard-marketing
plan: "03"
subsystem: marketing-landing-page
tags: [landing-page, static-rendering, marketing, next-js]
dependency_graph:
  requires: []
  provides: [landing-page-route, marketing-components]
  affects: [src/app/page.tsx, src/app/(marketing)/components]
tech_stack:
  added: []
  patterns: [force-static, server-components, details-summary-no-js-toggle]
key_files:
  created:
    - src/app/page.tsx
    - src/app/(marketing)/components/LandingNav.tsx
    - src/app/(marketing)/components/LandingHero.tsx
    - src/app/(marketing)/components/LandingFeatures.tsx
    - src/app/(marketing)/components/LandingPricing.tsx
    - src/app/(marketing)/components/LandingCTA.tsx
    - src/app/(marketing)/components/LandingFooter.tsx
  modified:
    - src/actions/orders/completeSale.ts
    - src/types/database.ts
decisions:
  - "Mobile hamburger nav implemented with HTML details/summary pattern (no JavaScript) per plan spec — keeps page fully static"
  - "LandingNav uses details/summary for mobile toggle — no use client directive required"
  - "Hero illustration is a CSS-only iPad mockup (no external images) — keeps page lightweight and static"
metrics:
  duration: 6
  completed_date: "2026-04-03"
  tasks_completed: 1
  files_modified: 9
---

# Phase 14 Plan 03: Static Marketing Landing Page Summary

Static marketing landing page at the root domain with all 6 sections (nav, hero, features, pricing, CTA, footer), statically rendered with `force-static`, NZ-focused copy, and one-click signup CTAs.

## Tasks Completed

| Task | Description | Commit | Files |
|------|-------------|--------|-------|
| 1 | Landing page route and all 6 section components | cae4cab | 7 new files + 2 type fixes |

## What Was Built

**Root landing page (`src/app/page.tsx`):**
- `export const dynamic = 'force-static'` — prerendered at build time
- Imports and composes all 6 section components
- Page metadata: "NZPOS — The POS built for Kiwi retailers"

**LandingNav:** Sticky navy header with NZPOS wordmark (Satoshi 700), "Sign in" ghost button to `/login`, "Get started" amber button to `/signup`. Mobile: `<details>/<summary>` hamburger with full-screen overlay — zero JavaScript.

**LandingHero:** Full-bleed navy section. Responsive headline (48px desktop / 28px mobile, Satoshi display). Sub-headline, "Get started free" CTA to `/signup`, CSS iPad mockup illustration (desktop only, no external images).

**LandingFeatures:** Warm stone background, 2-column grid of 4 feature cards: POS on iPad, Online store included, GST done right, Stock stays in sync. Each with inline SVG icon.

**LandingPricing:** Surface background, Free core card (navy border, Satoshi display "Free"), 2 add-on pills: Xero Integration ($9/month NZD) and Email Notifications ($5/month NZD) with bullet points. GST note below.

**LandingCTA:** Navy background, "Ready to run a better shop?" heading, "Get started free" amber CTA to `/signup`, "Set up in under 5 minutes" sub-text.

**LandingFooter:** Navy background, "© 2026 NZPOS. Built in New Zealand.", Sign in / Privacy / Terms links.

## Verification

- Build output: `┌ ○ /` — root route confirmed static (`○`)
- All acceptance criteria passed
- No `'use client'` in any component (hamburger uses HTML pattern instead)
- No `cookies()`, `headers()`, or Supabase calls in any landing component
- NZ spelling throughout (colour references in DESIGN.md followed, copy uses "colour", "Kiwi", NZD)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed pre-existing completeSale.ts type error**
- **Found during:** Task 1 (build verification)
- **Issue:** `receipt_data` cast to `Record<string, unknown>` was incompatible with Supabase `Json` type
- **Fix:** Cast to `import('@/types/database').Json` instead
- **Files modified:** `src/actions/orders/completeSale.ts`
- **Commit:** cae4cab (included in parallel agent commit)

**2. [Rule 3 - Blocking] Added setup wizard columns to database types**
- **Found during:** Task 1 (build verification)
- **Issue:** Migration 018 added `setup_completed_steps` and `setup_wizard_dismissed` to `stores` table, but `src/types/database.ts` was not updated — caused TypeScript build failure in `dismissWizard.ts`
- **Fix:** Added both columns to Row, Insert, and Update types for the `stores` table
- **Files modified:** `src/types/database.ts`
- **Commit:** cae4cab (included in parallel agent commit)

### Coordination Note

The parallel agent executing plan 01 committed the landing page files as part of commit `cae4cab` alongside its own setup wizard work. Our task produced identical file contents — the code matched on merge. No conflicts. The commit hash `cae4cab` covers the landing page artifacts for both plan 01 (middleware work) and plan 03 (landing page).

## Known Stubs

None. All landing page sections render complete content. No hardcoded empty values, no placeholder text beyond the spec-defined "Privacy" and "Terms" links to `#` (intentional placeholder per plan — future plans will add legal pages).

## Self-Check: PASSED

Files created:
- src/app/page.tsx — FOUND (in git commit cae4cab)
- src/app/(marketing)/components/LandingNav.tsx — FOUND
- src/app/(marketing)/components/LandingHero.tsx — FOUND
- src/app/(marketing)/components/LandingFeatures.tsx — FOUND
- src/app/(marketing)/components/LandingPricing.tsx — FOUND
- src/app/(marketing)/components/LandingCTA.tsx — FOUND
- src/app/(marketing)/components/LandingFooter.tsx — FOUND

Commits: cae4cab — FOUND in git log

Build: `○ /` confirmed static in build output
