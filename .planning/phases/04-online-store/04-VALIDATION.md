---
phase: 4
slug: online-store
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-01
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | `vitest.config.ts` |
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
| 04-01-01 | 01 | 0 | STORE-01 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 04-02-01 | 02 | 1 | STORE-01 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 04-03-01 | 03 | 1 | STORE-02, DISC-01, DISC-02 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 04-04-01 | 04 | 2 | STORE-03, STORE-04 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 04-05-01 | 05 | 2 | STORE-05, STORE-06, STORE-07 | unit+integration | `npx vitest run` | ❌ W0 | ⬜ pending |
| 04-06-01 | 06 | 3 | STORE-08, STORE-09 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Type bug fixes in `database.ts` — align with actual migration schema
- [ ] `complete_online_sale` RPC migration
- [ ] Product slug migration
- [ ] Test stubs for Stripe webhook, promo code validation, cart logic

*Populated from research findings.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Stripe Checkout redirect | STORE-03 | Requires real Stripe session | Use Stripe CLI test mode, verify redirect URL |
| Click-and-collect status email | STORE-09 | Email delivery | Check Resend dashboard or test inbox |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
