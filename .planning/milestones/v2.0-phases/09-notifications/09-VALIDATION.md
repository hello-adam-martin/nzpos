---
phase: 9
slug: notifications
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-02
---

# Phase 9 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 2.x |
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
| 09-01-01 | 01 | 1 | NOTIF-01, NOTIF-02 | unit | `npx vitest run src/lib/__tests__/email` | ❌ W0 | ⬜ pending |
| 09-01-02 | 01 | 1 | NOTIF-03 | unit | `npx vitest run src/lib/__tests__/email` | ❌ W0 | ⬜ pending |
| 09-02-01 | 02 | 1 | NOTIF-01 | unit | `npx vitest run src/app/api/webhooks` | ❌ W0 | ⬜ pending |
| 09-02-02 | 02 | 1 | NOTIF-02 | unit | `npx vitest run src/actions` | ❌ W0 | ⬜ pending |
| 09-02-03 | 02 | 1 | NOTIF-03 | unit | `npx vitest run src/actions` | ❌ W0 | ⬜ pending |
| 09-03-01 | 03 | 2 | NOTIF-04, NOTIF-05 | unit | `npx vitest run src/app/api/cron` | ❌ W0 | ⬜ pending |
| 09-04-01 | 04 | 2 | NOTIF-06 | unit | `npx vitest run src/hooks` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/__tests__/email-templates.test.tsx` — stubs for NOTIF-01, NOTIF-02, NOTIF-03 email rendering
- [ ] `src/lib/__tests__/email-sender.test.ts` — stubs for Resend send calls (mocked)
- [ ] `src/app/api/cron/__tests__/daily-summary.test.ts` — stubs for NOTIF-04, NOTIF-05

*Existing vitest infrastructure covers test runner. React Email rendering tests need `@react-email/render` installed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Email arrives in inbox within 60s | NOTIF-01 | Requires real Resend API + real email inbox | Complete a Stripe test purchase, check inbox within 60s |
| iPad plays chime sound | NOTIF-06 | Requires iPad Safari + audio autoplay | Open POS on iPad, place online order, verify chime plays |
| Daily summary at 7 AM NZST | NOTIF-04 | Requires Vercel cron trigger at scheduled time | Verify cron fires at correct UTC time via Vercel dashboard |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
