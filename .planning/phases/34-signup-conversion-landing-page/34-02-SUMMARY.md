---
phase: 34-signup-conversion-landing-page
plan: "02"
subsystem: marketing-landing-page
tags: [landing-page, cta, demo, conversion, tdd]
dependency_graph:
  requires: []
  provides: [landing-page-demo-cta]
  affects: [landing-page, demo-route]
tech_stack:
  added: []
  patterns: [ghost-button-secondary-cta, dual-cta-row]
key_files:
  created:
    - src/app/__tests__/LandingHero.test.tsx
  modified:
    - src/app/(marketing)/components/LandingHero.tsx
    - src/app/(marketing)/components/LandingCTA.tsx
decisions:
  - Ghost button uses border-white/70 on navy background per DESIGN.md D-08 (outlined secondary)
  - Dual-CTA flex row with flex-wrap allows responsive stacking on mobile
  - LandingCTA gets subtle text link (not full ghost button) for bottom-of-page visitors
metrics:
  duration: "5 min"
  completed: "2026-04-06"
  tasks_completed: 2
  files_created: 1
  files_modified: 2
---

# Phase 34 Plan 02: Landing Page Demo CTA Buttons Summary

## One-liner

Ghost "Try POS Demo" button added to LandingHero alongside amber primary CTA, with subtle text link in LandingCTA bottom section, linking to /demo/pos via Next.js Link.

## What Was Built

### Task 1: Ghost Try POS Demo button in LandingHero (TDD)

Added a dual-CTA flex row to the LandingHero left column. The existing amber "Get started free" button is preserved as the primary CTA. A new ghost button "Try POS Demo" is placed alongside it using `border border-white/70` outlined styling on the navy background, with `hover:bg-white/10` interaction — matching the DESIGN.md D-08 ghost button pattern.

TDD workflow used:
- RED: Created `src/app/__tests__/LandingHero.test.tsx` with 3 tests — tests 1 and 3 failed as expected (no demo link existed)
- GREEN: Updated LandingHero with dual-CTA row — all 3 tests pass

### Task 2: Demo text link in LandingCTA

Added a subtle "Try the POS demo" text link below the existing subtitle in the bottom CTA section. Uses `text-white/60 underline` styling for discoverability without competing with the primary amber CTA.

## Acceptance Criteria

- [x] LandingHero.tsx contains `href="/demo/pos"` in a Link element
- [x] LandingHero.tsx contains text "Try POS Demo"
- [x] LandingHero.tsx contains `aria-label="Try the POS demo"`
- [x] LandingHero.tsx contains `border border-white/70` (ghost button styling)
- [x] LandingHero.tsx still contains `href="/signup"` (existing primary CTA preserved)
- [x] LandingHero.tsx contains `flex flex-wrap gap-` (dual-CTA row wrapper)
- [x] LandingHero.test.tsx exists with 3 test cases
- [x] All 3 tests pass
- [x] LandingCTA.tsx contains `href="/demo/pos"` in a Link element
- [x] LandingCTA.tsx contains text "Try the POS demo"
- [x] LandingCTA.tsx contains `underline` class on demo link

## Deviations from Plan

None - plan executed exactly as written.

**Pre-existing TypeScript errors noted (out of scope):** `tsc --noEmit` reports errors in `src/actions/inventory/adjustStock.ts`, `src/actions/products/createProduct.ts`, and `src/actions/products/importProducts.ts`. These are pre-existing and unrelated to this plan's changes. No TypeScript errors exist in the marketing components modified by this plan.

## Known Stubs

None. Both `/demo/pos` route (Phase 33) and all marketing components are fully wired.

## Commits

- `76c245f` test(34-02): add failing tests for LandingHero demo CTA button (RED)
- `5aa807d` feat(34-02): add ghost Try POS Demo button to LandingHero (GREEN)
- `f827b74` feat(34-02): add demo text link to LandingCTA bottom section

## Self-Check: PASSED
