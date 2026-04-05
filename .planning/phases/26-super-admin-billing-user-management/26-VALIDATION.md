---
phase: 26
slug: super-admin-billing-user-management
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-05
---

# Phase 26 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest ^2.x |
| **Config file** | `vitest.config.mts` |
| **Quick run command** | `npx vitest run src/actions/super-admin/__tests__/` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/actions/super-admin/__tests__/`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 26-01-01 | 01 | 1 | SA-DASH-01 | unit | `npx vitest run src/app/super-admin/__tests__/dashboardMetrics.test.ts` | ❌ W0 | ⬜ pending |
| 26-01-02 | 01 | 1 | SA-DASH-02 | unit | `npx vitest run src/app/super-admin/__tests__/dashboardMetrics.test.ts` | ❌ W0 | ⬜ pending |
| 26-01-03 | 01 | 1 | SA-DASH-03 | unit | `npx vitest run src/app/super-admin/__tests__/signupTrend.test.ts` | ❌ W0 | ⬜ pending |
| 26-02-01 | 02 | 1 | SA-BILL-01 | manual | Integration test via page render | — | ⬜ pending |
| 26-02-02 | 02 | 1 | SA-BILL-02 | manual | Integration test via page render | — | ⬜ pending |
| 26-02-03 | 02 | 1 | SA-BILL-03 | unit | `npx vitest run src/app/super-admin/__tests__/billingAlerts.test.ts` | ❌ W0 | ⬜ pending |
| 26-03-01 | 03 | 2 | SA-USER-01 | manual | Integration test via page render | — | ⬜ pending |
| 26-03-02 | 03 | 2 | SA-USER-02 | unit | `npx vitest run src/actions/super-admin/__tests__/resetMerchantPassword.test.ts` | ❌ W0 | ⬜ pending |
| 26-03-03 | 03 | 2 | SA-USER-03 | unit | `npx vitest run src/actions/super-admin/__tests__/disableMerchantAccount.test.ts` | ❌ W0 | ⬜ pending |
| 26-03-04 | 03 | 2 | SA-USER-03 | unit | `npx vitest run src/actions/super-admin/__tests__/enableMerchantAccount.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/app/super-admin/__tests__/dashboardMetrics.test.ts` — stubs for SA-DASH-01, SA-DASH-02
- [ ] `src/app/super-admin/__tests__/signupTrend.test.ts` — stubs for SA-DASH-03
- [ ] `src/app/super-admin/__tests__/billingAlerts.test.ts` — stubs for SA-BILL-03
- [ ] `src/actions/super-admin/__tests__/resetMerchantPassword.test.ts` — stubs for SA-USER-02
- [ ] `src/actions/super-admin/__tests__/disableMerchantAccount.test.ts` — stubs for SA-USER-03
- [ ] `src/actions/super-admin/__tests__/enableMerchantAccount.test.ts` — stubs for SA-USER-03

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Stripe subscriptions render on tenant detail | SA-BILL-01 | Requires live Stripe API / complex mock setup | Open tenant detail page for a store with stripe_customer_id, verify subscriptions section shows |
| Stripe invoices render on tenant detail | SA-BILL-02 | Requires live Stripe API / complex mock setup | Open tenant detail page, verify invoices table with status badges |
| Owner email displayed on tenant detail | SA-USER-01 | Requires Supabase Auth Admin call / complex mock | Open tenant detail page, verify owner email and signup date visible |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
