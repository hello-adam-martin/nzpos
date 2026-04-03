---
phase: 15
slug: stripe-billing-feature-gating
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-03
---

# Phase 15 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 2.x/3.x (installed) |
| **Config file** | `vitest.config.mts` (project root) |
| **Quick run command** | `npx vitest run src/actions/billing src/lib/__tests__/requireFeature.test.ts` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/actions/billing src/lib/__tests__/requireFeature.test.ts`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 15-01-01 | 01 | 1 | BILL-01 | unit | `npx vitest run src/actions/billing/__tests__/createSubscriptionCheckoutSession.test.ts` | ❌ W0 | ⬜ pending |
| 15-01-02 | 01 | 1 | BILL-01 | unit | same file | ❌ W0 | ⬜ pending |
| 15-02-01 | 02 | 1 | BILL-02 | unit | `npx vitest run src/app/api/webhooks/stripe/billing/__tests__/billing.test.ts` | ❌ W0 | ⬜ pending |
| 15-02-02 | 02 | 1 | BILL-02 | unit | same file | ❌ W0 | ⬜ pending |
| 15-02-03 | 02 | 1 | BILL-02 | unit | same file | ❌ W0 | ⬜ pending |
| 15-03-01 | 03 | 1 | BILL-03 | unit | `npx vitest run src/lib/__tests__/requireFeature.test.ts` | ❌ W0 | ⬜ pending |
| 15-03-02 | 03 | 1 | BILL-03 | unit | same file | ❌ W0 | ⬜ pending |
| 15-03-03 | 03 | 1 | BILL-03 | unit | same file | ❌ W0 | ⬜ pending |
| 15-04-01 | 04 | 2 | BILL-04 | unit | `npx vitest run src/components/admin/billing/__tests__/UpgradePrompt.test.tsx` | ❌ W0 | ⬜ pending |
| 15-05-01 | 05 | 2 | BILL-05 | unit | `npx vitest run src/actions/billing/__tests__/createBillingPortalSession.test.ts` | ❌ W0 | ⬜ pending |
| 15-06-01 | 06 | 2 | BILL-06 | manual | Load `/admin/billing` in browser | — | ⬜ pending |
| 15-06-02 | 06 | 2 | BILL-06 | manual | Check with fresh store account | — | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/actions/billing/__tests__/createSubscriptionCheckoutSession.test.ts` — stubs for BILL-01
- [ ] `src/actions/billing/__tests__/createBillingPortalSession.test.ts` — stubs for BILL-05
- [ ] `src/app/api/webhooks/stripe/billing/__tests__/billing.test.ts` — stubs for BILL-02
- [ ] `src/lib/__tests__/requireFeature.test.ts` — stubs for BILL-03
- [ ] `src/components/admin/billing/__tests__/UpgradePrompt.test.tsx` — stubs for BILL-04

*If none: "Existing infrastructure covers all phase requirements."*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Billing page renders all three add-on cards | BILL-06 | Visual layout verification | Load `/admin/billing`, confirm 3 cards render with correct status |
| Portal link hidden when no `stripe_customer_id` | BILL-06 | Requires specific DB state | Test with fresh store account that has no Stripe customer |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
