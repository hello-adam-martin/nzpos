---
phase: 17
slug: security-audit
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-04
---

# Phase 17 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 2.x/3.x |
| **Config file** | `vitest.config.ts` |
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
| 17-01-XX | 01 | 1 | SEC-01 | integration | `npx vitest run src/lib/__tests__/rls.test.ts` | ✅ | ⬜ pending |
| 17-01-XX | 01 | 1 | SEC-02 | manual | manual (Supabase Storage API inspection) | ❌ W0 | ⬜ pending |
| 17-01-XX | 01 | 1 | SEC-03 | manual | SQL inspection + GRANT verification | ❌ W0 | ⬜ pending |
| 17-01-XX | 01 | 1 | SEC-04 | unit | verify middleware getUser() pattern | ❌ W0 | ⬜ pending |
| 17-01-XX | 01 | 1 | SEC-05 | unit | `npx vitest run src/actions/auth/staffPin` | ❌ W0 | ⬜ pending |
| 17-01-XX | 01 | 1 | SEC-06 | unit | verify action-level checks | ✅ | ⬜ pending |
| 17-01-XX | 01 | 1 | SEC-07 | integration | middleware test | ❌ W0 | ⬜ pending |
| 17-01-XX | 01 | 1 | SEC-08 | manual | grep audit (static analysis) | ❌ manual-only | ⬜ pending |
| 17-01-XX | 01 | 1 | SEC-09 | manual | grep audit | ❌ manual-only | ⬜ pending |
| 17-01-XX | 01 | 1 | SEC-10 | manual | build verification | ❌ manual-only | ⬜ pending |
| 17-01-XX | 01 | 1 | SEC-11 | unit | `npx vitest run src/app/api/webhooks/stripe/webhook.test.ts` | ✅ | ⬜ pending |
| 17-01-XX | 01 | 1 | SEC-12 | unit | middleware output test | ❌ W0 | ⬜ pending |
| 17-01-XX | 01 | 1 | SEC-13 | unit | existing signup test + new PIN test | ✅ partial | ⬜ pending |
| 17-01-XX | 01 | 1 | SEC-14 | unit | verify super_admin_actions insert | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/actions/auth/__tests__/staffPin.test.ts` — stubs for SEC-05 (PIN lockout behavior)
- [ ] `src/app/api/webhooks/stripe/__tests__/middleware.test.ts` — stubs for SEC-07 (customer auth isolation)
- [ ] `src/middleware.test.ts` — stubs for SEC-12 (CSP headers in response)

*Most audit findings are verified via static analysis / code reading. The above test files are needed for remediation validation.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Zod validation coverage across all 48 actions | SEC-08 | Static analysis — grep for z.safeParse/z.parse patterns | `grep -rL "z\.\(safeParse\|parse\)" src/actions/ --include="*.ts"` excluding test files |
| No secrets in source code | SEC-09 | Pattern scan — not deterministic | `grep -rn "sk_live\|sk_test\|supabase_service_role" src/` should return 0 results |
| server-only guards on admin clients | SEC-10 | Build-time verification | `npx next build` should fail if server-only violated |
| .env.example completeness | SEC-09 | Manual comparison | Cross-check `grep -roh "process.env\.\w*" src/ | sort -u` against `.env.example` |
| Storage bucket RLS policies | SEC-02 | Requires Supabase dashboard/API | Inspect `storage.policies` table via Supabase SQL editor |
| SECURITY DEFINER RPC permissions | SEC-03 | SQL inspection | Verify GRANT statements match expected callers only |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
