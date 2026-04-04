---
phase: 21
slug: service-product-type-free-tier-simplification
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-04
---

# Phase 21 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
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
| 21-01-01 | 01 | 1 | PROD-01 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 21-01-02 | 01 | 1 | PROD-02 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 21-01-03 | 01 | 1 | PROD-03 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 21-01-04 | 01 | 1 | PROD-04 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 21-02-01 | 02 | 1 | FREE-01 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 21-02-02 | 02 | 1 | FREE-02 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 21-02-03 | 02 | 1 | FREE-03 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 21-03-01 | 03 | 2 | POS-04 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Test stubs for product_type service logic (PROD-01–04)
- [ ] Test stubs for free-tier UI gating (FREE-01–03)
- [ ] Test stubs for POS service product handling (POS-04)

*Existing vitest infrastructure covers framework needs.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Visual: no stock badges on free-tier POS cards | FREE-01 | Visual rendering check | Open POS as free-tier store, verify no stock badge on product cards |
| Visual: no stock column in admin table (free-tier) | FREE-02 | Visual rendering check | Open admin products page as free-tier store, verify no Stock column |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
