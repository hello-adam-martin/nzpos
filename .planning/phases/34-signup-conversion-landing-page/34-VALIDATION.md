---
phase: 34
slug: signup-conversion-landing-page
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-06
---

# Phase 34 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.2 + @testing-library/react 16.3.2 |
| **Config file** | `vitest.config.mts` |
| **Quick run command** | `npm test -- --reporter=verbose src/components/pos/__tests__/ src/app/__tests__/` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- --reporter=verbose src/components/pos/__tests__/ src/app/__tests__/`
- **After every plan wave:** Run `npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 34-01-01 | 01 | 0 | CONV-01, CONV-02, CONV-03 | unit | `npm test -- src/components/pos/__tests__/ReceiptScreen.demo.test.tsx` | ❌ W0 | ⬜ pending |
| 34-01-02 | 01 | 0 | LAND-01, LAND-02 | unit | `npm test -- src/app/__tests__/LandingHero.test.tsx` | ❌ W0 | ⬜ pending |
| 34-01-03 | 01 | 1 | CONV-01, CONV-03 | unit | `npm test -- src/components/pos/__tests__/ReceiptScreen.demo.test.tsx` | ❌ W0 | ⬜ pending |
| 34-01-04 | 01 | 1 | LAND-01, LAND-02 | unit | `npm test -- src/app/__tests__/LandingHero.test.tsx` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/components/pos/__tests__/ReceiptScreen.demo.test.tsx` — stubs for CONV-01, CONV-02, CONV-03
- [ ] `src/app/__tests__/LandingHero.test.tsx` — stubs for LAND-01, LAND-02

*Existing `POSClientShell.demo.test.tsx` covers POSTopBar demo mode; ReceiptScreen demo CTA gets its own file.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Ghost button visual hierarchy | LAND-01 | Visual styling on navy background | Verify outline button is visually distinct from amber CTA |
| CTA banner visual treatment | CONV-01 | Visual appearance within receipt card | Verify banner is visible but not intrusive below receipt |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
