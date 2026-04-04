---
phase: 24
slug: staff-rbac-foundation
status: draft
nyquist_compliant: true
wave_0_complete: true
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

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | Test File | Status |
|---------|------|------|-------------|-----------|-------------------|-----------|--------|
| 24-01-01 | 01 | 1 | STAFF-01,02,03 | unit | `npx vitest run src/lib/pin.test.ts` | src/lib/pin.test.ts | ⬜ pending |
| 24-01-02 | 01 | 1 | STAFF-01,06 | unit | `npx vitest run src/lib/resolveAuth.test.ts` | src/lib/resolveAuth.test.ts | ⬜ pending |
| 24-02-01 | 02 | 2 | STAFF-01,02,03,04,05 | unit | `npx vitest run src/actions/staff/__tests__/staff-actions.test.ts` | src/actions/staff/__tests__/staff-actions.test.ts | ⬜ pending |
| 24-02-02 | 02 | 2 | STAFF-06 | unit | `npx vitest run src/middleware.test.ts` | src/middleware.test.ts | ⬜ pending |
| 24-03-01 | 03 | 3 | STAFF-01,02,03,04,05 | compile | `npx tsc --noEmit` | n/a (UI) | ⬜ pending |
| 24-03-02 | 03 | 3 | STAFF-06 | compile | `npx tsc --noEmit` | n/a (UI) | ⬜ pending |
| 24-03-03 | 03 | 3 | ALL | manual | human-verify checkpoint | n/a | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] Plan 01 creates `src/lib/pin.test.ts` (PIN utility tests)
- [x] Plan 01 creates `src/lib/resolveAuth.test.ts` (DB-verified auth tests)
- [x] Plan 02 creates `src/actions/staff/__tests__/staff-actions.test.ts` (Server Action tests)
- [x] Plan 02 creates `src/middleware.test.ts` (middleware routing tests)

*All test files are created inline within their respective plans — no separate Wave 0 needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| PIN display modal shows once and dismisses | STAFF-05 | Visual UI behavior | Create staff -> verify PIN modal appears with large text, copy button, warning. Dismiss -> verify PIN not recoverable |
| Manager sidebar shows only allowed links | STAFF-06 | Visual UI layout | Login as manager -> navigate to /admin -> verify only Dashboard, Orders, Reports, Cash-up visible |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** ready
