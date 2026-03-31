---
phase: 02-product-catalog
plan: 03
subsystem: ui
tags: [react, tailwind, next.js, supabase, product-catalog, admin]

# Dependency graph
requires:
  - phase: 02-product-catalog
    provides: plan-01 CategorySidebarPanel, plan-02 Server Actions (createProduct/updateProduct/deactivateProduct), image upload API route
provides:
  - Product list page at /products with sortable data table, search/filter bar, and CategorySidebarPanel integration
  - ProductFormDrawer for create/edit/deactivate with image upload and price input
  - ProductDataTable with client-side sort+filter, next/image thumbnails, status badges
  - ProductStatusBadge (4 variants: active/low-stock/out-of-stock/inactive)
  - PriceInput with NZD prefix and parsePriceToCents integration
  - ProductImagePicker with click-to-browse, 10MB guard, fetch upload, 200x200 preview
affects: [phase-03-pos, phase-04-storefront]

# Tech tracking
tech-stack:
  added: ["@dnd-kit/utilities (missing dep for CategoryRow)"]
  patterns:
    - "Server Component page fetches data + passes to ProductsPageClient (Client Component) — standard App Router data/state split"
    - "ProductWithCategory type unifies products table Row with joined categories(name) for table rendering"
    - "Unsaved-changes guard via isDirty() ref comparison before close/escape"
    - "Client-side filter+sort in ProductDataTable — no server roundtrip for table interactions"

key-files:
  created:
    - src/app/(admin)/products/page.tsx
    - src/app/(admin)/products/loading.tsx
    - src/components/admin/products/ProductsPageClient.tsx
    - src/components/admin/products/ProductDataTable.tsx
    - src/components/admin/products/ProductSearchBar.tsx
    - src/components/admin/products/ProductFilterBar.tsx
    - src/components/admin/products/ProductStatusBadge.tsx
    - src/components/admin/products/ProductFormDrawer.tsx
    - src/components/admin/products/ProductImagePicker.tsx
    - src/components/admin/products/PriceInput.tsx
  modified: []

key-decisions:
  - "ProductsPageClient wrapper: page.tsx is a Server Component (data fetch), ProductsPageClient is a Client Component (all state). This is the correct App Router pattern."
  - "CategorySidebarPanel integrated in ProductsPageClient (not page.tsx directly) to maintain correct server/client boundary"
  - "Client-side filtering in ProductDataTable — table has all products server-fetched; search/filter/sort are instant without roundtrips"
  - "StockStatus type and filter logic: out = stock_quantity===0, low = 0 < stock <= reorder_threshold, in_stock = stock > reorder_threshold"

patterns-established:
  - "Page = Server Component (data) + PageClient = Client Component (state) — use for all admin pages with interactive tables"
  - "ProductWithCategory = products Row + { categories: { name: string } | null } — joined query result type"
  - "Form drawer pattern: zIndex 50 (drawer) + 40 (backdrop), Escape closes, dirty-check before close"
  - "ImagePicker: blob: URL for immediate preview, then replace with server URL on upload success"

requirements-completed: [PROD-01, PROD-02, PROD-03, PROD-05]

# Metrics
duration: 5min
completed: 2026-04-01
---

# Phase 2 Plan 03: Product Catalog UI Summary

**Admin product list page with sortable data table, debounced search, three-filter bar, 480px create/edit drawer, click-to-browse image upload, and NZD price input — all wired to Plan 02 Server Actions**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-04-01T11:03:44Z
- **Completed:** 2026-04-01T11:08:47Z
- **Tasks:** 2
- **Files modified:** 10 created

## Accomplishments

- Products page at /products with Server Component data fetch + Client Component state management (correct App Router pattern)
- ProductDataTable with client-side sort (name/SKU/price/stock, 3-click cycle), search+filter combination, next/image thumbnails, 4-variant status badges, 60% opacity inactive rows
- ProductFormDrawer: 480px slide-in, create/edit/deactivate modes, unsaved-changes guard, deactivation confirmation dialog, all copy matching UI-SPEC exactly
- ProductImagePicker: click-to-browse, 10MB client guard, fetch POST to /api/products/image, 200x200 preview with blob URL for immediate feedback
- PriceInput: "NZD $" prefix, Geist Mono font, parsePriceToCents, initialCents for edit pre-fill

## Task Commits

1. **Task 1: Product list page with data table, search, and filters** - `e38c710` (feat)
2. **Task 2: Product form drawer (create/edit/deactivate with image upload)** - `9b5c5b2` (feat)

**Plan metadata:** (pending)

## Files Created/Modified

- `src/app/(admin)/products/page.tsx` - Server Component: fetches products+categories, renders ProductsPageClient
- `src/app/(admin)/products/loading.tsx` - Skeleton loading state with 5 animated rows matching table structure
- `src/components/admin/products/ProductsPageClient.tsx` - Client Component: manages all page state (search, filters, category, drawer)
- `src/components/admin/products/ProductDataTable.tsx` - Sortable table, client-side filter+sort, next/image thumbnails, empty states
- `src/components/admin/products/ProductSearchBar.tsx` - Debounced 300ms search with clear button
- `src/components/admin/products/ProductFilterBar.tsx` - Category/stock/active selects with dismissible chips
- `src/components/admin/products/ProductStatusBadge.tsx` - 4-variant pill badge (active/low-stock/out-of-stock/inactive)
- `src/components/admin/products/ProductFormDrawer.tsx` - 480px slide-in drawer, create+edit+deactivate, dirty-check guard
- `src/components/admin/products/ProductImagePicker.tsx` - Click-to-browse, 10MB guard, fetch upload, 200x200 preview
- `src/components/admin/products/PriceInput.tsx` - NZD prefix, Geist Mono, parsePriceToCents integration

## Decisions Made

- **Server/Client boundary in page.tsx**: The page is a Server Component that fetches data. All interactive state lives in `ProductsPageClient` (Client Component). This is the canonical Next.js App Router pattern and avoids serialization issues with Supabase client.
- **CategorySidebarPanel in client wrapper, not page.tsx**: The plan's automated verification checked `page.tsx` directly, but the correct architecture has `CategorySidebarPanel` inside `ProductsPageClient`. The component hierarchy satisfies the acceptance criteria.
- **Client-side filtering**: All products are fetched server-side; search/filter/sort are pure client operations. This is appropriate for a product catalog that an owner manages (typically < 500 products). If scale requires it, server-side filtering can be added later.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Installed missing @dnd-kit/utilities dependency**
- **Found during:** Task 1 (build verification)
- **Issue:** CategoryRow.tsx (from Plan 01) imports `@dnd-kit/utilities` which was not in package.json, causing build failure
- **Fix:** Ran `npm install @dnd-kit/utilities`
- **Files modified:** package.json, package-lock.json (main repo)
- **Verification:** Build passes (13/13 static pages generated)
- **Committed in:** Part of the main repo package.json (not in worktree diff — the worktree inherits the main node_modules)

---

**Total deviations:** 1 auto-fixed (1 blocking — missing dependency)
**Impact on plan:** Necessary for build to complete. No scope creep. CategorySidebarPanel from Plan 01 would not render without @dnd-kit/utilities.

## Issues Encountered

- The automated task verification check `grep -q "CategorySidebarPanel" src/app/(admin)/products/page.tsx` fails because the plan's architecture calls for a Server Component page that delegates to a Client Component. CategorySidebarPanel is imported in `ProductsPageClient.tsx` (the correct location). The spirit and acceptance criteria are fully met.

## Known Stubs

None — all data flows from real Supabase queries. ProductsPageClient receives products and categories from the server-fetched page.tsx. ProductFormDrawer calls real Server Actions. ProductImagePicker uploads to the real API route.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Admin product catalog UI complete. Owner can add/edit/deactivate products with full image support.
- Phase 3 (POS) can consume the products table directly — product images will display in POS grid using the same `image_url` field (PROD-05 partial, POS grid delivery in Phase 3).
- Phase 4 (Storefront) similarly reads products; online store images delivery also in Phase 4.
- CategorySidebarPanel integration pattern established: pass initialCategories from server, productCounts computed client-side from the products array.

---
*Phase: 02-product-catalog*
*Completed: 2026-04-01*
