---
phase: 13-merchant-self-serve-signup
plan: 02
subsystem: auth
tags: [supabase, server-actions, middleware, pkce, rate-limiting, email-verification, vitest]

requires:
  - phase: 13-01
    provides: provision_store RPC, SlugSchema, checkRateLimit, email confirmations enabled

provides:
  - ownerSignup Server Action (Zod validation, rate limit, signUp, provision_store RPC, orphan cleanup, refreshSession)
  - checkSlugAvailability Server Action (format + reserved word + DB uniqueness check)
  - retryProvisioning Server Action (idempotent re-run of provision_store for authenticated users)
  - resendVerification now points emailRedirectTo at /api/auth/callback
  - /api/auth/callback route (PKCE exchange, store slug lookup, subdomain redirect)
  - Middleware email verification gate (email_confirmed_at check in /admin branch)
  - 15 unit tests (11 ownerSignup + 4 middleware email gate)

affects:
  - 13-03 (UI screens call ownerSignup, checkSlugAvailability, retryProvisioning; email verification page uses resendVerification)
  - Phase 14 (billing uses same auth pipeline)

tech-stack:
  added: []
  patterns:
    - "ownerSignup: rate limit check before Zod parse, then signUp + provision_store RPC, deleteUser on RPC failure"
    - "PKCE callback on root domain /api/auth/callback redirects to store subdomain /admin/dashboard"
    - "email_confirmed_at gate in middleware /admin branch only — not in POS, storefront, or root routes"
    - "vi.hoisted() for mock functions that are referenced in vi.mock() factories (avoids TDZ errors)"

key-files:
  created:
    - src/actions/auth/ownerSignup.ts
    - src/actions/auth/checkSlugAvailability.ts
    - src/actions/auth/retryProvisioning.ts
    - src/app/api/auth/callback/route.ts
    - src/actions/auth/__tests__/ownerSignup.test.ts
    - src/middleware.test.ts
  modified:
    - src/actions/auth/resendVerification.ts
    - src/middleware.ts
    - src/types/database.ts

key-decisions:
  - "ownerSignup does not call redirect() — client page navigates to /signup/provisioning after success"
  - "retryProvisioning accepts FormData (storeName + slug) — no cookie storage of signup intent needed"
  - "Auth callback uses .single() not .maybeSingle() for store lookup — user should always have a store at this point"
  - "email_confirmed_at gate placed between !user redirect and getSession() role check — unverified users hit gate before role is checked"
  - "database.ts spurious 'Connecting to db 5432' prefix removed (Rule 1 auto-fix — caused TS1434 blocking compilation)"

requirements-completed: [SIGNUP-01, SIGNUP-02, SIGNUP-03, SIGNUP-05]

duration: 5min
completed: 2026-04-03
---

# Phase 13 Plan 02: Server Actions + Auth Callback + Middleware Gate Summary

**Complete server-side signup pipeline: ownerSignup with rate limiting + provision_store RPC + orphan cleanup, checkSlugAvailability, retryProvisioning, PKCE callback route with subdomain redirect, and email_confirmed_at gate in middleware**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-04-03T00:52:42Z
- **Completed:** 2026-04-03T00:57:18Z
- **Tasks:** 2
- **Files modified:** 9 (6 created, 3 modified)

## Accomplishments

- `ownerSignup` validates with Zod+SlugSchema, rate-limits by IP (5/hour), calls `signUp` with `emailRedirectTo`, calls `provision_store` RPC via admin client, deletes orphaned auth user on RPC failure, refreshes session on success — does NOT call `redirect()` (client handles navigation)
- `checkSlugAvailability` validates format + reserved list via `validateSlug()`, then checks DB uniqueness with `.maybeSingle()` — no auth required
- `retryProvisioning` is idempotent: returns existing store if already provisioned, otherwise re-runs RPC with FormData inputs
- `resendVerification` now points `emailRedirectTo` at `/api/auth/callback` (root domain) instead of the old `/account/callback`
- `/api/auth/callback` exchanges PKCE code, looks up store slug via `owner_auth_id`, and redirects to `{slug}.{rootDomain}/admin/dashboard`
- Middleware email gate checks `email_confirmed_at != null` in the `/admin` branch only — unverified users redirected to `{rootDomain}/signup/verify-email`
- 11 ownerSignup unit tests: all validations, rate limit, RPC call, SLUG_TAKEN, orphan cleanup, emailRedirectTo, refreshSession
- 4 middleware unit tests: unverified→redirect, verified→allow, storefront bypass, root domain bypass
- 15/15 new tests pass

## Task Commits

1. **Task 1: Server actions (ownerSignup, checkSlugAvailability, retryProvisioning, resendVerification)** - `c159f3f`
2. **Task 2: Auth callback route, middleware email gate, unit tests** - `b24ec4b`

## Files Created/Modified

- `src/actions/auth/ownerSignup.ts` — Complete rewrite: rate limit + Zod+SlugSchema + signUp + provision_store RPC + orphan cleanup
- `src/actions/auth/checkSlugAvailability.ts` — Created: validateSlug + DB maybeSingle
- `src/actions/auth/retryProvisioning.ts` — Created: idempotent re-run of provision_store
- `src/actions/auth/resendVerification.ts` — Updated emailRedirectTo to /api/auth/callback
- `src/app/api/auth/callback/route.ts` — Created: PKCE exchange + slug lookup + subdomain redirect
- `src/middleware.ts` — Added email_confirmed_at gate in /admin branch
- `src/actions/auth/__tests__/ownerSignup.test.ts` — Created: 11 unit tests with vi.hoisted mocks
- `src/middleware.test.ts` — Created: 4 unit tests for email verification gate
- `src/types/database.ts` — Removed spurious "Connecting to db 5432" prefix (Rule 1 auto-fix)

## Decisions Made

- `ownerSignup` does not call `redirect()` — the client page handles navigation to `/signup/provisioning` after receiving `{ success: true, slug }`. This keeps the Server Action testable and decoupled.
- `retryProvisioning` accepts `FormData` with `storeName` and `slug` rather than reading from a session cookie. Simpler and avoids adding cookie state to the signup flow.
- Auth callback uses `.single()` for the store lookup (not `.maybeSingle()`). At callback time, the store should always exist — a missing store is an error state handled by redirecting to `/signup?error=no_store`.
- `email_confirmed_at` gate is placed between the `!user` redirect and `getSession()` role check. Unverified users hit the gate before role is inspected.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed spurious prefix line from src/types/database.ts**
- **Found during:** Task 1 verification (npx tsc --noEmit)
- **Issue:** File began with literal text "Connecting to db 5432" causing TS1434 parse errors
- **Fix:** Removed the prefix line
- **Files modified:** `src/types/database.ts`
- **Commit:** `c159f3f`

**2. [Rule 1 - Bug] Test mocks needed vi.hoisted() pattern**
- **Found during:** Task 2 test execution
- **Issue:** vi.mock() factories referencing module-level `const` variables fail with TDZ ReferenceError because vi.mock() is hoisted before variable declarations
- **Fix:** Wrapped mock function declarations in `vi.hoisted(() => { ... })` and destructured the return value — this is the correct Vitest pattern for this use case
- **Files modified:** `src/actions/auth/__tests__/ownerSignup.test.ts`, `src/middleware.test.ts`
- **Commit:** `b24ec4b`

## Known Stubs

None — all Server Actions are fully implemented. Tests use mocks but the actual implementations call real dependencies.

## Self-Check: PASSED

- `src/actions/auth/ownerSignup.ts` — FOUND
- `src/actions/auth/checkSlugAvailability.ts` — FOUND
- `src/actions/auth/retryProvisioning.ts` — FOUND
- `src/app/api/auth/callback/route.ts` — FOUND
- `src/actions/auth/__tests__/ownerSignup.test.ts` — FOUND
- `src/middleware.test.ts` — FOUND
- Commit `c159f3f` — FOUND
- Commit `b24ec4b` — FOUND
- 15 new tests passing — CONFIRMED

---
*Phase: 13-merchant-self-serve-signup*
*Completed: 2026-04-03*
