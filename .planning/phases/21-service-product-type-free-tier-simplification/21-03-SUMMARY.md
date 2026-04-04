---
phase: 21-service-product-type-free-tier-simplification
plan: "03"
subsystem: ui-components
tags: [product-type, inventory, feature-gating, pos, storefront, admin, free-tier]
dependency_graph:
  requires: [product_type-column, has_inventory-store_plans, inventory-jwt-claim, ProductTypeSchema]
  provides: [product-type-radio-ui, free-tier-stock-gating, service-product-sell-ui, hasInventory-prop-chain]
  affects: [ProductFormDrawer, ProductDataTable, Dashboard, Reports, POSClientShell, ProductCard, StoreProductCard, AddToCartButton, StoreProductGrid, admin-products-page, pos-page, store-home-page, product-detail-page]
tech_stack:
  added: []
  patterns: [hasInventory-prop-chain, jwt-app_metadata-read, store_plans-direct-query, fieldset-radio-group-accessibility]
key_files:
  created: []
  modified:
    - src/app/admin/products/page.tsx
    - src/components/admin/products/ProductsPageClient.tsx
    - src/components/admin/products/ProductFormDrawer.tsx
    - src/components/admin/products/ProductDataTable.tsx
    - src/app/admin/dashboard/page.tsx
    - src/app/admin/reports/page.tsx
    - src/components/admin/reports/ReportsPageClient.tsx
    - src/components/pos/ProductCard.tsx
    - src/components/pos/ProductGrid.tsx
    - src/components/pos/POSClientShell.tsx
    - src/app/(pos)/pos/page.tsx
    - src/components/store/AddToCartButton.tsx
    - src/components/store/StoreProductCard.tsx
    - src/components/store/StoreProductGrid.tsx
    - src/app/(store)/page.tsx
    - src/app/(store)/products/[slug]/page.tsx
decisions:
  - "ProductGrid added as intermediate carrier for hasInventory — POSClientShell renders ProductGrid which renders ProductCard, requiring the prop to thread through both"
  - "POS page queries store_plans directly (staff JWT has no app_metadata) — consistent with plan spec"
  - "Storefront pages query store_plans directly (no auth session) — consistent with plan spec"
  - "StoreProductCard isSoldOut/isLowStock use hasInventory === true (strict equality) — avoids false truthy on undefined for free-tier"
metrics:
  duration_minutes: 15
  tasks_completed: 3
  files_modified: 16
  completed_date: "2026-04-04"
---

# Phase 21 Plan 03: UI Wiring for Service Product Types and Free-Tier Simplification Summary

**One-liner:** hasInventory and product_type props threaded through all admin, POS, and storefront components to gate stock display and enable service product selling at every tier.

## What Was Built

### Task 1: Product type radio group in ProductFormDrawer (PROD-01, D-01 through D-05)

- `src/app/admin/products/page.tsx`: Reads `user?.app_metadata?.inventory` from Supabase auth JWT and passes `hasInventory: boolean` to `ProductsPageClient`.
- `src/components/admin/products/ProductsPageClient.tsx`: Accepts `hasInventory` prop and passes it to both `ProductDataTable` and `ProductFormDrawer`.
- `src/components/admin/products/ProductFormDrawer.tsx`:
  - Added `hasInventory: boolean` prop.
  - Added `productType` state (`'physical' | 'service'`) initialized from `product?.product_type ?? 'physical'`.
  - Added `productType` to dirty tracking ref and `isDirty()` check.
  - Added `formData.set('product_type', productType)` in `handleSubmit`.
  - Added `<fieldset>` with `<legend>` "Product type" containing two radio cards (Physical / Service) with amber ring selected state, DM Sans typography, 44px min-height touch targets.
  - Wrapped Stock Quantity and Reorder Threshold in `{hasInventory && productType === 'physical' && (...)}` — instant DOM removal per D-03, no transitions.
  - "New products default to Physical." hint shown only in create mode per D-02.

### Task 2a: Admin stock UI gating (D-06, D-07)

- `src/components/admin/products/ProductDataTable.tsx`: Accepts `hasInventory: boolean`. When false, excludes `stock_quantity` from `SORTABLE_COLUMNS` and conditionally renders the Stock cell in each table row. Stock column removed entirely from DOM per D-07.
- `src/app/admin/dashboard/page.tsx`: Reads `hasInventory` from JWT. Computes `lowStockProducts` as empty array when `!hasInventory`. Wraps `<LowStockAlertList>` in `{hasInventory && ...}` per D-06.
- `src/app/admin/reports/page.tsx`: Reads `hasInventory` from JWT. Skips the stock levels Supabase query when `!hasInventory` (passes empty array). Passes `hasInventory` to `ReportsPageClient`.
- `src/components/admin/reports/ReportsPageClient.tsx`: Accepts `hasInventory: boolean`. `stockCSVData` computed as empty array when false. Stock Levels section wrapped in `{hasInventory && (...)}` per D-06.

### Task 2b: POS and storefront stock gating (D-12, D-13, D-14, POS-04, FREE-01, FREE-02)

**POS:**
- `src/components/pos/ProductCard.tsx`: Accepts `hasInventory: boolean`. Derives `isService = product.product_type === 'service'` and `showStockBadge = hasInventory && !isService`. Stock badge paragraph wrapped in `{showStockBadge && ...}`. `isOutOfStock`/`isLowStock`/`isDisabled` all derived from `showStockBadge` per D-12, D-14.
- `src/components/pos/ProductGrid.tsx`: Added `hasInventory: boolean` prop, threaded through to `ProductCard`.
- `src/components/pos/POSClientShell.tsx`: Added `hasInventory: boolean` prop. `handleAddToCart` updated: service products and free-tier stores bypass the out-of-stock check. Only blocks on stock when `!isService && hasInventory && stock_quantity === 0` per POS-04.
- `src/app/(pos)/pos/page.tsx`: Queries `store_plans.has_inventory` in the existing `Promise.all` block. Passes `hasInventory` to `POSClientShell`.

**Storefront:**
- `src/components/store/AddToCartButton.tsx`: Added `hasInventory?: boolean` and `product_type?: string` to product interface. `isSoldOut = hasInventory === true && !isService && stock_quantity <= 0` — free-tier and service products always addable per FREE-02, POS-04.
- `src/components/store/StoreProductCard.tsx`: Added `hasInventory?: boolean` and `productType?: string`. `isSoldOut`/`isLowStock` gated on `hasInventory === true && !isService` per D-13, D-14.
- `src/components/store/StoreProductGrid.tsx`: Added `hasInventory?: boolean` prop, passes to each `StoreProductCard`.
- `src/app/(store)/page.tsx`: Queries `store_plans.has_inventory` for `STORE_ID`. Adds `product_type` to products SELECT. Maps `productType: p.product_type` in product objects. Passes `hasInventory` to `StoreProductGrid` per FREE-01, FREE-02.
- `src/app/(store)/products/[slug]/page.tsx`: Queries `store_plans.has_inventory`. Derives `isService`, gates `isSoldOut`/`isLowStock` on `hasInventory && !isService`. Passes `hasInventory` and `product_type` to `AddToCartButton`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Prop Chain] ProductGrid required as intermediate hasInventory carrier**
- **Found during:** Task 2b
- **Issue:** The plan specified passing `hasInventory` from `POSClientShell` directly to `ProductCard`, but `POSClientShell` renders `ProductGrid` which renders `ProductCard`. `ProductGrid` had no `hasInventory` prop.
- **Fix:** Added `hasInventory: boolean` to `ProductGrid` props and threaded it through to `ProductCard`.
- **Files modified:** `src/components/pos/ProductGrid.tsx`
- **Commit:** cc52268

## Tasks

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Add product type radio group and conditional stock fields to ProductFormDrawer | 2253eb4 | ProductFormDrawer.tsx, ProductsPageClient.tsx, admin/products/page.tsx |
| 2a | Gate stock UI in admin components — DataTable, Dashboard, Reports | e505fd9 | ProductDataTable.tsx, dashboard/page.tsx, reports/page.tsx, ReportsPageClient.tsx |
| 2b | Gate stock UI in POS and storefront | cc52268 | ProductCard.tsx, ProductGrid.tsx, POSClientShell.tsx, pos/page.tsx, AddToCartButton.tsx, StoreProductCard.tsx, StoreProductGrid.tsx, store/page.tsx, [slug]/page.tsx |

## Known Stubs

None — all hasInventory and product_type wiring is fully connected end-to-end. Free-tier stores correctly hide stock UI. Service products correctly bypass stock checks. No placeholder or TODO left in the prop chains.

## Self-Check: PASSED
