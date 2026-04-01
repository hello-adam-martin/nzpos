---
phase: 6
slug: xero-integration
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-04-01
---

# Phase 6 — Validation Strategy

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
| 06-01-01 | 01 | 1 | XERO-06 | unit | `npm ls xero-node date-fns-tz` | n/a (migration + install) | ⬜ pending |
| 06-01-02 | 01 | 1 | XERO-06 | unit | `npx vitest run src/lib/xero/__tests__/dates.test.ts src/lib/xero/__tests__/buildInvoice.test.ts` | ❌ W0 | ⬜ pending |
| 06-02-01 | 02 | 2 | XERO-01, XERO-06 | typecheck | `npx tsc --noEmit` | n/a (API routes + actions) | ⬜ pending |
| 06-02-02 | 02 | 2 | XERO-05 | typecheck | `npx tsc --noEmit && npx vitest run --reporter=verbose` | n/a (UI components) | ⬜ pending |
| 06-03-01 | 03 | 2 | XERO-02, XERO-03, XERO-04 | unit | `npx vitest run src/lib/xero/__tests__/sync.test.ts` | ❌ W0 | ⬜ pending |
| 06-04-01 | 04 | 3 | XERO-02, XERO-04 | typecheck | `npx tsc --noEmit` | n/a (cron route + action) | ⬜ pending |
| 06-04-02 | 04 | 3 | XERO-03, XERO-05 | typecheck | `npx tsc --noEmit && npx vitest run --reporter=verbose` | n/a (UI components) | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/xero/__tests__/` — test directory for Xero module
- [ ] `src/lib/xero/__tests__/dates.test.ts` — NZ timezone day boundary tests (created in Plan 01, Task 2)
- [ ] `src/lib/xero/__tests__/buildInvoice.test.ts` — Invoice/credit note builder tests (created in Plan 01, Task 2)
- [ ] `src/lib/xero/__tests__/sync.test.ts` — Sync orchestration + retry tests (created in Plan 03, Task 1)
- [ ] Mock Xero API responses for unit tests (no live API calls in CI)

*Existing vitest infrastructure covers framework needs.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Xero OAuth redirect flow | XERO-01 | Requires real Xero developer app and browser redirect | 1. Click "Connect to Xero" 2. Complete OAuth in Xero 3. Verify tokens stored in Vault |
| Xero invoice appears in Xero UI | XERO-02 | Requires Xero sandbox org to verify invoice creation | 1. Trigger manual sync 2. Check Xero demo org for invoice |
| Persistent banner on disconnect/expiry | XERO-05 | Visual verification across admin pages | 1. Connect then disconnect Xero 2. Navigate admin pages 3. Verify banner visible on all pages 4. Verify NO banner on fresh install (never connected) |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
