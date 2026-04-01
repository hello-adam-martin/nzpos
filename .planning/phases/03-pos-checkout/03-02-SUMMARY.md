---
phase: 03-pos-checkout
plan: 02
subsystem: pos-left-panel
tags: [pos, products, cart, server-component, jwt, stock-badges]
dependency_graph:
  requires: [03-01]
  provides: [pos-product-grid, pos-client-shell, pos-top-bar, stock-badges]
  affects: [03-03, 03-04]
tech_stack:
  added: []
  patterns:
    - Server Component fetches all data (products/categories/staff/store) in parallel via Promise.all before rendering
    - POSClientShell as client boundary root: useReducer + visibilitychange stock refresh
    - Filtering managed in POSClientShell, filtered products passed to ProductGrid
    - search/SKU inputs at ProductGrid level for encapsulation; search state lifted to shell
key_files:
  created:
    - src/components/pos/POSClientShell.tsx
    - src/components/pos/POSTopBar.tsx
    - src/components/pos/CategoryFilterBar.tsx
    - src/components/pos/ProductGrid.tsx
    - src/components/pos/ProductCard.tsx
    - src/components/pos/StockBadge.tsx
  modified:
    - src/app/(pos)/pos/page.tsx
    - src/app/(pos)/layout.tsx
decisions:
  - POSClientShell manages both search and selectedCategory state; filtered products passed to ProductGrid — keeps filtering logic in one place
  - Search input (text-base 16px) in ProductGrid with onSearchChange prop to bubble up to shell state
  - SKU quick-entry clears on successful match without page navigation
  - visibilitychange listener wired in useEffect with proper cleanup
metrics:
  duration_seconds: 192
  completed_date: "2026-04-01"
  tasks_completed: 2
  tasks_total: 2
  files_created: 6
  files_modified: 2
---

# Phase 03 Plan 02: POS Product Grid + Left Panel Summary

**One-liner:** Server Component POS page with JWT-verified data fetch, POSClientShell cart state root, category filter/search/SKU-entry product grid, and green/amber/red stock badges.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | POS page Server Component + POSClientShell + POSTopBar | 9b04a55 | pos/page.tsx, layout.tsx, POSClientShell.tsx, POSTopBar.tsx |
| 2 | CategoryFilterBar + ProductGrid + ProductCard + StockBadge | 7537cbb | CategoryFilterBar.tsx, ProductGrid.tsx, ProductCard.tsx, StockBadge.tsx |

## What Was Built

The complete POS left panel: a Server Component page that verifies the staff JWT, fetches products/categories/staff/store data via admin client in parallel, and renders a client shell managing cart state via `useReducer`. The product grid shows auto-fill cards with images, prices, and color-coded stock badges. Category filter pills (horizontal scroll, 44px touch targets) and a search bar + SKU quick-entry field allow staff to find products quickly. Tapping a product dispatches `ADD_PRODUCT` to the cart reducer. Out-of-stock products show a red badge and are disabled for staff role (owners can override). Stock refreshes on tab focus via `visibilitychange` + `router.refresh()`.

## Decisions Made

1. **Filtering in POSClientShell, not ProductGrid** — POSClientShell holds `search` and `selectedCategory` state and passes already-filtered products to ProductGrid. ProductGrid receives `onSearchChange` to bubble the search input value up. This keeps filtering logic centralized while keeping the search input close to the grid.

2. **SKU quick-entry in ProductGrid** — Local ref-based input that finds an exact SKU match and calls `onAddToCart` on Enter, then clears. No state lift needed since it's a stateless lookup.

3. **visibilitychange with cleanup** — `useEffect` registers and removes the listener with proper cleanup to avoid double-registration in React StrictMode.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Build failed because Task 2 components were imported in POSClientShell**

- **Found during:** Task 1 build verification
- **Issue:** `POSClientShell.tsx` imports `ProductGrid`, `CategoryFilterBar`, and `CartPanel` which did not exist yet when Task 1 build was run
- **Fix:** Proceeded immediately to create Task 2 components (which was the natural next step) and then verified the combined build — build passed on first complete check
- **Files modified:** Created all Task 2 components before Task 1 build check could succeed
- **Commit:** 7537cbb

## Known Stubs

- Right panel `onOpenDiscount` is wired as `() => {}` in POSClientShell — the discount sheet is Plan 04 scope
- Logout handler uses `router.push('/pos/login')` (client-side redirect) rather than a server action that clears the `staff_session` cookie — this means the cookie remains valid but the user is redirected away. Full logout (cookie deletion) is out of scope for this plan; the staff session expires in 8h. This is intentional for v1 scope.

## Self-Check: PASSED

### Files Created/Modified

- `src/app/(pos)/pos/page.tsx` — FOUND
- `src/app/(pos)/layout.tsx` — FOUND (contains h-dvh)
- `src/components/pos/POSClientShell.tsx` — FOUND
- `src/components/pos/POSTopBar.tsx` — FOUND
- `src/components/pos/CategoryFilterBar.tsx` — FOUND
- `src/components/pos/ProductGrid.tsx` — FOUND
- `src/components/pos/ProductCard.tsx` — FOUND
- `src/components/pos/StockBadge.tsx` — FOUND

### Commits

- 9b04a55 — feat(03-02): POS page Server Component, POSClientShell, POSTopBar — FOUND
- 7537cbb — feat(03-02): CategoryFilterBar, ProductGrid, ProductCard, StockBadge — FOUND

### Tests

- 372/372 tests passing (0 failures)
- Build: ✓ Compiled successfully
