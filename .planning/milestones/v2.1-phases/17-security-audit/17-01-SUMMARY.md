---
phase: 17-security-audit
plan: 01
subsystem: security
tags: [rls, postgres, supabase, stripe, jwt, server-actions, zod, storage, csp]

requires:
  - phase: 16-super-admin-panel
    provides: "super_admin_actions table, suspension enforcement, super admin JWT claims"
  - phase: 15-billing-feature-gates
    provides: "store_plans table, feature gating, billing webhook secret decision"

provides:
  - "SECURITY-AUDIT.md: formal findings report with 23 classified findings across 9 security domains"
  - "Full coverage of all 14 SEC requirements with explicit PASS/FAIL/PASS WITH FINDINGS verdicts"
  - "Critical finding: orders_public_read RLS policy is IDOR vulnerability (F-1.3)"
  - "Critical finding: 13 env vars missing from .env.example (F-7.1)"
  - "Complete inventory of all 48 Server Actions with Zod/server-only/error-leak status"
  - "Storage cross-tenant write risk documented (F-2.1, F-2.2, F-2.3)"
  - "Missing security headers documented (F-8.1, F-8.2, F-8.3)"

affects:
  - 17-02-critical (fixes Critical findings F-1.3, F-7.1)
  - 17-03-high (fixes High findings F-2.1..F-8.3)
  - 17-04-low (fixes Low findings)

tech-stack:
  added: []
  patterns:
    - "Audit-then-fix separation: discovery (Plan 01) strictly separated from remediation (Plans 02-04)"
    - "Blast-radius ordering: RLS → Storage → SECURITY DEFINER → Auth → Webhooks → Actions → Secrets → Headers → Rate Limits"

key-files:
  created:
    - .planning/phases/17-security-audit/SECURITY-AUDIT.md
  modified: []

key-decisions:
  - "orders_public_read policy is a true IDOR — any anon user can enumerate all online orders; fix is Critical priority"
  - "increment_promo_uses and restore_stock RPCs have no GRANT/REVOKE — any authenticated user can call them; High priority"
  - "13 env vars missing from .env.example — blocks production deployment of add-on features; Critical priority"
  - "Product image uploads do not scope to store_id path — any authenticated user (including customer) can upload; High priority"
  - "No CSP headers exist anywhere in the application — FAIL on SEC-12"
  - "Staff PIN has account-level lockout but no IP-level rate limiting — Low priority gap"

patterns-established:
  - "SECURITY-AUDIT.md format: Domain sections with F-N.M finding IDs, severity, file, evidence, recommendation"
  - "Severity classification: Critical (data leak/auth bypass), High (missing validation/weak headers), Low (hygiene)"

requirements-completed:
  - SEC-01
  - SEC-02
  - SEC-03
  - SEC-04
  - SEC-05
  - SEC-06
  - SEC-07
  - SEC-08
  - SEC-09
  - SEC-10
  - SEC-11
  - SEC-12
  - SEC-13
  - SEC-14

duration: 3min
completed: 2026-04-04
---

# Phase 17 Plan 01: Security Audit Summary

**Systematic security audit of 336-file NZPOS codebase producing 23 classified findings across 9 domains — 2 Critical, 14 High, 7 Low — with orders_public_read IDOR and 13 missing .env.example vars as top priorities**

## Performance

- **Duration:** 3 min
- **Started:** 2026-04-03T19:45:24Z
- **Completed:** 2026-04-03T19:49:06Z
- **Tasks:** 2 (combined into 1 comprehensive audit)
- **Files modified:** 1

## Accomplishments

- Read all 20 migration files, 48 Server Action files, middleware, webhook handlers, auth libraries, and storage route handlers
- Produced 687-line SECURITY-AUDIT.md with 23 findings across 9 security domains, all 14 SEC requirements covered
- Identified Critical IDOR in `orders_public_read` RLS policy — any anonymous user can enumerate all online orders
- Identified 13 environment variables used in production code but missing from `.env.example` (blocking add-on deployment)
- Confirmed Stripe webhook integrity is correctly implemented on both endpoints (PASS)
- Confirmed super admin auth double-layer protection: middleware + action-level guards both use `getUser()` (PASS)
- Documented cross-tenant write risk in both storage buckets (product-images and store-logos)

## Task Commits

1. **Task 1+2: Full security audit (all 9 domains)** - `580972b` (feat)

**Plan metadata:** (pending)

## Files Created/Modified

- `.planning/phases/17-security-audit/SECURITY-AUDIT.md` — Formal security audit findings report, 687 lines, 23 findings

## Decisions Made

- Combined Tasks 1 and 2 into a single comprehensive write after completing all reads — more accurate to write the whole report atomically once all evidence was gathered
- Classified `orders_public_read` as Critical (not High) because any anonymous user can enumerate customer emails and order totals across all stores — this is a data leak at scale
- Classified missing env vars as Critical (not High) because they directly block deployment of paid add-on features that are already sold to merchants
- Confirmed `refund_items` no UPDATE/DELETE is intentional immutability — documented as Low (no fix needed)
- `server-only` missing from admin-client files is High (not Critical) because the transitive guard via `admin.ts` provides protection — but explicit guard is missing per project convention

## Deviations from Plan

### Structural Deviation: Tasks Combined

The plan specified two tasks: Task 1 covering domains 1-5, Task 2 covering domains 6-9. After reading all files, the audit was written as a single comprehensive document rather than two partial files.

- **Why:** Writing domains 1-5 first would have required re-reading earlier files during domain 6-9 to cross-reference findings (e.g., which actions use admin client). Writing the complete report once with full evidence was more accurate.
- **Impact:** Single commit instead of two. SECURITY-AUDIT.md covers all 9 domains as required. No scope change.

None — plan executed as specified (audit only, no code changes).

## Issues Encountered

- `004_storage.sql` filename was `004_storage_bucket.sql` — corrected after ls check
- Storage bucket policies do NOT have per-store path enforcement despite the route handler using `store_id` prefix for logos — confirmed cross-tenant write risk

## User Setup Required

None — this plan creates only documentation. No external service configuration needed.

## Next Phase Readiness

SECURITY-AUDIT.md is the input for Plans 02-04. All findings are classified with severity, file paths, and evidence snippets sufficient to execute fixes without re-reading the codebase.

**Critical fixes ready (Plan 02):**
- F-1.3: Change `orders_public_read` policy to require `lookup_token`
- F-7.1: Add 13 missing env vars to `.env.example`

**High fixes ready (Plan 03):**
- F-2.1/F-2.2/F-2.3: Storage bucket policy path scoping + product image route auth check
- F-3.1/F-3.2: Add GRANT/REVOKE to increment_promo_uses, restore_stock, check_rate_limit, complete_pos_sale, complete_online_sale
- F-6.1/F-6.2/F-6.3: Add Zod to createCheckoutSession, importProducts, validatePromoCode
- F-6.4/F-6.5: Fix raw DB error leaks in createProduct, updateProduct
- F-7.2: Add server-only to 6 admin-client action files
- F-8.1/F-8.2/F-8.3: Add CSP, X-Frame-Options, X-Content-Type-Options headers to middleware

---
*Phase: 17-security-audit*
*Completed: 2026-04-04*
