---
phase: 17-security-audit
plan: 03
subsystem: infra
tags: [csp, security-headers, middleware, env-vars, server-only, stripe, supabase]

# Dependency graph
requires:
  - phase: 17-security-audit-01
    provides: SECURITY-AUDIT.md findings report identifying SEC-09, SEC-10, SEC-11, SEC-12 gaps
provides:
  - CSP Report-Only headers on all middleware responses (SEC-12)
  - X-Content-Type-Options, X-Frame-Options, Referrer-Policy on all responses
  - Complete .env.example with all 22 environment variables documented (SEC-09)
  - server-only guards on provisionStore.ts, ownerSignup.ts, billing/route.ts (SEC-10)
  - SEC-11 confirmed correct — both Stripe webhook handlers use constructEvent() properly
affects: [deployment, security-audit-04, documentation]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "addSecurityHeaders() helper pattern — single function wraps all response return points in middleware"
    - "CSP Report-Only before enforcing — collect violation reports before switching to enforcing mode"
    - "server-only after 'use server' in Server Actions — 'use server' must be first directive"

key-files:
  created: []
  modified:
    - src/middleware.ts
    - .env.example
    - src/actions/auth/provisionStore.ts
    - src/actions/auth/ownerSignup.ts
    - src/app/api/webhooks/stripe/billing/route.ts

key-decisions:
  - "CSP set as Report-Only (not enforcing) — allows violation reports before production enforcement switch"
  - "addSecurityHeaders() helper called at every return point — ensures no response path skips headers"
  - "Webhook routes receive security headers too — no special exemption needed since raw body is read before middleware runs"
  - "server-only placed after 'use server' in Server Actions — 'use server' must be the first statement per Next.js spec"
  - "NEXT_PUBLIC_STORE_ID retained in .env.example — deprecated legacy var, removal deferred to Plan 04 cleanup"

patterns-established:
  - "All middleware return points: wrap response in addSecurityHeaders() before returning"
  - "Admin client files: import 'server-only' immediately after 'use server' directive"

requirements-completed: [SEC-09, SEC-10, SEC-11, SEC-12]

# Metrics
duration: 10min
completed: 2026-04-04
---

# Phase 17 Plan 03: Security Infrastructure Summary

**CSP Report-Only headers on all middleware responses, complete .env.example with 13 previously undocumented env vars, and server-only guards on three admin-client files**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-04-03T19:50:00Z
- **Completed:** 2026-04-03T19:54:17Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Added `addSecurityHeaders()` helper to middleware covering all 15+ return points — CSP Report-Only, X-Content-Type-Options, X-Frame-Options, Referrer-Policy on every response
- Completed .env.example from 11 variables to 22 — documents all Stripe billing, Resend, Xero, price IDs, URLs, cron, and founder email vars
- Added `import 'server-only'` to provisionStore.ts, ownerSignup.ts (after `'use server'`), and billing/route.ts (at top)
- Confirmed SEC-11 PASS — both Stripe webhook handlers use `constructEvent()` with correct signing secrets

## Task Commits

Each task was committed atomically:

1. **Task 1: Add CSP Headers and Security Headers to Middleware** - `4305ac0` (feat)
2. **Task 2: Complete .env.example and Add server-only Guards** - `4fc0d7b` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `src/middleware.ts` - Added addSecurityHeaders() helper, called at all return points
- `.env.example` - Added 13 missing env vars in organized sections with comments
- `src/actions/auth/provisionStore.ts` - Added `import 'server-only'` after `'use server'`
- `src/actions/auth/ownerSignup.ts` - Added `import 'server-only'` after `'use server'`
- `src/app/api/webhooks/stripe/billing/route.ts` - Added `import 'server-only'` at top

## Decisions Made
- CSP is Report-Only (not enforcing) — switch to enforcing after monitoring violations in production per D-06
- addSecurityHeaders() helper pattern rather than inline code at each return — maintainable and DRY
- Webhook routes receive security headers too — raw body is consumed before middleware processes headers, so no conflict
- `'use server'` must remain first statement in Server Action files — `server-only` placed immediately after, not before

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Pre-existing test failures (17 tests, 8 files) were present before any changes — confirmed by running tests on HEAD before edits. Not caused by this plan's changes and out of scope per deviation rules.

## Known Stubs
None — all changes are guard/header additions with no data stubs.

## User Setup Required
None - no external service configuration required. .env.example documents existing env vars for reference — no new services added.

## Next Phase Readiness
- SEC-09, SEC-10, SEC-11, SEC-12 all closed
- Ready for Plan 04 (Low severity findings: RLS pattern gaps, xero_connections role check, deprecated env var cleanup)
- Before production: switch CSP from Report-Only to enforcing after reviewing violation reports in Vercel/Sentry

---
*Phase: 17-security-audit*
*Completed: 2026-04-04*
