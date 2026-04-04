---
phase: 18-code-quality-test-coverage
plan: "02"
subsystem: testing
tags: [testing, coverage, gst, rls, stripe, middleware, vitest]
dependency_graph:
  requires: ["18-01"]
  provides: ["TEST-02", "TEST-03", "TEST-04", "TEST-05"]
  affects: ["CI coverage gate"]
tech_stack:
  added: []
  patterns:
    - vi.hoisted() for mock factories in server-only modules
    - vi.useFakeTimers() + vi.advanceTimersByTime() for TTL cache tests
    - IRD specimen validation with integer cent arithmetic
key_files:
  created:
    - src/lib/resolveAuth.test.ts
    - src/lib/tenantCache.test.ts
    - src/lib/gst.ird.test.ts
  modified:
    - src/lib/__tests__/rls.test.ts
    - src/app/api/webhooks/stripe/billing/__tests__/billing.test.ts
    - src/app/api/webhooks/stripe/webhook.test.ts
    - src/middleware.test.ts
decisions:
  - "Mock resolveStaffAuth via cookies()+jose mocks rather than module-level stub — more accurate to real call chain"
  - "IRD specimen tests in separate gst.ird.test.ts to distinguish compliance from implementation tests"
  - "Middleware test expansion added as auto-fix (Rule 2) — middleware was at 50.94%, below 80% threshold required by plan success criteria"
metrics:
  duration_minutes: 15
  completed_date: "2026-04-04"
  tasks_completed: 2
  files_changed: 7
---

# Phase 18 Plan 02: Critical-Path Test Coverage Summary

**One-liner:** IRD-validated GST tests, resolveAuth/tenantCache unit tests, super_admin_actions RLS coverage, Stripe past_due/incomplete lifecycle tests, and middleware expansion push all 8 critical-path files above 80% coverage threshold.

## What Was Done

### Task 1: resolveAuth, tenantCache, and IRD GST Tests

**`src/lib/resolveAuth.test.ts`** (8 tests, 100% line coverage on resolveAuth.ts):
- Owner Supabase session returns `{ store_id, staff_id }`
- `x-store-id` header overrides JWT store_id for owner
- Staff JWT cookie fallback when no owner session
- Null return when no owner session and no staff cookie
- Staff JWT: valid returns payload, absent returns null, expired returns null
- Staff auth header override of JWT store_id

Mocking pattern: `vi.mock('server-only', () => ({}))` + `vi.hoisted()` for `mockGetUser`, `mockHeadersGet`, `mockCookiesGet`, `mockJwtVerify` — required to break the `next/headers` + `jose` + Supabase dependency chain.

**`src/lib/tenantCache.test.ts`** (7 tests, 100% coverage on tenantCache.ts):
- Get returns null for unknown slug
- Set + Get returns correct value
- Invalidate makes Get return null
- TTL expiry after 5 minutes + 1ms (via `vi.useFakeTimers` + `vi.advanceTimersByTime`)
- Valid just before TTL (5 minutes - 1ms)
- Invalidate one slug does not affect others
- Re-set overwrites existing entry

**`src/lib/gst.ird.test.ts`** (9 tests, IRD compliance validation):
- IRD specimen: $115.00 → $15.00 GST (1500 cents)
- IRD specimen: $230.00 → $30.00 GST (3000 cents)
- IRD specimen: $1,150.00 → $150.00 GST (15000 cents)
- IRD rounding: $1.00 → $0.13 GST (13 cents)
- $46.00 → $6.00 GST, $23.00 → $3.00 GST
- calcLineItem: $115 × 1 qty → lineTotal 11500, gst 1500, excl 10000
- calcLineItem with discount path
- GST + excl always sums to lineTotal (accounting identity for 4 test cases)

### Task 2: RLS and Stripe Billing/Webhook Test Extensions

**`src/lib/__tests__/rls.test.ts`** — `super_admin_actions` RLS block (TEST-03):
- Super admin JWT can SELECT from `super_admin_actions`
- Regular owner JWT is denied SELECT (RLS blocks — returns empty)
- Anonymous client is denied SELECT

These tests are skipped when `SUPABASE_SERVICE_ROLE_KEY` is absent (CI without local Supabase), following the same pattern as existing RLS tests.

**`src/app/api/webhooks/stripe/billing/__tests__/billing.test.ts`** — Stripe lifecycle gaps (TEST-04):
- `customer.subscription.updated` with `status='past_due'` sets feature to false
- `status='incomplete'` processes gracefully without crash
- `status='active'` after past_due re-enables feature (re-activation)
- Unrecognized price ID records event for idempotency but skips store_plans update

**`src/app/api/webhooks/stripe/webhook.test.ts`** — Email and metadata paths:
- Email receipt sent when `customer_details.email` present + `receipt_data` exists
- Email sent via fallback path when `receipt_data` is null (builds from order_items + store)
- Missing `metadata.store_id` returns 200 without calling RPC
- Missing `metadata.order_id` returns 200 without calling RPC

**`src/middleware.test.ts`** — Expanded from 4 to 21 tests (auto-fix: middleware was at 50.94%, plan requires 80%+):
- Webhook passthrough (no auth)
- Root domain / www / localhost pass-through
- Super admin: unauthenticated redirected to /login, non-super-admin to /unauthorized, super admin passes through
- Subdomain tenant resolution: cached active, cached suspended, unknown slug → /not-found, uncached suspended, uncached active (sets cache)
- Admin protection: unauthenticated → /login, customer → /, non-owner → /unauthorized
- POS protection: /pos/login passes through, unauthenticated /pos → /pos/login
- Email verification gate tests (pre-existing, 4 tests)

## Coverage Results

All 8 critical-path files now above 80% line coverage threshold:

| File | Before | After | Threshold |
|------|--------|-------|-----------|
| src/lib/gst.ts | ~100% | 100% | 80% |
| src/lib/money.ts | ~100% | 100% | 80% |
| src/lib/resolveAuth.ts | ~0% | 100% | 80% |
| src/lib/tenantCache.ts | ~0% | 100% | 80%/100% fn |
| src/middleware.ts | 50.94% | 83.96% | 80% |
| src/app/api/webhooks/stripe/route.ts | ~78% | 85.18% | 80% |
| src/app/api/webhooks/stripe/billing/route.ts | ~79% | 86.04% | 80% |
| src/lib/xero/sync.ts | ~93% | 92.94% | 80% |

`npm run test:coverage` exits with zero errors — CI gate passes.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical Functionality] Middleware coverage below 80% threshold**
- **Found during:** Verification after Task 2
- **Issue:** `src/middleware.ts` was at 50.94% despite being in the plan's success criteria. Plan did not explicitly task middleware tests but listed it in success criteria.
- **Fix:** Expanded `src/middleware.test.ts` from 4 to 21 tests covering webhook passthrough, root domain, super admin routes, tenant resolution, admin protection, POS protection.
- **Files modified:** `src/middleware.test.ts`
- **Commit:** 4d5d66e

**2. [Rule 2 - Missing Critical Functionality] webhook route.ts and billing route.ts below 80%**
- **Found during:** First coverage run after Task 2
- **Issue:** `src/app/api/webhooks/stripe/route.ts` at 78.43%, `billing/route.ts` at 79.06%
- **Fix:** Added email fallback path test (builds receipt from order_items + store when receipt_data is null) and unrecognized price ID test to billing webhook
- **Files modified:** `webhook.test.ts`, `billing/__tests__/billing.test.ts`
- **Commit:** 4d5d66e

## Known Stubs

None — all tests exercise real production code paths via mocks.

## Self-Check: PASSED

Files created/modified:
- FOUND: src/lib/resolveAuth.test.ts
- FOUND: src/lib/tenantCache.test.ts
- FOUND: src/lib/gst.ird.test.ts
- FOUND: src/lib/__tests__/rls.test.ts (modified)
- FOUND: src/app/api/webhooks/stripe/billing/__tests__/billing.test.ts (modified)
- FOUND: src/app/api/webhooks/stripe/webhook.test.ts (modified)
- FOUND: src/middleware.test.ts (modified)

Commits:
- cac76f5: test(18-02): add resolveAuth, tenantCache, and IRD GST tests
- 2541e06: test(18-02): extend RLS and Stripe billing/webhook tests
- 4d5d66e: test(18-02): expand middleware tests and push all coverage thresholds to 80%+

Coverage: npm run test:coverage exits 0 (no ERROR lines)
