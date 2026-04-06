---
phase: 29-backend-billing-cleanup
plan: "02"
subsystem: billing
tags: [billing, config, testing, email-notifications, cleanup]
dependency_graph:
  requires: []
  provides: [clean-addon-config-without-email-notifications, updated-billing-tests]
  affects: [src/config/addons.ts, src/actions/billing, src/actions/super-admin, docs]
tech_stack:
  added: []
  patterns: [zod-enum-validation, vitest-mock-cleanup]
key_files:
  created: []
  modified:
    - src/config/addons.ts
    - src/actions/billing/createSubscriptionCheckoutSession.ts
    - src/actions/super-admin/activateAddon.ts
    - src/actions/super-admin/deactivateAddon.ts
    - .env.example
    - docs/env-vars.md
    - docs/deploy.md
    - src/lib/__tests__/requireFeature.test.ts
    - src/actions/billing/__tests__/createSubscriptionCheckoutSession.test.ts
    - src/app/api/webhooks/stripe/billing/__tests__/billing.test.ts
    - src/lib/stripe/syncStripeSnapshot.test.ts
    - src/lib/__tests__/schema.test.ts
    - src/actions/super-admin/__tests__/activateAddon.test.ts
    - src/actions/super-admin/__tests__/deactivateAddon.test.ts
decisions:
  - SubscriptionFeature type reduced from 4 values to 3 (xero | custom_domain | inventory)
  - schema.test.ts has_email_notifications assertion changed to true (reflects post-migration state)
  - Pre-existing TS errors in adjustStock.ts and createProduct.ts deferred (out of scope)
metrics:
  duration: "~6 minutes"
  completed: "2026-04-06T06:46:08Z"
  tasks_completed: 2
  files_modified: 14
---

# Phase 29 Plan 02: Backend Billing Cleanup — Remove email_notifications Summary

Remove email_notifications from all TypeScript config, billing actions, super admin actions, env files, docs, and update all affected backend tests so the Stripe billing system only operates on the 3 remaining paid add-ons (Xero, Custom Domain, Inventory).

## What Was Built

- Stripped `email_notifications` from `SubscriptionFeature` union type — now `'xero' | 'custom_domain' | 'inventory'`
- Removed `has_email_notifications` from the `FeatureFlags` interface
- Removed `email_notifications` entries from `PRICE_ID_MAP`, `PRICE_TO_FEATURE`, `FEATURE_TO_COLUMN`, and `ADDONS` array
- Updated `featureSchema` z.enum in `createSubscriptionCheckoutSession.ts`
- Updated feature z.enum in `activateAddon.ts` and `deactivateAddon.ts`
- Removed `STRIPE_PRICE_EMAIL_NOTIFICATIONS` from `.env.example`, `docs/env-vars.md`, and `docs/deploy.md`
- Updated all 7 test files to remove email_notifications references
- 49/49 unit tests in the 6 non-integration test files pass

## Tasks Completed

| Task | Description | Commit | Files |
|------|-------------|--------|-------|
| 1 | Remove email_notifications from config, actions, env, docs | b9f1747 | 7 files |
| 2 | Update all 7 backend test files | ab9ceb9 | 7 files |

## Deviations from Plan

### Auto-fixed Issues

None.

### Notes on Test Results

- **schema.test.ts** is an integration test that hits the local Supabase DB. It now expects `has_email_notifications = true` (which will be correct after the Phase 29 Plan 01 migration runs). Until that migration is applied to the local DB, this 1 test will fail with the actual DB returning `false`. This is expected — the test has been updated to reflect the post-migration state.

- **4 pre-existing failures** in `processPartialRefund.test.ts` and `processRefund.test.ts` are unrelated to this plan — they fail due to `cookies()` being called outside a request scope, which existed before our changes. These are out of scope per SCOPE BOUNDARY rules and logged to deferred items.

- **Pre-existing TypeScript errors** in `adjustStock.ts`, `createProduct.ts`, and `importProducts.ts` are unrelated to this plan and out of scope.

## Known Stubs

None — all changes are cleanup/removal work with no new stubs introduced.

## Self-Check: PASSED

- b9f1747 — feat(29-02): remove email_notifications from config, actions, env, and docs
- ab9ceb9 — test(29-02): update 7 backend test files to remove email_notifications
- `src/config/addons.ts` verified: no `email_notifications` string anywhere
- `src/actions/billing/createSubscriptionCheckoutSession.ts` verified: z.enum is `['xero', 'custom_domain', 'inventory']`
- `src/actions/super-admin/activateAddon.ts` verified: z.enum is `['xero', 'custom_domain', 'inventory']`
- `src/actions/super-admin/deactivateAddon.ts` verified: z.enum is `['xero', 'custom_domain', 'inventory']`
- `.env.example` verified: no `STRIPE_PRICE_EMAIL_NOTIFICATIONS`
- `docs/env-vars.md` verified: no `STRIPE_PRICE_EMAIL_NOTIFICATIONS`
- `docs/deploy.md` verified: no `STRIPE_PRICE_EMAIL_NOTIFICATIONS`
- 49 unit tests pass in 6 non-integration test files
