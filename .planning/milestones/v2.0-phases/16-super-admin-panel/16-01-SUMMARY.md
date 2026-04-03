---
phase: 16-super-admin-panel
plan: 01
subsystem: database
tags: [supabase, postgres, rls, server-actions, zod, vitest]

# Dependency graph
requires:
  - phase: 15-stripe-billing-feature-gating
    provides: store_plans table with has_xero/has_email_notifications/has_custom_domain columns
  - phase: 12-multi-tenant-infrastructure
    provides: stores table, tenantCache utility, super admin JWT claim pattern

provides:
  - supabase/migrations/020_super_admin_panel.sql — suspension columns on stores, manual override columns on store_plans, super_admin_actions audit table with RLS
  - src/actions/super-admin/suspendTenant.ts — suspend tenant with cache invalidation
  - src/actions/super-admin/unsuspendTenant.ts — unsuspend tenant clearing suspension state
  - src/actions/super-admin/activateAddon.ts — manually activate add-on with Stripe guard
  - src/actions/super-admin/deactivateAddon.ts — deactivate manually comp'd add-on only
  - src/lib/tenantCache.ts — extended with invalidateCachedStoreId export

affects: [16-super-admin-panel plans 02-04, middleware suspension check, tenant resolution]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Super admin Server Actions follow: 'use server' + server-only + Zod safeParse + is_super_admin auth check + admin client write + super_admin_actions audit log + revalidatePath
    - Manual override pattern: has_xero_manual_override tracks admin comps vs Stripe subscriptions; deactivation blocked unless override=true
    - Cache invalidation on suspension: invalidateCachedStoreId called immediately after store update so middleware reflects suspension

key-files:
  created:
    - supabase/migrations/020_super_admin_panel.sql
    - src/actions/super-admin/suspendTenant.ts
    - src/actions/super-admin/unsuspendTenant.ts
    - src/actions/super-admin/activateAddon.ts
    - src/actions/super-admin/deactivateAddon.ts
    - src/actions/super-admin/__tests__/suspendTenant.test.ts
    - src/actions/super-admin/__tests__/unsuspendTenant.test.ts
    - src/actions/super-admin/__tests__/activateAddon.test.ts
    - src/actions/super-admin/__tests__/deactivateAddon.test.ts
  modified:
    - src/lib/tenantCache.ts

key-decisions:
  - "Zod v4 UUID validation is stricter than v3 — test UUIDs must be RFC 4122 compliant (version bits 1-8, variant bits 89ab); fake zeroed UUIDs fail validation"
  - "server-only package must be mocked in Vitest tests (vi.mock('server-only', () => ({}))) — established pattern from Phase 15 billing tests"
  - "TDD RED commit uses test files before implementation; GREEN commit adds all 4 Server Actions together in one atomic commit"

patterns-established:
  - "Super admin guard pattern: check user.app_metadata.is_super_admin === true via getUser() before any admin operation"
  - "Manual override tracking: has_xero_manual_override boolean tracks which active add-ons are admin comps (true) vs Stripe-paid (false)"
  - "Audit log insertion: super_admin_actions table records every admin action with actor, target, action type, and note"

requirements-completed: [SADMIN-01, SADMIN-03, SADMIN-04]

# Metrics
duration: 12min
completed: 2026-04-03
---

# Phase 16 Plan 01: Super Admin Data Layer Summary

**Suspension columns + manual override tracking + super_admin_actions audit table with four Server Actions (suspend/unsuspend/activateAddon/deactivateAddon) fully tested via TDD**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-04-03T06:56:00Z
- **Completed:** 2026-04-03T07:00:39Z
- **Tasks:** 2 (Task 1: migration + cache; Task 2: TDD Server Actions)
- **Files modified:** 10

## Accomplishments

- Migration 020 adds suspended_at/suspension_reason to stores, three manual_override booleans to store_plans, and a super_admin_actions audit table with RLS (read: super admin JWT only, writes: service role only)
- Four Server Actions implement the complete super admin data layer: suspend, unsuspend, activate add-on, deactivate add-on — all with Zod validation, is_super_admin auth guard, admin client writes, audit logging, and revalidatePath
- suspendTenant calls invalidateCachedStoreId immediately after suspension so middleware denies access within the same request cycle, not after 5-minute TTL expiry
- activateAddon blocks activating an add-on already active via Stripe (has_xero=true, manual_override=false) — prevents double-activation confusion
- deactivateAddon blocks deactivating Stripe-managed add-ons (manual_override=false) — protects billing integrity
- All 17 unit tests pass via TDD (RED → GREEN with server-only mock and Zod v4-compliant UUIDs)

## Task Commits

1. **Task 1: Database migration + tenant cache invalidation** - `7440d7b` (feat)
2. **Task 2 RED: Failing tests for super admin Server Actions** - `8ed107b` (test)
3. **Task 2 GREEN: Four Server Actions implementation** - `1b5af08` (feat)

## Files Created/Modified

- `supabase/migrations/020_super_admin_panel.sql` - Suspension columns, manual override booleans, super_admin_actions audit table with RLS
- `src/lib/tenantCache.ts` - Added invalidateCachedStoreId export
- `src/actions/super-admin/suspendTenant.ts` - Suspend tenant Server Action with cache invalidation
- `src/actions/super-admin/unsuspendTenant.ts` - Unsuspend tenant Server Action (nulls suspended_at/reason)
- `src/actions/super-admin/activateAddon.ts` - Activate add-on manually with Stripe guard
- `src/actions/super-admin/deactivateAddon.ts` - Deactivate manually comp'd add-on only
- `src/actions/super-admin/__tests__/suspendTenant.test.ts` - 6 unit tests
- `src/actions/super-admin/__tests__/unsuspendTenant.test.ts` - 3 unit tests
- `src/actions/super-admin/__tests__/activateAddon.test.ts` - 4 unit tests
- `src/actions/super-admin/__tests__/deactivateAddon.test.ts` - 4 unit tests

## Decisions Made

- Zod v4 UUID validation rejects zeroed/fake test UUIDs (e.g., `a0000000-...`). Test UUIDs must be RFC 4122-compliant with valid version (1-8) and variant (89ab) bits. Fixed by using `crypto.randomUUID()` generated values.
- `server-only` package must be explicitly mocked in Vitest with `vi.mock('server-only', () => ({}))` — following the established pattern from Phase 15 billing action tests.
- TDD RED committed before implementation to capture the failing test baseline, per plan spec and Phase 13 decision on vi.hoisted() mock pattern.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Zod v4 strict UUID validation rejects non-compliant test UUIDs**
- **Found during:** Task 2 GREEN (first test run)
- **Issue:** Test UUIDs like `a0000000-0000-0000-0000-000000000001` fail Zod v4's `.uuid()` pattern — version digit must be 1-8 and variant must be 8/9/a/b. All happy-path tests returned `{ error: 'Invalid input' }`.
- **Fix:** Replaced all test UUIDs with `crypto.randomUUID()`-generated RFC 4122-compliant values
- **Files modified:** All 4 test files
- **Verification:** 17/17 tests pass
- **Committed in:** `1b5af08` (Task 2 GREEN commit)

**2. [Rule 3 - Blocking] Missing `vi.mock('server-only', () => ({}))` in test files**
- **Found during:** Task 2 GREEN (initial test run after implementation)
- **Issue:** `import 'server-only'` in Server Action files throws "This module cannot be imported from a Client Component module" in jsdom test environment
- **Fix:** Added `vi.mock('server-only', () => ({}))` to all four test files, consistent with Phase 15 billing tests
- **Files modified:** All 4 test files
- **Verification:** All test suites load and run cleanly
- **Committed in:** `1b5af08` (Task 2 GREEN commit)

---

**Total deviations:** 2 auto-fixed (1 bug, 1 blocking)
**Impact on plan:** Both fixes were required for tests to run. No scope changes.

## Issues Encountered

None beyond the two auto-fixed deviations above.

## User Setup Required

None — no external service configuration required. Migration runs via `supabase db push`.

## Next Phase Readiness

- Data layer complete: suspension, unsuspend, add-on activate/deactivate all implemented with audit trail
- Phase 16-02 can build the super admin panel UI (tenant list, detail view with action buttons) against these Server Actions
- Phase 16-03 can build the suspension middleware guard using `stores.is_active` + `stores.suspended_at`
- Cache invalidation wired — suspended tenants lose access within the current request cycle

---
*Phase: 16-super-admin-panel*
*Completed: 2026-04-03*

## Self-Check: PASSED

All files confirmed present and all commits verified in git history.
