---
phase: 35
plan: 00
subsystem: testing
tags: [gift-cards, tdd, test-stubs, vitest]
dependency_graph:
  requires: []
  provides: [gift-card-utils-test-stubs, pos-cart-gift-card-test-stubs]
  affects: [35-01, 35-02, 35-03]
tech_stack:
  added: []
  patterns: [RED-state test stubs, vitest describe/it structure]
key_files:
  created:
    - src/lib/__tests__/gift-card-utils.test.ts
    - src/lib/__tests__/pos-cart-gift-card.test.ts
  modified: []
decisions:
  - 9 stubs for utility tests (code generation, expiry validation, balance operations)
  - 7 stubs for cart state machine tests (gift card payment method transitions)
  - All stubs use expect(true).toBe(false) — deliberately RED until implementations arrive in Plans 02-03
metrics:
  duration: 1 min
  completed: 2026-04-06
  tasks_completed: 2
  files_created: 2
  files_modified: 0
---

# Phase 35 Plan 00: Gift Card Test Stubs Summary

## One-liner

RED-state vitest stubs for gift card code generation, expiry validation, balance operations, and cart state machine payment transitions — scaffolding for Plans 02 and 03.

## What Was Built

Two test stub files establishing the Nyquist-compliant Wave 0 test scaffolding for Phase 35.

### Task 1: Gift Card Utility Test Stubs (`gift-card-utils.test.ts`)

- 3 describe blocks: code generation, expiry validation, balance operations
- 9 test stubs in RED state
- Covers: 8-digit numeric code generation, leading-zero padding, XXXX-XXXX dash format, effective expiry status (active past expires_at treated as expired), active card within window, voided card rejection, auto-split full cover (balance >= total), auto-split partial cover (balance < total), non-numeric character stripping from code input

### Task 2: Cart State Machine Test Stubs (`pos-cart-gift-card.test.ts`)

- 1 describe block: cart state machine — gift card payment
- 7 test stubs in RED state
- Covers: gift_card_entry phase transition on payment method selection, code storage via ENTER_GIFT_CARD_CODE, auto-split on GIFT_CARD_VALIDATED (full cover), auto-split on GIFT_CARD_VALIDATED (partial cover, needs split method), gift_card_confirmed transition after SET_SPLIT_REMAINDER_METHOD, field reset on GIFT_CARD_VALIDATION_FAILED, full reset on NEW_SALE

## Verification

- `npx vitest run src/lib/__tests__/gift-card-utils.test.ts src/lib/__tests__/pos-cart-gift-card.test.ts` ran and showed 16 failing tests (expected RED state)
- Both files valid vitest test files with correct imports

## Commits

| Task | Commit | Files |
|------|--------|-------|
| Task 1: Gift card utility stubs | c48465b | src/lib/__tests__/gift-card-utils.test.ts |
| Task 2: Cart gift card stubs | b817333 | src/lib/__tests__/pos-cart-gift-card.test.ts |

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

All stubs in both files are intentional RED-state placeholders. They will be resolved:
- `src/lib/__tests__/gift-card-utils.test.ts` — resolved by Plan 02 (gift card utilities implementation)
- `src/lib/__tests__/pos-cart-gift-card.test.ts` — resolved by Plan 03 Task 1 (cart.ts gift card extension)

These stubs do not prevent the plan's goal — establishing Wave 0 test scaffolding — from being achieved.

## Self-Check: PASSED

Files created:
- FOUND: src/lib/__tests__/gift-card-utils.test.ts
- FOUND: src/lib/__tests__/pos-cart-gift-card.test.ts

Commits:
- FOUND: c48465b (test(35-00): add gift card utility test stubs in RED state)
- FOUND: b817333 (test(35-00): add cart gift card state machine test stubs in RED state)
