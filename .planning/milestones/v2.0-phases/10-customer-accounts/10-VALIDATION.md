---
phase: 10
slug: customer-accounts
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-04-02
---

# Phase 10 -- Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest ^4.1.2 |
| **Config file** | `vitest.config.mts` |
| **Quick run command** | `npx vitest run src/actions/auth/__tests__/` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/actions/auth/__tests__/`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 10-01-01 | 01 | 1 | CUST-04 | grep | `grep -c "CREATE TABLE public.customers" supabase/migrations/012_customer_accounts.sql && grep -c "CREATE OR REPLACE FUNCTION public.custom_access_token_hook" supabase/migrations/012_customer_accounts.sql` | n/a (file grep) | ⬜ pending |
| 10-01-02 | 01 | 1 | CUST-05 | grep | `grep -c "role === 'customer'" src/middleware.ts && grep -A1 "role === 'customer'" src/middleware.ts \| grep -c "new URL('/', request.url)"` | n/a (file grep) | ⬜ pending |
| 10-02-01 | 02 | 2 | CUST-01 | unit | `npx vitest run src/actions/auth/__tests__/customerSignup.test.ts` | ❌ W0 | ⬜ pending |
| 10-02-02 | 02 | 2 | CUST-06 | unit | `npx vitest run src/actions/auth/__tests__/resendVerification.test.ts` | ❌ W0 | ⬜ pending |
| 10-03-01 | 03 | 3 | CUST-03 | unit | `npx vitest run src/actions/auth/__tests__/updateProfile.test.ts` | ❌ W0 | ⬜ pending |
| 10-03-02 | 03 | 3 | CUST-02 | grep | `ls src/app/\(store\)/account/orders/page.tsx src/app/\(store\)/account/orders/\[id\]/page.tsx src/components/store/OrderHistoryCard.tsx` | n/a (file ls) | ⬜ pending |
| 10-03-03 | 03 | 3 | CUST-02 | grep | `grep -l "PostPurchaseAccountPrompt" src/app/\(store\)/order/\[id\]/confirmation/page.tsx` | n/a (file grep) | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/actions/auth/__tests__/customerSignup.test.ts` -- stubs for CUST-01 schema validation (created in Plan 02 execution)
- [ ] `src/actions/auth/__tests__/updateProfile.test.ts` -- stubs for CUST-03 validation (created in Plan 03 execution)
- [ ] `src/actions/auth/__tests__/resendVerification.test.ts` -- stubs for CUST-06 action call (created in Plan 02 execution)

*Plan 01 tasks (10-01-01, 10-01-02) use grep/ls verification against migration SQL and middleware.ts -- no test stubs needed.*
*Plan 03 order/confirmation tasks (10-03-02, 10-03-03) use file existence and grep verification -- no test stubs needed.*
*Existing infrastructure covers CUST-02 RLS (rls.test.ts exists) and CUST-04 (manual-only).*

**Test stub creation responsibility:**
- Plan 02 executor creates `customerSignup.test.ts` and `resendVerification.test.ts` as part of task execution (early in Task 1).
- Plan 03 executor creates `updateProfile.test.ts` as part of task execution (early in Task 2).

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Auth hook injects role='customer' when customers row present | CUST-04 | Requires running Supabase instance with hook registered | 1. Run `supabase start` 2. Sign up customer via app 3. Check JWT claims in Supabase dashboard 4. Verify role='customer' and store_id present |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
