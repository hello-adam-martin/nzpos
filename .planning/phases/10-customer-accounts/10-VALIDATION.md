---
phase: 10
slug: customer-accounts
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-02
---

# Phase 10 — Validation Strategy

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
| 10-01-01 | 01 | 1 | CUST-01 | unit | `npx vitest run src/actions/auth/__tests__/customerSignup.test.ts` | ❌ W0 | ⬜ pending |
| 10-01-02 | 01 | 1 | CUST-01 | unit | `npx vitest run src/actions/auth/__tests__/customerSignup.test.ts` | ❌ W0 | ⬜ pending |
| 10-02-01 | 02 | 1 | CUST-02 | unit (RLS) | `npx vitest run src/lib/__tests__/rls.test.ts` | partial | ⬜ pending |
| 10-03-01 | 03 | 2 | CUST-03 | unit | `npx vitest run src/actions/auth/__tests__/updateProfile.test.ts` | ❌ W0 | ⬜ pending |
| 10-04-01 | 01 | 1 | CUST-04 | manual | supabase local + integration test | manual-only | ⬜ pending |
| 10-05-01 | 01 | 1 | CUST-05 | unit | `npx vitest run src/middleware.test.ts` | ❌ W0 | ⬜ pending |
| 10-05-02 | 01 | 1 | CUST-05 | unit | `npx vitest run src/middleware.test.ts` | ❌ W0 | ⬜ pending |
| 10-06-01 | 03 | 2 | CUST-06 | unit | `npx vitest run src/actions/auth/__tests__/resendVerification.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/actions/auth/__tests__/customerSignup.test.ts` — stubs for CUST-01 schema validation
- [ ] `src/actions/auth/__tests__/updateProfile.test.ts` — stubs for CUST-03 validation
- [ ] `src/actions/auth/__tests__/resendVerification.test.ts` — stubs for CUST-06 action call
- [ ] `src/middleware.test.ts` — stubs for CUST-05 customer redirect logic

*Existing infrastructure covers CUST-02 (rls.test.ts exists) and CUST-04 (manual-only).*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Auth hook injects role='customer' when customers row present | CUST-04 | Requires running Supabase instance with hook registered | 1. Run `supabase start` 2. Sign up customer via app 3. Check JWT claims in Supabase dashboard 4. Verify role='customer' and store_id present |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
