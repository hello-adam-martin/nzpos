---
phase: 22-inventory-add-on-core
plan: "05"
subsystem: ui
tags: [inventory, stocktake, react, next-js, tailwind, barcode]

# Dependency graph
requires:
  - phase: 22-03
    provides: "Stocktake server actions (create, get, update, commit, discard)"
  - phase: 22-04
    provides: "InventoryPageClient with Stocktakes tab placeholder"

provides:
  - "StocktakesTab: session list with status badges, create form with scope selection"
  - "StocktakeSessionPage: Count and Review tabs with full stocktake workflow"
  - "StocktakeCountTab: auto-save count entry with barcode scanning and row highlight"
  - "StocktakeReviewTab: variance table with semantic colors and filter toggle"
  - "Stocktake session page at /admin/inventory/stocktake/[sessionId]"

affects: [qa, testing, verifier]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Auto-save with 800ms debounce + useTransition pattern for server action calls"
    - "Input ref map keyed by product_id for barcode auto-focus"
    - "Inline confirmation strip (role=alert) instead of modal for commit confirmation"
    - "Focus-trapped modal for destructive discard action"
    - "Dynamic import (next/dynamic, ssr: false) for BarcodeScannerSheet"

key-files:
  created:
    - src/components/admin/inventory/StocktakesTab.tsx
    - src/app/admin/inventory/stocktake/[sessionId]/page.tsx
    - src/components/admin/inventory/StocktakeSessionPage.tsx
    - src/components/admin/inventory/StocktakeCountTab.tsx
    - src/components/admin/inventory/StocktakeReviewTab.tsx
  modified:
    - src/components/admin/inventory/InventoryPageClient.tsx

key-decisions:
  - "Commit confirmation uses inline strip (role=alert) not modal — matches UI-SPEC rationale: lighter UX, in-context confirmation"
  - "Discard confirmation uses modal — destructive action warrants higher friction"
  - "System quantity hidden in Count tab (anti-anchoring D-07), visible in Review tab only"
  - "Barcode scanner reused BarcodeScannerSheet component via dynamic import (ssr: false)"
  - "Category fetch in StocktakesTab uses fetch('/api/admin/categories') — silently fails if unavailable"

patterns-established:
  - "Auto-save pattern: local state update + debounce 800ms + useTransition for server action"
  - "Barcode focus pattern: Map<string, HTMLInputElement> ref keyed by product_id, scrollIntoView + focus()"
  - "Tab navigation in session page: useState-driven (not URL-driven) for simplicity within a dedicated page"

requirements-completed: [TAKE-01, TAKE-02, TAKE-03, TAKE-04, TAKE-05]

# Metrics
duration: 20min
completed: 2026-04-04
---

# Phase 22 Plan 05: Stocktake Flow UI Summary

**Full stocktake workflow UI: session list with status badges, count entry with 800ms auto-save and barcode scan focus, variance review with semantic colors, inline commit strip, and focus-trapped discard modal**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-04-04T08:27:00Z
- **Completed:** 2026-04-04T08:47:14Z
- **Tasks:** 2 of 2 auto tasks complete (Task 3 is checkpoint:human-verify)
- **Files modified:** 6

## Accomplishments

- StocktakesTab: session list table with status badges (In progress/Committed/Discarded), inline create form with scope selection (Full/By category), and empty state per UI-SPEC copywriting
- StocktakeCountTab: auto-save with 800ms debounce via useTransition, system qty hidden (anti-anchoring D-07), barcode scanner integration with row highlight (bg-amber/10 border-l-4 border-amber), aria-label on every count input
- StocktakeSessionPage: Commit stocktake inline confirmation strip (role=alert) with counted product count, Discard stocktake modal with focus trap, tab navigation (Count/Review)
- StocktakeReviewTab: variance column with text-success/text-error/text-muted, Show all/Show variances only pill toggle (default: variances only), Not counted label for uncounted lines

## Task Commits

Each task was committed atomically:

1. **Task 1: Create StocktakesTab and wire into InventoryPageClient** - `a10feef` (feat)
2. **Task 2: Create stocktake session page with Count and Review tabs** - `074c625` (feat)

## Files Created/Modified

- `src/components/admin/inventory/StocktakesTab.tsx` - Session list, status badges, create form, empty state
- `src/app/admin/inventory/stocktake/[sessionId]/page.tsx` - Server component loading session via getStocktakeSession
- `src/components/admin/inventory/StocktakeSessionPage.tsx` - Client component with tab nav, commit strip, discard modal
- `src/components/admin/inventory/StocktakeCountTab.tsx` - Count entry table with auto-save, barcode scanning, row highlight
- `src/components/admin/inventory/StocktakeReviewTab.tsx` - Variance table with filter toggle and semantic colors
- `src/components/admin/inventory/InventoryPageClient.tsx` - Replaced placeholder div with StocktakesTab

## Decisions Made

- Commit confirmation uses inline strip (role=alert) not modal — matches UI-SPEC rationale: lighter UX, in-context confirmation
- Discard confirmation uses modal — destructive action warrants higher friction per UI-SPEC
- System quantity hidden in Count tab (anti-anchoring D-07), visible in Review tab only
- Barcode scanner reused BarcodeScannerSheet component via next/dynamic (ssr: false) — avoids SSR issues with camera API
- StocktakeSessionPage uses useState tab switching (not URL-driven) — dedicated page makes URL param overkill

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## Known Stubs

None — all data flows are wired to live server actions (getStocktakeSessions, createStocktakeSession, updateStocktakeLine, commitStocktake, discardStocktakeSession, getStocktakeSession).

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Full stocktake UI complete — awaiting human verification (Task 3 checkpoint)
- After verification: Phase 22 complete, ready for milestone wrap-up
- History tab in InventoryHistoryTab (Plan 04) already wired for stocktake adjustment rows to appear post-commit

---
*Phase: 22-inventory-add-on-core*
*Completed: 2026-04-04*
