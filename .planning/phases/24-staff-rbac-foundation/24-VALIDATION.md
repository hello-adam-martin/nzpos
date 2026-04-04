---
phase: 24
slug: staff-rbac-foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-05
---

# Phase 24 — Validation Strategy

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
| 24-01-01 | 01 | 1 | STAFF-01 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 24-01-02 | 01 | 1 | STAFF-02 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 24-02-01 | 02 | 1 | STAFF-03 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 24-02-02 | 02 | 1 | STAFF-04 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 24-03-01 | 03 | 2 | STAFF-05 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 24-03-02 | 03 | 2 | STAFF-06 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Test stubs for STAFF-01 through STAFF-06 covering role model, middleware, staff CRUD, permission checks
- [ ] Shared fixtures for staff test data (owner, manager, staff users)

*Existing vitest infrastructure covers framework needs — stubs needed for phase-specific requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| PIN display modal shows once and dismisses | STAFF-05 | Visual UI behavior | Create staff → verify PIN modal appears with large text, copy button, warning. Dismiss → verify PIN not recoverable |
| Manager sidebar shows only allowed links | STAFF-06 | Visual UI layout | Login as manager → navigate to /admin → verify only Dashboard, Orders, Reports, Cash-up visible |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
