---
phase: 37-loyalty-points-add-on
plan: 03
subsystem: ui
tags: [loyalty, pos, cart, react, zod, server-actions, customer-lookup, privacy]

requires:
  - phase: 37-02
    provides: LoyaltySettingsCard, saveLoyaltySettings, getLoyaltySettings, loyalty_settings table

provides:
  - CartState extended with attachedCustomerId, attachedCustomerName, attachedCustomerPoints, loyaltyDiscountCents, loyaltyPointsRedeemed
  - CartAction types: ATTACH_CUSTOMER, DETACH_CUSTOMER, APPLY_LOYALTY_DISCOUNT, REMOVE_LOYALTY_DISCOUNT
  - lookupCustomerForPOS server action: type-ahead customer search with points balance
  - quickAddCustomer server action: create POS customer with IPP 3A consent gate
  - CustomerLookupSheet: slide-in POS panel with search, no-match, quick-add form, skip link
  - LoyaltyRedemptionRow: cart row with Apply/Remove controls and amber styling
  - CartPanel extended with hasLoyalty props, Add Customer button, LoyaltyRedemptionRow integration
  - POSClientShell extended with hasLoyalty/redeemRateCents props and CustomerLookupSheet overlay

affects:
  - 37-04 (completeSale loyalty hooks will use attachedCustomerId/loyaltyDiscountCents from cart)
  - 37-05 (receipt screen may display loyalty earned)
  - 37-06 (billing/feature gating passes hasLoyalty and redeemRateCents to POSClientShell)

tech-stack:
  added: []
  patterns:
    - Slide-in sheet pattern (w-80, z-50, translate-x animation) established for CustomerLookupSheet matching DiscountSheet
    - Privacy consent checkbox with z.literal(true) enforcement for IPP 3A compliance
    - Zod v4 .issues[] (not .errors[]) for parsing error access

key-files:
  created:
    - src/actions/loyalty/lookupCustomerForPOS.ts
    - src/actions/loyalty/quickAddCustomer.ts
    - src/components/pos/CustomerLookupSheet.tsx
    - src/components/pos/LoyaltyRedemptionRow.tsx
  modified:
    - src/lib/cart.ts
    - src/components/pos/CartPanel.tsx
    - src/components/pos/POSClientShell.tsx
    - src/lib/__tests__/pos-cart-loyalty.test.ts
    - src/lib/__tests__/pos-cart.test.ts
    - src/actions/loyalty/__tests__/lookupCustomerForPOS.test.ts
    - src/actions/loyalty/__tests__/quickAddCustomer.test.ts

key-decisions:
  - "CartPanel Add Customer button: border style when no customer, amber style when attached — amber signals active loyalty engagement"
  - "quickAddCustomer uses Zod v4 .issues[] (not .errors[]) — project is on Zod 4.3.6, not v3"
  - "CustomerLookupSheet pre-fills quick-add form from search query (email if @ detected, name otherwise)"
  - "DETACH_CUSTOMER also clears loyaltyDiscountCents and loyaltyPointsRedeemed — single action removes all loyalty state"

patterns-established:
  - "Pattern 1: Slide-in sheet — fixed right-0, w-80, z-50, translate-x-full closed, translate-x-0 open, backdrop div z-40"
  - "Pattern 2: IPP 3A consent — z.literal(true) schema + server-side check for consent_given path in issues array"
  - "Pattern 3: Zod v4 error access — parsed.error.issues[] not .errors[]"

requirements-completed: [LOYAL-04, LOYAL-09, LOYAL-11]

duration: 12min
completed: 2026-04-07
---

# Phase 37 Plan 03: POS Customer Lookup Flow Summary

**POS customer lookup with type-ahead search (300ms debounce), quick-add with IPP 3A privacy consent, cart state machine extended with customer attachment and loyalty discount, CartPanel/POSClientShell wired end-to-end**

## Performance

- **Duration:** 12 min
- **Started:** 2026-04-07T08:38:50Z
- **Completed:** 2026-04-07T08:51:20Z
- **Tasks:** 2
- **Files modified:** 11

## Accomplishments

- Extended CartState with 5 new loyalty fields and 4 new CartAction types with full reducer cases; NEW_SALE and DETACH_CUSTOMER both clean up loyalty state correctly
- Created `lookupCustomerForPOS` and `quickAddCustomer` server actions with Zod validation, `server-only` guards, ILIKE name/email search with loyalty_points LEFT JOIN, and IPP 3A consent enforcement
- Created `CustomerLookupSheet` (slide-in panel: search, debounced results, no-match + create flow, consent checkbox, skip link) and `LoyaltyRedemptionRow` (available/applied states with amber styling); wired into CartPanel and POSClientShell

## Task Commits

1. **Task 1: Cart state machine extension + server actions** - `d0ea7af` (feat)
2. **Task 2: POS UI components + wiring** - `b9842ce` (feat)

## Files Created/Modified

- `src/lib/cart.ts` - CartState +5 fields, CartAction +4 types, cartReducer +4 cases
- `src/actions/loyalty/lookupCustomerForPOS.ts` - Type-ahead customer search with loyalty_points balance
- `src/actions/loyalty/quickAddCustomer.ts` - Create POS customer with IPP 3A consent, duplicate email detection
- `src/components/pos/CustomerLookupSheet.tsx` - Slide-in sheet: search, debounce, quick-add, consent, skip
- `src/components/pos/LoyaltyRedemptionRow.tsx` - Points display, Apply (amber) / Remove (ghost navy) controls
- `src/components/pos/CartPanel.tsx` - Add Customer button, LoyaltyRedemptionRow, loyalty dispatch handlers
- `src/components/pos/POSClientShell.tsx` - hasLoyalty/redeemRateCents props, CustomerLookupSheet overlay
- `src/lib/__tests__/pos-cart-loyalty.test.ts` - 9 tests GREEN (was all RED stubs)
- `src/lib/__tests__/pos-cart.test.ts` - Fixed NEW_SALE test: added missing loyalty fields to dirtyState
- `src/actions/loyalty/__tests__/lookupCustomerForPOS.test.ts` - 5 tests GREEN (was all RED stubs)
- `src/actions/loyalty/__tests__/quickAddCustomer.test.ts` - 5 tests GREEN (was all RED stubs)

## Decisions Made

- CartPanel amber button for attached customer signals active loyalty engagement at a glance
- `quickAddCustomer` pre-populates quick-add form from search query: if query contains `@` it goes to email field, otherwise name field
- `DETACH_CUSTOMER` clears loyalty discount too — single action removes all loyalty-related cart state
- Zod v4 uses `.issues[]` not `.errors[]` for accessing parse errors (project uses Zod 4.3.6)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed pos-cart.test.ts NEW_SALE test failing TypeScript compilation**
- **Found during:** Task 2 (TypeScript compilation check)
- **Issue:** Existing test created a partial `CartState` object with only pre-loyalty fields; adding 5 new required fields to CartState caused TS2740 error
- **Fix:** Added all missing CartState fields (giftCardCode, giftCardBalanceCents, etc. + new loyalty fields) to the dirtyState test object
- **Files modified:** src/lib/__tests__/pos-cart.test.ts
- **Verification:** tsc --noEmit shows no errors in modified files
- **Committed in:** b9842ce (Task 2 commit)

**2. [Rule 1 - Bug] Fixed Zod errorMap incompatibility with Zod v4**
- **Found during:** Task 1 (TypeScript compilation check)
- **Issue:** Plan specified `z.literal(true, { errorMap: ... })` which is Zod v3 API; project uses Zod 4.3.6 where `errorMap` is not valid on `z.literal`
- **Fix:** Used plain `z.literal(true)` and checked `parsed.error.issues` (not `.errors`) in server action; also updated test to match Zod v4 API
- **Files modified:** src/actions/loyalty/quickAddCustomer.ts, src/actions/loyalty/__tests__/quickAddCustomer.test.ts
- **Verification:** tsc --noEmit passes, vitest run passes (19 tests GREEN)
- **Committed in:** d0ea7af (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (2 Rule 1 bugs)
**Impact on plan:** Both fixes necessary for TypeScript compilation and Zod v4 compatibility. No scope creep.

## Issues Encountered

None beyond the auto-fixed deviations above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Cart state machine ready for plan 37-04 (completeSale loyalty hooks): `attachedCustomerId`, `loyaltyDiscountCents`, `loyaltyPointsRedeemed` are all available in cart state
- `POSClientShell` accepts `hasLoyalty` and `redeemRateCents` props — plan 37-06 (billing/gating) needs to pass these from the server-side feature check
- `CustomerLookupSheet` and `LoyaltyRedemptionRow` are fully implemented but only render when `hasLoyalty=true` — safe to deploy before billing is wired

---
*Phase: 37-loyalty-points-add-on*
*Completed: 2026-04-07*

## Self-Check: PASSED

- FOUND: src/actions/loyalty/lookupCustomerForPOS.ts
- FOUND: src/actions/loyalty/quickAddCustomer.ts
- FOUND: src/components/pos/CustomerLookupSheet.tsx
- FOUND: src/components/pos/LoyaltyRedemptionRow.tsx
- FOUND: commit d0ea7af (feat(37-03): cart state machine + server actions)
- FOUND: commit b9842ce (feat(37-03): CustomerLookupSheet + wiring)
