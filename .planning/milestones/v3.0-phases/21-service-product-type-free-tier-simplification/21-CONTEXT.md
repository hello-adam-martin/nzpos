# Phase 21: Service Product Type + Free-Tier Simplification - Context

**Gathered:** 2026-04-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Add a `product_type` field (`physical` | `service`) to products so service products skip all stock logic (decrements, restores, blocking). Simultaneously clean up the free-tier experience so stores without the inventory add-on see no stock quantities, badges, alerts, or reports anywhere in admin, POS, or storefront — products sell freely.

Requirements covered: PROD-01, PROD-02, PROD-03, PROD-04, FREE-01, FREE-02, FREE-03, POS-04

</domain>

<decisions>
## Implementation Decisions

### Product Type UX
- **D-01:** Radio buttons for physical/service selection on product create/edit form — two options side by side, always visible
- **D-02:** Default product type for new products is `physical` — matches existing implicit behavior
- **D-03:** When product type is set to `service`, hide stock_quantity and reorder_threshold fields entirely (not disabled/greyed)
- **D-04:** Allow product type changes freely at any time, even after sales history — no warning dialog, no locking. Stock quantity stays in DB but is ignored for services

### Free-Tier Cleanup
- **D-05:** Hide stock_quantity and reorder_threshold fields entirely from admin product form for stores without inventory add-on
- **D-06:** Hide the Low Stock Alerts dashboard widget and Stock Levels report completely for free-tier stores — no upgrade CTA replacement
- **D-07:** Remove the Stock column from the admin product data table for free-tier stores
- **D-08:** Skip stock quantity input in the store setup wizard product step for free-tier stores

### CSV Import Behavior
- **D-09:** Default `product_type` to `physical` when CSV has no product_type column — preserves backward compatibility with existing CSV templates
- **D-10:** When a CSV row has product_type=service AND a stock_quantity value, silently ignore the stock_quantity value
- **D-11:** Reject CSV rows with invalid product_type values (anything other than physical/service) — show error in import preview, row is skipped unless fixed

### Stock Display States
- **D-12:** POS product cards for free-tier stores show no stock badge at all — cleaner card with name, price, image only
- **D-13:** Storefront product cards for free-tier stores show no stock/sold-out badges — clean card
- **D-14:** Service products show no visual indicator differentiating them from physical products in POS or storefront — they look like any other product

### Claude's Discretion
- No areas deferred to Claude's discretion — all decisions made by user

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Database & RPCs
- `supabase/migrations/005_pos_rpc.sql` — Original complete_pos_sale RPC definition
- `supabase/migrations/010_checkout_speed.sql` — Updated complete_pos_sale RPC with receipt/email params
- `supabase/migrations/006_online_store.sql` — complete_online_sale RPC definition
- `supabase/migrations/021_security_audit_fixes.sql` — RPC GRANT restrictions for sale RPCs

### Feature Gating
- `src/lib/requireFeature.ts` — Feature gating utility (JWT fast path + DB fallback)
- `src/config/addons.ts` — Add-on configuration, SubscriptionFeature type, price/feature maps

### Product Schema & Actions
- `src/schemas/product.ts` — Zod schemas for CreateProduct/UpdateProduct (needs product_type field)
- `src/actions/products/createProduct.ts` — Product creation server action
- `src/actions/products/updateProduct.ts` — Product update server action
- `src/actions/products/importProducts.ts` — CSV import server action

### Sale Actions
- `src/actions/orders/completeSale.ts` — POS sale completion (calls complete_pos_sale RPC)
- `src/actions/orders/createCheckoutSession.ts` — Online checkout (calls complete_online_sale)

### UI Components
- `src/components/admin/products/ProductFormDrawer.tsx` — Product create/edit form
- `src/components/admin/products/ProductDataTable.tsx` — Product list table (has Stock column)
- `src/components/admin/products/ProductStatusBadge.tsx` — Stock status badge component
- `src/components/admin/dashboard/LowStockAlertList.tsx` — Dashboard low stock widget
- `src/components/admin/reports/StockLevelsTable.tsx` — Stock levels report
- `src/components/admin/csv/ColumnMapperStep.tsx` — CSV column mapping (needs product_type)
- `src/components/admin/csv/ImportPreviewTable.tsx` — CSV import preview
- `src/components/pos/ProductCard.tsx` — POS product card (has stock badge)
- `src/components/pos/POSClientShell.tsx` — POS main shell (stock references)
- `src/components/store/AddToCartButton.tsx` — Storefront add-to-cart (stock check)
- `src/components/store/StoreProductCard.test.tsx` — Storefront card tests

### Research & Requirements
- `.planning/REQUIREMENTS.md` — v3.0 requirements (PROD-01–04, FREE-01–03, POS-04)
- `.planning/ROADMAP.md` — Phase 21 success criteria

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `requireFeature()` in `src/lib/requireFeature.ts` — already supports JWT fast path + DB fallback pattern; needs `inventory` added to `SubscriptionFeature` type
- `ADDONS` array in `src/config/addons.ts` — follows established pattern for add-on registration; inventory add-on follows same shape
- `ProductFormDrawer` — existing form with stock_quantity/reorder_threshold fields that need conditional rendering
- `ColumnMapperStep` — CSV column mapping already handles optional columns

### Established Patterns
- Feature gating: JWT claim for UI rendering, DB check for mutations (`requireFeature` with `requireDbCheck` option)
- Add-on registration: `SubscriptionFeature` union type + `FEATURE_TO_COLUMN` + `PRICE_ID_MAP` + `ADDONS` array
- RPC-based mutations: Stock decrements happen in PostgreSQL RPCs (`complete_pos_sale`, `complete_online_sale`), not application code
- Schema validation: Zod schemas in `src/schemas/` validate all server action inputs

### Integration Points
- Migration file needed: Add `product_type` column to products table, modify sale RPCs to skip stock for services
- `store_plans` table: Needs `has_inventory` column (Phase 23 adds gating, but column may be needed earlier for conditional UI)
- Product type needs to flow through: schema → form → server action → database → RPC → UI display

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 21-service-product-type-free-tier-simplification*
*Context gathered: 2026-04-04*
