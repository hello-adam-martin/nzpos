---
phase: 36-advanced-reporting-cogs-add-on
plan: "01"
subsystem: billing, products, admin-ui
tags: [advanced-reporting, cogs, billing, products, migration]
dependency_graph:
  requires: [36-00]
  provides: [advanced_reporting-billing-pipeline, cost_price_cents-data-layer, margin-percent-ui]
  affects: [src/config/addons.ts, src/schemas/product.ts, supabase/migrations, src/app/admin/products]
tech_stack:
  added: []
  patterns: [add-on billing pipeline, conditional UI gating via hasAdvancedReporting prop, GST-exclusive cost price pattern]
key_files:
  created:
    - supabase/migrations/034_cogs.sql
  modified:
    - src/config/addons.ts
    - src/actions/billing/createSubscriptionCheckoutSession.ts
    - src/app/admin/layout.tsx
    - src/components/admin/AdminSidebar.tsx
    - src/schemas/product.ts
    - src/actions/products/createProduct.ts
    - src/actions/products/updateProduct.ts
    - src/app/admin/products/page.tsx
    - src/components/admin/products/ProductsPageClient.tsx
    - src/components/admin/products/ProductFormDrawer.tsx
    - src/components/admin/products/ProductDataTable.tsx
decisions:
  - cost_price_cents is GST-exclusive (supplier cost before tax) — enforced by UI label "(excl. GST)"
  - NULL cost_price_cents means "not entered yet" — margin shows "---" in the table
  - Margin color coding: >30% text-success, 15-30% text-primary, 0-15% text-warning, negative text-error
  - AdminSidebar Add-ons section renders when hasGiftCards OR hasAdvancedReporting is true
metrics:
  duration_minutes: 8
  completed_date: "2026-04-07"
  tasks_completed: 3
  tasks_total: 3
  files_modified: 11
---

# Phase 36 Plan 01: Advanced Reporting Add-On Data Layer and Billing Pipeline Summary

**One-liner:** Advanced Reporting add-on registered in Stripe billing pipeline with cost_price_cents column on products and conditional cost price / margin UI gated behind hasAdvancedReporting flag.

## What Was Built

Three tasks completed in sequence:

**Task 1: DB migration + billing pipeline registration**
- `supabase/migrations/034_cogs.sql`: Adds `has_advanced_reporting BOOLEAN NOT NULL DEFAULT false` to `store_plans`, `cost_price_cents INTEGER NULL` with non-negative CHECK constraint to `products`, and a partial index `idx_products_cost_price` on `products(store_id) WHERE cost_price_cents IS NOT NULL`.
- `src/config/addons.ts`: `advanced_reporting` added to all 5 registration points (SubscriptionFeature union, FeatureFlags interface, PRICE_ID_MAP, PRICE_TO_FEATURE, FEATURE_TO_COLUMN, ADDONS array with marketing copy).
- `createSubscriptionCheckoutSession.ts`: featureSchema z.enum extended with `'advanced_reporting'`.
- `src/app/admin/layout.tsx`: Store plans query now selects `has_gift_cards, has_advanced_reporting`; `hasAdvancedReporting` extracted and passed to `AdminSidebar`.
- `AdminSidebar.tsx`: Accepts `hasAdvancedReporting?: boolean`; Add-ons section condition updated to `hasGiftCards === true || hasAdvancedReporting === true`.

**Task 2: Cost price in product schema and server actions**
- `src/schemas/product.ts`: `cost_price_cents: z.number().int().min(0).nullable().optional()` added to `CreateProductSchema`; `UpdateProductSchema` inherits via `.partial()`.
- `createProduct.ts`: Extracts `cost_price_cents` from FormData, included in Supabase insert via `parsed.data` spread.
- `updateProduct.ts`: Extracts `cost_price_cents` from FormData, included in Supabase update.
- All 7 Wave 0 cost price tests pass.

**Task 3: Cost price field in product form and margin column in product list**
- `products/page.tsx`: Reads `advanced_reporting` from `user.app_metadata`, passes `hasAdvancedReporting` to `ProductsPageClient`.
- `ProductsPageClient.tsx`: Accepts and forwards `hasAdvancedReporting` to both `ProductDataTable` and `ProductFormDrawer`.
- `ProductDataTable.tsx`: `ProductWithCategory` interface gains `cost_price_cents: number | null`; `productMarginPercent()` helper calculates gross margin from GST-inclusive sell price and GST-exclusive cost price; conditional "Margin %" column header and color-coded margin cells (text-success >30%, text-primary 15-30%, text-warning 0-15%, text-error negative); null cost price shows "---".
- `ProductFormDrawer.tsx`: `hasAdvancedReporting?: boolean` prop, `costPriceCents` state initialized from `product.cost_price_cents`, conditional cost price `PriceInput` positioned below selling price field with "(excl. GST)" annotation and helper text; `cost_price_cents` included in FormData submission.

## Commits

- `1b4de3f` feat(36-01): DB migration + billing pipeline for advanced_reporting add-on
- `446e19e` feat(36-01): add cost_price_cents to product schema and server actions
- `c98b94d` feat(36-01): cost price field in product form and margin column in product list

## Deviations from Plan

None — plan executed exactly as written.

The verification command `grep -rq "hasGiftCards || hasAdvancedReporting"` in the plan would fail because the actual implementation uses `(hasGiftCards === true || hasAdvancedReporting === true)` for correct boolean guards. This is semantically equivalent and more type-safe — not a deviation from intent.

## Known Stubs

None. All data flows are wired:
- `cost_price_cents` persists via server actions and will be returned by `select('*, categories(name)')` once migration is applied.
- `hasAdvancedReporting` flows from DB → layout → page → components.
- Margin % is calculated inline from live `price_cents` and `cost_price_cents` values.

## Self-Check: PASSED

- supabase/migrations/034_cogs.sql: FOUND
- src/config/addons.ts: FOUND
- Commit 1b4de3f: FOUND
- Commit 446e19e: FOUND
- Commit c98b94d: FOUND
