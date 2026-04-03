---
phase: 17-security-audit
plan: 04
subsystem: auth
tags: [security, rate-limiting, server-only, server-actions, rls, audit-trail]

# Dependency graph
requires:
  - phase: 17-security-audit
    provides: "Plans 02/03 High severity remediations (Zod, error sanitization, storage, SECURITY DEFINER, CSP, server-only for admin files)"

provides:
  - IP-level rate limiting on staff PIN login via check_rate_limit RPC
  - Direct server-only imports on all 18 remaining Server Action files (defense-in-depth)
  - Verified audit trail: super_admin_actions immutability confirmed, non-admin logging deferred
  - Post-remediation notes documenting final SEC-04/06/07/10/13/14 status
  - All 14 SEC requirements addressed: verified-correct or remediated

affects: [security-audit, phase-18, deploy]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "IP rate limiting in Server Actions using check_rate_limit RPC with namespaced identifier (pin_login:{ip})"
    - "server-only import after 'use server' directive for all Server Action files"

key-files:
  created:
    - .planning/phases/17-security-audit/17-04-SUMMARY.md
  modified:
    - src/actions/auth/staffPin.ts
    - src/actions/categories/createCategory.ts
    - src/actions/categories/deleteCategory.ts
    - src/actions/categories/updateCategory.ts
    - src/actions/categories/reorderCategories.ts
    - src/actions/products/createProduct.ts
    - src/actions/products/updateProduct.ts
    - src/actions/products/deactivateProduct.ts
    - src/actions/auth/ownerSignin.ts
    - src/actions/auth/customerSignin.ts
    - src/actions/auth/customerSignup.ts
    - src/actions/auth/signOut.ts
    - src/actions/auth/resetPassword.ts
    - src/actions/auth/changePassword.ts
    - src/actions/auth/updateEmail.ts
    - src/actions/auth/updateProfile.ts
    - src/actions/auth/retryProvisioning.ts
    - src/actions/auth/resendVerification.ts
    - src/actions/auth/checkSlugAvailability.ts
    - .planning/phases/17-security-audit/SECURITY-AUDIT.md

key-decisions:
  - "IP rate limit threshold for PIN login set at 20/5min (not 10) to allow multiple staff shift-changes on shared iPad"
  - "Used check_rate_limit RPC (not in-memory signupRateLimit) for PIN rate limiting — DB-backed, survives cold starts"
  - "F-9.1 non-admin mutation logging deferred (Low severity) — refund tables provide natural audit trail"
  - "super_admin_actions no INSERT RLS is confirmed intentional — immutable writes via service_role only"

patterns-established:
  - "All Server Action files have direct import 'server-only' after 'use server' directive"
  - "IP rate limiting uses namespaced identifier: {action_type}:{ip} to avoid key collisions"

requirements-completed: [SEC-04, SEC-05, SEC-06, SEC-07, SEC-13, SEC-14]

# Metrics
duration: 15min
completed: 2026-04-04
---

# Phase 17 Plan 04: Low Severity Fixes and Audit Completion Summary

**IP-level PIN rate limiting via check_rate_limit RPC plus server-only defense-in-depth on 46 Server Action files, completing all 14 SEC requirements**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-04-04T09:00:00Z
- **Completed:** 2026-04-04T09:15:00Z
- **Tasks:** 2
- **Files modified:** 20

## Accomplishments

- Added IP-level rate limiting to `staffPin.ts` using the `check_rate_limit` RPC — 20 attempts per IP per 5-minute window, namespaced as `pin_login:{ip}` to prevent cross-action collisions
- Added direct `import 'server-only'` to 18 remaining Server Action files (categories, products, auth) — 46 total action files now independently guarded as defense-in-depth
- Verified `super_admin_actions` audit trail immutability: no INSERT RLS = service_role writes only, confirmed for all 4 super-admin mutation files
- Added post-remediation notes to SECURITY-AUDIT.md documenting final verdict for all 14 SEC requirements

## Task Commits

Each task was committed atomically:

1. **Task 1: Add IP-Level Rate Limiting to Staff PIN Login** - `ca057c7` (feat)
2. **Task 2: Add Defense-in-Depth server-only Guards and Verify Audit Trail** - `7f74f22` (feat)

**Plan metadata:** (final commit — see state updates)

## Files Created/Modified

- `src/actions/auth/staffPin.ts` - Added IP rate limiting via check_rate_limit RPC + server-only import
- `src/actions/categories/createCategory.ts` - Added server-only import
- `src/actions/categories/deleteCategory.ts` - Added server-only import
- `src/actions/categories/updateCategory.ts` - Added server-only import
- `src/actions/categories/reorderCategories.ts` - Added server-only import
- `src/actions/products/createProduct.ts` - Added server-only import
- `src/actions/products/updateProduct.ts` - Added server-only import
- `src/actions/products/deactivateProduct.ts` - Added server-only import
- `src/actions/auth/ownerSignin.ts` - Added server-only import
- `src/actions/auth/customerSignin.ts` - Added server-only import
- `src/actions/auth/customerSignup.ts` - Added server-only import
- `src/actions/auth/signOut.ts` - Added server-only import
- `src/actions/auth/resetPassword.ts` - Added server-only import
- `src/actions/auth/changePassword.ts` - Added server-only import
- `src/actions/auth/updateEmail.ts` - Added server-only import
- `src/actions/auth/updateProfile.ts` - Added server-only import
- `src/actions/auth/retryProvisioning.ts` - Added server-only import
- `src/actions/auth/resendVerification.ts` - Added server-only import
- `src/actions/auth/checkSlugAvailability.ts` - Added server-only import
- `.planning/phases/17-security-audit/SECURITY-AUDIT.md` - Post-remediation notes for all 14 SEC requirements

## Decisions Made

- **IP rate limit threshold (20/5min):** Higher than per-account lockout (10/5min) because a legitimate POS iPad may have multiple staff members logging in during shift changes from the same IP. Per-account lockout remains the primary defense; IP-level is secondary against distributed enumeration.
- **Used check_rate_limit RPC over in-memory signupRateLimit:** DB-backed RPC survives serverless cold starts and is already used for signup. The in-memory store resets between instances — inadequate for a security control.
- **F-9.1 non-admin audit logging deferred:** Refund operations write to `refunds` and `refund_items` tables (natural audit trail). Stock adjustments via `restore_stock` RPC are Low severity. Deferring to v2.2 is acceptable.

## Deviations from Plan

None — plan executed exactly as written. The check_rate_limit RPC interface (p_ip, p_max, p_window_seconds) differed from the plan's pseudocode (p_identifier, p_window_seconds, p_max_attempts) but the plan explicitly stated "adjust the call accordingly based on what you read in migration 009." Adjusted accordingly.

## Issues Encountered

- Pre-existing test failures: 8 test files failed (17 tests) before and after this plan's changes — confirmed these are unrelated to this plan's modifications (same failure count with and without changes). The failures are in e2e/tenant tests, billing webhook tests, and completeSale/sendPosReceipt tests.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- All 14 SEC requirements are addressed. The complete security remediation cycle (Plans 01-04) is done.
- Phase 17 security audit is complete. Ready for Phase 18 (code quality review or documentation).
- Pre-existing test failures (8 files, 17 tests) should be investigated in a future phase — not introduced by Phase 17.

---
*Phase: 17-security-audit*
*Completed: 2026-04-04*
