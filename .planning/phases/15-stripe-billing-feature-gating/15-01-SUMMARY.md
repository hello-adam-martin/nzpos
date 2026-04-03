---
phase: 15-stripe-billing-feature-gating
plan: 01
subsystem: auth
tags: [jwt, supabase, stripe, postgres, feature-gating, billing]

# Dependency graph
requires:
  - phase: 12-multi-tenant-infrastructure
    provides: store_plans table with has_xero/has_email_notifications/has_custom_domain columns, custom_access_token_hook

provides:
  - requireFeature() utility with JWT fast path and DB fallback
  - ADDONS, PRICE_ID_MAP, PRICE_TO_FEATURE, FEATURE_TO_COLUMN config exports
  - JWT claims for xero, email_notifications, custom_domain injected at auth time
  - GRANT SELECT on store_plans to supabase_auth_admin (auth hook can read feature flags)

affects:
  - 15-02-webhook (needs PRICE_TO_FEATURE config to map Stripe Price IDs)
  - 15-03-feature-gating (calls requireFeature() in all gated routes/actions)
  - 15-04-billing-ui (uses ADDONS metadata for UI rendering)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "requireFeature() structured return: { authorized: true } | { authorized: false, feature, upgradeUrl }"
    - "JWT fast path via app_metadata claims (zero DB queries for non-critical reads)"
    - "DB fallback via store_plans for critical mutations (requireDbCheck: true)"
    - "Auth hook GRANT SELECT pattern: each new table used by hook needs explicit GRANT"

key-files:
  created:
    - src/config/addons.ts
    - src/lib/requireFeature.ts
    - src/lib/__tests__/requireFeature.test.ts
    - supabase/migrations/019_billing_claims.sql
  modified: []

key-decisions:
  - "requireFeature never throws — returns structured { authorized, feature, upgradeUrl } for use in redirects and error responses"
  - "JWT fast path is default; DB fallback only when requireDbCheck: true (critical mutations where stale claims are unacceptable)"
  - "Price IDs loaded from env vars in addons.ts — never hardcoded per D-02"

patterns-established:
  - "Feature gating pattern: await requireFeature('xero') in Server Actions/Components, redirect to upgradeUrl if !authorized"
  - "Auth hook extension: CREATE OR REPLACE full function with new block appended after existing logic"

requirements-completed: [BILL-01, BILL-03]

# Metrics
duration: 2min
completed: 2026-04-03
---

# Phase 15 Plan 01: Billing Foundation Summary

**requireFeature() JWT/DB dual-path guard + addons config + auth hook migration injecting xero/email_notifications/custom_domain claims from store_plans**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-04-03T05:32:49Z
- **Completed:** 2026-04-03T05:34:58Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- requireFeature() utility with JWT fast path and DB fallback — never throws, structured return
- Centralized addons config with ADDONS metadata, PRICE_ID_MAP, PRICE_TO_FEATURE for webhook, FEATURE_TO_COLUMN for DB queries
- Auth hook extended with feature flag claims — xero, email_notifications, custom_domain injected from store_plans at login time
- 5 unit tests passing — JWT authorized, JWT denied, upgradeUrl format, DB fallback authorized, no store_id guard

## Task Commits

1. **Task 1: Add-on config + requireFeature utility with tests** - `7700a7a` (feat, TDD)
2. **Task 2: Auth hook migration for feature flag JWT claims** - `2e87eca` (feat)

## Files Created/Modified

- `src/config/addons.ts` - ADDONS metadata, PRICE_ID_MAP (env var loaded), PRICE_TO_FEATURE, FEATURE_TO_COLUMN, SubscriptionFeature type
- `src/lib/requireFeature.ts` - Feature gate utility with JWT fast path and DB fallback via store_plans
- `src/lib/__tests__/requireFeature.test.ts` - 5 tests covering all behaviors using vi.hoisted() mock pattern
- `supabase/migrations/019_billing_claims.sql` - GRANT SELECT + full auth hook replacement with feature flag injection

## Decisions Made

- `requireFeature` returns structured result rather than throwing — enables callers to redirect to billing upgrade page with proper URL
- JWT fast path is the default (zero extra DB queries per request); `requireDbCheck: true` used only for critical mutations
- `PRICE_ID_MAP` uses `process.env.STRIPE_PRICE_XERO!` pattern — keeps Price IDs out of source code, easily swapped between test/live modes

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

Environment variables needed before Phase 15-02/03/04 work:
- `STRIPE_PRICE_XERO` — Stripe Price ID for Xero add-on
- `STRIPE_PRICE_EMAIL_NOTIFICATIONS` — Stripe Price ID for Email Notifications add-on
- `STRIPE_PRICE_CUSTOM_DOMAIN` — Stripe Price ID for Custom Domain add-on

These are consumed by `src/config/addons.ts`. Tests do not require them (mocked).

## Next Phase Readiness

- 15-02 (webhook handler): Can import `PRICE_TO_FEATURE` from addons.ts to map Stripe Price IDs to store_plans columns
- 15-03 (feature gating): Can call `requireFeature('xero')` in any Server Action or Server Component
- 15-04 (billing UI): Can import `ADDONS` array for rendering add-on cards with correct copy

---
*Phase: 15-stripe-billing-feature-gating*
*Completed: 2026-04-03*

## Self-Check: PASSED

All files exist, all commits verified.
