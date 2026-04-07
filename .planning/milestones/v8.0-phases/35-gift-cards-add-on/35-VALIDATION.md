---
phase: 35
slug: gift-cards-add-on
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-06
---

# Phase 35 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 3.x + @testing-library/react |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run --reporter=verbose` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run --reporter=verbose`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 35-01-01 | 01 | 1 | GIFT-01 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 35-01-02 | 01 | 1 | GIFT-02 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 35-02-01 | 02 | 1 | GIFT-03 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 35-02-02 | 02 | 1 | GIFT-04 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 35-03-01 | 03 | 2 | GIFT-05 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 35-03-02 | 03 | 2 | GIFT-06 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 35-04-01 | 04 | 2 | GIFT-07 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 35-04-02 | 04 | 2 | GIFT-08 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 35-05-01 | 05 | 3 | GIFT-09 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 35-05-02 | 05 | 3 | GIFT-10 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 35-05-03 | 05 | 3 | GIFT-11 | integration | `npx vitest run` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Gift card utility test stubs for code generation, expiry validation, balance operations
- [ ] Gift card RPC test stubs for issuance and redemption
- [ ] Cart state machine test stubs for gift card payment method

*Existing vitest infrastructure covers framework — no new install needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Email delivery with code/balance/expiry | GIFT-04 | Requires email service | Check Resend dashboard for sent email with correct template |
| Stripe subscription activates feature | GIFT-01 | Requires Stripe webhook | Create test subscription in Stripe dashboard, verify feature flag |
| POS receipt shows gift card details | GIFT-08 | Visual verification | Complete POS sale with gift card, check receipt display |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
