---
phase: 01-foundation
plan: 03
subsystem: testing
tags: [gst, zod, vitest, typescript, money, validation]

# Dependency graph
requires:
  - phase: 01-foundation/01-01
    provides: Next.js project scaffold with TypeScript, Vitest configured

provides:
  - Pure GST calculation module (gst.ts) with IRD-compliant per-line formula
  - Money formatting utility (money.ts) converting cents to NZD display strings
  - Zod validation schemas for all entity types (product, order, staff, store)
  - Integer cents enforcement at Server Action boundary via Zod

affects:
  - All Server Actions that handle financial data (use GST module + Zod schemas)
  - POS checkout (calcLineItem, calcOrderGST)
  - Online storefront checkout (CreateOrderSchema)
  - Admin product management (CreateProductSchema, UpdateProductSchema)
  - Staff authentication (StaffPinLoginSchema, 4-digit PIN validation)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - TDD RED-GREEN pattern for pure utility functions
    - Pure functions with no external dependencies for financial calculations
    - Zod schema barrel export via src/schemas/index.ts
    - Integer cents throughout — z.number().int() on all monetary Zod fields

key-files:
  created:
    - src/lib/gst.ts
    - src/lib/gst.test.ts
    - src/lib/money.ts
    - src/lib/money.test.ts
    - src/schemas/store.ts
    - src/schemas/staff.ts
    - src/schemas/product.ts
    - src/schemas/order.ts
    - src/schemas/index.ts
  modified: []

key-decisions:
  - "GST formula Math.round(cents * 3 / 23) confirmed as IRD-compliant; per-line on discounted amounts per D-09"
  - "Zod v4 (4.3.6) is installed, not v3 as the plan specified — API is compatible for all usage patterns"
  - "formatNZD uses toLocaleString('en-NZ') for thousand-separator commas in NZD display"

patterns-established:
  - "Pure function pattern: GST and money utilities have zero imports, enabling Edge Runtime use"
  - "Schema barrel: all Zod schemas import from @/schemas, never individual files"
  - "Integer cents rule: all monetary Zod fields use z.number().int().min(0)"

requirements-completed: [FOUND-05, FOUND-06, FOUND-07]

# Metrics
duration: 3min
completed: 2026-04-01
---

# Phase 01 Plan 03: GST Module and Zod Schemas Summary

**IRD-compliant per-line GST module (Math.round * 3/23) with 19 passing Vitest tests, plus Zod v4 validation schemas for all entity types enforcing integer cents**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-03-31T19:29:07Z
- **Completed:** 2026-03-31T19:31:13Z
- **Tasks:** 2 (Task 1 had 2 commits: RED + GREEN)
- **Files modified:** 9 created, 0 modified

## Accomplishments

- GST module passes all 19 IRD specimen test cases including discount scenarios and rounding edge cases
- Money formatter handles comma-separated thousands, two decimal places, and negative amounts for refunds
- Zod schemas cover all entity types with integer cents constraints, 4-digit PIN regex, and promo code uppercase transform

## Task Commits

Each task was committed atomically:

1. **Task 1 RED: Add failing GST and money formatting tests** - `6a0df2e` (test)
2. **Task 1 GREEN: Implement GST calculation and money formatting** - `9c2a955` (feat)
3. **Task 2: Add Zod validation schemas for all entity types** - `9aad8f2` (feat)

## Files Created/Modified

- `src/lib/gst.ts` - Pure GST functions: gstFromInclusiveCents, calcLineItem, calcOrderGST
- `src/lib/gst.test.ts` - 14 IRD specimen test cases for GST functions
- `src/lib/money.ts` - formatNZD converts integer cents to NZD display string
- `src/lib/money.test.ts` - 5 test cases for money formatting including negative amounts
- `src/schemas/store.ts` - CreateStoreSchema, UpdateStoreSchema
- `src/schemas/staff.ts` - CreateStaffSchema, StaffPinLoginSchema, UpdateStaffSchema (4-digit PIN regex)
- `src/schemas/product.ts` - CreateProductSchema, UpdateProductSchema (integer cents)
- `src/schemas/order.ts` - OrderItemSchema, CreateOrderSchema, CreatePromoCodeSchema
- `src/schemas/index.ts` - Barrel export for all schemas

## Decisions Made

- Zod v4 (4.3.6) is installed (plan said v3) — API compatible for all used patterns: `.int()`, `.length()`, `.transform()`, `.partial()`. No migration needed.
- `formatNZD` uses `toLocaleString('en-NZ')` for locale-correct comma separators in NZD display strings.
- GST formula documented inline per D-09 compliance requirement — equivalence between `discountedPriceCents * qty * 3/23` and `lineTotal * 3/23` is explicitly commented.

## Deviations from Plan

None — plan executed exactly as written. Zod v4 vs v3 version difference was discovered but required no code changes (API compatible).

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- GST module is ready for use in POS checkout and online storefront Server Actions
- Zod schemas are ready for use in every Server Action that creates/updates products, orders, or staff
- All monetary fields enforce integer cents — floats will be rejected at the Server Action boundary
- No blockers for subsequent plans

## Self-Check: PASSED

- FOUND: src/lib/gst.ts
- FOUND: src/lib/gst.test.ts
- FOUND: src/lib/money.ts
- FOUND: src/lib/money.test.ts
- FOUND: src/schemas/product.ts
- FOUND: src/schemas/order.ts
- FOUND: src/schemas/staff.ts
- FOUND: src/schemas/store.ts
- FOUND: src/schemas/index.ts
- FOUND: commit 6a0df2e (RED phase tests)
- FOUND: commit 9c2a955 (GREEN phase implementation)
- FOUND: commit 9aad8f2 (Zod schemas)

---
*Phase: 01-foundation*
*Completed: 2026-04-01*
