---
phase: 12
slug: multi-tenant-infrastructure
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-03
---

# Phase 12 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.2 (unit/integration) + Playwright 1.58.2 (E2E) |
| **Config file** | `vitest.config.ts` (exists), `tests/e2e/playwright.config.ts` (Wave 0 creates) |
| **Quick run command** | `npx vitest run src/lib/__tests__/rls.test.ts` |
| **Full suite command** | `npx vitest run && npx playwright test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/lib/__tests__/rls.test.ts`
- **After every plan wave:** Run `npx vitest run && npx playwright test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 12-01-01 | 01 | 1 | TENANT-02 | integration | `npx vitest run src/lib/__tests__/schema.test.ts` | ❌ W0 | ⬜ pending |
| 12-01-02 | 01 | 1 | TENANT-02 | integration | `npx vitest run src/lib/__tests__/schema.test.ts` | ❌ W0 | ⬜ pending |
| 12-02-01 | 02 | 1 | TENANT-01 | E2E | `npx playwright test tests/e2e/tenant-routing.spec.ts` | ❌ W0 | ⬜ pending |
| 12-02-02 | 02 | 1 | TENANT-01 | E2E | `npx playwright test tests/e2e/tenant-routing.spec.ts` | ❌ W0 | ⬜ pending |
| 12-03-01 | 03 | 2 | TENANT-03 | integration | `npx vitest run src/lib/__tests__/rls.test.ts` | ✅ (extend) | ⬜ pending |
| 12-03-02 | 03 | 2 | TENANT-04 | integration | `npx vitest run src/lib/__tests__/rls.test.ts` | ✅ (extend) | ⬜ pending |
| 12-04-01 | 04 | 3 | TENANT-05 | integration | `npx vitest run src/lib/__tests__/rls.test.ts` | ✅ (extend) | ⬜ pending |
| 12-04-02 | 04 | 3 | TENANT-05 | E2E | `npx playwright test tests/e2e/tenant-isolation.spec.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/e2e/playwright.config.ts` — Playwright config with lvh.me baseURL and webServer
- [ ] `tests/e2e/tenant-routing.spec.ts` — stub tests for TENANT-01
- [ ] `tests/e2e/tenant-isolation.spec.ts` — stub tests for TENANT-05 routing layer
- [ ] `src/lib/__tests__/schema.test.ts` — stub tests for TENANT-02 column/table existence
- [ ] Extend `src/lib/__tests__/rls.test.ts` with 3 new attack vectors — TENANT-03, TENANT-04, TENANT-05

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Vercel wildcard domain DNS delegation | TENANT-01 (prod) | Requires DNS registrar access | 1. Add domain to Vercel project 2. Update NS records 3. Verify with `dig +short slug.nzpos.co.nz` |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
