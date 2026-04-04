---
phase: 24-staff-rbac-foundation
plan: 01
subsystem: auth
tags: [rbac, roles, pin, jwt, zod, postgres, supabase]

# Dependency graph
requires:
  - phase: 12-staff-pin-auth
    provides: resolveAuth, resolveStaffAuth, staff_session JWT cookie pattern
provides:
  - POS_ROLES constant (owner/manager/staff) with PosRole type
  - MANAGER_ADMIN_ROUTES and OWNER_ONLY_ADMIN_ROUTES route whitelists
  - generatePin() and isPinBlacklisted() PIN utility with blacklist
  - CreateStaffSchema, UpdateStaffSchema, ResetStaffPinSchema, DeactivateStaffSchema (all export manager role support)
  - resolveStaffAuthVerified() for DB-verified role lookup on role-gated writes
  - Migration 027 adding manager to staff role CHECK constraint
affects: [24-staff-server-actions, 24-staff-rbac-middleware, middleware.ts, admin-staff-routes]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "POS_ROLES as single source of truth for role strings — import in schemas, middleware, and auth"
    - "resolveStaffAuthVerified() pattern: JWT for identity, DB for live role and is_active status"
    - "PIN blacklist with crypto.randomInt retry loop for secure PIN generation"

key-files:
  created:
    - src/config/roles.ts
    - src/lib/pin.ts
    - src/lib/pin.test.ts
    - supabase/migrations/027_staff_manager_role.sql
  modified:
    - src/schemas/staff.ts
    - src/lib/resolveAuth.ts
    - src/lib/resolveAuth.test.ts

key-decisions:
  - "CreateStaffSchema limits role to manager|staff only — owners cannot be created via staff management flow (D-07)"
  - "resolveStaffAuthVerified() uses DB role lookup, not JWT role — prevents stale role from granting excess access on role-gated writes"
  - "Migration uses DROP CONSTRAINT IF EXISTS defensively to handle any prior constraint name variation"

patterns-established:
  - "Role-gated mutations call resolveStaffAuthVerified(), not resolveStaffAuth() — DB is truth for writes"
  - "PIN generation uses crypto.randomInt (not Math.random) for security-appropriate randomness"
  - "Config constants follow src/config/*.ts pattern, exported as const with TypeScript as const"

requirements-completed: [STAFF-01, STAFF-02, STAFF-03, STAFF-06]

# Metrics
duration: 10min
completed: 2026-04-05
---

# Phase 24 Plan 01: Staff RBAC Foundation Summary

**Three-tier RBAC foundation: POS_ROLES constant, PIN utility with blacklist, extended Zod schemas with manager role, and DB-verified resolveStaffAuthVerified() for role-gated writes**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-04-04T18:31:00Z
- **Completed:** 2026-04-04T18:34:16Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Created `src/config/roles.ts` as single source of truth for role strings (owner/manager/staff) plus route whitelists
- Created `src/lib/pin.ts` with `generatePin()` (crypto.randomInt, blacklist retry) and `isPinBlacklisted()` — 8 tests all pass
- Created database migration `027_staff_manager_role.sql` adding manager to staff role CHECK constraint
- Rewrote `src/schemas/staff.ts` to export all four staff CRUD schemas with manager role support via POS_ROLES import
- Added `resolveStaffAuthVerified()` to `src/lib/resolveAuth.ts` — queries DB for live role and is_active status before returning auth
- Extended `src/lib/resolveAuth.test.ts` with 6 new tests for resolveStaffAuthVerified (14 total, all pass)
- TypeScript compiles without errors across all new files

## Task Commits

Each task was committed atomically:

1. **Task 1: Roles constant, PIN utility, and DB migration** - `027a3b8` (feat)
2. **Task 2: Extend Zod schemas and add resolveStaffAuthVerified()** - `e050476` (feat)

**Plan metadata:** (pending final docs commit)

## Files Created/Modified
- `src/config/roles.ts` - POS_ROLES, PosRole, MANAGER_ADMIN_ROUTES, OWNER_ONLY_ADMIN_ROUTES
- `src/lib/pin.ts` - generatePin(), isPinBlacklisted() with crypto.randomInt + blacklist
- `src/lib/pin.test.ts` - 8 tests: blacklist, format, leading zeros, non-determinism
- `supabase/migrations/027_staff_manager_role.sql` - ALTER TABLE staff ADD CONSTRAINT with manager role
- `src/schemas/staff.ts` - CreateStaffSchema, UpdateStaffSchema, ResetStaffPinSchema, DeactivateStaffSchema, StaffPinLoginSchema (all exported with type exports)
- `src/lib/resolveAuth.ts` - Added resolveStaffAuthVerified() with admin client DB lookup
- `src/lib/resolveAuth.test.ts` - Extended with 6 tests for resolveStaffAuthVerified()

## Decisions Made
- `CreateStaffSchema` allows `manager|staff` roles only (not owner) — owners are created at signup, not via staff management (D-07)
- `resolveStaffAuthVerified()` returns the DB role, not the JWT role — ensures stale JWTs cannot grant excess access after a role downgrade
- `UpdateStaffSchema` allows all three roles (`owner|manager|staff`) so owner can reassign roles in both directions

## Deviations from Plan

None — plan executed exactly as written. The existing `resolveAuth.test.ts` was found already present (pre-existing test coverage for resolveAuth and resolveStaffAuth). Tests were extended rather than replaced, which preserves regression coverage.

## Issues Encountered
None.

## User Setup Required
None — no external service configuration required. Migration `027_staff_manager_role.sql` must be applied to the Supabase database as part of normal migration workflow.

## Next Phase Readiness
- All foundation contracts are in place for Phase 24 Plan 02 (Server Actions) and Plan 03 (middleware + UI)
- `POS_ROLES`, `PosRole`, route whitelists importable from `@/config/roles`
- `resolveStaffAuthVerified()` ready to use in role-gated Server Actions
- All four CRUD schemas exported from `@/schemas/staff`
- No blockers

---
*Phase: 24-staff-rbac-foundation*
*Completed: 2026-04-05*

## Self-Check: PASSED

- src/config/roles.ts: FOUND
- src/lib/pin.ts: FOUND
- src/lib/pin.test.ts: FOUND
- supabase/migrations/027_staff_manager_role.sql: FOUND
- src/schemas/staff.ts: FOUND (modified)
- src/lib/resolveAuth.ts: FOUND (modified)
- src/lib/resolveAuth.test.ts: FOUND (modified)
- Commit 027a3b8 (Task 1): FOUND
- Commit e050476 (Task 2): FOUND
- All 22 tests pass (pin.test.ts: 8, resolveAuth.test.ts: 14)
- TypeScript: compiles without errors
