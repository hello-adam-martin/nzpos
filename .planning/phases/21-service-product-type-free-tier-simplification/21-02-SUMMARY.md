---
phase: 21-service-product-type-free-tier-simplification
plan: "02"
subsystem: server-actions
tags: [product-type, service-product, refund, checkout, csv-import, stock-guard]
dependency_graph:
  requires: [product_type-column, ProductTypeSchema]
  provides: [product_type-create-persist, product_type-update-persist, product_type-import-persist, service-refund-stock-skip, service-checkout-stock-skip]
  affects: [createProduct, updateProduct, importProducts, processRefund, processPartialRefund, createCheckoutSession]
tech_stack:
  added: []
  patterns: [per-row-zod-validation, service-product-guard-in-action, productTypeMap-lookup]
key_files:
  created: []
  modified:
    - src/actions/products/createProduct.ts
    - src/actions/products/updateProduct.ts
    - src/actions/products/importProducts.ts
    - src/actions/orders/processRefund.ts
    - src/actions/orders/processPartialRefund.ts
    - src/actions/orders/createCheckoutSession.ts
decisions:
  - "Used (item as any).products?.product_type cast in refund actions — Supabase generated types don't model nested FK join, cast is safe because the join is explicitly declared in the select string"
  - "processPartialRefund builds a productTypeMap keyed by product_id before the restore loop — avoids inline DB lookup per item"
  - "createCheckoutSession uses !== 'service' guard (not === 'physical') — future product types default to physical behavior without code change"
  - "ImportSchema bulk validator replaced with per-row loop to give targeted D-11 error messages per invalid row"
metrics:
  duration_minutes: 8
  tasks_completed: 2
  files_modified: 6
  completed_date: "2026-04-04"
---

# Phase 21 Plan 02: Server Actions product_type Wiring Summary

**One-liner:** Wired product_type through all six server action files — product CRUD persists type from FormData, CSV import validates per-row with D-09/D-10/D-11 rules, and refund/checkout actions guard stock operations for service products.

## What Was Built

### createProduct.ts
- Extracts `product_type` from `FormData` with `formData.get('product_type')`
- Passes it into the `raw` object before `CreateProductSchema.safeParse()` — schema defaults to `'physical'` if absent (D-02)
- `...parsed.data` spread in the insert naturally includes `product_type`

### updateProduct.ts
- Extracts `product_type` from `FormData` after the `imageUrl` block
- Sets `raw.product_type = productType` only when the field is present (partial update pattern)
- `UpdateProductSchema.safeParse(raw)` validates the partial field; `parsed.data` spread in the update includes it

### importProducts.ts (three changes)
1. **D-09 — Default physical:** `product_type: z.enum(['physical', 'service']).default('physical')` added to `ImportRowSchema`
2. **D-11 — Per-row rejection:** Replaced `ImportSchema` bulk validator with a per-row loop. Invalid `product_type` produces `"Invalid product type — must be 'physical' or 'service'. Row skipped."`. Other field errors produce the generic error. Valid rows continue to import even when other rows are invalid.
3. **D-10 — Silence stock for service:** In `insertRows` mapping, `isService ? 0 :` guards `stock_quantity` and `reorder_threshold`. Service products always insert with 0 stock regardless of CSV column values.

### processRefund.ts (PROD-03)
- Order query updated to `.select('*, order_items(*, products(product_type))')`
- In the restore_stock loop: `if ((item as any).products?.product_type === 'service') continue`
- Physical items retain the existing restore_stock RPC call unchanged

### processPartialRefund.ts (PROD-03)
- Order query updated to `.select('*, order_items(*, products(product_type))')`
- `productTypeMap` built from `order.order_items` before the restore loop, keyed by `product_id`
- Restore loop: `if (productTypeMap.get(item.productId) === 'service') continue`

### createCheckoutSession.ts (FREE-02, POS-04)
- Product fetch updated to `.select('id, name, price_cents, stock_quantity, product_type, is_active')`
- Stock check wrapped: `if (product.product_type !== 'service' && product.stock_quantity < item.quantity)`
- Service products always pass the stock check, regardless of their `stock_quantity` value

## Deviations from Plan

None — plan executed exactly as written. The pre-existing TypeScript error in `ProductsPageClient.tsx` (`hasInventory` prop not yet on `ProductDataTableProps`) was confirmed out of scope for this plan and logged below.

## Deferred Items

**Pre-existing TypeScript error (out of scope):**
- `src/components/admin/products/ProductsPageClient.tsx(105,11)`: `hasInventory` prop missing from `ProductDataTableProps` — this prop is introduced by Phase 21 plan 03 (UI wiring). Not caused by this plan's changes.

## Tasks

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Wire product_type through product CRUD and CSV import | 7955507 | createProduct.ts, updateProduct.ts, importProducts.ts |
| 2 | Add service product guards to refund actions and checkout session | 04ea786 | processRefund.ts, processPartialRefund.ts, createCheckoutSession.ts |

## Known Stubs

None — all changes are server-side logic. No UI rendering in this plan.

## Self-Check: PASSED
