# Phase 22: Inventory Add-on Core - Context

**Gathered:** 2026-04-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Merchants with the inventory add-on can manually adjust stock with reason codes and run a stocktake with variance calculation. This phase builds the core inventory management features: stock adjustments (single product, with audit trail), stocktake sessions (create, count, review variance, commit), and adjustment history viewing. Feature gating and POS/storefront integration are Phase 23.

Requirements covered: STOCK-01, STOCK-02, STOCK-03, STOCK-04, STOCK-05, TAKE-01, TAKE-02, TAKE-03, TAKE-04, TAKE-05

</domain>

<decisions>
## Implementation Decisions

### Adjustment UX
- **D-01:** Stock adjustment is triggered inline from the product edit/detail view via an "Adjust stock" button — no dedicated inventory adjustment page
- **D-02:** Adjustment form opens in a slide-out drawer (matches existing ProductFormDrawer pattern)
- **D-03:** Single product adjustment only — no bulk adjustment mode. Stocktake covers the bulk use case
- **D-04:** Adjustment input supports both modes: relative (±delta, e.g. +5 or -3) and absolute (set to X, system calculates delta). Toggle between "Adjust by" and "Set to"

### Stocktake Flow
- **D-05:** Stocktake uses a single page with tabs: Count tab (enter quantities) and Review tab (variance review). Commit button at the top
- **D-06:** Count entry view is a scrollable table with product name, SKU/barcode, and count input field. Filter/search at top. Barcode scan auto-focuses the matching row
- **D-07:** System quantity is hidden during the counting phase to prevent anchoring bias. Only shown on the Review tab alongside counted qty and variance
- **D-08:** Stocktake sessions auto-save as the user types. Session stays open until explicitly committed or discarded. Can close browser and resume later

### History & Filtering
- **D-09:** Adjustment history lives as a tab on the inventory page (alongside Stock Levels and Stocktakes tabs)
- **D-10:** History table columns: Date, Product, Reason, Quantity change (±), New total, Notes, User
- **D-11:** Filter controls: Product picker, date range, reason code dropdown. Matches success criteria requirements

### Reason Codes
- **D-12:** Reason codes stored as a fixed enum in code (not a database table). Simple, consistent, good for filtering. Can extend later
- **D-13:** Manual adjustment reason codes: `received`, `damaged`, `theft_shrinkage`, `correction`, `return_to_supplier`, `other`
- **D-14:** System-generated reason codes (`sale`, `refund`, `stocktake`) are auto-set by the system and not selectable by users for manual adjustments

### Inventory Page Structure
- **D-15:** New `/admin/inventory` page with three tabs: Stock Levels, Stocktakes, History
- **D-16:** Stock Levels tab shows all physical products with current stock quantities (STOCK-05)
- **D-17:** Stocktakes tab shows list of stocktake sessions with status (in-progress, committed, discarded)

### Claude's Discretion
- Exact tab component implementation (reuse existing tab pattern or new)
- Pagination strategy for history and stock levels tables
- Stocktake session creation UX (scope selection: full inventory vs filtered by category)
- Auto-save debounce timing and optimistic UI strategy

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Database & RPCs
- `supabase/migrations/001_initial_schema.sql` — Products table with `stock_quantity` and `reorder_threshold` columns
- `supabase/migrations/024_service_product_type.sql` — Phase 21 migration adding `product_type`, `has_inventory` on store_plans, updated auth hook with inventory JWT claim
- `supabase/migrations/005_pos_rpc.sql` — Original complete_pos_sale RPC (stock decrement source)
- `supabase/migrations/010_checkout_speed.sql` — Updated complete_pos_sale RPC
- `supabase/migrations/006_online_store.sql` — complete_online_sale RPC (stock decrement source)

### Feature Gating
- `src/lib/requireFeature.ts` — Feature gating utility (JWT fast path + DB fallback)
- `src/config/addons.ts` — Add-on config with `inventory` already registered in SubscriptionFeature type

### Existing Product Code
- `src/schemas/product.ts` — Zod schemas for product validation
- `src/actions/products/createProduct.ts` — Product creation server action
- `src/actions/products/updateProduct.ts` — Product update server action
- `src/components/admin/products/ProductFormDrawer.tsx` — Product form drawer (pattern to follow for adjustment drawer)
- `src/components/admin/products/ProductDataTable.tsx` — Product data table

### Barcode Scanner (Reusable)
- `src/actions/products/lookupBarcode.ts` — Barcode lookup server action (reuse for stocktake scanning)
- `src/components/pos/BarcodeScannerSheet.tsx` — Barcode scanner UI component (adapt for stocktake)
- `src/components/pos/BarcodeScannerButton.tsx` — Barcode trigger button

### Admin Layout
- `src/components/admin/AdminSidebar.tsx` — Sidebar nav (needs new Inventory entry)

### Requirements & Roadmap
- `.planning/REQUIREMENTS.md` — v3.0 requirements (STOCK-01–05, TAKE-01–05)
- `.planning/ROADMAP.md` — Phase 22 success criteria

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `ProductFormDrawer` — Drawer pattern to follow for stock adjustment drawer
- `BarcodeScannerSheet` + `lookupBarcode` — Barcode scanner and lookup, reusable for stocktake count entry (TAKE-05)
- `requireFeature('inventory')` — Feature gating already set up for inventory add-on
- `ProductDataTable` — Table patterns (sorting, filtering) reusable for stock levels and history tables

### Established Patterns
- Feature gating: JWT claim for UI rendering, DB check for mutations
- Server actions with Zod validation in `src/actions/`
- Drawer-based forms (ProductFormDrawer pattern)
- Admin sidebar navigation in `AdminSidebar.tsx`
- RPC-based stock mutations in PostgreSQL (sale/refund stock changes happen in RPCs)

### Integration Points
- New migration needed: `stock_adjustments` table (append-only audit log) and `stocktake_sessions` / `stocktake_lines` tables
- Sale and refund RPCs need to INSERT into `stock_adjustments` when recording stock changes (STOCK-02)
- New admin route: `/admin/inventory` with tabs
- AdminSidebar needs new "Inventory" nav item (gated behind `has_inventory`)
- Product edit view needs "Adjust stock" button (gated behind `has_inventory`)

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

*Phase: 22-inventory-add-on-core*
*Context gathered: 2026-04-04*
