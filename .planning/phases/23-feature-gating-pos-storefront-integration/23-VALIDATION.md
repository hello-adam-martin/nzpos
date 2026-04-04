---
phase: 23
slug: feature-gating-pos-storefront-integration
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-04
---

# Phase 23 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 3.x |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run --reporter=verbose` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run --reporter=verbose`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 23-01-01 | 01 | 1 | GATE-01 | unit | `npx vitest run` | ✅ | ⬜ pending |
| 23-01-02 | 01 | 1 | GATE-02 | unit | `npx vitest run` | ✅ | ⬜ pending |
| 23-01-03 | 01 | 1 | GATE-03 | unit | `npx vitest run` | ✅ | ⬜ pending |
| 23-02-01 | 02 | 1 | GATE-04 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 23-02-02 | 02 | 1 | GATE-05 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 23-03-01 | 03 | 2 | POS-01 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 23-03-02 | 03 | 2 | POS-02 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 23-03-03 | 03 | 2 | POS-03 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- Existing infrastructure covers all phase requirements. Vitest is installed and configured. Test files for billing/gating exist from Phase 15. New tests for inventory gating and POS stock behavior will be added alongside implementation.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Stripe checkout redirect flow | GATE-01 | Requires real Stripe session | Create checkout session, verify redirect to Stripe hosted page, complete test payment, verify redirect back to billing page with success param |
| POS visual stock badges | POS-01 | Visual rendering verification | Load POS with inventory-subscribed store, verify green/amber/red badges on physical products |
| Storefront sold-out display | POS-03 | Visual rendering + interaction | Load storefront, verify sold-out badge on zero-stock products, verify add-to-cart disabled |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
