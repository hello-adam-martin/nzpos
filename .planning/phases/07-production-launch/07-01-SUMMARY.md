---
phase: 07-production-launch
plan: 01
subsystem: infra
tags: [stripe, server-components, env-validation, production-readiness]

# Dependency graph
requires: []
provides:
  - StripeTestModeBanner server component that auto-detects test keys and renders persistent warning
  - check-production-env.ts script validating all 7 required env vars with specific rules
affects: [production-deploy, smoke-testing]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "server-only guard on server components that read env secrets"
    - "Server Component env var detection pattern (reads process.env, renders conditionally)"

key-files:
  created:
    - src/components/StripeTestModeBanner.tsx
    - scripts/check-production-env.ts
  modified:
    - src/app/admin/layout.tsx
    - src/app/(store)/layout.tsx
    - package.json

key-decisions:
  - "Banner is persistent (no dismiss) while sk_test_ prefix detected per UI-SPEC D-05"
  - "Stripe test keys cause WARN not FAIL in env script — valid during validation period"
  - "STAFF_JWT_SECRET minimum 64 chars (32 bytes hex) for sufficient entropy"

patterns-established:
  - "Server component reading env var: import 'server-only', read process.env, conditional render"

requirements-completed: [DEPLOY-01]

# Metrics
duration: 2min
completed: 2026-04-02
---

# Phase 7 Plan 01: Production Readiness Guards Summary

**Stripe test mode banner wired into admin and storefront layouts via Server Component env detection, plus a 7-check CLI env validator that catches localhost URLs, placeholder values, weak secrets, and missing webhook config**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-04-02T02:33:21Z
- **Completed:** 2026-04-02T02:35:00Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- StripeTestModeBanner Server Component reads STRIPE_SECRET_KEY server-side and renders a persistent warning banner when test keys detected — prevents owner from treating test checkouts as real sales
- Banner wired into both admin layout (above XeroDisconnectBanner) and storefront layout (above StorefrontHeader)
- check-production-env.ts script validates all 7 env vars with specific per-var rules: rejects localhost URLs, placeholder values, weak JWT secrets, missing webhook secret prefix
- Added `check:env` npm script for easy pre-deploy invocation
- All 142 existing tests continue to pass

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Stripe test mode banner and wire into layouts** - `5e4dd58` (feat)
2. **Task 2: Create production environment validation script** - `74b5dda` (feat)

**Plan metadata:** _(final docs commit follows)_

## Files Created/Modified
- `src/components/StripeTestModeBanner.tsx` - Server Component with server-only guard; renders warning banner when STRIPE_SECRET_KEY starts with sk_test_
- `src/app/admin/layout.tsx` - Added StripeTestModeBanner as first child inside the flex-1 div, above XeroDisconnectBanner
- `src/app/(store)/layout.tsx` - Added StripeTestModeBanner as first child inside min-h-screen div, above StorefrontHeader
- `scripts/check-production-env.ts` - 7-check CLI validator: exits 0 on pass/warn, exits 1 on failure
- `package.json` - Added `check:env` script

## Decisions Made
- Stripe test key triggers WARN not FAIL in env script — test keys are a valid configuration during the Stripe validation period (D-05). Using live keys before testing is validated would be a risk.
- Banner has no dismiss button — persistent per UI-SPEC spec while test key is active. Once owner swaps to live keys, banner vanishes automatically.
- `server-only` import guards the banner from accidentally being used in Client Components (would leak the key prefix detection logic to the client bundle).

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

Pre-existing TypeScript errors exist in the codebase (vault.ts, completeSale.ts, etc.) — confirmed pre-existing before any changes. These are out of scope for this plan. The new files introduce zero TypeScript errors.

## User Setup Required

None - no external service configuration required for these production-readiness guards. The banner and script work against whatever STRIPE_SECRET_KEY is configured.

## Next Phase Readiness
- Production readiness guards are in place
- Owner will see the test mode banner during Stripe validation period
- `npm run check:env` can be run before any Vercel deploy to catch missing config
- Phase 07-02 (product import and data load) can proceed

---
*Phase: 07-production-launch*
*Completed: 2026-04-02*
