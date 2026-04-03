---
phase: 13-merchant-self-serve-signup
plan: 01
subsystem: database
tags: [postgres, zod, vitest, supabase, rpc, rls, validation, rate-limiting]

requires:
  - phase: 12-multi-tenant-infrastructure
    provides: stores/staff/store_plans tables, SECURITY DEFINER RPC pattern, tenant cache

provides:
  - provision_store SECURITY DEFINER RPC (atomic stores + staff + store_plans creation)
  - validateSlug() with reserved list and format checks
  - slugify() store-name-to-slug converter
  - SlugSchema Zod schema for Server Action validation
  - checkRateLimit() in-memory IP rate limiter (5 attempts/hour)
  - Email confirmations enabled in Supabase config
  - Regenerated database.ts types with provision_store signature

affects:
  - 13-02 (signup Server Action uses provision_store RPC + validateSlug + checkRateLimit)
  - 13-03 (provisioning loading page + verification redirect)
  - Any future plan calling provision_store or slug validation

tech-stack:
  added: []
  patterns:
    - "SECURITY DEFINER RPC with SLUG_TAKEN/PROVISION_FAILED exceptions (mirrors complete_pos_sale)"
    - "In-memory rate limiter via module-level Map (no Redis needed at v2.0 scale)"
    - "SLUG_REGEX = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/ for subdomain-safe slug validation"
    - "TDD: write failing tests first, then implement to pass"

key-files:
  created:
    - supabase/migrations/017_provision_store_rpc.sql
    - src/lib/slugValidation.ts
    - src/lib/slugValidation.test.ts
    - src/lib/signupRateLimit.ts
    - src/lib/signupRateLimit.test.ts
  modified:
    - supabase/config.toml
    - src/types/database.ts

key-decisions:
  - "REVOKE EXECUTE on provision_store from authenticated/anon/public — service_role only (security boundary)"
  - "enable_confirmations = true in config.toml — local dev must use Inbucket for email verification"
  - "resetRateLimit() exported for test cleanup — not a production API"
  - "RESERVED_SLUGS includes 26 words: all required (admin/www/api/app/signup/login/support/billing) plus common platform paths"

patterns-established:
  - "Slug validation: validateSlug() for runtime checks, SlugSchema for Zod integration"
  - "Rate limiter: module-level Map resets on window expiry, resetRateLimit() for test isolation"

requirements-completed: [SIGNUP-02, SIGNUP-04, SIGNUP-05]

duration: 12min
completed: 2026-04-03
---

# Phase 13 Plan 01: Provisioning RPC + Slug Validation + Rate Limiter Summary

**Atomic provision_store SECURITY DEFINER RPC, Zod slug validation with 26 reserved words, and in-memory IP rate limiter (5/hour) — tested foundations for merchant signup**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-04-03T00:38:00Z
- **Completed:** 2026-04-03T00:50:10Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- `provision_store` Postgres RPC creates store + staff + store_plans atomically with SLUG_TAKEN/PROVISION_FAILED exceptions; only service_role can call it
- `validateSlug` rejects 26 reserved slugs, format violations (uppercase, consecutive hyphens, leading/trailing hyphens, underscores, digit-start), and length violations (3-30 chars)
- `slugify` converts store names to valid slug candidates (lowercase, strip specials, spaces-to-hyphens, truncate 30 chars)
- `checkRateLimit` blocks the 6th attempt from the same IP within a 1-hour window; resets after window expires
- Supabase email confirmations enabled (SIGNUP-03 prerequisite for email gate middleware)
- Types regenerated with `provision_store` RPC signature in `database.ts`
- 29 tests covering all slug and rate limit edge cases — all pass

## Task Commits

1. **Task 1: Slug validation + rate limiter modules with tests** - `53c6b06` (feat)
2. **Task 2: Provisioning RPC migration + Supabase config + type regeneration** - `6a81e6b` (feat)

## Files Created/Modified

- `supabase/migrations/017_provision_store_rpc.sql` - SECURITY DEFINER RPC, GRANT to service_role, REVOKE from others
- `src/lib/slugValidation.ts` - RESERVED_SLUGS, SLUG_REGEX, validateSlug(), slugify(), SlugSchema (Zod)
- `src/lib/slugValidation.test.ts` - 24 tests covering validateSlug, slugify, RESERVED_SLUGS, SlugSchema
- `src/lib/signupRateLimit.ts` - In-memory Map rate limiter, WINDOW_MS=1h, MAX_ATTEMPTS=5
- `src/lib/signupRateLimit.test.ts` - 5 tests covering allow/block/window-expiry/cross-IP isolation
- `supabase/config.toml` - enable_confirmations = true, added /api/auth/callback to redirect URLs
- `src/types/database.ts` - Regenerated with provision_store in Functions section

## Decisions Made
- REVOKE EXECUTE from authenticated/anon/public — service_role only for provision_store. Prevents any client-side or JWT-authenticated caller from invoking the provisioning function directly.
- `enable_confirmations = true` changes local dev — users must verify via Inbucket at http://127.0.0.1:54324. Documented in config comment.
- `resetRateLimit()` exported for test isolation only — not a production endpoint.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required. Email confirmation uses local Inbucket for dev.

**Note for local dev:** With `enable_confirmations = true` now active, new signups in local dev require email verification via Inbucket at http://127.0.0.1:54324.

## Next Phase Readiness

- `provision_store` RPC callable via `supabase.rpc('provision_store', {...})` with service role client
- `validateSlug` and `SlugSchema` ready for signup Server Action
- `checkRateLimit` ready for Server Action rate gating
- Plan 13-02 can build the signup Server Action immediately

## Self-Check: PASSED

- `supabase/migrations/017_provision_store_rpc.sql` — FOUND
- `src/lib/slugValidation.ts` — FOUND
- `src/lib/slugValidation.test.ts` — FOUND
- `src/lib/signupRateLimit.ts` — FOUND
- `src/lib/signupRateLimit.test.ts` — FOUND
- Commits `53c6b06` and `6a81e6b` — FOUND (git log confirmed)
- 29 tests passing — CONFIRMED

---
*Phase: 13-merchant-self-serve-signup*
*Completed: 2026-04-03*
