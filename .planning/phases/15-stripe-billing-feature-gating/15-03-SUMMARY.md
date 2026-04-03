---
phase: 15-stripe-billing-feature-gating
plan: "03"
subsystem: billing-feature-gating
tags: [feature-gating, xero, email, upgrade-prompt, server-actions, tdd]
dependency_graph:
  requires: ["15-01"]
  provides: ["server-side-xero-gates", "server-side-email-gate", "upgrade-prompt-component", "integrations-page-gating"]
  affects: ["src/actions/xero", "src/lib/email.ts", "src/app/admin/integrations/page.tsx"]
tech_stack:
  added: ["@testing-library/jest-dom"]
  patterns: ["requireFeature guard at top of Server Actions", "TDD red-green cycle for UI components", "vi.mock for requireFeature in unit tests"]
key_files:
  created:
    - src/components/admin/billing/UpgradePrompt.tsx
    - src/components/admin/billing/__tests__/UpgradePrompt.test.tsx
    - src/test/setup.ts
  modified:
    - src/actions/xero/triggerManualSync.ts
    - src/actions/xero/saveXeroSettings.ts
    - src/actions/xero/disconnectXero.ts
    - src/lib/email.ts
    - src/app/admin/integrations/page.tsx
    - src/lib/__tests__/email-sender.test.ts
    - vitest.config.mts
decisions:
  - "requireFeature guard placed as first operation in all gated Server Actions — before auth check, before any business logic"
  - "email.ts gate returns { success: false } (not void) to match existing return type"
  - "integrations page uses JWT fast path (app_metadata.xero) for has_xero — no DB query needed since page is read-only"
  - "vitest globals: true + setupFiles: jest-dom needed for toBeInTheDocument matchers"
  - "email-sender.test.ts mocks requireFeature to avoid Supabase cookie context error in tests"
metrics:
  duration_seconds: 231
  completed_date: "2026-04-03"
  tasks_completed: 2
  files_created: 3
  files_modified: 7
---

# Phase 15 Plan 03: Server-Side Feature Gates + UpgradePrompt Component Summary

**One-liner:** requireFeature() guards on all Xero/email Server Actions plus UpgradePrompt component with TDD test suite and conditional integrations page rendering.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Add requireFeature guards to Xero + email Server Actions | c475ac3 | triggerManualSync.ts, saveXeroSettings.ts, disconnectXero.ts, email.ts |
| 2 (RED) | Failing tests for UpgradePrompt | 3b58737 | __tests__/UpgradePrompt.test.tsx |
| 2 (GREEN) | UpgradePrompt component + integrations page gating | 307bba6 | UpgradePrompt.tsx, integrations/page.tsx, vitest.config.mts |

## Verification

- `npx vitest run src/components/admin/billing/__tests__/UpgradePrompt.test.tsx` — 6/6 pass
- `grep -r "requireFeature" src/actions/xero/ src/lib/email.ts` — guards in all 4 files
- `grep -r "UpgradePrompt" src/app/admin/integrations/page.tsx` — conditional rendering confirmed
- `grep "Upgrade to unlock" src/components/admin/billing/UpgradePrompt.tsx` — CTA copy confirmed
- TypeScript: no errors in any modified production file

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Missing @testing-library/jest-dom + vitest setup**
- **Found during:** Task 2 (TDD GREEN — tests failing with "Invalid Chai property: toBeInTheDocument")
- **Issue:** vitest.config.mts had no setupFiles and jest-dom was not installed; toBeInTheDocument unavailable
- **Fix:** Installed @testing-library/jest-dom, created src/test/setup.ts, added `globals: true` and `setupFiles` to vitest.config.mts
- **Files modified:** vitest.config.mts, src/test/setup.ts, package.json
- **Commit:** 307bba6

**2. [Rule 1 - Bug] email-sender tests broken by requireFeature guard**
- **Found during:** Task 1 → discovered when running full test suite after email.ts change
- **Issue:** email.ts now calls requireFeature() which calls createSupabaseServerClient() → `cookies()` throws "called outside request scope" in test environment
- **Fix:** Added `vi.mock('@/lib/requireFeature', () => ({ requireFeature: vi.fn().mockResolvedValue({ authorized: true }) }))` and `process.env.RESEND_API_KEY = 'test-api-key'` to email-sender.test.ts
- **Files modified:** src/lib/__tests__/email-sender.test.ts
- **Commit:** 307bba6

## Known Stubs

None — all wired. The UpgradePrompt renders real headline/body props from the calling page. The integrations page reads `user.app_metadata.xero` from the live JWT.

## Self-Check: PASSED

All created files confirmed present on disk. All task commits confirmed in git log.
