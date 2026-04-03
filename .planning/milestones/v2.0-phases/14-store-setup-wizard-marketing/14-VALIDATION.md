---
phase: 14
slug: store-setup-wizard-marketing
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-03
---

# Phase 14 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | vitest.config.ts |
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
| 14-01-01 | 01 | 1 | SETUP-01 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 14-01-02 | 01 | 1 | SETUP-02 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 14-01-03 | 01 | 1 | SETUP-03 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 14-02-01 | 02 | 2 | MKTG-01 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 14-02-02 | 02 | 2 | MKTG-02 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Test stubs for wizard step validation (SETUP-01, SETUP-02)
- [ ] Test stubs for setup checklist logic (SETUP-03)
- [ ] Test stubs for landing page rendering (MKTG-01, MKTG-02)

*Existing infrastructure covers test framework — only test files needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Landing page < 2s mobile load | MKTG-01 | Requires real network throttling | Use Chrome DevTools, Slow 3G preset, measure LCP |
| Wizard UX flow timing < 5 min | SETUP-01 | Subjective UX timing | Walk through wizard as new merchant, time full flow |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
