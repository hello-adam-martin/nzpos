---
phase: 13
slug: merchant-self-serve-signup
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-03
---

# Phase 13 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 2.x/3.x |
| **Config file** | `vitest.config.mts` (root) |
| **Quick run command** | `npm run test -- --reporter=verbose src/lib/slugValidation.test.ts src/lib/signupRateLimit.test.ts` |
| **Full suite command** | `npm run test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run test -- --reporter=verbose src/lib/slugValidation.test.ts src/lib/signupRateLimit.test.ts`
- **After every plan wave:** Run `npm run test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 13-01-01 | 01 | 0 | SIGNUP-04 | unit | `npm run test -- src/lib/slugValidation.test.ts` | ❌ W0 | ⬜ pending |
| 13-01-02 | 01 | 0 | SIGNUP-05 | unit | `npm run test -- src/lib/signupRateLimit.test.ts` | ❌ W0 | ⬜ pending |
| 13-01-03 | 01 | 0 | SIGNUP-03 | unit | `npm run test -- src/middleware.test.ts` | ❌ W0 | ⬜ pending |
| 13-01-04 | 01 | 0 | SIGNUP-01 | integration | `npm run test -- src/actions/auth/__tests__/ownerSignup.test.ts` | ❌ W0 | ⬜ pending |
| 13-02-01 | 02 | 1 | SIGNUP-02 | integration | `npm run test -- src/lib/__tests__/rls.test.ts` | Extend existing | ⬜ pending |
| 13-03-01 | 03 | 1 | SIGNUP-01 | unit | `npm run test -- src/actions/auth/__tests__/ownerSignup.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/slugValidation.test.ts` — stubs for SIGNUP-04 (reserved slugs, regex rules, valid/invalid cases)
- [ ] `src/lib/signupRateLimit.test.ts` — stubs for SIGNUP-05 (rate window, max attempts, reset)
- [ ] `src/actions/auth/__tests__/ownerSignup.test.ts` — stubs for SIGNUP-01/02 (mocked Supabase admin client)
- [ ] `src/middleware.test.ts` — stubs for SIGNUP-03 (email gate logic, mock getUser returning unconfirmed user)

*Existing infrastructure covers Vitest framework. Wave 0 adds test files only.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Signup form renders with 4 fields and live slug check | SIGNUP-01 | Visual/interactive UI | Load /signup, verify fields render, type store name, confirm slug auto-generates |
| Provisioning loading screen shows progress steps | SIGNUP-01 | Visual animation/transition | Complete signup, observe provisioning screen shows progress indicators |
| Email verification redirect lands on admin dashboard | SIGNUP-03 | Requires real email delivery | Sign up, check email, click verification link, confirm redirect to admin dashboard |
| Verification screen shows resend button with rate limit | SIGNUP-03 | Interactive UI + timing | Load verification screen, click resend, verify cooldown behavior |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
