# Phase 2: Product Catalog - Context

**Gathered:** 2026-04-01
**Status:** Ready for planning

<domain>
## Phase Boundary

The owner can build and maintain the store's product inventory through the admin UI. This includes CRUD for products and categories, image uploads to Supabase Storage, and CSV import with flexible column mapping. The admin product list is the central workspace — categories live as a sidebar, not a separate page.

</domain>

<decisions>
## Implementation Decisions

### Product List Layout
- **D-01:** Data table layout with sortable columns. Rows show: image thumbnail, name, SKU, price (NZD), stock quantity, category, active/inactive status.
- **D-02:** Search bar (searches name + SKU) with multiple filters: category dropdown, stock status (in stock / low / out), active/inactive toggle.
- **D-03:** Essential columns only — no barcode, reorder threshold, or dates in the default view. Keep it clean and scannable.

### Image Upload
- **D-04:** Single image per product. One hero image displayed in POS grid and online storefront. Multi-image deferred to v2.
- **D-05:** Click-to-browse file picker with image preview after selection. No drag-and-drop (iPad is primary device, drag-and-drop less useful on touch).
- **D-06:** Server-side auto-resize to max 800x800px on upload. Owner uploads any size, system handles optimization. Uses Supabase Storage.

### CSV Import
- **D-07:** Flexible column mapping UI. Owner uploads any CSV, then maps their columns to product fields via a visual column mapper (not fixed column names).
- **D-08:** Preview table with diff highlighting. Duplicates identified by SKU, showing existing vs new values. Owner confirms before committing.
- **D-09:** Import valid rows, skip invalid. Errors shown inline in preview (e.g., "row 42: price missing"). Invalid rows listed in a downloadable error report.
- **D-10:** Auto-create categories from CSV if category name doesn't exist yet.
- **D-11:** Price column accepts dollar values (e.g., $8.99) and converts to integer cents internally.

### Category Management
- **D-12:** Categories displayed as a sidebar panel on the product list page. Click category to filter products, edit/rename via icon or context action.
- **D-13:** Flat categories only (no nesting/subcategories). Single level sufficient for supplies store with ~10 categories.
- **D-14:** Drag-and-drop reordering of categories. Updates sort_order field in database.

### Claude's Discretion
- Product form layout and field arrangement (create/edit modal vs full page)
- Table pagination strategy (client-side for <500 products, server-side if needed)
- Image placeholder/fallback when no image uploaded
- CSV parsing library choice
- Column mapper UI component approach
- Drag-and-drop library choice for category reordering

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Design System
- `DESIGN.md` — Full design system (navy #1E293B + amber #E67E22, Satoshi + DM Sans typography, spacing scale, POS touch targets)

### Schemas & Types
- `src/schemas/product.ts` — Existing Zod schemas (CreateProductSchema, UpdateProductSchema) with price_cents as integer
- `src/types/database.ts` — Database types for products, categories tables (columns, relationships)

### Project Context
- `.planning/PROJECT.md` — Project vision, constraints, key decisions
- `.planning/REQUIREMENTS.md` — PROD-01 through PROD-06 requirements for this phase
- `.planning/phases/01-foundation/01-CONTEXT.md` — Phase 1 decisions (Supabase setup, auth patterns, GST module)

### Database
- `supabase/migrations/001_initial_schema.sql` — Products and categories table definitions

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/schemas/product.ts` — CreateProductSchema and UpdateProductSchema already defined with Zod v4
- `src/lib/supabase/server.ts` — Server-side Supabase client creation
- `src/lib/supabase/client.ts` — Browser-side Supabase client creation
- `src/lib/supabase/admin.ts` — Admin client (service role key, bypasses RLS)
- `src/lib/money.ts` — Money formatting utilities (cents to display)
- `src/actions/auth/` — Established Server Action pattern with Zod validation

### Established Patterns
- Server Actions with Zod validation (every action validates inputs with z.safeParse())
- Supabase client via `@supabase/ssr` for App Router cookie handling
- Tailwind v4 CSS-native config with @theme block in globals.css
- Route groups: `(admin)`, `(pos)`, `(store)` — product catalog goes in `(admin)`
- Money stored as integer cents, display formatting via money.ts

### Integration Points
- `src/app/(admin)/layout.tsx` — Admin layout wrapper (currently minimal, needs nav)
- Products table has `store_id` FK — all queries must scope by store_id via RLS
- Categories table has `sort_order` — used for drag-and-drop reordering
- Supabase Storage — product images uploaded here, URL stored in `image_url` column

</code_context>

<specifics>
## Specific Ideas

- Product list is the primary admin screen — should feel like the "home base" for inventory management
- Category sidebar on the product list keeps everything on one screen (no navigation away)
- CSV column mapper enables importing from any supplier spreadsheet format, not just a fixed template
- Server-side image resize keeps uploads fast and storage efficient without requiring owner to pre-process images

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-product-catalog*
*Context gathered: 2026-04-01*
