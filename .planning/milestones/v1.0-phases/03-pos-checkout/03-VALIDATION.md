---
phase: 3
slug: pos-checkout
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-01
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 2.x + @testing-library/react 16.x |
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
| 03-01-01 | 01 | 1 | POS-01 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 03-01-02 | 01 | 1 | POS-02 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 03-02-01 | 02 | 1 | POS-03,POS-04 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 03-02-02 | 02 | 1 | DISC-03,DISC-04 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 03-03-01 | 03 | 2 | POS-05,POS-06 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 03-03-02 | 03 | 2 | POS-07 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 03-04-01 | 04 | 2 | POS-08 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 03-04-02 | 04 | 2 | POS-09 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/__tests__/pos-cart.test.ts` — stubs for cart state, quantity adjustments
- [ ] `src/lib/__tests__/pos-discount.test.ts` — stubs for discount + GST recalculation
- [ ] `src/lib/__tests__/pos-sale.test.ts` — stubs for atomic sale completion

*Existing vitest infrastructure covers framework needs. Tests are phase-specific.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| iPad touch targets respond correctly | POS-01 | Requires physical iPad | Tap product tiles, verify 44px+ touch targets |
| EFTPOS terminal confirmation flow | POS-06 | Hardware-dependent | Complete sale, verify full-screen APPROVED prompt |
| Product grid stock refresh after sale | POS-08 | Visual/timing | Complete sale, verify grid counts update without manual refresh |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
