---
phase: 5
slug: admin-reporting
status: draft
nyquist_compliant: true
wave_0_complete: false
wave_0_plan: "05-01"
created: 2026-04-01
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.2 |
| **Config file** | `vitest.config.mts` (jsdom environment, tsconfigPaths, react plugin) |
| **Quick run command** | `npm test` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test`
- **After every plan wave:** Run `npm test` + `npm run build`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 05-01-00 | 01 | 0 | ALL | scaffold | `npm test` | Created by Task 0 | ⬜ pending |
| 05-01-01 | 01 | 0 | ADMIN-01, ADMIN-06 | unit | `npm test -- src/lib/__tests__/dashboard.test.ts` | Created by 05-01 Task 0 | ⬜ pending |
| 05-01-02 | 01 | 0 | ADMIN-02 | unit | `npm test -- src/lib/__tests__/cashSession.test.ts` | Created by 05-01 Task 0 | ⬜ pending |
| 05-01-03 | 01 | 0 | ADMIN-03 | unit | `npm test -- src/actions/cash-sessions/__tests__/` | Created by 05-01 Task 0 | ⬜ pending |
| 05-01-04 | 01 | 0 | ADMIN-04, REF-02 | unit | `npm test -- src/lib/__tests__/reports.test.ts` | Created by 05-01 Task 0 | ⬜ pending |
| 05-01-05 | 01 | 0 | ADMIN-05 | unit | `npm test -- src/lib/__tests__/gstReport.test.ts` | Created by 05-01 Task 0 | ⬜ pending |
| 05-01-06 | 01 | 0 | ADMIN-07 | unit | `npm test -- src/lib/__tests__/orderFilters.test.ts` | Created by 05-01 Task 0 | ⬜ pending |
| 05-01-07 | 01 | 0 | REF-01 | unit | `npm test -- src/actions/orders/__tests__/processRefund.test.ts` | Created by 05-01 Task 0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

All 8 test stubs are created by Plan 05-01 Task 0 (first task in the phase):

- [ ] `src/lib/__tests__/dashboard.test.ts` — stubs for ADMIN-01, ADMIN-06
- [ ] `src/lib/__tests__/cashSession.test.ts` — stubs for ADMIN-02
- [ ] `src/actions/cash-sessions/__tests__/openCashSession.test.ts` — stubs for ADMIN-03
- [ ] `src/actions/cash-sessions/__tests__/closeCashSession.test.ts` — stubs for ADMIN-03
- [ ] `src/lib/__tests__/reports.test.ts` — stubs for ADMIN-04, REF-02
- [ ] `src/lib/__tests__/gstReport.test.ts` — stubs for ADMIN-05
- [ ] `src/lib/__tests__/orderFilters.test.ts` — stubs for ADMIN-07
- [ ] `src/actions/orders/__tests__/processRefund.test.ts` — stubs for REF-01

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Recharts renders bar/donut charts correctly | ADMIN-04 | Visual rendering requires browser | Verify chart renders in dev server with sample data |
| Cash-up print/export layout | ADMIN-02 | Print layout is CSS-only | Use browser print preview to verify layout |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (Plan 05-01 Task 0 creates all 8 stubs)
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending execution
