---
phase: 03-pos-checkout
plan: 03
subsystem: ui
tags: [react, tailwind, cart, gst, pos, touch-targets]

# Dependency graph
requires:
  - phase: 03-01
    provides: CartState, CartAction, cartReducer, calcCartTotals types from cart.ts
  - phase: 03-01
    provides: formatNZD from money.ts, calcLineItem from gst.ts

provides:
  - CartPanel component (full-height right panel, scrollable line items, empty state)
  - CartLineItem component (product name, quantity controls, line total, remove, discount indicator)
  - QuantityControl component (36px visible buttons, 44px touch targets via padding)
  - CartSummary component (subtotal/GST/total rows using calcCartTotals)
  - PaymentMethodToggle component (EFTPOS/Cash pill toggle, navy active state)
  - PayButton component (amber CTA, "Charge $X.XX", disabled state when cart empty)

affects: [03-04, 03-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Cart UI components receive CartState+dispatch as props (no internal cart state)
    - calcCartTotals called in CartPanel for totals, passed to sub-components as needed
    - TouchTarget pattern: 36px visible button + 44px via padding (p-1 on w-9 h-9)
    - Discount indicator computed in CartLineItem from discountCents/discountType
    - font-display (Satoshi 700) used only for Total amount row in CartSummary

key-files:
  created:
    - src/components/pos/QuantityControl.tsx
    - src/components/pos/CartLineItem.tsx
    - src/components/pos/CartSummary.tsx
    - src/components/pos/PaymentMethodToggle.tsx
    - src/components/pos/PayButton.tsx
  modified:
    - src/components/pos/CartPanel.tsx

key-decisions:
  - "CartPanel shows summary/toggle/button only when cart has items (bottom section hidden on empty state)"
  - "Discount indicator text computed from discountType: percentage shows X% off, fixed shows $X.XX off"
  - "PayButton uses pointer-events-none + opacity-50 for disabled state (not HTML disabled attribute)"

patterns-established:
  - "POS components receive CartState+dispatch from parent (POSClientShell) — no internal state"
  - "Touch target pattern: w-9 h-9 (36px visible) + p-1 padding achieves 44px tap area on iPad"
  - "font-display class (Satoshi 700) reserved for cart total only — all other monetary values use DM Sans"

requirements-completed: [POS-03, POS-04, POS-05, DISC-03]

# Metrics
duration: 15min
completed: 2026-04-01
---

# Phase 03 Plan 03: POS Cart Panel UI Summary

**POS right panel components: CartLineItem with discount indicators, CartSummary with GST breakdown via calcCartTotals, EFTPOS/Cash toggle, and amber Pay button with "Charge $X.XX" label**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-04-01T03:08:00Z
- **Completed:** 2026-04-01T03:23:26Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- QuantityControl with 36px visible buttons padded to 44px iPad touch target, aria-labels
- CartLineItem with 48px min height, discount indicator (% or $ off), formatNZD line total, remove button
- CartPanel with scrollable line items, "No items yet" empty state, bottom section with summary/toggle/button
- CartSummary uses calcCartTotals from cart.ts (not manual calculation), displays Satoshi 700 30px total
- PaymentMethodToggle EFTPOS/Cash pills with bg-navy active state
- PayButton amber CTA with "Charge $X.XX" label, opacity-50 disabled when cart empty or no payment method

## Task Commits

Each task was committed atomically:

1. **Task 1: CartPanel + CartLineItem + QuantityControl** - `e1fecbe` (feat)
2. **Task 2: CartSummary + PaymentMethodToggle + PayButton** - `7c5d6e6` (feat)

**Plan metadata:** _(docs commit below)_

## Files Created/Modified
- `src/components/pos/QuantityControl.tsx` - Minus/Plus buttons with 36px visible, 44px tap target
- `src/components/pos/CartLineItem.tsx` - Cart row: name, quantity controls, line total, remove, discount indicator
- `src/components/pos/CartPanel.tsx` - Full-height right panel with header, scrollable list, bottom section
- `src/components/pos/CartSummary.tsx` - Subtotal/GST/total rows using calcCartTotals
- `src/components/pos/PaymentMethodToggle.tsx` - EFTPOS/Cash pill toggle with navy active state
- `src/components/pos/PayButton.tsx` - Amber "Charge $X.XX" button with disabled state

## Decisions Made
- CartPanel shows summary/toggle/button only when cart has items (bottom section is hidden in empty state — avoids showing $0.00 total)
- Discount indicator text computed from discountCents and discountType: percentage type shows calculated % off from original line value, fixed type shows dollar amount off
- PayButton uses CSS opacity-50 + pointer-events-none for disabled state rather than HTML `disabled` attribute — avoids native button styling interference with Tailwind classes

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None — all components built to specification, build passes, all 372 tests pass.

## User Setup Required

None - no external service configuration required.

## Known Stubs

None — all components wire to real CartState data via dispatch props.

## Next Phase Readiness

- All cart panel UI components complete and wired to CartState/CartAction types
- CartPanel ready to receive cart state from POSClientShell (Plan 03-04)
- PayButton dispatches INITIATE_PAYMENT to trigger EFTPOS/cash flow (Plan 03-05)
- No blockers for subsequent plans

---
*Phase: 03-pos-checkout*
*Completed: 2026-04-01*
