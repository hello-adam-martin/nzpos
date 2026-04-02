---
phase: 11
slug: partial-refunds
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-03
---

# Phase 11 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest ^4.1.2 |
| **Config file** | none — auto-detected via `package.json` scripts |
| **Quick run command** | `npx vitest run src/actions/orders/__tests__/processPartialRefund.test.ts` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/actions/orders/__tests__/processPartialRefund.test.ts`
- **After every plan wave:** Run `npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 11-01-01 | 01 | 1 | REFUND-01 | unit | `npx vitest run src/actions/orders/__tests__/processPartialRefund.test.ts -t "validation"` | ❌ W0 | ⬜ pending |
| 11-01-02 | 01 | 1 | REFUND-02 | unit | `npx vitest run src/actions/orders/__tests__/processPartialRefund.test.ts -t "stripe"` | ❌ W0 | ⬜ pending |
| 11-01-03 | 01 | 1 | REFUND-03 | unit | `npx vitest run src/actions/orders/__tests__/processPartialRefund.test.ts -t "stock"` | ❌ W0 | ⬜ pending |
| 11-01-04 | 01 | 1 | REFUND-04 | unit | `npx vitest run src/lib/xero/__tests__/buildCreditNote.test.ts` | ❌ W0 | ⬜ pending |
| 11-01-05 | 01 | 1 | REFUND-04 | unit | `npx vitest run src/actions/orders/__tests__/processPartialRefund.test.ts -t "xero failure"` | ❌ W0 | ⬜ pending |
| 11-01-06 | 01 | 1 | REFUND-05 | unit | `npx vitest run src/actions/orders/__tests__/processPartialRefund.test.ts -t "audit"` | ❌ W0 | ⬜ pending |
| 11-01-07 | 01 | 1 | REFUND-05 | unit | `npx vitest run src/actions/orders/__tests__/processPartialRefund.test.ts -t "status"` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/actions/orders/__tests__/processPartialRefund.test.ts` — stubs for REFUND-01 through REFUND-05
- [ ] Extend `src/lib/xero/__tests__/buildInvoice.test.ts` with partial refund credit note cases

*Existing test infrastructure covers the framework — no new config needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| EFTPOS terminal refund confirmation step | REFUND-01 | Hardware device interaction | Process refund for EFTPOS order, verify terminal prompt appears with correct amount |
| Drawer UX: checkbox + quantity selection | REFUND-01 | Visual/interaction testing | Open order detail, click Refund, verify checkboxes and quantity spinners render correctly |
| Already-refunded items greyed out | REFUND-01 | Visual state verification | Process partial refund, reopen same order, verify refunded items are greyed/disabled |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
