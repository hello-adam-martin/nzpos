---
phase: 01-foundation
plan: 04
subsystem: auth
tags: [supabase, jose, jwt, bcryptjs, middleware, nextjs, rls]

# Dependency graph
requires:
  - phase: 01-02
    provides: createSupabaseServerClient, createSupabaseMiddlewareClient
  - phase: 01-03
    provides: StaffPinLoginSchema, CreateStaffSchema — Zod schemas for auth input validation

provides:
  - Owner email/password signup Server Action (creates auth user + store + staff record + refreshes session)
  - Owner email/password signin Server Action
  - Staff PIN verification with lockout (bcrypt, 10 attempts in 5 min, 8h jose JWT in httpOnly cookie)
  - createSupabaseAdminClient — service role client for bootstrapping/seeding
  - Route middleware: /admin requires owner JWT claim, /pos requires staff_session cookie or owner session
  - Route group layouts: (admin), (pos) with touch-manipulation, (store)
  - Placeholder pages: /dashboard, /pos, /pos/login, /login, /signup, /unauthorized
  - Development seed data: 1 store, 3 staff, 5 categories, 25 NZ supplies products

affects: [all subsequent phases — auth gates every protected Server Action and route]

# Tech tracking
tech-stack:
  added: [bcryptjs (PIN hashing), jose (JWT signing/verification for staff sessions)]
  patterns:
    - Admin client (service role) bypasses RLS for auth bootstrapping
    - Staff sessions are custom jose JWTs independent of Supabase Auth
    - Owner sessions use Supabase Auth cookies + app_metadata JWT claims
    - Middleware reads staff_session cookie and verifies with jwtVerify from jose

key-files:
  created:
    - src/actions/auth/ownerSignup.ts
    - src/actions/auth/ownerSignin.ts
    - src/actions/auth/staffPin.ts
    - src/lib/supabase/admin.ts
    - src/middleware.ts
    - src/app/(admin)/layout.tsx
    - src/app/(admin)/dashboard/page.tsx
    - src/app/(pos)/layout.tsx
    - src/app/(pos)/pos/page.tsx
    - src/app/(pos)/pos/login/page.tsx
    - src/app/(store)/layout.tsx
    - src/app/login/page.tsx
    - src/app/signup/page.tsx
    - src/app/unauthorized/page.tsx
    - supabase/seed.ts
  modified:
    - src/types/database.ts (expanded from stub to full typed schema)

key-decisions:
  - "Admin client uses SUPABASE_SERVICE_ROLE_KEY and bypasses RLS — required for bootstrapping before JWT claims exist"
  - "Staff PIN sessions issued as independent jose JWTs (8h) stored in httpOnly cookie named staff_session"
  - "Owner signup refreshes session after staff record creation to trigger JWT hook and inject store_id+role claims"
  - "database.ts expanded with full typed schema including Relationships arrays required by Supabase v2 client generics"

patterns-established:
  - "Pattern: Server Actions use admin client for operations that need to bypass RLS during setup"
  - "Pattern: Staff PIN auth is a separate auth layer from Supabase Auth — parallel sessions"
  - "Pattern: Middleware handles both Supabase Auth (owner) and jose JWT (staff) in /pos routes"
  - "Pattern: All monetary columns in seed data use integer cents"

requirements-completed: [AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05]

# Metrics
duration: 18min
completed: 2026-04-01
---

# Phase 01 Plan 04: Auth System Summary

**Dual auth system: owner email/password via Supabase Auth with JWT claims, staff PIN via bcrypt + jose JWTs with 10-attempt lockout — protected by Next.js middleware and seeded with 25 NZ supplies products**

## Performance

- **Duration:** 18 min
- **Started:** 2026-04-01T00:00:00Z
- **Completed:** 2026-04-01T00:18:00Z
- **Tasks:** 2
- **Files modified:** 16

## Accomplishments

- Owner signup creates auth user + store + staff record using admin client, then refreshes session so JWT hook fires and injects store_id + role into app_metadata
- Staff PIN auth verifies bcrypt hash, tracks failed attempts (resets after lockout window), locks after 10 failures in 5 minutes, issues 8-hour jose JWT in httpOnly cookie
- Next.js middleware enforces role-based access: /admin requires Supabase Auth session with owner role, /pos requires valid staff_session JWT or owner session
- Development seed script creates 25 realistic NZ supplies products across 5 categories with correct bcrypt-hashed PINs

## Task Commits

Each task was committed atomically:

1. **Task 1: Owner auth actions, staff PIN auth, admin client** - `65ec4d5` (feat)
2. **Task 2: Route middleware, layouts, placeholder pages, seed data** - `6f54711` (feat)

**Plan metadata:** (this commit)

## Files Created/Modified

- `src/actions/auth/ownerSignup.ts` — Owner signup Server Action with Zod validation, admin client store creation, session refresh
- `src/actions/auth/ownerSignin.ts` — Owner signin Server Action via Supabase Auth signInWithPassword
- `src/actions/auth/staffPin.ts` — Staff PIN verification with bcryptjs, attempt tracking, lockout, jose JWT issuance
- `src/lib/supabase/admin.ts` — Service role Supabase client for RLS-bypass operations
- `src/middleware.ts` — Route-level RBAC for /admin (owner), /pos (staff or owner), public store
- `src/app/(admin)/layout.tsx` — Admin route group layout
- `src/app/(admin)/dashboard/page.tsx` — Admin dashboard placeholder
- `src/app/(pos)/layout.tsx` — POS route group layout with touch-manipulation
- `src/app/(pos)/pos/page.tsx` — POS terminal placeholder
- `src/app/(pos)/pos/login/page.tsx` — Staff PIN login placeholder
- `src/app/(store)/layout.tsx` — Storefront route group layout
- `src/app/login/page.tsx` — Owner login placeholder
- `src/app/signup/page.tsx` — Owner signup placeholder
- `src/app/unauthorized/page.tsx` — Unauthorized page
- `supabase/seed.ts` — Development seed: 1 store, 3 staff (owner + Alice/1234 + Bob/5678), 5 categories, 25 products
- `src/types/database.ts` — Expanded from stubs to full typed schema with Relationships arrays

## Decisions Made

- Admin client (service role) is used for store + staff creation during signup because the newly created user's JWT has no app_metadata claims yet (the JWT hook fires on next token, not at creation time)
- Owner signup calls `supabase.auth.refreshSession()` after creating the staff record to trigger the JWT hook immediately, so the redirect to /admin/dashboard arrives with a valid token
- Staff PIN sessions use an independent jose JWT (not Supabase Auth) because staff do not have Supabase auth accounts — they authenticate via PIN only
- Middleware checks both staff_session cookie and Supabase Auth session for /pos routes to allow owners to access POS without a PIN

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Expanded database.ts placeholder types to full typed schema**
- **Found during:** Task 1 (auth actions implementation)
- **Issue:** database.ts Row/Insert/Update types were `Record<string, unknown>` which resolves to `never` in Supabase v2 client generics (PostgrestFilterBuilder overloads), causing 16 TypeScript errors
- **Fix:** Replaced all table type stubs with full typed definitions derived from migration 001_initial_schema.sql, including `Relationships` arrays required by `GenericTable` interface in @supabase/postgrest-js
- **Files modified:** src/types/database.ts
- **Verification:** `npx tsc --noEmit` exits 0 with no errors
- **Committed in:** 65ec4d5 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Required fix for TypeScript to compile. The types will eventually be replaced by auto-generated output from `supabase gen types typescript --local` — this was an expected gap in the placeholder.

## Issues Encountered

- The `(store)/page.tsx` from the plan would conflict with the existing `src/app/page.tsx` (both map to `/` URL). Skipped creating `(store)/page.tsx` — existing root page already serves this purpose. The `(store)/layout.tsx` is created and will apply to storefront pages added under this route group.

## User Setup Required

Environment variable required before deployment:
- `STAFF_JWT_SECRET` — secret key for signing staff PIN session JWTs (minimum 32 characters)

This should be added to `.env.local` for development and Vercel environment variables for production.

## Next Phase Readiness

- Auth system complete: owner signup/signin and staff PIN login are functional
- Middleware ready: route protection in place for all route groups
- Seed data ready: run `npx tsx supabase/seed.ts` after `supabase start` to populate development database
- Plan 05 (final foundation plan) can proceed — all auth gates are in place

---
*Phase: 01-foundation*
*Completed: 2026-04-01*
