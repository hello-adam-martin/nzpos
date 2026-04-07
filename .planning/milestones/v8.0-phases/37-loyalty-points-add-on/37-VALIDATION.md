---
phase: 37
slug: loyalty-points-add-on
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-07
---

# Phase 37 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npm test -- --reporter=verbose src/lib/__tests__/loyalty` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- --reporter=verbose src/lib/__tests__/loyalty`
- **After every plan wave:** Run `npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 37-00-01 | 00 | 0 | LOYAL-02/03 | unit | `npm test -- src/lib/__tests__/loyalty-utils.test.ts` | ❌ W0 | ⬜ pending |
| 37-00-02 | 00 | 0 | LOYAL-09 | unit | `npm test -- src/lib/__tests__/pos-cart-loyalty.test.ts` | ❌ W0 | ⬜ pending |
| 37-00-03 | 00 | 0 | LOYAL-02/03 | unit | `npm test -- src/actions/loyalty/__tests__/saveLoyaltySettings.test.ts` | ❌ W0 | ⬜ pending |
| 37-00-04 | 00 | 0 | LOYAL-11 | unit | `npm test -- src/actions/loyalty/__tests__/quickAddCustomer.test.ts` | ❌ W0 | ⬜ pending |
| 37-00-05 | 00 | 0 | LOYAL-04 | unit | `npm test -- src/actions/loyalty/__tests__/lookupCustomerForPOS.test.ts` | ❌ W0 | ⬜ pending |
| 37-01-xx | 01 | 1 | LOYAL-01 | unit | `npm test -- src/app/api/webhooks/stripe/billing/__tests__/billing.test.ts` | extends existing | ⬜ pending |
| 37-02-xx | 02 | 1 | LOYAL-02/03 | unit | `npm test -- src/actions/loyalty/__tests__/saveLoyaltySettings.test.ts` | ❌ W0 | ⬜ pending |
| 37-03-xx | 03 | 2 | LOYAL-04 | unit | `npm test -- src/actions/loyalty/__tests__/lookupCustomerForPOS.test.ts` | ❌ W0 | ⬜ pending |
| 37-04-xx | 04 | 2 | LOYAL-05/06 | unit | `npm test -- src/actions/orders/__tests__/completeSale.test.ts` | extends existing | ⬜ pending |
| 37-05-xx | 05 | 3 | LOYAL-08/09 | unit | `npm test -- src/lib/__tests__/pos-cart-loyalty.test.ts` | ❌ W0 | ⬜ pending |
| 37-06-xx | 06 | 3 | LOYAL-07/10 | manual | Manual QA: /account/profile, /admin/customers | — | ⬜ pending |
| 37-07-xx | 07 | 3 | LOYAL-11 | unit | `npm test -- src/actions/loyalty/__tests__/quickAddCustomer.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/__tests__/loyalty-utils.test.ts` — stubs for calculatePointsEarned, calculateRedemptionDiscount (RED stubs)
- [ ] `src/lib/__tests__/pos-cart-loyalty.test.ts` — stubs for ATTACH_CUSTOMER, DETACH_CUSTOMER, APPLY_LOYALTY_DISCOUNT cart actions (RED stubs)
- [ ] `src/actions/loyalty/__tests__/saveLoyaltySettings.test.ts` — validates schema parsing (RED stubs, LOYAL-02/03)
- [ ] `src/actions/loyalty/__tests__/quickAddCustomer.test.ts` — covers consent_given validation (RED, LOYAL-11)
- [ ] `src/actions/loyalty/__tests__/lookupCustomerForPOS.test.ts` — covers search result shape (RED, LOYAL-04)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Customer profile shows points balance | LOYAL-07 | UI rendering, requires browser | Visit /account/profile while logged in with loyalty active, verify balance displays |
| Admin customer list shows points column | LOYAL-10 | UI rendering, requires browser | Visit /admin/customers with loyalty subscribed, verify Points column visible |
| Online privacy banner shows on first visit | LOYAL-11 | UI rendering + cookie state | Log in as customer after loyalty activated, verify dismissible banner appears |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
