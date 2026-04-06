---
phase: 29-backend-billing-cleanup
plan: "01"
subsystem: database-and-email
tags: [sql-migration, auth-hook, email, feature-gate, billing]
dependency_graph:
  requires: []
  provides: [free-email-notifications-db, email-gate-removed]
  affects: [supabase-auth-hook, email-sending, store-provisioning]
tech_stack:
  added: []
  patterns: [auth-hook-rewrite, column-default-change, data-migration]
key_files:
  created:
    - supabase/migrations/031_free_email_notifications.sql
  modified:
    - src/lib/email.ts
decisions:
  - "has_email_notifications column retained in store_plans for backwards compat — always true"
  - "Auth hook now queries only xero, custom_domain, inventory from store_plans"
  - "email.ts sends directly to Resend without any subscription gate"
metrics:
  duration_minutes: 5
  completed_date: "2026-04-06"
  tasks_completed: 2
  tasks_total: 2
  files_changed: 2
---

# Phase 29 Plan 01: Free Email Notifications — DB Migration and Gate Removal Summary

**One-liner:** SQL migration enables has_email_notifications for all stores and sets DEFAULT true; auth hook rewrite drops email_notifications JWT claim; email.ts drops requireFeature gate and sends directly via Resend.

## What Was Built

### Task 1: SQL Migration (031_free_email_notifications.sql)

Three-section migration file:

1. **Data migration** — `UPDATE public.store_plans SET has_email_notifications = true WHERE has_email_notifications = false` ensures all existing stores have the flag enabled.
2. **Column default change** — `ALTER TABLE public.store_plans ALTER COLUMN has_email_notifications SET DEFAULT true` ensures new stores provisioned via `provision_store` inherit the flag automatically.
3. **Auth hook rewrite** — `CREATE OR REPLACE FUNCTION public.custom_access_token_hook` with `email_notifications` removed from: DECLARE block (`v_has_email_notifications`), SELECT clause, INTO clause, and `jsonb_set` claim injection. Preserved unchanged: `v_has_xero`, `v_has_custom_domain`, `v_has_inventory`, and all their corresponding JWT claim injections.

### Task 2: Email Feature Gate Removal (src/lib/email.ts)

Removed two items from `email.ts`:
- Import: `import { requireFeature } from '@/lib/requireFeature'`
- Gate block (6 lines): `requireFeature('email_notifications', { requireDbCheck: true })` call and its conditional early return

The function now flows directly from parameter destructuring to `getResend()`. All existing error handling, Resend client setup, and return types preserved.

## Verification Results

All acceptance criteria passed:
- Migration contains all three sections (data update, default change, auth hook)
- Auth hook preserves `v_has_xero`, `v_has_custom_domain`, `v_has_inventory` variables and their JWT claims
- Auth hook does not reference `v_has_email_notifications` or inject `app_metadata,email_notifications`
- `src/lib/email.ts` contains no `requireFeature` reference
- `src/lib/email.ts` compiles with no TypeScript errors

## Deviations from Plan

None — plan executed exactly as written.

Pre-existing TypeScript errors in other files (`billing/__tests__`, `requireFeature.test.ts`, `adjustStock.ts`, `createProduct.ts`, `importProducts.ts`) were observed during the compile check but are out of scope for this plan — they are in files not touched by this plan.

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1    | 0904afd | feat(29-01): SQL migration to make email notifications free for all stores |
| 2    | f13218c | feat(29-01): remove email_notifications feature gate from email sending |

## Known Stubs

None.

## Self-Check: PASSED

- [x] `supabase/migrations/031_free_email_notifications.sql` exists
- [x] `src/lib/email.ts` exists and has no requireFeature
- [x] Commits 0904afd and f13218c exist in git log
