---
phase: 30-admin-ui-super-admin
plan: 01
subsystem: admin-billing
tags: [cleanup, email-notifications, billing, ui]
dependency_graph:
  requires: [Phase 29 backend cleanup — SubscriptionFeature type reduced to xero/custom_domain/inventory]
  provides: [clean admin billing UI with no email_notifications dead code]
  affects: [src/app/admin/billing, src/components/admin/billing]
tech_stack:
  added: []
  patterns: [SubscriptionFeature type alignment between config/addons.ts and UI components]
key_files:
  created: []
  modified:
    - src/components/admin/billing/UpgradePrompt.tsx
    - src/components/admin/billing/AddOnCard.tsx
    - src/app/admin/billing/BillingClient.tsx
    - src/app/admin/billing/page.tsx
    - src/components/admin/billing/__tests__/UpgradePrompt.test.tsx
decisions:
  - UpgradePrompt feature type aligned with SubscriptionFeature: xero | custom_domain | inventory
  - AddOnCard email envelope icon removed, inventory cube icon added
  - BillingClient interface drops has_email_notifications, flagMap drops email_notifications entry
  - Billing page select query reduced to has_xero, has_custom_domain, has_inventory
metrics:
  duration: 5 min
  completed: 2026-04-06
  tasks_completed: 2
  files_modified: 5
---

# Phase 30 Plan 01: Admin Billing UI Email Notifications Cleanup Summary

**One-liner:** Removed all email_notifications dead code from admin billing UI components and tests, aligning with Phase 29 backend SubscriptionFeature type reduction.

## What Was Built

Cleaned 4 admin billing files and 1 test file that contained dead code referencing the `email_notifications` feature removed in Phase 29:

- **UpgradePrompt.tsx** — Feature type union changed from `'xero' | 'email_notifications' | 'custom_domain'` to `'xero' | 'custom_domain' | 'inventory'`
- **AddOnCard.tsx** — Removed email envelope SVG icon branch; added inventory cube/box icon branch for the `inventory` feature
- **BillingClient.tsx** — Removed `has_email_notifications: boolean` from `BillingClientProps.storePlans` interface and removed `email_notifications` entry from `flagMap` in `getStatus()`
- **page.tsx** — Updated `.select()` call from `'has_xero, has_email_notifications, has_custom_domain, has_inventory'` to `'has_xero, has_custom_domain, has_inventory'`; updated fallback default object to remove `has_email_notifications: false`
- **UpgradePrompt.test.tsx** — Replaced `email_notifications` test case with `inventory` feature test case

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Remove email_notifications from admin billing components | 42d2602 | UpgradePrompt.tsx, AddOnCard.tsx, BillingClient.tsx, page.tsx |
| 2 | Update UpgradePrompt test to remove email_notifications test case | 3021792 | UpgradePrompt.test.tsx |

## Verification

- `grep -r "email_notifications" src/components/admin/billing/ src/app/admin/billing/` returns zero matches
- `npx vitest run src/components/admin/billing/` — 6 tests pass
- TypeScript errors present are pre-existing in unrelated files (adjustStock.ts, createProduct.ts, importProducts.ts) — out of scope

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None.

## Self-Check: PASSED

- src/components/admin/billing/UpgradePrompt.tsx — exists, contains `'xero' | 'custom_domain' | 'inventory'`
- src/components/admin/billing/AddOnCard.tsx — exists, no email_notifications branch
- src/app/admin/billing/BillingClient.tsx — exists, no has_email_notifications
- src/app/admin/billing/page.tsx — exists, select query excludes email_notifications
- src/components/admin/billing/__tests__/UpgradePrompt.test.tsx — exists, contains inventory test case
- Commits 42d2602 and 3021792 verified in git log
