---
phase: 18
slug: code-quality-test-coverage
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-04
---

# Phase 18 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.2 |
| **Config file** | `vitest.config.mts` |
| **Quick run command** | `npm run test` |
| **Full suite command** | `npm run test:coverage` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run test`
- **After every plan wave:** Run `npm run test:coverage`
- **Before `/gsd:verify-work`:** Full suite must be green + `npx tsc --noEmit` zero errors
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 18-01-01 | 01 | 1 | QUAL-03 | type check | `npx tsc --noEmit` | ✅ | ⬜ pending |
| 18-01-02 | 01 | 1 | QUAL-02 | unit | `npm run test` | ✅ (need fixes) | ⬜ pending |
| 18-02-01 | 02 | 1 | TEST-01 | automated | `npm run test:coverage` | ❌ W0 | ⬜ pending |
| 18-02-02 | 02 | 1 | TEST-02 | automated | `npm run test:coverage` | ❌ W0 | ⬜ pending |
| 18-03-01 | 03 | 2 | TEST-02 | unit | `npm run test` | ❌ W0 | ⬜ pending |
| 18-03-02 | 03 | 2 | TEST-03 | integration | `npm run test` | ✅ (need extension) | ⬜ pending |
| 18-03-03 | 03 | 2 | TEST-04 | unit | `npm run test` | ✅ (need extension) | ⬜ pending |
| 18-03-04 | 03 | 2 | TEST-05 | unit | `npm run test` | ❌ W0 | ⬜ pending |
| 18-04-01 | 04 | 3 | QUAL-01 | static analysis | `npx knip` | ❌ W0 | ⬜ pending |
| 18-04-02 | 04 | 3 | QUAL-04 | manual | SQL query | N/A | ⬜ pending |
| 18-04-03 | 04 | 3 | QUAL-05 | type check | `npx tsc --noEmit` | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `@vitest/coverage-v8` install + `vitest.config.mts` coverage config — covers TEST-01, TEST-02
- [ ] `knip` install + `knip.json` config — required before QUAL-01
- [ ] Fix `vitest.config.mts` exclude (add `tests/e2e/**`) — unblocks clean test run
- [ ] `src/lib/gst.ird.test.ts` stubs — IRD specimen tests for TEST-05
- [ ] `src/lib/tenantCache.test.ts` stubs — covers TEST-02 for tenantCache
- [ ] `src/lib/resolveAuth.test.ts` stubs — covers TEST-02 for auth path (if file exists)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| DB indexes confirmed | QUAL-04 | Requires Supabase SQL editor or local DB | Run `SELECT indexname, tablename, indexdef FROM pg_indexes WHERE schemaname='public' ORDER BY tablename;` in Supabase SQL editor |
| JSDoc completeness | QUAL-05 | Requires visual inspection of IDE tooltips | Verify all exported functions have `@param` and `@returns` tags via grep pattern |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
