---
phase: 01-foundation
plan: 02
subsystem: database
tags: [supabase, postgres, rls, jwt, row-level-security, multi-tenant, typescript]

# Dependency graph
requires:
  - phase: 01-foundation plan 01
    provides: Next.js 16 project scaffold with TypeScript, Tailwind v4, @supabase/ssr installed

provides:
  - Supabase local dev config (supabase/config.toml with auth hook registered)
  - 9-table Postgres schema with integer cents, multi-tenant store_id columns
  - RLS policies enforcing tenant isolation via JWT app_metadata claims on all 9 tables
  - Custom JWT access token hook injecting store_id + role into app_metadata
  - Typed server, browser, and middleware Supabase client utilities
  - Database type placeholder (src/types/database.ts) ready for supabase gen types
  - RLS cross-tenant isolation integration test

affects:
  - 01-03 (auth — uses staff table, JWT claims, server/browser clients)
  - 01-04 (GST module — uses products/orders schema)
  - 01-05 (CI/CD — runs supabase migrations)
  - All phases with Server Actions (use createSupabaseServerClient)

# Tech tracking
tech-stack:
  added: [supabase CLI (npx supabase init)]
  patterns: [RLS tenant isolation via JWT claims, integer cents for all money columns, custom JWT access token hook pattern]

key-files:
  created:
    - supabase/config.toml
    - supabase/migrations/001_initial_schema.sql
    - supabase/migrations/002_rls_policies.sql
    - supabase/migrations/003_auth_hook.sql
    - src/lib/supabase/server.ts
    - src/lib/supabase/client.ts
    - src/lib/supabase/middleware.ts
    - src/types/database.ts
    - src/lib/__tests__/rls.test.ts
  modified:
    - supabase/config.toml (auth hook registration added)

key-decisions:
  - "All monetary columns use INTEGER (cents) — no DECIMAL/NUMERIC/FLOAT anywhere in schema"
  - "RLS policies use auth.jwt()->'app_metadata'->>'store_id' (not auth.uid() join) for 2-11x performance advantage"
  - "Custom JWT access token hook (003_auth_hook.sql) registered in config.toml so Supabase Auth calls it on every token issuance"
  - "Products and promo_codes have public_read_active SELECT policy enabling anonymous storefront access without sacrificing tenant write isolation"
  - "Database type file is a placeholder — run 'npx supabase gen types typescript --local' after supabase start to get full types"

patterns-established:
  - "Pattern 1: All data tables have store_id UUID NOT NULL REFERENCES public.stores(id) for tenant isolation"
  - "Pattern 2: RLS tenant isolation — FOR ALL USING (store_id = (auth.jwt() -> 'app_metadata' ->> 'store_id')::UUID)"
  - "Pattern 3: Supabase server client — createSupabaseServerClient() in src/lib/supabase/server.ts (import 'server-only')"
  - "Pattern 4: Supabase browser client — createSupabaseBrowserClient() in src/lib/supabase/client.ts"
  - "Pattern 5: FOR SELECT RLS policies use USING only — WITH CHECK is invalid on SELECT and causes Postgres error"

requirements-completed: [FOUND-02, FOUND-03, FOUND-04]

# Metrics
duration: 6min
completed: 2026-03-31
---

# Phase 01 Plan 02: Supabase Schema and RLS Summary

**Postgres schema with 9 multi-tenant tables (integer cents), tenant-isolating RLS via custom JWT access token hook, and typed @supabase/ssr client utilities**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-31T19:18:09Z
- **Completed:** 2026-03-31T19:23:42Z
- **Tasks:** 2 of 2
- **Files modified:** 9

## Accomplishments
- Complete Postgres schema for v1: stores, staff, categories, products, orders, order_items, promo_codes, stripe_events, cash_sessions — all with integer cents and store_id tenant isolation
- RLS enabled on all 9 tables using JWT app_metadata claims (no user table joins — avoids 2-11x performance penalty)
- Custom access token hook injects store_id + role into JWT app_metadata on every Supabase Auth token issuance, registered in config.toml
- Server, browser, and middleware Supabase client utilities using @supabase/ssr (not deprecated auth-helpers)
- RLS cross-tenant isolation integration test: verifies querying with mismatched store_id returns empty result (skips gracefully when Supabase not running)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Supabase config and schema migration** - `54c1d07` (feat)
2. **Task 2: RLS policies, JWT auth hook, clients, RLS test** - `127432f` (feat)

**Plan metadata:** _(docs commit below)_

## Files Created/Modified
- `supabase/config.toml` - Supabase local dev config with auth hook registered
- `supabase/migrations/001_initial_schema.sql` - 9 tables, integer cents, indexes, updated_at triggers
- `supabase/migrations/002_rls_policies.sql` - RLS enabled on all 9 tables, tenant_isolation + public_read policies
- `supabase/migrations/003_auth_hook.sql` - custom_access_token_hook with proper GRANT/REVOKE
- `src/lib/supabase/server.ts` - createSupabaseServerClient (server-only, @supabase/ssr)
- `src/lib/supabase/client.ts` - createSupabaseBrowserClient (@supabase/ssr)
- `src/lib/supabase/middleware.ts` - createSupabaseMiddlewareClient for Next.js middleware
- `src/types/database.ts` - Database type placeholder (replace with supabase gen types output)
- `src/lib/__tests__/rls.test.ts` - Cross-tenant isolation integration test

## Decisions Made
- **Integer cents everywhere:** All monetary columns are INTEGER. Enforced at schema level — no DECIMAL/NUMERIC/FLOAT allowed.
- **JWT claims for RLS (not user joins):** `auth.jwt()->'app_metadata'->>'store_id'` avoids joining the users table on every RLS check (2-11x faster).
- **Hook registered in config.toml:** The `[auth.hook.custom_access_token]` section must be present or Supabase Auth never calls the hook function even though it exists in the DB.
- **Public read policies for storefront:** `public_read_active` SELECT policies on products and promo_codes allow anonymous access for the online store without weakening write isolation.
- **FOR SELECT = USING only:** Never use WITH CHECK on SELECT policies — it's invalid Postgres SQL and causes migration failures.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed email variable reuse bug in RLS test**
- **Found during:** Task 2 (RLS isolation test creation)
- **Issue:** Plan's test template used `Date.now()` inline in both the `createUser` call and the subsequent `signInWithPassword` call. The two timestamps would differ, causing sign-in to fail with "User not found" since the email wouldn't match.
- **Fix:** Extracted stable `emailA` and `emailB` constants at `describe` scope, used the same variables in both `createUser` and `signInWithPassword`.
- **Files modified:** src/lib/__tests__/rls.test.ts
- **Verification:** Test logic verified correct — `emailA` and `emailB` are stable across beforeAll calls.
- **Committed in:** `127432f` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - bug)
**Impact on plan:** Bug fix only — no scope change. Test would have failed with "user not found" at runtime without this fix.

## Issues Encountered
None - supabase init ran cleanly, TypeScript compilation passed, build passed, test suite passes with expected skips when Supabase not running.

## Known Stubs
- `src/types/database.ts` — placeholder `Record<string, unknown>` types. Must be replaced with `npx supabase gen types typescript --local` output after running `supabase start` + `supabase db reset`. All Supabase client calls currently untyped. Future plan (01-03 or later) should run gen types and commit the output.

## User Setup Required
None — no external service configuration required for this plan. Local Supabase via Docker (`supabase start`) is the next step for integration testing, but not required until auth work begins in plan 01-03.

## Next Phase Readiness
- Schema and RLS are complete — plan 01-03 (auth) can now implement owner signup and staff PIN login against the staff table
- JWT hook is registered — plan 01-03 auth implementation will get store_id + role in JWT claims automatically
- Supabase client utilities are ready — all Server Actions and middleware can use createSupabaseServerClient/createSupabaseMiddlewareClient
- Database types are stubs — run `npx supabase gen types typescript --local` after `supabase start` to get full types before writing typed queries

---
*Phase: 01-foundation*
*Completed: 2026-03-31*
