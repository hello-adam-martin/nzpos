---
phase: 1
slug: foundation
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-01
updated: 2026-04-01
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest |
| **Config file** | `vitest.config.mts` (Plan 01-01 T2) |
| **Quick run command** | `npm run test` |
| **Full suite command** | `npm run test && npm run build` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run test`
- **After every plan wave:** Run `npm run test && npm run build`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | Status |
|---------|------|------|-------------|-----------|-------------------|--------|
| 01-01-T1 | 01 | 1 | FOUND-01 | build check | `npm run build` | pending |
| 01-01-T2 | 01 | 1 | FOUND-07 | config check | `npx vitest run --passWithNoTests` | pending |
| 01-02-T1 | 02 | 2 | FOUND-02, FOUND-03 | SQL check | `grep -c "CREATE TABLE" supabase/migrations/001_initial_schema.sql` | pending |
| 01-02-T2 | 02 | 2 | FOUND-04 | integration | `npm run test -- lib/__tests__/rls` | pending |
| 01-03-T1 | 03 | 2 | FOUND-05 | unit (TDD) | `npx vitest run src/lib/gst.test.ts src/lib/money.test.ts` | pending |
| 01-03-T2 | 03 | 2 | FOUND-06, FOUND-07 | type check | `npx tsc --noEmit` | pending |
| 01-04-T1 | 04 | 3 | AUTH-01, AUTH-02, AUTH-03 | type check | `npx tsc --noEmit` | pending |
| 01-04-T2 | 04 | 3 | AUTH-04, AUTH-05 | build check | `npm run build` | pending |
| 01-05-T1 | 05 | 4 | DEPLOY-02 | file check | `test -f src/app/manifest.ts && test -f public/icons/icon-192.png` | pending |
| 01-05-T2 | 05 | 4 | DEPLOY-01 | file check | `test -f .github/workflows/ci.yml` | pending |

*Status: pending -- green -- red -- flaky*

---

## Wave 0 Requirements

- [x] `vitest.config.mts` — root config file (Plan 01-01 T2 creates this)
- [x] `package.json` test scripts — `"test": "vitest run"`, `"test:watch": "vitest"` (Plan 01-01 T1 creates this)
- [x] `src/lib/gst.test.ts` — covers FOUND-05 (Plan 01-03 T1, TDD RED phase)
- [x] `src/lib/money.test.ts` — covers FOUND-05 (Plan 01-03 T1, TDD RED phase)
- [x] `src/lib/__tests__/rls.test.ts` — covers FOUND-04, cross-tenant isolation (Plan 01-02 T2)

*All Wave 0 test files are created by the plans that need them.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| PWA installs on iPad | DEPLOY-02 | Requires physical iPad with Safari | Open app URL in Safari, tap share, Add to Home Screen, verify standalone fullscreen mode |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved
