---
phase: 23-feature-gating-pos-storefront-integration
plan: "00"
subsystem: testing
tags: [vitest, react-testing-library, component-tests, pos, storefront]

requires: []

provides:
  - "Wave 0 test scaffold: POS ProductCard stock badge and out-of-stock behavior tests (POS-01, POS-02)"
  - "Wave 0 test scaffold: Storefront AddToCartButton sold-out disable behavior tests (POS-03)"

affects:
  - "23-feature-gating-pos-storefront-integration"

tech-stack:
  added: []
  patterns:
    - "vi.mock('@/contexts/CartContext') pattern for testing components that useCart without a CartProvider"
    - "ProductRow partial factory (makeProduct) for POS component tests"

key-files:
  created:
    - src/components/pos/__tests__/ProductCard.test.tsx
    - src/components/store/__tests__/AddToCartButton.test.tsx
  modified: []

key-decisions:
  - "Mocked CartContext at module level (vi.mock) — AddToCartButton uses useCart() which throws without a provider; module-level mock avoids wrapping every render call in CartProvider"
  - "11 passing tests (not .todo stubs) — actual component rendering assertions since Phase 21 already implemented the components with the correct behavior"

patterns-established:
  - "CartContext mock pattern: vi.mock('@/contexts/CartContext', () => ({ useCart: vi.fn(() => ({ state: { items: [] }, dispatch: vi.fn() })) }))"
  - "ProductRow factory: makeProduct(overrides) returns minimal valid ProductRow with product_type defaulting to 'physical'"

requirements-completed: [POS-01, POS-02, POS-03]

duration: 4min
completed: "2026-04-04"
---

# Phase 23 Plan 00: Wave 0 Test Scaffolds Summary

**Vitest component tests for POS ProductCard (stock badges, out-of-stock) and storefront AddToCartButton (sold-out gate), 11 tests passing — closes Nyquist compliance gap for Phase 23**

## Performance

- **Duration:** 4 min
- **Started:** 2026-04-04T10:00:00Z
- **Completed:** 2026-04-04T10:03:35Z
- **Tasks:** 1
- **Files modified:** 2

## Accomplishments

- Created `src/components/pos/__tests__/ProductCard.test.tsx` with 7 tests covering POS-01 (stock badge show/hide for physical/service, in-stock/low-stock/out-of-stock) and POS-02 (aria-disabled state for staff role when out of stock)
- Created `src/components/store/__tests__/AddToCartButton.test.tsx` with 4 tests covering POS-03 (button disabled + "Sold Out" text gated on hasInventory=true and stock_quantity<=0, service products always enabled)
- All 11 tests pass against existing Phase 21 component implementations — no stubs needed

## Task Commits

1. **Task 1: Create POS ProductCard and storefront AddToCartButton test scaffolds** - `e55af55` (test)

**Plan metadata:** (pending this commit)

## Files Created/Modified

- `src/components/pos/__tests__/ProductCard.test.tsx` - 11-test scaffold covering POS-01 and POS-02 behaviors
- `src/components/store/__tests__/AddToCartButton.test.tsx` - 4-test scaffold covering POS-03 sold-out gate

## Decisions Made

- Mocked `@/contexts/CartContext` at module level rather than wrapping in `CartProvider` — AddToCartButton calls `useCart()` which throws without a provider; module-level mock is cleaner and faster
- Used real component rendering (not `.todo` stubs) because Phase 21 already ships both components with the correct behavior — tests validate existing implementation rather than scaffolding for future work

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Wave 0 Nyquist compliance gap closed
- Phase 23 plans 01 and 02 can proceed with feature gating implementation and POS/storefront wiring
- Test scaffolds will catch regressions if Phase 23 modifies ProductCard or AddToCartButton

## Self-Check: PASSED

- FOUND: src/components/pos/__tests__/ProductCard.test.tsx
- FOUND: src/components/store/__tests__/AddToCartButton.test.tsx
- FOUND: commit e55af55

---
*Phase: 23-feature-gating-pos-storefront-integration*
*Completed: 2026-04-04*
