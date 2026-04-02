---
phase: 09-notifications
plan: "01"
subsystem: email
tags: [email, resend, react-email, notifications, templates]
dependency_graph:
  requires: []
  provides:
    - src/lib/email.ts (sendEmail helper)
    - src/emails/OnlineReceiptEmail.tsx (NOTIF-01)
    - src/emails/PosReceiptEmail.tsx (NOTIF-02)
    - src/emails/PickupReadyEmail.tsx (NOTIF-03)
    - src/emails/DailySummaryEmail.tsx (NOTIF-04+05)
  affects:
    - Plans 02 and 03 (wire sendEmail into trigger points)
tech_stack:
  added:
    - resend (Resend SDK for transactional email)
    - react-email (template framework)
    - "@react-email/components"
    - "@react-email/render"
  patterns:
    - React Email functional components with inline styles
    - server-only import guard on sendEmail helper
    - Fire-and-forget email pattern (void sendEmail(...))
    - HTML entity encoding awareness in email render output
key_files:
  created:
    - src/lib/email.ts
    - src/emails/components/EmailHeader.tsx
    - src/emails/components/EmailFooter.tsx
    - src/emails/components/LineItemTable.tsx
    - src/emails/OnlineReceiptEmail.tsx
    - src/emails/PosReceiptEmail.tsx
    - src/emails/PickupReadyEmail.tsx
    - src/emails/DailySummaryEmail.tsx
    - src/lib/__tests__/email-sender.test.ts
    - src/lib/__tests__/email-templates.test.tsx
  modified:
    - next.config.ts (serverExternalPackages added)
    - package.json (4 new dependencies)
    - .env.local.example (RESEND_API_KEY, RESEND_FROM_ADDRESS, FOUNDER_EMAIL)
decisions:
  - "Used class-based Resend mock in tests (vi.fn() cannot mock constructors — class syntax required)"
  - "Test assertions use HTML-encoded apostrophes (&#x27;) since @react-email/render HTML-encodes special characters"
  - "DailySummaryEmail zero-sale and low-stock sections are conditionally rendered (not just hidden)"
metrics:
  duration_minutes: 4
  completed_date: "2026-04-02"
  tasks_completed: 2
  tasks_total: 2
  files_created: 10
  files_modified: 3
  tests_added: 29
---

# Phase 09 Plan 01: Email Infrastructure + Templates Summary

Resend SDK installed, sendEmail helper created with server-only guard, and all four React Email templates built with shared sub-components — navy/amber branded, DM Sans font stack, tested with 29 unit tests.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Install Resend deps, create sendEmail helper, add env vars | `0d27d6e` | package.json, next.config.ts, src/lib/email.ts, src/lib/__tests__/email-sender.test.ts, .env.local.example |
| 2 | Create shared sub-components and all four email templates with tests | `6e5acbd` | src/emails/ (7 files), src/lib/__tests__/email-templates.test.tsx |

## What Was Built

### Email Module (`src/lib/email.ts`)
- Resend client singleton initialised with `RESEND_API_KEY`
- `sendEmail()` async helper with `server-only` import guard
- Fire-and-forget safe: catches Resend errors, logs via `console.error('[email] Send failed:')`, returns `{ success: boolean }` without re-throwing

### Shared Sub-components
- **EmailHeader**: Navy `#1E293B` background, white store name (20px/600), optional subtitle (`#94A3B8`), 3px amber `#E67E22` strip below
- **EmailFooter**: Stone-white `#FAFAF9` background, muted `#78716C` 12px text, store address + phone + optional opening hours
- **LineItemTable**: Product rows with quantity, discount rows (amber, 12px, indented), `<Hr>` divider, GST row, total row (16px/600), payment method row (uppercase)

### Email Templates
- **OnlineReceiptEmail** (NOTIF-01): "Thanks for your order" heading, ReceiptData props, full line-item breakdown
- **PosReceiptEmail** (NOTIF-02): "Here's your receipt" heading — identical structure to online receipt
- **PickupReadyEmail** (NOTIF-03): Emerald `#059669` "Ready for pickup" pill, condensed item list (no prices), collection details section
- **DailySummaryEmail** (NOTIF-04+05): Hero 3-stat row, revenue by method table, top-5 products section, conditional low-stock section, zero-sale empty state

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Class-based constructor mock for Resend**
- **Found during:** Task 1 verification
- **Issue:** `vi.fn().mockImplementation(() => ({ ... }))` cannot mock a constructor — Vitest requires a `class` or `function` keyword for constructable mocks
- **Fix:** Changed `vi.mock('resend', ...)` to use `class { emails = { send: mockSend } }` syntax
- **Files modified:** `src/lib/__tests__/email-sender.test.ts`
- **Commit:** `0d27d6e` (applied in same task)

**2. [Rule 1 - Bug] HTML entity encoding in test assertions**
- **Found during:** Task 2 verification (3 of 25 tests failing)
- **Issue:** `@react-email/render` HTML-encodes apostrophes to `&#x27;` — test assertions using raw `'` failed
- **Fix:** Updated 3 test assertions to use `&#x27;` encoded form for store name and "Here's your receipt"
- **Files modified:** `src/lib/__tests__/email-templates.test.tsx`
- **Commit:** `6e5acbd` (applied in same task)

## Known Stubs

None. All templates render real data from their props. No hardcoded placeholder values.

## Test Coverage

| Test file | Tests | Status |
|-----------|-------|--------|
| src/lib/__tests__/email-sender.test.ts | 4 | All passing |
| src/lib/__tests__/email-templates.test.tsx | 25 | All passing |
| **Total** | **29** | **All passing** |

## Self-Check: PASSED

Files exist:
- src/lib/email.ts: FOUND
- src/emails/OnlineReceiptEmail.tsx: FOUND
- src/emails/PosReceiptEmail.tsx: FOUND
- src/emails/PickupReadyEmail.tsx: FOUND
- src/emails/DailySummaryEmail.tsx: FOUND
- src/emails/components/EmailHeader.tsx: FOUND
- src/emails/components/EmailFooter.tsx: FOUND
- src/emails/components/LineItemTable.tsx: FOUND

Commits exist:
- 0d27d6e: FOUND (Task 1)
- 6e5acbd: FOUND (Task 2)
