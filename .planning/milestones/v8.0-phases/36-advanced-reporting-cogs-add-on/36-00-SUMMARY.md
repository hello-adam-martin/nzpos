---
phase: 36-advanced-reporting-cogs-add-on
plan: "00"
subsystem: testing
tags: [wave-0, tdd, billing-webhook, product-schema, cogs]
dependency_graph:
  requires: []
  provides: [wave-0-test-stubs-cogs01, wave-0-test-stubs-cogs02]
  affects: [36-01-PLAN]
tech_stack:
  added: []
  patterns: [vitest-red-stubs, describe-nested-feature-tests]
key_files:
  created:
    - src/actions/products/__tests__/costPrice.test.ts
  modified:
    - src/app/api/webhooks/stripe/billing/__tests__/billing.test.ts
decisions:
  - Wave 0 RED stubs use nested describe block for has_advanced_reporting, matching existing xero test style
  - costPrice.test.ts validates schema-level acceptance — no mock DB needed since Zod parsing is pure
  - PRICE_TO_FEATURE mock extended with price_advanced_reporting_test key to wire billing webhook tests
metrics:
  duration_minutes: 3
  completed_date: "2026-04-06"
  tasks_completed: 1
  tasks_total: 1
  files_created: 1
  files_modified: 1
requirements_covered:
  - COGS-01
  - COGS-02
---

# Phase 36 Plan 00: Wave 0 COGS Test Stubs Summary

Wave 0 RED test stubs for COGS add-on — billing webhook `has_advanced_reporting` activation/cancellation tests and `cost_price_cents` schema validation tests. Both files are syntactically valid TypeScript and will fail (RED) until Plan 01 implements the production code.

## What Was Built

Two test files scaffolding the Nyquist rule requirement before Plan 01 implementation:

1. **Extended billing webhook test** (`billing.test.ts`): Added a `describe('has_advanced_reporting')` block with two test cases:
   - Sets `has_advanced_reporting: true` when `customer.subscription.created` fires with the advanced reporting price ID
   - Sets `has_advanced_reporting: false` when `customer.subscription.deleted` fires

2. **New cost price schema test** (`costPrice.test.ts`): Five test cases covering `CreateProductSchema` and two for `UpdateProductSchema`:
   - Accepts `cost_price_cents` as positive integer
   - Accepts `cost_price_cents` as `null`
   - Accepts omission (optional field)
   - Rejects negative values
   - Rejects non-integer values
   - Accepts partial `UpdateProductSchema` with only `cost_price_cents`
   - Accepts `UpdateProductSchema` with `cost_price_cents: null`

## Tasks

| Task | Description | Commit | Files |
|------|-------------|--------|-------|
| 1 | Wave 0 test stubs for billing webhook and cost price persistence | c5baa7b | billing.test.ts (modified), costPrice.test.ts (created) |

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

These tests are intentionally RED (failing) at this stage:
- `src/actions/products/__tests__/costPrice.test.ts` — all 7 test cases fail because `cost_price_cents` is not yet in `CreateProductSchema` or `UpdateProductSchema`
- `src/app/api/webhooks/stripe/billing/__tests__/billing.test.ts` — 2 new `has_advanced_reporting` test cases fail because `has_advanced_reporting` is not yet in `PRICE_TO_FEATURE` (production `addons.ts`) nor `store_plans` update logic

Both stub sets will go GREEN when Plan 01 implements the production code.

## Self-Check: PASSED

- `src/actions/products/__tests__/costPrice.test.ts` — FOUND
- `src/app/api/webhooks/stripe/billing/__tests__/billing.test.ts` — FOUND (modified)
- Commit `c5baa7b` — FOUND
