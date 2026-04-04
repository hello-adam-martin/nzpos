---
phase: 21-service-product-type-free-tier-simplification
plan: "01"
subsystem: database-foundation
tags: [migration, product-type, inventory, feature-gating, rpc, auth-hook]
dependency_graph:
  requires: []
  provides: [product_type-column, has_inventory-store_plans, inventory-jwt-claim, service-product-stock-skip, ProductTypeSchema, inventory-addon-config]
  affects: [complete_pos_sale, complete_online_sale, custom_access_token_hook, requireFeature]
tech_stack:
  added: []
  patterns: [CHECK-constraint-not-enum, CREATE-OR-REPLACE-preserves-grants, service-product-stock-skip-in-RPC]
key_files:
  created:
    - supabase/migrations/024_service_product_type.sql
  modified:
    - src/types/database.ts
    - src/schemas/product.ts
    - src/config/addons.ts
    - src/components/admin/billing/AddOnCard.tsx
decisions:
  - "Used CHECK constraint for product_type (not ENUM) to allow easy future extension"
  - "Re-fetches product_type in loop 2 of RPCs rather than caching from loop 1 — avoids stale variable risk in plpgsql loops"
  - "AddOnCard feature prop updated to use SubscriptionFeature type from addons.ts — prevents type divergence as features grow"
metrics:
  duration_minutes: 2
  tasks_completed: 2
  files_modified: 5
  completed_date: "2026-04-04"
---

# Phase 21 Plan 01: Database Foundation for Service Product Types Summary

**One-liner:** Migration adds product_type CHECK column and has_inventory to store_plans, rewrites both sale RPCs to skip stock for service products, and updates TypeScript/Zod/addon config to match.

## What Was Built

### Migration 024_service_product_type.sql (6 sections)

1. **product_type column** — `TEXT NOT NULL DEFAULT 'physical' CHECK (product_type IN ('physical', 'service'))` on `public.products`. All existing products default to physical.

2. **store_plans columns** — `has_inventory BOOLEAN NOT NULL DEFAULT false` and `has_inventory_manual_override BOOLEAN NOT NULL DEFAULT false`. Both default false — existing stores start without inventory add-on.

3. **Auth hook update** — Full `CREATE OR REPLACE` of `custom_access_token_hook`. Added `v_has_inventory` variable, included `has_inventory` in the `store_plans` SELECT, and injected `app_metadata.inventory` boolean claim. Existing xero/email_notifications/custom_domain claims preserved verbatim.

4. **complete_pos_sale rewrite** — Signature preserved exactly (matches migration 021 GRANT). Added `v_product_type TEXT` to DECLARE. Loop 1: `SELECT stock_quantity, product_type ... FOR UPDATE`, wraps OUT_OF_STOCK check in `IF v_product_type = 'physical' THEN`. Loop 2: re-fetches `product_type`, wraps `UPDATE products SET stock_quantity` in `IF v_product_type = 'physical' THEN`.

5. **complete_online_sale rewrite** — Same pattern as POS sale. Signature preserved exactly (matches migration 021 GRANT).

6. **Idempotent GRANT** — `GRANT SELECT ON public.store_plans TO supabase_auth_admin` ensures new columns are accessible to auth hook.

### TypeScript types (src/types/database.ts)
- `products.Row`: added `product_type: string`
- `products.Insert/Update`: added `product_type?: string`
- `store_plans.Row`: added `has_inventory: boolean`, `has_inventory_manual_override: boolean`
- `store_plans.Insert/Update`: added optional variants of both

### Zod schemas (src/schemas/product.ts)
- New export `ProductTypeSchema = z.enum(['physical', 'service']).default('physical')`
- Added `product_type: ProductTypeSchema` to `CreateProductSchema`
- Exported `CreateProductInput` and `UpdateProductInput` inferred types (previously type-only, not exported)

### Addon config (src/config/addons.ts)
- `SubscriptionFeature` union: added `'inventory'`
- `FeatureFlags` interface: added `has_inventory: boolean`
- `PRICE_ID_MAP`: added `inventory: process.env.STRIPE_PRICE_INVENTORY ?? ''`
- `PRICE_TO_FEATURE`: conditionally adds `inventory` mapping only when env var is set
- `FEATURE_TO_COLUMN`: added `inventory: 'has_inventory'`
- `ADDONS` array: added inventory entry with display metadata

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] AddOnCard feature prop type was hardcoded as narrow union**
- **Found during:** Task 2 TypeScript check
- **Issue:** `AddOnCard.tsx` had `feature: 'xero' | 'email_notifications' | 'custom_domain'` hardcoded in its props interface. After adding `'inventory'` to `SubscriptionFeature`, BillingClient.tsx got a TS2322 error passing `addon.feature` to `AddOnCard`.
- **Fix:** Updated `AddOnCard.tsx` to import `SubscriptionFeature` from `@/config/addons` and use it as the prop type.
- **Files modified:** `src/components/admin/billing/AddOnCard.tsx`
- **Commit:** 2a31e89

## Tasks

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Create database migration 024_service_product_type.sql | d27e7a6 | supabase/migrations/024_service_product_type.sql |
| 2 | Update TypeScript types, Zod schemas, and addon config | 2a31e89 | src/types/database.ts, src/schemas/product.ts, src/config/addons.ts, src/components/admin/billing/AddOnCard.tsx |

## Known Stubs

None — all changes are foundational schema/type definitions. No UI rendering or data wiring in this plan.

## Self-Check: PASSED
