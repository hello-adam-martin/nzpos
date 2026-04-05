---
phase: 27
slug: super-admin-analytics
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-06
---

# Phase 27 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 27-01-01 | 01 | 1 | SA-MRR-01 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 27-01-02 | 01 | 1 | SA-MRR-04 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 27-02-01 | 02 | 2 | SA-MRR-02 | manual | visual chart check | N/A | ⬜ pending |
| 27-02-02 | 02 | 2 | SA-MRR-03 | manual | visual chart check | N/A | ⬜ pending |
| 27-03-01 | 03 | 1 | SA-MRR-05 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] MRR calculation unit tests — verify annual normalisation, trial exclusion, discount handling
- [ ] Sync job unit tests — verify Stripe data transformation to snapshot rows
- [ ] Rate limiting logic tests — verify 5-minute cooldown enforcement

*Existing vitest infrastructure covers test runner needs.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| MRR trend chart renders correctly | SA-MRR-02 | Recharts visual output | Load analytics page, verify 6-month AreaChart renders with data points |
| Churn count and add-on breakdown display | SA-MRR-03 | Visual layout verification | Load analytics page, verify stat cards and horizontal bar chart |
| Page loads under 2 seconds | SA-MRR-04 | Performance timing | Measure page load with browser devtools, confirm <2s from snapshot |
| Refresh button UX (spinner, dimming, countdown) | SA-MRR-05 | Interactive UI state | Click refresh, verify spinner + dimming, re-click within 5min to verify rate limit |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
