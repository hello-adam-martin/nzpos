---
phase: 16-super-admin-panel
plan: 02
subsystem: auth
tags: [middleware, supabase, jwt, suspension, super-admin, next.js]

# Dependency graph
requires:
  - phase: 16-01
    provides: "Super admin DB schema, is_super_admin JWT hook, tenant cache"
provides:
  - "Super admin route guard in middleware (auth gate before root domain pass-through)"
  - "Suspension enforcement: suspended subdomains rewrite to /suspended page"
  - "ownerSignin redirects super admins to /super-admin/tenants instead of /admin/dashboard"
  - "Branded suspension page at src/app/suspended/page.tsx"
affects: [16-03, 16-04, super-admin-panel]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Super admin route guard: isRoot && pathname.startsWith('/super-admin') — handled before general root domain pass-through"
    - "Suspension routing: remove .eq('is_active', true) from slug query, check manually and rewrite to /suspended"
    - "Cached slug suspension enforcement: secondary DB lookup by store ID to catch cross-instance suspension"

key-files:
  created:
    - src/app/suspended/page.tsx
  modified:
    - src/middleware.ts
    - src/actions/auth/ownerSignin.ts
    - src/middleware.test.ts

key-decisions:
  - "Cached-path suspension check adds one indexed DB lookup per request — acceptable cost for correctness across serverless instances"
  - "ownerSignin redirects to /super-admin/tenants (not /super-admin/dashboard) — tenants list is the primary super admin landing page"

patterns-established:
  - "Middleware route order: webhook skip → super admin guard → root domain pass-through → subdomain resolution"
  - "Suspension page: Server Component only, no navigation, amber support link, NZPOS branding"

requirements-completed: [SADMIN-03]

# Metrics
duration: 15min
completed: 2026-04-03
---

# Phase 16 Plan 02: Middleware Super Admin Guard + Suspension Page Summary

**Middleware extended to protect /super-admin/* with is_super_admin JWT check and route suspended subdomains to a branded suspension page; ownerSignin redirects super admins to the tenant list**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-04-03T07:05:00Z
- **Completed:** 2026-04-03T07:20:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Super admin routes on root domain are now auth-gated: unauthenticated users redirected to /login, non-super-admins to /unauthorized
- Suspended stores show branded /suspended page instead of /not-found — both uncached (slug query) and cached (admin ID lookup) paths enforce suspension
- ownerSignin action detects is_super_admin JWT claim and redirects to /super-admin/tenants instead of /admin/dashboard
- Branded suspension page: Server Component with NZPOS logo, "Store Suspended" heading, support email link using design tokens

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend middleware for super admin routes and suspension enforcement** - `c42d5cb` (feat)
2. **Task 2: Super admin login redirect + branded suspension page** - `08109a7` (feat)
3. **Auto-fix: Update middleware tests for cached-path suspension check** - `8e7a0b3` (fix)

**Plan metadata:** (docs commit at end)

## Files Created/Modified
- `src/middleware.ts` - Added super admin guard (step 2.5), changed slug query to check is_active manually, added suspension rewrite for cached and uncached paths
- `src/actions/auth/ownerSignin.ts` - Added is_super_admin check after signInWithPassword, redirect to /super-admin/tenants for super admins
- `src/app/suspended/page.tsx` - New Server Component: branded suspension notice with NZPOS logo, Store Suspended heading, support link
- `src/middleware.test.ts` - Added makeAdminMock helper, configured mockCreateMiddlewareAdminClient in beforeEach for cached-path suspension check

## Decisions Made
- Cached-path suspension check (active check by store ID) adds one DB query per cached request — accepted for correctness. In-memory cache invalidation (Plan 01) handles same-instance suspension immediately; this catch-all covers cross-instance edge cases.
- Redirect to /super-admin/tenants (not /super-admin/dashboard) — tenants list is the effective super admin home page, no intermediate redirect needed.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Middleware tests broken by cached-path suspension check**
- **Found during:** Task 1 verification (running full test suite)
- **Issue:** New cached-path code calls `createMiddlewareAdminClient()`, but existing test `beforeEach` didn't configure this mock — 3 middleware tests failed with "Cannot read properties of undefined (reading 'from')"
- **Fix:** Added `makeAdminMock(isActive)` helper returning a chainable Supabase-like mock object; added `mockCreateMiddlewareAdminClient.mockReturnValue(makeAdminMock(true))` to `beforeEach`
- **Files modified:** `src/middleware.test.ts`
- **Verification:** All 4 middleware tests pass
- **Committed in:** `8e7a0b3`

---

**Total deviations:** 1 auto-fixed (Rule 1 — bug introduced by plan changes)
**Impact on plan:** Test fix was necessary for correctness. No scope creep.

## Issues Encountered
- Pre-existing test failures in `completeSale`, `sendPosReceipt`, `updateOrderStatus`, and e2e tests — all pre-dated this plan and are unrelated to changes here.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Middleware fully prepared for super admin routes — Plan 03 (super admin UI) can proceed
- Suspension page is live and will render for any inactive-flagged subdomain
- Super admin login flow routes correctly to the tenant management panel

---
*Phase: 16-super-admin-panel*
*Completed: 2026-04-03*
