---
phase: 12-multi-tenant-infrastructure
plan: "04"
subsystem: testing
tags: [rls, security, vitest, playwright, e2e, supabase-types, multi-tenant, attack-vectors]

dependency_graph:
  requires:
    - phase: 12-01
      provides: stores.slug, store_plans, super_admins tables
    - phase: 12-02
      provides: middleware with x-store-id header injection
    - phase: 12-03
      provides: 015_rls_policy_rewrite.sql, 016_super_admin.sql, is_super_admin JWT claim
  provides:
    - src/lib/__tests__/rls.test.ts (extended with 4 D-16 attack vectors, 10 tests total)
    - tests/e2e/playwright.config.ts (lvh.me baseURL + webServer config)
    - tests/e2e/tenant-routing.spec.ts (5 subdomain routing tests)
    - tests/e2e/tenant-isolation.spec.ts (2 cross-tenant navigation isolation tests)
    - src/types/database.ts (regenerated with store_plans, super_admins, slug, is_active, logo_url)
  affects:
    - All Phase 12+ features (security gate before tenant-aware feature builds)
    - Future tenants (test patterns establish baseline for RLS regression testing)

tech-stack:
  added: []
  patterns:
    - app-metadata-injection-for-rls-tests
    - playwright-lvh-me-subdomain-e2e
    - admin-updateUserById-app-metadata-bypass

key-files:
  created:
    - tests/e2e/playwright.config.ts
    - tests/e2e/tenant-routing.spec.ts
    - tests/e2e/tenant-isolation.spec.ts
  modified:
    - src/lib/__tests__/rls.test.ts
    - src/types/database.ts

key-decisions:
  - "app_metadata set via admin.auth.admin.updateUserById before sign-in (not refreshSession) — auth hook not firing in test context; mirrors seed.ts pattern"
  - "Store B product created with is_active=false to test tenant_access RLS (not products_public_read which allows cross-tenant reads of active products)"
  - "p_items passed as JS array (not JSON.stringify) — PostgREST serializes to JSONB automatically"
  - "All 12 complete_pos_sale params explicit to avoid PostgREST overload ambiguity (005 + 010 both define the RPC)"

patterns-established:
  - "RLS test pattern: use admin.auth.admin.updateUserById to set app_metadata before sign-in for predictable JWT claims"
  - "Inactive products bypass products_public_read — use is_active=false for tenant isolation assertions"
  - "PostgREST RPC calls: pass JS arrays/objects directly (not JSON.stringify) for JSONB params"

requirements-completed: [TENANT-05]

duration: 15min
completed: "2026-04-03"
---

# Phase 12 Plan 04: Cross-Tenant Isolation Test Suite Summary

**Comprehensive D-16 security test suite with 10 Vitest RLS attack-vector tests and 7 Playwright E2E subdomain routing tests, plus regenerated database.ts with store_plans and super_admins.**

## Performance

- **Duration:** 15 min
- **Started:** 2026-04-03T08:52:00Z
- **Completed:** 2026-04-03T08:59:00Z
- **Tasks:** 2
- **Files modified:** 5 (3 created, 2 modified)

## Accomplishments

- Extended `rls.test.ts` to 10 tests covering all 4 D-16 attack vectors: wrong JWT cross-tenant read, `complete_pos_sale` RPC with mismatched store_id, super admin write-block, and header spoofing
- Created Playwright E2E config with lvh.me baseURL and 7 tests across 2 spec files (routing + isolation)
- Regenerated `database.ts` to include Phase 12 schema: `store_plans`, `super_admins`, `slug`, `is_active`, `logo_url`, `stripe_customer_id`
- All 10 Vitest tests pass against local Supabase instance

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend rls.test.ts with 4 attack vectors** - `24e42c2` (feat)
2. **Task 2: Playwright E2E tests and regenerated types** - `1c96e9b` (feat)

**Plan metadata:** (doc commit follows)

## Files Created/Modified

- `src/lib/__tests__/rls.test.ts` — Extended: shared beforeAll with 3 users/2 stores, 4 new describe blocks (10 tests total)
- `tests/e2e/playwright.config.ts` — New: Playwright config with lvh.me baseURL, webServer dev-server auto-start
- `tests/e2e/tenant-routing.spec.ts` — New: 5 tests for subdomain routing (valid slug, unknown slug, root domain, auth redirects)
- `tests/e2e/tenant-isolation.spec.ts` — New: 2 tests for sequential subdomain navigation isolation
- `src/types/database.ts` — Updated: regenerated via `supabase gen types typescript --local`, includes all Phase 12 schema

## Decisions Made

1. **app_metadata injection via admin updateUserById** — The custom_access_token_hook (migration 016) does not fire in the local test environment, so JWT claims are not automatically injected on sign-in. Used `admin.auth.admin.updateUserById({ app_metadata: { store_id, role } })` before sign-in, which stamps the claim directly on the auth user (same approach as `seed.ts`). No `refreshSession()` needed.

2. **Store B product as `is_active: false`** — Migration 015 includes `products_public_read: FOR SELECT USING (is_active = true)` which allows any user (including User A) to read active products across tenants (correct storefront behavior). Setting Store B's product to `is_active: false` bypasses the public read policy and tests the `products_tenant_access` isolation correctly.

3. **Pass all 12 RPC params explicitly** — Migrations 005 and 010 both define `complete_pos_sale` with different signatures (10 and 12 params). `CREATE OR REPLACE` with different signatures creates overloads rather than replacing. PostgREST PGRST203 error results when params match both signatures. Passing all 12 params explicitly resolves to the 12-param version.

4. **Pass p_items as JS array, not JSON.stringify** — `p_items JSONB DEFAULT '[]'::JSONB` requires PostgREST to receive a native JSON value. Passing a stringified JSON causes the "cannot extract elements from a scalar" error inside the RPC's `jsonb_array_elements(p_items)` call.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed stores insert failing due to missing slug field**
- **Found during:** Task 1 (initial test run)
- **Issue:** Plan's original test store inserts didn't include `slug` field. Migration 014 makes `slug NOT NULL`, so inserts fail with "Failed to create test stores"
- **Fix:** Added `slug: 'rls-test-a-${ts}'` and `slug: 'rls-test-b-${ts}'` to store inserts in beforeAll
- **Files modified:** src/lib/__tests__/rls.test.ts
- **Verification:** Test stores insert successfully
- **Committed in:** 24e42c2

**2. [Rule 1 - Bug] Fixed JWT claims not being injected by auth hook**
- **Found during:** Task 1 (RLS tests returning wrong results)
- **Issue:** The custom_access_token_hook (migration 016) doesn't fire in the Vitest/jsdom test environment. Signed-in users had no store_id in JWT, causing all tenant RLS checks to fail and expose cross-tenant data.
- **Fix:** Added `admin.auth.admin.updateUserById({ app_metadata: { store_id, role } })` before sign-in for each user. This mirrors the fallback used in `seed.ts`. Removed `refreshSession()` calls which were unnecessary.
- **Files modified:** src/lib/__tests__/rls.test.ts
- **Verification:** 10/10 tests pass with correct RLS enforcement
- **Committed in:** 24e42c2

**3. [Rule 1 - Bug] Fixed PostgREST RPC overload ambiguity (PGRST203)**
- **Found during:** Task 1 (RPC test returning overload error)
- **Issue:** Two `complete_pos_sale` overloads (005 = 10 params, 010 = 12 params) cause PGRST203 when 10 params are passed (ambiguous which version to call)
- **Fix:** Added all 12 params explicitly including `p_receipt_data: null` and `p_customer_email: null`
- **Files modified:** src/lib/__tests__/rls.test.ts
- **Verification:** RPC resolves to 12-param version; PRODUCT_NOT_FOUND error correctly raised
- **Committed in:** 24e42c2

**4. [Rule 1 - Bug] Fixed "cannot extract elements from a scalar" in RPC**
- **Found during:** Task 1 (after PGRST203 resolved)
- **Issue:** `p_items: JSON.stringify([...])` passed a string to a JSONB param. Inside the RPC, `jsonb_array_elements(p_items)` fails on a string scalar.
- **Fix:** Changed to `p_items: [{ ... }]` — pass a native JS array; PostgREST serializes to JSONB
- **Files modified:** src/lib/__tests__/rls.test.ts
- **Verification:** RPC executes past product lookup; proceeds to order insert
- **Committed in:** 24e42c2

**5. [Rule 1 - Bug] Fixed cross-tenant isolation test false-positive due to products_public_read**
- **Found during:** Task 1 (test expecting empty results but getting Store B's active product)
- **Issue:** `products_public_read: FOR SELECT USING (is_active = true)` is intentional for storefront — allows any authenticated user to read active products. The test expected Store B's active product to be blocked, but it's correctly visible.
- **Fix:** Changed Store B's product to `is_active: false` so it's only visible via `products_tenant_access` (JWT store_id must match). Header spoofing test also benefits since the inactive product can only be seen by Store B's JWT.
- **Files modified:** src/lib/__tests__/rls.test.ts
- **Verification:** User A cannot see Store B's inactive product; all 10 tests pass
- **Committed in:** 24e42c2

**6. [Rule 1 - Bug] Fixed p_staff_id must be staff.id (PK), not auth_user_id**
- **Found during:** Task 1 (FK constraint violation on order insert)
- **Issue:** `orders.staff_id` references `staff.id` (UUID primary key of staff table), not `staff.auth_user_id`. Plan used `userAId` (auth_user_id) which is a different UUID.
- **Fix:** Captured `staffA.id` from staff insert, stored as `staffAId`, used as `p_staff_id`
- **Files modified:** src/lib/__tests__/rls.test.ts
- **Verification:** RPC insert succeeds with correct staff_id FK
- **Committed in:** 24e42c2

---

**Total deviations:** 6 auto-fixed (all Rule 1 - Bug)
**Impact on plan:** All fixes required for tests to actually run and assert correct RLS behavior. No scope creep, no new tables or architecture changes.

## Issues Encountered

The auth hook not firing in test context is a known pattern in this codebase — `seed.ts` already has a comment noting this. The approach of setting `app_metadata` via admin API is the established fallback.

## Known Stubs

None — test files only, no UI components or placeholder data.

## Next Phase Readiness

- Phase 12 security test suite is complete. All 4 D-16 attack vectors are covered by Vitest tests.
- Playwright E2E tests require dev server at `lvh.me:3000` with `demo` slug in DB (provided by seed).
- Phase 12 is complete — all 4 plans executed. Ready to proceed to Phase 13 (merchant signup/onboarding).
- `database.ts` is current with all Phase 12 schema; TypeScript consumers of Supabase types will pick up store_plans and super_admins.

## Self-Check: PASSED

- [x] `src/lib/__tests__/rls.test.ts` contains `complete_pos_sale` RPC call
- [x] `src/lib/__tests__/rls.test.ts` contains `PRODUCT_NOT_FOUND`
- [x] `src/lib/__tests__/rls.test.ts` contains `super admin JWT can SELECT products across all tenants`
- [x] `src/lib/__tests__/rls.test.ts` contains `super admin JWT cannot INSERT into products`
- [x] `src/lib/__tests__/rls.test.ts` contains `super admin JWT cannot UPDATE products`
- [x] `src/lib/__tests__/rls.test.ts` contains `x-store-id header cannot override JWT-based RLS`
- [x] `src/lib/__tests__/rls.test.ts` contains `owner can read their own store plan`
- [x] `src/lib/__tests__/rls.test.ts` contains `owner cannot read another store plan`
- [x] `src/lib/__tests__/rls.test.ts` contains `super_admins` (insert in beforeAll)
- [x] `src/lib/__tests__/rls.test.ts` contains `slug:` (stores created with slug)
- [x] Original test `should return empty result when querying products with mismatched store_id` still present
- [x] `tests/e2e/playwright.config.ts` exists and contains `lvh.me`
- [x] `tests/e2e/tenant-routing.spec.ts` exists and contains `demo.lvh.me:3000`, `Store not found`, `nonexistent-store`
- [x] `tests/e2e/tenant-isolation.spec.ts` exists with sequential subdomain navigation
- [x] `src/types/database.ts` contains `store_plans`, `super_admins`, `slug`, `is_active`
- [x] All 10 Vitest RLS tests pass: `npx vitest run src/lib/__tests__/rls.test.ts` exits 0
- [x] Commit 24e42c2 exists (Task 1)
- [x] Commit 1c96e9b exists (Task 2)

---
*Phase: 12-multi-tenant-infrastructure*
*Completed: 2026-04-03*
