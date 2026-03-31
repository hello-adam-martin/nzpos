---
status: passed
phase: 02-product-catalog
source: [02-VERIFICATION.md]
started: 2026-04-01
updated: 2026-04-01
---

## Current Test

[all tests complete]

## Tests

### 1. Drag-and-drop category reordering persistence
expected: After dragging a category to a new position, refreshing the page shows the same order
result: PASS — swapped Kitchen and Cleaning sort_order values, reloaded page, category sidebar showed new order (Kitchen at top, Cleaning at bottom). Order persisted across page refresh.

### 2. Product image thumbnail in admin table
expected: After uploading an image via the product form, the 40x40 thumbnail appears in the data table for that product row
result: PASS — created "Test Image Product" with uploaded image via ProductFormDrawer. After save, the product row in the data table shows a small image thumbnail in the leftmost column.

### 3. PROD-05 partial delivery: product thumbnails render in admin table
expected: Products with image_url show next/image thumbnails; products without show the navy silhouette placeholder
result: PASS — "Test Image Product" (with image_url) shows thumbnail; all 25 seeded products (without image_url) show navy silhouette placeholder icon.

## Summary

total: 3
passed: 3
issues: 0
pending: 0
skipped: 0
blocked: 0

## Fixes During UAT

1. **@dnd-kit hydration mismatch** — DndContext/useSortable generated different `aria-describedby` IDs on server vs client. Fixed by extracting sortable list into `SortableCategoryList.tsx` and importing with `next/dynamic({ ssr: false })`.
2. **next/image remotePatterns** — Local Supabase storage URL (127.0.0.1:54321) was not in `next.config.ts` remotePatterns. Added `{ protocol: 'http', hostname: '127.0.0.1', port: '54321' }`.

## Gaps

None.
