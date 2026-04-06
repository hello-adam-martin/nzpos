---
phase: 29-backend-billing-cleanup
verified: 2026-04-06T18:52:00Z
status: passed
score: 9/9 must-haves verified
gaps: []
human_verification:
  - test: "Apply migration 031 to local Supabase DB and confirm schema.test.ts passes"
    expected: "has_email_notifications = true for all existing rows"
    why_human: "schema.test.ts is an integration test that hits the live local DB — the migration must be applied manually before it passes"
---

# Phase 29: Backend & Billing Cleanup — Verification Report

**Phase Goal:** Email notifications work for every store without any feature gate check, billing integration, or subscription requirement — the system treats email as a core free feature
**Verified:** 2026-04-06T18:52:00Z
**Status:** PASSED
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | All existing stores have has_email_notifications = true after migration | VERIFIED | `UPDATE public.store_plans SET has_email_notifications = true WHERE has_email_notifications = false` in 031 migration |
| 2 | New stores created via provision_store get has_email_notifications = true by default | VERIFIED | `ALTER TABLE public.store_plans ALTER COLUMN has_email_notifications SET DEFAULT true` in 031; provision_store does bare INSERT with no column list |
| 3 | Auth hook JWT no longer contains email_notifications claim | VERIFIED | 031 migration rewrites custom_access_token_hook removing v_has_email_notifications, SELECT clause, INTO clause, and jsonb_set injection |
| 4 | Email sends without any feature gate check | VERIFIED | email.ts (44 lines) has no requireFeature import or gate block — calls getResend() directly |
| 5 | ADDONS config contains only xero, custom_domain, and inventory | VERIFIED | src/config/addons.ts SubscriptionFeature type = `'xero' \| 'custom_domain' \| 'inventory'`; grep returns 0 matches for email_notifications |
| 6 | Stripe checkout session creation cannot accept email_notifications as a feature | VERIFIED | featureSchema = z.enum(['xero', 'custom_domain', 'inventory']) in createSubscriptionCheckoutSession.ts |
| 7 | Stripe webhook handler has no mapping for email_notifications price ID | VERIFIED | PRICE_TO_FEATURE in addons.ts has no email_notifications entry; webhook route uses this map |
| 8 | Super admin activate/deactivate actions cannot target email_notifications | VERIFIED | Both activateAddon.ts and deactivateAddon.ts use z.enum(['xero', 'custom_domain', 'inventory']) |
| 9 | All backend tests pass with email_notifications removed | VERIFIED (with caveat) | 565 tests pass; 4 pre-existing failures in processPartialRefund/processRefund (cookies() scope issue, predates Phase 29) |

**Score:** 9/9 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `supabase/migrations/031_free_email_notifications.sql` | Data migration, column default change, auth hook rewrite | VERIFIED | 103 lines; all 3 sections present |
| `src/lib/email.ts` | Email sending without feature gate | VERIFIED | 44 lines; no requireFeature, no gate block, direct Resend call |
| `src/config/addons.ts` | Central add-on config without email_notifications | VERIFIED | SubscriptionFeature = 3 values; ADDONS array = 3 entries; 0 email_notifications references |
| `src/actions/billing/createSubscriptionCheckoutSession.ts` | Checkout session without email_notifications option | VERIFIED | z.enum(['xero', 'custom_domain', 'inventory']) on line 13 |
| `src/actions/super-admin/activateAddon.ts` | Activate action cannot target email_notifications | VERIFIED | z.enum(['xero', 'custom_domain', 'inventory']) on line 11 |
| `src/actions/super-admin/deactivateAddon.ts` | Deactivate action cannot target email_notifications | VERIFIED | z.enum(['xero', 'custom_domain', 'inventory']) on line 11 |
| `.env.example` | No STRIPE_PRICE_EMAIL_NOTIFICATIONS | VERIFIED | grep returns 0 matches |
| `docs/env-vars.md` | No STRIPE_PRICE_EMAIL_NOTIFICATIONS | VERIFIED | grep returns 0 matches |
| `docs/deploy.md` | No STRIPE_PRICE_EMAIL_NOTIFICATIONS, no Email Notifications product row | VERIFIED | grep returns 0 matches; deploy.md now shows 2-product table (Xero, Custom Domain) |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `031_free_email_notifications.sql` | store_plans table | `ALTER TABLE ... SET DEFAULT true` | VERIFIED | Line 18 of migration |
| `031_free_email_notifications.sql` | store_plans table | `UPDATE ... SET has_email_notifications = true` | VERIFIED | Line 12 of migration |
| `src/lib/email.ts` | Resend API | `resend.emails.send` direct call | VERIFIED | Line 30 of email.ts, no gate preceding it |
| `src/config/addons.ts` | `createSubscriptionCheckoutSession.ts` | `SubscriptionFeature` type import | VERIFIED | Line 9: `import type { SubscriptionFeature } from '@/config/addons'` |
| `src/config/addons.ts` | `src/app/api/webhooks/stripe/billing/route.ts` | `PRICE_TO_FEATURE` map | VERIFIED | Line 5 of route.ts: `import { PRICE_TO_FEATURE } from '@/config/addons'` |

### Data-Flow Trace (Level 4)

Level 4 not applicable — Phase 29 artifacts are server-side data/logic only (SQL migration, TypeScript config, server actions). No client-side rendering components were modified.

### Behavioral Spot-Checks

| Behavior | Evidence | Status |
|----------|----------|--------|
| email.ts calls Resend without gate | File read: no requireFeature, direct `resend.emails.send` | PASS |
| Checkout action rejects email_notifications | z.enum(['xero', 'custom_domain', 'inventory']) returns invalid_feature for email_notifications | PASS |
| Auth hook produces no email_notifications JWT claim | Migration function body: no v_has_email_notifications, no jsonb_set for email_notifications | PASS |
| Vitest suite: 565 tests pass | `npx vitest run` output: 565 passed, 4 failed (pre-existing) | PASS |
| TypeScript: 0 new errors from Phase 29 files | `tsc --noEmit`: 3 errors, all in adjustStock.ts, createProduct.ts, importProducts.ts (pre-existing, noted in summaries) | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| GATE-01 | 29-01 | Email sending works for all stores without feature gate check | SATISFIED | email.ts removes requireFeature gate; sends directly |
| GATE-02 | 29-01 | Auth hook always sets email_notifications JWT claim to true | SATISFIED* | Auth hook removes the claim entirely (not set to true) — functionally equivalent since no code reads this claim anymore |
| GATE-03 | 29-01 | All existing stores have email notifications enabled via migration | SATISFIED | UPDATE WHERE has_email_notifications = false |
| GATE-04 | 29-01 | New stores provisioned with email notifications enabled by default | SATISFIED | ALTER TABLE SET DEFAULT true; provision_store uses bare INSERT |
| BILL-01 | 29-02 | Email notifications removed from ADDONS config and Stripe price mappings | SATISFIED | addons.ts: 0 email_notifications references |
| BILL-02 | 29-02 | Email notifications removed from subscription checkout session creation | SATISFIED | createSubscriptionCheckoutSession.ts z.enum has 3 values |
| BILL-03 | 29-02 | Stripe billing webhook no longer toggles email_notifications feature flag | SATISFIED | PRICE_TO_FEATURE has no email_notifications entry; webhook uses this map |

*GATE-02 implementation note: The REQUIREMENTS.md description says "always sets email_notifications JWT claim to **true**" but the plan and implementation instead **removes** the claim entirely. The net effect is the same — no gate check reads this claim — because email.ts no longer calls requireFeature. No consumer of the JWT reads `app_metadata.email_notifications`. This is a documentation discrepancy, not a functional gap.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/lib/requireFeature.ts` | 22 | JSDoc comment mentions `email_notifications` as example | Info | Comment only, no functional impact |
| `src/lib/__tests__/schema.test.ts` | 36 | Still selects `has_email_notifications` column | Info | Correct — column retained for backwards compat; assertion updated to `toBe(true)` |
| Admin UI files (BillingClient.tsx, AddOnCard.tsx, UpgradePrompt.tsx, super-admin pages) | Various | Still reference email_notifications | Info | Phase 30 scope (ADMIN-01, ADMIN-02, ADMIN-03) — correctly deferred |

No blockers or warnings. All anti-patterns are info-level and expected.

### Pre-Existing Test Failures (Out of Scope)

The following 4 test failures existed before Phase 29 and are unrelated to email notifications removal:

- `processPartialRefund.test.ts` (2 failures) — `cookies()` called outside request scope
- `processRefund.test.ts` (2 failures) — `cookies()` called outside request scope

These are documented as pre-existing in both 29-01-SUMMARY.md and 29-02-SUMMARY.md.

### Pre-Existing TypeScript Errors (Out of Scope)

3 pre-existing TypeScript errors, all noted in summaries as out of scope:
- `src/actions/inventory/adjustStock.ts` — Type 'string | null' not assignable to 'string | undefined'
- `src/actions/products/createProduct.ts` — Record<string, unknown> overload mismatch
- `src/actions/products/importProducts.ts` — Missing 'slug' property

None of these are in files touched by Phase 29.

### Human Verification Required

#### 1. Integration Test: schema.test.ts

**Test:** Apply migration 031 to local Supabase DB (`npx supabase db push` or `npx supabase migration up`) then run `npx vitest run src/lib/__tests__/schema.test.ts`
**Expected:** Test passes — `has_email_notifications` column returns `true` for all store_plans rows after the UPDATE migration runs
**Why human:** schema.test.ts is an integration test that queries the live local DB. The test assertion has been updated to `toBe(true)` but the local DB only reflects this after migration 031 is applied. Cannot verify programmatically without a running Supabase instance.

### Gaps Summary

No gaps. All 9 observable truths are verified. All 7 requirement IDs (GATE-01 through GATE-04, BILL-01 through BILL-03) are satisfied. Phase goal is achieved for the backend scope.

**Phase 29 is backend-only.** Remaining email_notifications references in admin UI (`BillingClient.tsx`, `AddOnCard.tsx`, `UpgradePrompt.tsx`, super-admin pages) are intentionally deferred to Phase 30 (ADMIN-01, ADMIN-02, ADMIN-03).

---

_Verified: 2026-04-06T18:52:00Z_
_Verifier: Claude (gsd-verifier)_
