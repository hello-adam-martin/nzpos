---
phase: 32-demo-store-seed
plan: 01
subsystem: database
tags: [sql, migration, seed, supabase, postgres, typescript, svg]

# Dependency graph
requires: []
provides:
  - "Demo store 'Aroha Home & Gift' seeded in DB with fixed UUID 00000000-0000-4000-a000-000000000099"
  - "5 categories and 20 NZD-priced products across Candles, Homewares, Prints, Kitchen, Jewellery"
  - "DEMO_STORE_ID and DEV_STORE_ID constants in src/lib/constants.ts"
  - "6 SVG placeholder images in public/demo/"
affects: [33-demo-pos-route]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Fixed UUID seed pattern: synthetic auth.users row + ON CONFLICT DO NOTHING on all INSERTs"
    - "DEMO_STORE_ID constant in src/lib/constants.ts for zero-query identification at runtime"

key-files:
  created:
    - supabase/migrations/032_demo_store_seed.sql
    - src/lib/constants.ts
    - public/demo/store-logo.svg
    - public/demo/placeholder-candles.svg
    - public/demo/placeholder-homewares.svg
    - public/demo/placeholder-prints.svg
    - public/demo/placeholder-kitchen.svg
    - public/demo/placeholder-jewellery.svg
  modified: []

key-decisions:
  - "Synthetic auth.users row with same UUID as the store satisfies NOT NULL FK constraint without a real login account"
  - "setup_completed_steps is INTEGER 0 (not JSONB) — confirmed from migration 018"
  - "All 20 products share 5 category SVG placeholders rather than product-specific images"

patterns-established:
  - "Pattern: Fixed UUID seed with ON CONFLICT DO NOTHING — use 00000000-0000-4000-a/b/c000-... prefix convention"
  - "Pattern: DEMO_STORE_ID + DEV_STORE_ID exported from src/lib/constants.ts — import for any demo or dev route"

requirements-completed: [DEMO-01, DEMO-02, DEMO-03, DEMO-04]

# Metrics
duration: 2min
completed: 2026-04-06
---

# Phase 32 Plan 01: Demo Store Seed Summary

**Idempotent SQL migration seeding 'Aroha Home & Gift' demo store with synthetic auth user, 5 categories, 20 NZD-priced products, plus DEMO_STORE_ID TypeScript constant and 6 SVG placeholder images**

## Performance

- **Duration:** 2 min
- **Started:** 2026-04-06T08:45:49Z
- **Completed:** 2026-04-06T08:47:24Z
- **Tasks:** 2
- **Files modified:** 8 created

## Accomplishments
- Idempotent seed migration with synthetic auth user (satisfies owner_auth_id FK), Aroha Home & Gift store row, store_plans row, 5 categories, and 20 products — all with ON CONFLICT DO NOTHING
- src/lib/constants.ts exports DEMO_STORE_ID and DEV_STORE_ID for zero-query identification in Phase 33
- 6 SVG placeholder images in public/demo/ using design system colors (deep navy, amber) and distinct category colors

## Task Commits

Each task was committed atomically:

1. **Task 1: Create SQL migration and TypeScript constants** - `6a7eb3a` (feat)
2. **Task 2: Create SVG placeholder images** - `ca4970e` (feat)

**Plan metadata:** (docs commit below)

## Files Created/Modified
- `supabase/migrations/032_demo_store_seed.sql` - Idempotent seed migration: auth user, store, store_plans, 5 categories, 20 products
- `src/lib/constants.ts` - Exports DEMO_STORE_ID ('00000000-0000-4000-a000-000000000099') and DEV_STORE_ID
- `public/demo/store-logo.svg` - Deep navy #1E293B with AHG initials, 200x200
- `public/demo/placeholder-candles.svg` - Amber #E67E22 with letter C, 400x400
- `public/demo/placeholder-homewares.svg` - Deep navy #1E293B with letter H, 400x400
- `public/demo/placeholder-prints.svg` - Purple #7C3AED with letter P, 400x400
- `public/demo/placeholder-kitchen.svg` - Green #059669 with letter K, 400x400
- `public/demo/placeholder-jewellery.svg` - Red #DC2626 with letter J, 400x400

## Decisions Made
- setup_completed_steps uses INTEGER 0 (not JSONB) — confirmed from migration 018_setup_wizard.sql which adds it as `INTEGER NOT NULL DEFAULT 0`
- Synthetic auth user with the same UUID as the store (00000000-0000-4000-a000-000000000099) is the simplest approach to satisfy the FK constraint without a real login
- 5 category SVG placeholders shared across 20 products (not per-product images) per plan specification

## Deviations from Plan

None - plan executed exactly as written. One schema clarification: the plan skeleton showed `setup_completed_steps: '{}'::jsonb` but the actual column (migration 018) is `INTEGER NOT NULL DEFAULT 0`. Used `0` to match the real column type.

## Issues Encountered
- Plan specified `setup_completed_steps: '{}'::jsonb` but the column is `INTEGER NOT NULL DEFAULT 0` per migration 018_setup_wizard.sql. Used `0` (integer). This was a plan documentation error, not a deviation requiring rule application.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Demo store data ready in DB with DEMO_STORE_ID = '00000000-0000-4000-a000-000000000099'
- Phase 33 can import DEMO_STORE_ID from src/lib/constants.ts and query products using anon Supabase client (products_public_read RLS policy covers active products)
- SVG placeholder images served at /demo/ paths match the image_url values in the migration
- Note: categories RLS uses JWT claims — Phase 33 may need a public read policy on categories (flagged in research as Phase 33 concern)

## Self-Check: PASSED

- FOUND: supabase/migrations/032_demo_store_seed.sql
- FOUND: src/lib/constants.ts
- FOUND: public/demo/store-logo.svg (and 5 other SVGs)
- FOUND: commit 6a7eb3a (feat: migration + constants)
- FOUND: commit ca4970e (feat: SVG placeholders)

---
*Phase: 32-demo-store-seed*
*Completed: 2026-04-06*
