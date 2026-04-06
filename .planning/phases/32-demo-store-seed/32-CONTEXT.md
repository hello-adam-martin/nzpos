# Phase 32: Demo Store Seed - Context

**Gathered:** 2026-04-06
**Status:** Ready for planning

<domain>
## Phase Boundary

A realistic NZ retail demo store exists in the database, ready for the demo POS to query. This phase creates the store record, categories, and ~20 products with placeholder images via an idempotent SQL migration. No UI work, no routing, no auth changes.

</domain>

<decisions>
## Implementation Decisions

### Store Identity
- **D-01:** Demo store represents a generic NZ retail/gift/homeware business (not the founder's supplies store). Broader appeal for prospective merchants visiting the demo.
- **D-02:** Minimal realistic branding — believable NZ business name (e.g., "Aroha Home & Gift"), placeholder logo (text/SVG), generic NZ address. Enough to look real in the POS header without over-engineering seed data.
- **D-03:** Include receipt_header and receipt_footer for realism. IRD/GST number optional (can use a sample format).

### Product Catalog
- **D-04:** New generic retail product mix — ~20 products across 4+ categories matching a gift/homeware store (candles, mugs, prints, kitchenware, etc.). Does NOT reuse the existing supplies products from seed.ts.
- **D-05:** All prices in NZD cents, tax-inclusive, realistic NZ retail price points ($5.99-$89.99 range).
- **D-06:** Placeholder SVG images — simple colored SVGs with product initials or category icons. No external dependencies, loads instantly, always works. Stored as data URIs or static files in public/.

### Seed Mechanism
- **D-07:** SQL migration (032_demo_store_seed.sql) that INSERTs the demo store, categories, and products with fixed UUIDs. Runs automatically with `supabase db reset`. No auth user needed for the demo store.
- **D-08:** Idempotent via `INSERT ... ON CONFLICT DO NOTHING` or `IF NOT EXISTS` checks. Re-running the migration produces the same result with no duplicate records.
- **D-09:** No owner auth user for the demo store. The store exists in the DB for read-only queries by the demo POS route (Phase 33). No staff records needed.

### Store Identification
- **D-10:** Fixed UUID constant (`DEMO_STORE_ID`) hardcoded in both the migration and app code. Same pattern as `DEV_STORE_ID` in seed.ts. Zero-query identification at runtime.
- **D-11:** Separate UUID from DEV_STORE_ID (`00000000-0000-4000-a000-000000000001`). Use a distinct fixed UUID (e.g., `00000000-0000-4000-a000-000000000099`) so demo and dev stores coexist in local development.
- **D-12:** Export the constant from a shared location (e.g., `src/lib/constants.ts` or `src/lib/demo.ts`) so Phase 33 can import it for the `/demo/pos` route.

### Claude's Discretion
- Category names and product names/SKUs — Claude picks a realistic NZ retail assortment
- Exact price points per product — Claude picks realistic NZD tax-inclusive prices
- SVG placeholder design — Claude picks a clean approach (colored backgrounds with initials, category icons, etc.)
- Store address and receipt text — Claude picks a believable NZ address

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Database Schema
- `supabase/migrations/001_initial_schema.sql` -- stores, categories, products table definitions (core columns)
- `supabase/migrations/014_multi_tenant_schema.sql` -- stores.slug, logo_url, store_description, primary_color, is_active columns
- `supabase/migrations/028_customer_disable_settings.sql` -- stores.business_address, ird_gst_number, receipt_header, receipt_footer columns
- `supabase/migrations/024_service_product_type.sql` -- products.product_type column (physical/service)

### Existing Seed Pattern
- `supabase/seed.ts` -- existing dev seed script pattern (DEV_STORE_ID, product structure, category mapping)

### Requirements
- `.planning/REQUIREMENTS.md` -- DEMO-01 through DEMO-04 requirements for this phase

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `supabase/seed.ts`: Existing seed pattern with fixed UUID, category mapping, and product insertion. Good reference for structure.
- `supabase/migrations/`: 31 existing migrations — new migration will be `032_demo_store_seed.sql`

### Established Patterns
- Fixed UUID constants for deterministic seeding (DEV_STORE_ID pattern in seed.ts)
- Integer cents for all monetary values (price_cents column)
- store_id foreign key on all tenant tables (categories, products)
- Products have: name, sku, barcode, price_cents, stock_quantity, reorder_threshold, image_url, is_active, category_id, product_type
- Stores have: name, slug, logo_url, store_description, primary_color, is_active, business_address, ird_gst_number, receipt_header, receipt_footer, setup_wizard_dismissed, setup_completed_steps

### Integration Points
- `DEMO_STORE_ID` constant will be imported by Phase 33's `/demo/pos` route to query products
- Products queried via Supabase client with `store_id = DEMO_STORE_ID` filter
- The demo store needs `is_active = true` to pass any existing store validation logic
- store_plans row may be needed if any feature gating checks run on the demo store

</code_context>

<specifics>
## Specific Ideas

No specific requirements -- open to standard approaches for the generic retail product mix and SVG placeholders.

</specifics>

<deferred>
## Deferred Ideas

None -- discussion stayed within phase scope

</deferred>

---

*Phase: 32-demo-store-seed*
*Context gathered: 2026-04-06*
