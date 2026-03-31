---
phase: 02-product-catalog
plan: 02
subsystem: api
tags: [server-actions, zod, supabase, sharp, image-upload, products]

requires:
  - phase: 01-foundation
    provides: Supabase server client, database types, Zod schema for products, money utilities

provides:
  - createProduct Server Action (Zod validated, store_id from JWT, SKU uniqueness handling)
  - updateProduct Server Action (partial field update)
  - deactivateProduct Server Action (soft delete via is_active=false)
  - parsePriceToCents utility (dollar string to integer cents)
  - POST /api/products/image Route Handler (sharp resize to 800x800 WebP, Supabase Storage upload)

affects: [03-product-catalog, 04-product-catalog, pos-checkout, online-storefront]

tech-stack:
  added: []
  patterns:
    - Server Action pattern: 'use server', FormData extraction, Zod safeParse, revalidatePath('/admin/products')
    - Image upload pattern: sharp resize fit:inside withoutEnlargement, WebP output, UUID filename, Supabase Storage
    - Price parsing: parsePriceToCents handles dollar signs, commas, whitespace, returns null for invalid/negative

key-files:
  created:
    - src/actions/products/createProduct.ts
    - src/actions/products/updateProduct.ts
    - src/actions/products/deactivateProduct.ts
    - src/app/api/products/image/route.ts
  modified:
    - src/lib/money.ts
    - src/lib/money.test.ts

key-decisions:
  - "price_dollars form field (string) converted via parsePriceToCents; price_cents (int) accepted directly — supports both form submission patterns"
  - "SKU unique constraint mapped from PostgreSQL error code 23505 to fieldErrors.sku for inline form display"
  - "Image upload returns WebP regardless of input format — consistent CDN storage, optimal file size"

patterns-established:
  - "Server Action auth check: supabase.auth.getUser() then user?.app_metadata?.store_id — return { error: { _form: [...] } } if missing"
  - "DB error handling: check error.code === '23505' for unique violations, return field-specific error"
  - "Image route handler: validate type + size before sharp processing to fail fast"

requirements-completed: [PROD-01, PROD-02, PROD-03]

duration: 12min
completed: 2026-04-01
---

# Phase 02 Plan 02: Product CRUD Server Actions and Image Upload Summary

**Product create/update/deactivate Server Actions with Zod validation and SKU uniqueness, plus sharp-powered 800x800 WebP image upload to Supabase Storage**

## Performance

- **Duration:** 12 min
- **Started:** 2026-04-01T10:53:45Z
- **Completed:** 2026-04-01T10:56:10Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Three product Server Actions (create, update, deactivate) with Zod validation, store_id from JWT app_metadata, and SKU uniqueness error mapping
- parsePriceToCents utility converts "$8.99" / "8.99" / "$1,000.00" to integer cents, returns null for invalid/negative input — 7 vitest test cases all passing
- POST /api/products/image route handler: validates type (JPEG/PNG/WebP) and size (max 10MB), resizes with sharp to max 800x800 (fit:inside, no upscaling), outputs WebP quality 85, uploads to Supabase Storage, returns public URL

## Task Commits

1. **Task 1: Product CRUD Server Actions + parsePriceToCents tests** - `9e1e07a` (feat)
2. **Task 2: Image upload Route Handler with sharp resize** - `2a7cf32` (feat)

**Plan metadata:** (to be committed with this file)

## Files Created/Modified
- `src/actions/products/createProduct.ts` - Create product Server Action with Zod + store_id + SKU uniqueness
- `src/actions/products/updateProduct.ts` - Update product Server Action with partial fields via UpdateProductSchema
- `src/actions/products/deactivateProduct.ts` - Soft-delete Server Action (is_active=false) with UUID validation
- `src/app/api/products/image/route.ts` - Image upload route: sharp resize, WebP conversion, Supabase Storage
- `src/lib/money.ts` - Added parsePriceToCents alongside existing formatNZD
- `src/lib/money.test.ts` - Added parsePriceToCents describe block (7 test cases)

## Decisions Made
- `price_dollars` form field (string input like "8.99") takes priority over `price_cents` int — supports HTML form submission without JavaScript
- SKU uniqueness error (PostgreSQL 23505) mapped to `fieldErrors.sku` for inline form feedback
- Image output always WebP regardless of input — consistent storage format, optimal file size at quality 85

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required. Supabase Storage bucket `product-images` must be created with public access before image upload is functional (this is a DB migration/setup step not code).

## Next Phase Readiness
- Plan 03 (product list page) can now import `createProduct`, `updateProduct`, `deactivateProduct` directly
- Plan 04 (CSV import) can use the same Server Actions for bulk product creation
- Image upload at `/api/products/image` is ready for the product form UI
- parsePriceToCents ready for any form that accepts dollar strings (CSV import, product form)

---
*Phase: 02-product-catalog*
*Completed: 2026-04-01*

## Self-Check: PASSED

- FOUND: src/actions/products/createProduct.ts
- FOUND: src/actions/products/updateProduct.ts
- FOUND: src/actions/products/deactivateProduct.ts
- FOUND: src/app/api/products/image/route.ts
- FOUND: src/lib/money.ts
- FOUND: .planning/phases/02-product-catalog/02-02-SUMMARY.md
- FOUND: commit 9e1e07a (Task 1)
- FOUND: commit 2a7cf32 (Task 2)
