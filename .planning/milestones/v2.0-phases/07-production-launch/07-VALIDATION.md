---
phase: 7
slug: production-launch
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-02
---

# Phase 7 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest ^2.x |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npm test` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~30 seconds (502 tests) |

---

## Sampling Rate

- **After every task commit:** Run `npm test`
- **After every plan wave:** Run `npm test` + production smoke tests
- **Before `/gsd:verify-work`:** Full suite must be green + production smoke checklist
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 07-01-01 | 01 | 1 | DEPLOY-01 | smoke/manual | `curl -s -o /dev/null -w "%{http_code}" https://<url>/` | N/A | ⬜ pending |
| 07-01-02 | 01 | 1 | DEPLOY-02 | CLI verification | `supabase migration list --linked` | N/A | ⬜ pending |
| 07-02-01 | 02 | 2 | DEPLOY-03 | smoke/manual | Manual test card 4242 4242 4242 4242 | N/A | ⬜ pending |
| 07-02-02 | 02 | 2 | DEPLOY-04 | data verification | `SELECT COUNT(*) FROM products WHERE store_id = '...'` | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. No new test files needed — this is a pure infrastructure/data phase. The existing 502-test suite validates the codebase; DEPLOY-* requirements are verified by smoke tests and manual checks.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| App accessible at Vercel URL | DEPLOY-01 | Requires live production URL | `curl -s -o /dev/null -w "%{http_code}" https://<url>/` returns 200 |
| Auth hook fires on login | DEPLOY-02 | Requires Supabase Dashboard config | Log in as owner, verify JWT contains store_id in Supabase Auth panel |
| Stripe test checkout completes | DEPLOY-03 | Requires live Stripe + production app | Complete checkout with test card 4242..., verify order in admin |
| 200+ products in catalog | DEPLOY-04 | Data import via admin UI | Query `SELECT COUNT(*) FROM products` ≥ 200 |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
