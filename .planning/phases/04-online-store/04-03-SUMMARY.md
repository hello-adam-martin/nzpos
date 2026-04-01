---
phase: 04-online-store
plan: "03"
subsystem: storefront-browse
tags: [storefront, server-components, seo, cart, product-grid]
dependency_graph:
  requires: ["04-01", "04-02"]
  provides: ["store-listing-page", "product-detail-page", "store-components"]
  affects: ["04-04"]
tech_stack:
  added: []
  patterns:
    - "Server Component product pages with force-dynamic for fresh stock data"
    - "Client boundary isolation: AddToCartButton as co-located client component"
    - "URL-based category filtering via searchParams on Server Component"
    - "formatNZD (not formatCents) — actual export name in src/lib/money.ts"
key_files:
  created:
    - src/app/(store)/page.tsx
    - src/app/(store)/products/[slug]/page.tsx
    - src/components/store/StoreProductCard.tsx
    - src/components/store/StoreProductGrid.tsx
    - src/components/store/CategoryPillBar.tsx
    - src/components/store/SoldOutBadge.tsx
    - src/components/store/StockNotice.tsx
    - src/components/store/AddToCartButton.tsx
  modified: []
decisions:
  - "Used formatNZD (actual money.ts export) instead of formatCents as referenced in plan"
  - "AddToCartButton extracted as separate file to maintain server/client component boundary"
metrics:
  duration: "~6 minutes"
  completed: "2026-04-01T07:26:22Z"
  tasks_completed: 2
  files_created: 8
  files_modified: 0
---

# Phase 04 Plan 03: Store Product Listing and Detail Pages Summary

Server-rendered storefront product browsing with category filtering, search, and client-side cart integration via isolated client component boundaries.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Store listing page with category pills, search, and product grid | 3b83ba2 | src/app/(store)/page.tsx, StoreProductCard.tsx, StoreProductGrid.tsx, CategoryPillBar.tsx, SoldOutBadge.tsx, StockNotice.tsx |
| 2 | Product detail page with SSR metadata for SEO | 6f32bc3 | src/app/(store)/products/[slug]/page.tsx, AddToCartButton.tsx |

## What Was Built

### Store Listing Page (`src/app/(store)/page.tsx`)
- Server Component with `force-dynamic` for fresh inventory data
- Accepts `searchParams` as `Promise<{category?, q?}>` per Next.js 16 async pattern
- Fetches categories and products from Supabase with `.eq('store_id', STORE_ID)` + `.eq('is_active', true)`
- Category filter: `.eq('category_id', category)` when category param present
- Search filter: `.or('name.ilike.%q%,sku.ilike.%q%')` when q param present

### Product Detail Page (`src/app/(store)/products/[slug]/page.tsx`)
- Server Component with `generateMetadata` for SEO title + Open Graph
- `notFound()` for missing/inactive products
- Responsive 2-column layout: single column mobile, 50/50 split desktop
- Price displayed in amber using `formatNZD`
- Stock status: inline sold out badge and low stock notice

### StoreProductCard (`src/components/store/StoreProductCard.tsx`)
- Client Component — connects to CartContext via `useCart()`
- `ADD_ITEM` dispatch → `OPEN_DRAWER` dispatch on Add to Cart click
- `aria-disabled` + `opacity-50 cursor-not-allowed` when sold out
- Active press feedback: `active:scale-[0.97] transition-transform duration-100`

### AddToCartButton (`src/components/store/AddToCartButton.tsx`)
- Isolated Client Component for product detail page
- Shows "Sold Out" / "Add Another" / "Add to Cart" based on state
- Dispatches `ADD_ITEM` + `OPEN_DRAWER` to CartContext

### CategoryPillBar (`src/components/store/CategoryPillBar.tsx`)
- Client Component — uses `useRouter()` for URL-based navigation
- `role="radiogroup"` + `role="radio"` + `aria-checked` per accessibility spec
- Active pill: `bg-navy text-white`, inactive: `border border-border`

### StoreProductGrid (`src/components/store/StoreProductGrid.tsx`)
- Server Component — renders `StoreProductCard` for each product
- Responsive grid: `grid-cols-2 gap-2 md:grid-cols-3 md:gap-4 lg:grid-cols-4 lg:gap-4`
- Empty states: "No products in this category" / "No products match your search..."

### SoldOutBadge / StockNotice
- Server Components (no 'use client')
- SoldOutBadge: absolute positioned red overlay with "Sold Out" copy
- StockNotice: amber warning "Only {n} left" when stock <= reorder_threshold

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Used `formatNZD` instead of `formatCents`**
- **Found during:** Task 1
- **Issue:** Plan referenced `formatCents` from `src/lib/money.ts`, but the actual exported function is `formatNZD`. No `formatCents` export exists.
- **Fix:** Used `formatNZD` throughout all components where price formatting is needed.
- **Files modified:** StoreProductCard.tsx, products/[slug]/page.tsx
- **Commit:** 3b83ba2, 6f32bc3

## Known Stubs

- Product description on detail page: static "Contact us for more details." — intentional placeholder per plan (products table has no description column in v1). No future plan currently resolves this; will require schema addition in a later phase.

## Self-Check: PASSED

Files verified:
- src/app/(store)/page.tsx — exists
- src/app/(store)/products/[slug]/page.tsx — exists
- src/components/store/StoreProductCard.tsx — exists
- src/components/store/StoreProductGrid.tsx — exists
- src/components/store/CategoryPillBar.tsx — exists
- src/components/store/SoldOutBadge.tsx — exists
- src/components/store/StockNotice.tsx — exists
- src/components/store/AddToCartButton.tsx — exists

Commits verified: 3b83ba2, 6f32bc3
TypeScript: no new errors (2 pre-existing errors in completeSale.ts, out of scope)
