---
phase: 33
slug: demo-pos-route-checkout
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-06
---

# Phase 33 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.x + @testing-library/react 16.x |
| **Config file** | `vitest.config.mts` |
| **Quick run command** | `npm test` |
| **Full suite command** | `npm run test:coverage` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test`
- **After every plan wave:** Run `npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 33-01-01 | 01 | 1 | DPOS-01 | manual smoke | N/A — middleware + browser | ❌ manual | ⬜ pending |
| 33-01-02 | 01 | 1 | DPOS-02 | unit | `npm test` | ❌ W0 | ⬜ pending |
| 33-01-03 | 01 | 1 | DPOS-03 | manual smoke | N/A — requires live Supabase | ❌ manual | ⬜ pending |
| 33-01-04 | 01 | 1 | DPOS-04 | unit | `npm test` | ❌ W0 | ⬜ pending |
| 33-01-05 | 01 | 1 | DCHK-01 | unit (existing) | `npm test` | ✅ existing | ⬜ pending |
| 33-01-06 | 01 | 1 | DCHK-02 | unit (existing) | `npm test` | ✅ existing | ⬜ pending |
| 33-01-07 | 01 | 1 | DCHK-03 | unit (existing) | `npm test` | ✅ existing | ⬜ pending |
| 33-01-08 | 01 | 1 | DCHK-04 | unit | `npm test` | ❌ W0 | ⬜ pending |
| 33-01-09 | 01 | 1 | DCHK-05 | unit | `npm test` | ❌ W0 | ⬜ pending |
| 33-01-10 | 01 | 1 | DCHK-06 | unit (existing) | `npm test` | ✅ existing | ⬜ pending |
| 33-01-11 | 01 | 1 | DCHK-07 | unit | `npm test` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/components/pos/__tests__/POSClientShell.demo.test.tsx` — demo mode rendering, feature hiding, sale simulation
  - Covers: DPOS-02, DPOS-04, DCHK-04, DCHK-05, DCHK-07

*Existing infrastructure covers DCHK-01, DCHK-02, DCHK-03, DCHK-06 via cart.ts and gst.ts tests.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| `/demo/pos` accessible without auth | DPOS-01 | Requires running middleware + browser | Visit `/demo/pos` in incognito — should load POS grid with no login |
| Demo store products appear | DPOS-03 | Requires live Supabase with seeded data | Verify product grid shows ~20 products from Aroha Home & Gift |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
