---
phase: 18-code-quality-test-coverage
plan: "03"
subsystem: code-quality
tags: [dead-code, knip, cleanup, dependencies]
dependency_graph:
  requires: [18-01]
  provides: [clean-knip-run, no-unused-dependencies, no-orphaned-files]
  affects: [all-subsequent-plans]
tech_stack:
  added: ["knip"]
  patterns: [knip-nextjs-entry-points, ignoreDependencies-css-imports]
key_files:
  created:
    - knip.json
  modified:
    - package.json
    - src/lib/signupRateLimit.ts
    - src/lib/slugValidation.ts
    - src/lib/xero/sync.ts
    - src/schemas/order.ts
    - src/schemas/staff.ts
    - src/schemas/category.ts
    - src/schemas/product.ts
    - src/schemas/refund.ts
    - src/schemas/xero.ts
    - src/components/admin/billing/AddOnCard.tsx
    - src/config/addons.ts
    - src/contexts/CartContext.tsx
    - src/lib/receipt.ts
    - src/lib/requireFeature.ts
decisions:
  - Add tailwindcss and postcss to ignoreDependencies — tailwindcss is used via CSS @import directive (not a JS import), postcss is pulled in as peer dep of @tailwindcss/postcss
  - Remove export from schema types (CreateCategoryInput etc) rather than deleting — types are valid for internal documentation, just unused as public API
  - Add scripts/**/*.ts as entry points — generate-icons.ts is a run-once CLI script, not dead code
  - Configuration hints (redundant ignore entries) resolved by cleaning knip.json rather than keeping them as noise
metrics:
  duration_minutes: 9
  completed_date: "2026-04-04"
  tasks_completed: 1
  files_modified: 15
---

# Phase 18 Plan 03: Dead Code Removal with knip Summary

knip installed, configured, and run clean — 6 orphaned files deleted, 19 unused type exports de-exported, 7 unused value exports internalized, 2 unused npm dependencies uninstalled. Build and all 415 tests still pass.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Configure and run knip, remove all dead code | aa3ea2e | knip.json, package.json, 6 deleted files, 15 modified files |

## What Was Built

### knip Configuration

`knip.json` created at project root with:
- Entry points: Next.js App Router file conventions, all Server Actions, Supabase client files, test files, scripts
- Project scope: `src/**/*.{ts,tsx}` and `scripts/**/*.ts`
- Ignore: `src/types/**` (type-only definitions, excluded by plan)
- `ignoreDependencies`: `@types/*`, `sharp`, `tailwindcss`, `postcss` — these are used at runtime/CSS-level, not JS imports

### Unused Files Deleted (6)

| File | Reason |
|------|--------|
| `src/components/admin/orders/RefundConfirmationStep.tsx` | Orphaned — no component imports it |
| `src/components/pos/SaleSummaryScreen.tsx` | Replaced by screen receipt (comment in POSClientShell confirms: "replaces SaleSummaryScreen") |
| `src/components/pos/StockBadge.tsx` | Orphaned — not imported anywhere |
| `src/lib/slugify.ts` | Duplicate — identical function exists in `src/lib/slugValidation.ts`; SignupForm imports from slugValidation |
| `src/schemas/index.ts` | Re-export barrel — nothing imports from `@/schemas` (consumers import individual schema files directly) |
| `src/schemas/store.ts` | Unused — CreateStoreSchema/UpdateStoreSchema not imported anywhere |

### Unused Dependencies Removed (2)

| Package | Reason |
|---------|--------|
| `@stripe/stripe-js` | App uses Stripe Checkout hosted page — `loadStripe` from stripe-js never called in source |
| `react-email` | App uses `@react-email/components` and `@react-email/render` — the `react-email` CLI wrapper was never imported |

### Unused Exports Internalized (26 total)

**Value exports (export keyword removed, values still used internally):**
- `WINDOW_MS`, `MAX_ATTEMPTS` in `signupRateLimit.ts`
- `SLUG_REGEX` in `slugValidation.ts`
- `sleep` in `xero/sync.ts`
- `OrderItemSchema` in `schemas/order.ts`
- `CreateStaffSchema`, `UpdateStaffSchema` in `schemas/staff.ts`

**Type exports (export keyword removed, types still valid for internal use):**
- `AddOnCardProps` in `AddOnCard.tsx`
- `FeatureFlags` in `config/addons.ts`
- `StoreCartState`, `StoreCartAction` in `CartContext.tsx`
- `BuildReceiptDataParams` in `lib/receipt.ts`
- `GatedFeature` in `lib/requireFeature.ts`
- `CreateCategoryInput`, `UpdateCategoryInput`, `ReorderCategoriesInput` in `schemas/category.ts`
- `CreateOrderInput`, `OrderItemInput`, `CreatePromoCodeInput` in `schemas/order.ts`
- `CreateProductInput`, `UpdateProductInput` in `schemas/product.ts`
- `RefundInput`, `PartialRefundInput` in `schemas/refund.ts`
- `CreateStaffInput`, `StaffPinLoginInput` in `schemas/staff.ts`
- `XeroAccountCodesInput` in `schemas/xero.ts`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Config] tailwindcss flagged as unused devDependency**
- **Found during:** Task 1 (first knip run)
- **Issue:** `tailwindcss` is imported in `globals.css` via `@import "tailwindcss"` CSS directive — knip only analyzes JS/TS imports, not CSS. It's a legitimate runtime dependency.
- **Fix:** Added `tailwindcss` to `ignoreDependencies` in knip.json
- **Files modified:** `knip.json`
- **Commit:** aa3ea2e

**2. [Rule 2 - Config] postcss flagged as unlisted dependency**
- **Found during:** Task 1 (first knip run)
- **Issue:** `postcss` appears in `postcss.config.mjs` as a plugin key but isn't listed in package.json (it's a transitive dep of `@tailwindcss/postcss`). Knip flagged it as unlisted.
- **Fix:** Added `postcss` to `ignoreDependencies` — it's a peer dep automatically installed, not a direct import.
- **Files modified:** `knip.json`
- **Commit:** aa3ea2e

**3. [Rule 2 - Config] scripts/generate-icons.ts flagged as unused file**
- **Found during:** Task 1 (second knip run after initial cleanup)
- **Issue:** `generate-icons.ts` is a one-off CLI script in `scripts/`, not a library. Needs to be an entry point, not a project file.
- **Fix:** Added `scripts/**/*.ts` to the `entry` array in knip.json
- **Files modified:** `knip.json`
- **Commit:** aa3ea2e

**4. [Rule 2 - Config] Redundant ignore entries removed**
- **Found during:** Task 1 (third knip run)
- **Issue:** `src/emails/**`, `tests/e2e/**`, and `server-only` were generating configuration hints (knip treats these as redundant ignores). The emails dir isn't in the project scan scope. tests/e2e is outside `src/`. server-only is auto-recognized.
- **Fix:** Removed these from the ignore/ignoreDependencies arrays
- **Files modified:** `knip.json`
- **Commit:** aa3ea2e

## Known Stubs

None — this plan removes code, introduces no new stubs.

## Self-Check

### Files created:
- `knip.json` exists at project root
- `package.json` no longer contains `@stripe/stripe-js` or `react-email`
- `package.json` devDependencies includes `"knip"`

### Commits:
- `aa3ea2e` — feat(18-03): configure knip and remove all dead code

### Verification:
- `npx knip` exits 0 with no output (clean)
- `npm run test` passes: 415 tests, 0 failures
- `npm run build` succeeds: all routes compiled
- `npx tsc --noEmit` exits 0 with no output

## Self-Check: PASSED
