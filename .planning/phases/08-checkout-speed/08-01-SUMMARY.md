---
phase: 08-checkout-speed
plan: 01
subsystem: receipt-data-foundation
tags: [receipt, database, types, migration, zod]
dependency_graph:
  requires: []
  provides: [ReceiptData type, buildReceiptData utility, receipt_data DB column, stores contact columns, updated RPC]
  affects: [08-02-barcode-scanner, 08-03-receipt-screen]
tech_stack:
  added: []
  patterns: [TDD red-green, manual type regeneration, JSONB snapshot pattern]
key_files:
  created:
    - src/lib/receipt.ts
    - src/lib/receipt.test.ts
    - supabase/migrations/010_checkout_speed.sql
  modified:
    - src/types/database.ts
    - src/schemas/order.ts
decisions:
  - "ReceiptData type includes all D-09/D-13 fields (storeAddress, storePhone, gstNumber, staffName) per plan spec — UI-SPEC.md omits these but the authoritative type includes them"
  - "z.record(z.string(), z.unknown()) required for Zod v3 (two-arg form) — single-arg z.record(z.unknown()) fails type check"
  - "Pre-existing .next/types/validator.ts errors (dev-login routes) confirmed before our changes — not introduced by this plan"
metrics:
  duration_minutes: 8
  completed_date: "2026-04-02T07:22:10Z"
  tasks_completed: 2
  files_changed: 5
---

# Phase 8 Plan 1: Receipt Data Foundation Summary

ReceiptData TypeScript type, buildReceiptData factory, Vitest tests, and SQL migration establishing the data contracts for barcode scanning (Plan 02) and receipt screen (Plan 03).

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 (RED) | Failing tests for ReceiptData | d30e609 | src/lib/receipt.test.ts |
| 1 (GREEN) | ReceiptData type and buildReceiptData | e446a8c | src/lib/receipt.ts |
| 2 | Database migration + types + schema | 338fd08 | 010_checkout_speed.sql, database.ts, order.ts |

## What Was Built

### src/lib/receipt.ts
- `ReceiptLineItem` type — maps from CartItem, all fields required for ESC/POS printer
- `ReceiptData` type — complete receipt snapshot with all D-09 compliance fields (store address, phone, GST number, staff name)
- `buildReceiptData()` — factory accepting store/cart/totals/payment params; null store fields default to `''`

### src/lib/receipt.test.ts
6 Vitest tests covering:
1. All required fields present in output
2. CartItem[] → ReceiptLineItem[] mapping with correct field values
3. Optional cash fields only included when provided
4. Optional customerEmail only included when provided
5. JSON round-trip serialisation without data loss
6. Null store fields defaulting to empty string

### supabase/migrations/010_checkout_speed.sql
- `ALTER TABLE public.stores` adds: `address TEXT`, `phone TEXT`, `gst_number TEXT`
- `ALTER TABLE public.orders` adds: `receipt_data JSONB`, `customer_email TEXT`
- `CREATE OR REPLACE FUNCTION complete_pos_sale` adds `p_receipt_data JSONB DEFAULT NULL` and `p_customer_email TEXT DEFAULT NULL` params, populates new columns in INSERT

### src/types/database.ts
- `stores.Row/Insert/Update`: address, phone, gst_number (all `string | null`)
- `orders.Row/Insert/Update`: receipt_data (`Record<string, unknown> | null`)
- `complete_pos_sale.Args`: p_receipt_data, p_customer_email

### src/schemas/order.ts
- `CreateOrderSchema`: added `receipt_data: z.record(z.string(), z.unknown()).optional()`

## Verification Results

- `npx vitest run src/lib/receipt.test.ts` — 6/6 tests pass
- `npx tsc --noEmit` — no new errors (2 pre-existing `.next/types/validator.ts` errors confirmed pre-existing)
- Migration file contains all three schema changes per acceptance criteria

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed Zod record() call syntax**
- **Found during:** Task 2 TypeScript check
- **Issue:** `z.record(z.unknown())` requires two arguments in Zod v3 — fails with TS2554 "Expected 2-3 arguments, but got 1"
- **Fix:** Changed to `z.record(z.string(), z.unknown())` which is the correct Zod v3 form
- **Files modified:** src/schemas/order.ts
- **Commit:** 338fd08 (included in task commit)

## Known Stubs

None — all types are complete and the migration is a proper schema change. No placeholder data.

## Self-Check: PASSED

- src/lib/receipt.ts — FOUND
- src/lib/receipt.test.ts — FOUND
- supabase/migrations/010_checkout_speed.sql — FOUND
- src/types/database.ts — MODIFIED with required additions
- src/schemas/order.ts — MODIFIED with receipt_data field
- Commits d30e609, e446a8c, 338fd08 — FOUND in git log
