---
phase: 16
slug: super-admin-panel
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-03
---

# Phase 16 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest + @testing-library/react |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run --reporter=verbose` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run --reporter=verbose`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 16-01-01 | 01 | 1 | SADMIN-01 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 16-02-01 | 02 | 1 | SADMIN-02 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 16-03-01 | 03 | 2 | SADMIN-03 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 16-04-01 | 04 | 2 | SADMIN-04 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Test stubs for super admin tenant list/search (SADMIN-01)
- [ ] Test stubs for tenant detail page (SADMIN-02)
- [ ] Test stubs for suspend/unsuspend flow (SADMIN-03)
- [ ] Test stubs for manual plan override (SADMIN-04)

*Existing test infrastructure covers framework needs — only phase-specific stubs needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Suspension page renders on tenant's subdomain | SADMIN-03 | Requires subdomain routing + middleware | Visit suspended tenant's subdomain, verify branded suspension page |
| Super admin redirect after login | SADMIN-01 | Requires real auth session + middleware | Log in as super admin, verify redirect to /super-admin/dashboard |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
