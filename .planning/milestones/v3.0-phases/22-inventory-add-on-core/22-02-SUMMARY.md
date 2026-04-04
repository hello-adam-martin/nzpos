---
phase: 22-inventory-add-on-core
plan: "02"
subsystem: inventory
tags: [server-actions, inventory, feature-gating, zod, vitest]
dependency_graph:
  requires: ["22-01"]
  provides: ["adjustStock", "getAdjustmentHistory", "getStockLevels"]
  affects: ["22-04"]
tech_stack:
  added: []
  patterns: ["requireFeature DB-check gate on mutations", "chainable Supabase query mock for vitest"]
key_files:
  created:
    - src/actions/inventory/adjustStock.ts
    - src/actions/inventory/getAdjustmentHistory.ts
    - src/actions/inventory/getStockLevels.ts
  modified:
    - src/actions/inventory/__tests__/adjustStock.test.ts
    - src/actions/inventory/__tests__/getAdjustmentHistory.test.ts
decisions:
  - "resolveAuth returns snake_case keys (store_id, staff_id) — plan template used camelCase; corrected to match actual implementation"
  - "adjustStock adds not_authenticated guard — plan omitted null check on resolveAuth return; added per Rule 2 (missing null check)"
  - "getAdjustmentHistory adds not_authenticated guard — same as above"
  - "Test mock for getAdjustmentHistory uses fully-chainable thenable object — Supabase chains select+eq+order+range+eq(filter) so mocks must support arbitrary chain length"
metrics:
  duration_mins: 3
  completed_date: "2026-04-04"
  tasks_completed: 2
  tasks_total: 2
  files_created: 3
  files_modified: 2
---

# Phase 22 Plan 02: Inventory Server Actions Summary

Three inventory server actions implementing the data layer for stock management: manual adjustment via RPC, paginated adjustment history with filters, and stock level queries across physical products.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | adjustStock server action + tests | 2a12638 | adjustStock.ts, adjustStock.test.ts |
| 2 | getAdjustmentHistory + getStockLevels + tests | b26414b | getAdjustmentHistory.ts, getStockLevels.ts, getAdjustmentHistory.test.ts |

## What Was Built

**adjustStock.ts**
- `'use server'` + `import 'server-only'` guard
- `requireFeature('inventory', { requireDbCheck: true })` — DB-path gate for mutations (stale JWT unacceptable for writes)
- `AdjustStockSchema.safeParse(input)` — Zod validation; only manual reason codes accepted
- `resolveAuth()` null check — returns `not_authenticated` if no session
- `adminClient.rpc('adjust_stock', { p_store_id, p_product_id, p_quantity_delta, p_reason, p_notes, p_staff_id })` — delegates to SECURITY DEFINER RPC
- Error routing: `PRODUCT_NOT_FOUND` in RPC message → `product_not_found`; other DB errors → `server_error`

**getAdjustmentHistory.ts**
- Paginated query on `stock_adjustments` with `PAGE_SIZE = 50`
- Filters: `productId` (eq), `fromDate` (gte on created_at), `toDate` (lte on created_at), `reason` (eq)
- Joins `products(name, sku)` for display in history table
- Returns `{ success, rows, total, page, pageSize }`

**getStockLevels.ts**
- Queries `products` filtered by `store_id`, `product_type = 'physical'`, `is_active = true`
- Selects stock-relevant fields + `categories(name)` join
- Ordered by name ascending

## Tests

- `adjustStock.test.ts`: 10 tests — 5 schema validation + 5 server action behavior (requireFeature called, feature_not_active return, RPC parameters, new_quantity return, product_not_found)
- `getAdjustmentHistory.test.ts`: 7 tests — 1 schema constant + 6 server action behavior (paginated rows, product filter, date range filter, reason filter, empty result, products join)

## Deviations from Plan

**1. [Rule 2 - Missing null check] Added not_authenticated guard to adjustStock**
- **Found during:** Task 1 implementation
- **Issue:** Plan template skipped null check on `resolveAuth()` return; `resolveAuth` returns `null` if unauthenticated
- **Fix:** Added `if (!staff) return { error: 'not_authenticated' as const }` after `resolveAuth()` call
- **Files modified:** src/actions/inventory/adjustStock.ts

**2. [Rule 2 - Missing null check] Added not_authenticated guard to getAdjustmentHistory**
- **Found during:** Task 2 implementation
- **Issue:** Same pattern — `resolveAuth()` can return null
- **Fix:** Added `if (!staff) return { error: 'not_authenticated' as const }` after `resolveAuth()` call
- **Files modified:** src/actions/inventory/getAdjustmentHistory.ts

**3. [Rule 1 - Bug] Corrected resolveAuth property names from camelCase to snake_case**
- **Found during:** Task 1 implementation — reading actual `resolveAuth.ts` return type
- **Issue:** Plan template used `staff.storeId` / `staff.staffId` (camelCase); actual implementation returns `{ store_id, staff_id }` (snake_case)
- **Fix:** Used `staff.store_id` and `staff.staff_id` throughout
- **Files modified:** src/actions/inventory/adjustStock.ts, src/actions/inventory/getAdjustmentHistory.ts, src/actions/inventory/getStockLevels.ts

## Known Stubs

None — all three actions are fully wired. No placeholder data or hardcoded empty values.

## Self-Check: PASSED
