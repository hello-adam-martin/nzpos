---
phase: 24-staff-rbac-foundation
plan: 02
subsystem: auth
tags: [rbac, staff-actions, middleware, jwt, zod, bcrypt, admin-layout]

# Dependency graph
requires:
  - phase: 24-01
    provides: POS_ROLES, MANAGER_ADMIN_ROUTES, generatePin, isPinBlacklisted, CreateStaffSchema, UpdateStaffSchema, ResetStaffPinSchema, DeactivateStaffSchema, resolveStaffAuthVerified
provides:
  - createStaff Server Action with owner-only guard, PIN blacklist check, bcrypt hash
  - updateStaff Server Action with pin_locked_until on role change (D-12)
  - deactivateStaff Server Action with is_active=false + immediate session invalidation (D-11, D-12)
  - resetStaffPin Server Action returning plaintext PIN once (D-06)
  - getStaffList Server Action for owner staff listing
  - Middleware manager JWT block — MANAGER_ADMIN_ROUTES whitelist + silent redirect (D-02, D-03)
  - Admin layout dual-auth (owner Supabase Auth + manager staff JWT)
  - processPartialRefund + processRefund extended for manager role (STAFF-06)
affects: [admin-staff-ui, admin-layout, pos-auth, refund-flows]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Staff Server Actions follow 'use server' + import 'server-only' + Zod safeParse + admin client pattern"
    - "Owner-only guard: supabase.auth.getUser() → check app_metadata.role === 'owner' → return INSUFFICIENT_ROLE"
    - "Dual-auth pattern in refund actions: owner via Supabase Auth, manager via resolveStaffAuthVerified()"
    - "Middleware manager block: jwtVerify → MANAGER_ADMIN_ROUTES.some() → allow or redirect to /admin/dashboard"
    - "Admin layout dual-auth: owner path sets userEmail/hasInventory, manager path reads staff_session cookie"

key-files:
  created:
    - src/actions/staff/createStaff.ts
    - src/actions/staff/updateStaff.ts
    - src/actions/staff/deactivateStaff.ts
    - src/actions/staff/resetStaffPin.ts
    - src/actions/staff/getStaffList.ts
    - src/actions/staff/__tests__/staff-actions.test.ts
  modified:
    - src/middleware.ts
    - src/middleware.test.ts
    - src/app/admin/layout.tsx
    - src/components/admin/AdminSidebar.tsx
    - src/actions/orders/processPartialRefund.ts
    - src/actions/orders/processRefund.ts

key-decisions:
  - "Admin layout passes role + staffName props to AdminSidebar already — Plan 03 UI only needs to consume them, not wire them"
  - "processPartialRefund created_by field uses user?.id ?? null when manager processes refund (no Supabase Auth user)"
  - "Middleware manager JWT block placed AFTER owner success path — owner check still runs first (no regression)"
  - "POS block updated to allow 'manager' role alongside 'staff' and 'owner' (D-07: managers can access POS)"

# Metrics
duration: 15min
completed: 2026-04-05
---

# Phase 24 Plan 02: Staff CRUD Actions + Middleware + Layout Summary

**5 staff Server Actions with owner-only guards and session invalidation, middleware extended for manager JWT admin access with route whitelist, admin layout dual-auth, and both refund actions extended for manager role**

## Performance

- **Duration:** ~15 min
- **Completed:** 2026-04-05
- **Tasks:** 2
- **Files modified:** 12

## Accomplishments

- Created 5 staff Server Actions in `src/actions/staff/`: createStaff (INSUFFICIENT_ROLE guard, PIN blacklist, bcrypt), updateStaff (pin_locked_until on role change), deactivateStaff (is_active=false + pin_locked_until, self-deactivation guard), resetStaffPin (plaintext PIN returned once), getStaffList (owner-only store-scoped list)
- Created 14 unit tests in `src/actions/staff/__tests__/staff-actions.test.ts` covering all five actions, including INSUFFICIENT_ROLE, PIN blacklist rejection, pin_locked_until on role change, is_active=false on deactivation, and plaintext PIN return
- Updated `src/middleware.ts`: manager JWT check after owner path, MANAGER_ADMIN_ROUTES whitelist, silent redirect to /admin/dashboard for restricted routes, POS block now allows 'manager' role
- Added 15 new middleware tests (29 total) covering manager allowed/redirected, no auth, invalid JWT, owner regression, and setup wizard preservation
- Updated `src/app/admin/layout.tsx` for dual-auth: owner path preserved, manager path reads staff_session cookie via jwtVerify, Xero banner scoped to owner only
- Updated `src/components/admin/AdminSidebar.tsx` to accept role and staffName props (Plan 03 will use them)
- Extended `src/actions/orders/processPartialRefund.ts` with resolveStaffAuthVerified() dual-auth for manager role (STAFF-06)
- Extended `src/actions/orders/processRefund.ts` with same dual-auth pattern (STAFF-06)
- 43 total tests passing

## Task Commits

Each task was committed atomically:

1. **Task 1: Staff CRUD Server Actions with unit tests** - `c7d61ef` (feat)
2. **Task 2: Middleware + admin layout + refund actions** - `1362157` (feat)

## Files Created/Modified

- `src/actions/staff/createStaff.ts` — createStaff with INSUFFICIENT_ROLE guard, isPinBlacklisted, bcrypt.hash, revalidatePath
- `src/actions/staff/updateStaff.ts` — updateStaff with pin_locked_until on role change
- `src/actions/staff/deactivateStaff.ts` — deactivateStaff with is_active=false, pin_locked_until, self-deactivation guard
- `src/actions/staff/resetStaffPin.ts` — resetStaffPin generating new PIN, returning plaintext once
- `src/actions/staff/getStaffList.ts` — getStaffList with StaffMember type export
- `src/actions/staff/__tests__/staff-actions.test.ts` — 14 unit tests
- `src/middleware.ts` — manager JWT block with MANAGER_ADMIN_ROUTES, POS manager role addition
- `src/middleware.test.ts` — 15 new manager + regression tests (29 total)
- `src/app/admin/layout.tsx` — dual-auth layout with manager session support
- `src/components/admin/AdminSidebar.tsx` — added role + staffName props to interface
- `src/actions/orders/processPartialRefund.ts` — dual-auth for manager role
- `src/actions/orders/processRefund.ts` — dual-auth for manager role

## Decisions Made

- Admin layout passes `role` and `staffName` props to AdminSidebar now — Plan 03 only needs to render them differently, the wiring is complete
- `processPartialRefund` `created_by` field uses `user?.id ?? null` when manager processes refund (no Supabase Auth user in manager path)
- Middleware manager JWT block placed AFTER the owner success path — owner check runs first, no regression
- POS block updated to allow `'manager'` role alongside `'staff'` and `'owner'` (per D-07: manager = filtered admin + full POS access)

## Deviations from Plan

None — plan executed exactly as written. The only minor adjustment was making the self-deactivation test use valid UUIDs (since DeactivateStaffSchema validates UUID format) and combining suspension+wizard mock data in middleware tests to avoid conflicting mock resolutions.

## Known Stubs

None — all wired correctly. AdminSidebar accepts `role` and `staffName` props but does not yet visually differentiate manager vs owner sessions (that is Plan 03's responsibility).

---
*Phase: 24-staff-rbac-foundation*
*Completed: 2026-04-05*

## Self-Check: PASSED

- src/actions/staff/createStaff.ts: FOUND
- src/actions/staff/updateStaff.ts: FOUND
- src/actions/staff/deactivateStaff.ts: FOUND
- src/actions/staff/resetStaffPin.ts: FOUND
- src/actions/staff/getStaffList.ts: FOUND
- src/actions/staff/__tests__/staff-actions.test.ts: FOUND
- src/middleware.ts: FOUND (modified)
- src/middleware.test.ts: FOUND (modified)
- src/app/admin/layout.tsx: FOUND (modified)
- src/actions/orders/processPartialRefund.ts: FOUND (modified)
- src/actions/orders/processRefund.ts: FOUND (modified)
- Commit c7d61ef (Task 1): FOUND
- Commit 1362157 (Task 2): FOUND
- All 43 tests pass (staff-actions.test.ts: 14, middleware.test.ts: 29)
- TypeScript: compiles without new errors (pre-existing database.ts artifact excluded)
