---
phase: 04-online-store
plan: "04"
subsystem: ui
tags: [promo-codes, server-actions, rate-limiting, admin, supabase, zod]

requires:
  - phase: 04-01
    provides: rateLimit.ts (created here as it was missing), createSupabaseAdminClient, DB promo_codes table schema

provides:
  - createPromoCode Server Action (Zod-validated, 23505 duplicate handling)
  - validatePromoCode Server Action (rate limiting 10/min/IP, 5 error types)
  - src/lib/rateLimit.ts in-memory per-IP rate limiter
  - Admin promo codes page at /admin/promos
  - PromoForm client component with all D-16 fields
  - PromoList server component with Active/Expired/Maxed Out status badges

affects: [04-05, checkout, storefront]

tech-stack:
  added: []
  patterns:
    - "validatePromoCode uses createSupabaseAdminClient (not auth-dependent) for public storefront actions"
    - "Rate limiter is in-memory per-process — acceptable for single-replica Vercel, note for multi-replica"
    - "datetime-local input values converted to ISO 8601 via new Date().toISOString() before Zod .datetime() validation"

key-files:
  created:
    - src/lib/rateLimit.ts
    - src/actions/promos/createPromoCode.ts
    - src/actions/promos/validatePromoCode.ts
    - src/app/admin/promos/page.tsx
    - src/components/admin/PromoForm.tsx
    - src/components/admin/PromoList.tsx
  modified:
    - src/types/database.ts
    - src/components/admin/AdminSidebar.tsx

key-decisions:
  - "validatePromoCode uses admin client (createSupabaseAdminClient) not server client — storefront has no auth session"
  - "rateLimit.ts created in this plan (was missing, referenced by plan 04-01 but not implemented)"
  - "database.ts promo_codes types corrected: 'percent'->'percentage', 'use_count'->'current_uses', added min_order_cents"
  - "datetime-local values converted via new Date().toISOString() to satisfy Zod .datetime() UTC requirement"

patterns-established:
  - "Public Server Actions (no auth): use createSupabaseAdminClient, rate-limit via checkRateLimit"
  - "Owner-only Server Actions: use createSupabaseServerClient + app_metadata.store_id check"

requirements-completed:
  - DISC-01
  - DISC-02

duration: 3min
completed: 2026-04-01
---

# Phase 04 Plan 04: Promo Code Management Summary

**Promo code CRUD (createPromoCode + validatePromoCode Server Actions) with in-memory rate limiting and admin UI showing Active/Expired/Maxed Out status**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-04-01T07:24:30Z
- **Completed:** 2026-04-01T07:27:42Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments

- `createPromoCode` Server Action with Zod validation, unique constraint (23505) duplicate handling, and `revalidatePath`
- `validatePromoCode` public Server Action with 10/min per-IP rate limiting, 5 specific error types (rate_limited, invalid, expired, max_uses, min_order), and clamped discount calculation
- Admin page at `/admin/promos` with `PromoForm` (all D-16 fields) and `PromoList` (status badges for Active/Expired/Maxed Out)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create promo code Server Actions (create + validate with rate limiting)** - `5d33e01` (feat)
2. **Task 2: Create admin promos page with form and list** - `c6fd459` (feat)

## Files Created/Modified

- `src/lib/rateLimit.ts` - In-memory sliding window rate limiter (60s per IP)
- `src/actions/promos/createPromoCode.ts` - Server Action: auth check, Zod validation, DB insert, duplicate handling
- `src/actions/promos/validatePromoCode.ts` - Public Server Action: rate limit, expiry/max_uses/min_order checks, discount calc
- `src/app/admin/promos/page.tsx` - Admin promo management page (Server Component, force-dynamic)
- `src/components/admin/PromoForm.tsx` - Client Component with useActionState, all promo fields
- `src/components/admin/PromoList.tsx` - Server Component, table with status badges
- `src/types/database.ts` - Fixed promo_codes Row types to match SQL migration
- `src/components/admin/AdminSidebar.tsx` - Added Promos nav link

## Decisions Made

- `validatePromoCode` uses `createSupabaseAdminClient` because storefront customers have no Supabase Auth session — auth-dependent client would return no data
- `rateLimit.ts` created here (was missing from plan 04-01 deliverables but referenced as existing)
- `datetime-local` inputs produce `YYYY-MM-DDTHH:mm` without timezone — converted via `new Date().toISOString()` for Zod `.datetime()` compliance

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Created missing src/lib/rateLimit.ts**
- **Found during:** Task 1 (creating validatePromoCode.ts)
- **Issue:** Plan referenced `src/lib/rateLimit.ts` as existing (created in Plan 01) but the file did not exist in the worktree
- **Fix:** Created `src/lib/rateLimit.ts` with in-memory sliding window rate limiter
- **Files modified:** src/lib/rateLimit.ts (created)
- **Verification:** TypeScript import resolves, no compilation errors
- **Committed in:** 5d33e01 (Task 1 commit)

**2. [Rule 1 - Bug] Fixed incorrect promo_codes types in database.ts**
- **Found during:** Task 1 (reading database.ts to understand promo_codes schema)
- **Issue:** `database.ts` had `discount_type: 'percent' | 'fixed'` (should be `'percentage'`), `use_count` (should be `current_uses`), and missing `min_order_cents` — contradicted the actual SQL migration
- **Fix:** Corrected `promo_codes` Row/Insert/Update types to match `001_initial_schema.sql` (ground truth)
- **Files modified:** src/types/database.ts
- **Verification:** TypeScript compiles clean, validatePromoCode.ts correctly uses `current_uses` and `min_order_cents`
- **Committed in:** 5d33e01 (Task 1 commit)

**3. [Rule 2 - Missing Critical] Fixed datetime-local → ISO 8601 conversion**
- **Found during:** Task 2 (PromoForm implementation)
- **Issue:** `datetime-local` inputs produce `2026-04-15T14:30` without timezone offset; Zod `.datetime()` requires full ISO 8601 with UTC offset — would silently fail validation
- **Fix:** Added `new Date(expiresAt).toISOString()` conversion before passing to Server Action
- **Files modified:** src/components/admin/PromoForm.tsx
- **Verification:** TypeScript compiles clean
- **Committed in:** c6fd459 (Task 2 commit)

---

**Total deviations:** 3 auto-fixed (1 blocking, 1 bug, 1 missing critical)
**Impact on plan:** All auto-fixes necessary for correctness. No scope creep.

## Issues Encountered

None beyond the deviations documented above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `validatePromoCode` is ready for Plan 05 cart checkout to call when applying promo codes before Stripe session creation
- `createPromoCode` Server Action is wired and ready for admin use
- Admin `/admin/promos` page is navigable from the sidebar

## Self-Check: PASSED

All created files confirmed to exist on disk. Both task commits verified in git log (5d33e01, c6fd459). TypeScript compiles with no errors.

---
*Phase: 04-online-store*
*Completed: 2026-04-01*
