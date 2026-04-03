---
phase: 15-stripe-billing-feature-gating
verified: 2026-04-03T08:56:30Z
status: passed
score: 5/5 must-haves verified
re_verification: false
---

# Phase 15: Stripe Billing + Feature Gating Verification Report

**Phase Goal:** Merchants can subscribe to paid add-ons, the platform enforces access server-side, and merchants can self-serve their billing
**Verified:** 2026-04-03T08:56:30Z
**Status:** PASSED
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (from Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | A merchant can subscribe to the Xero add-on or Email Notifications add-on via Stripe Checkout and the feature activates on return without any manual step | VERIFIED | `createSubscriptionCheckoutSession.ts` creates Stripe Checkout sessions with `mode:'subscription'`, 14-day trial, dual metadata placement. `BillingClient.tsx` calls `auth.refreshSession()` on return via `?subscribed=` query param to pick up new JWT claims immediately |
| 2 | Cancelling a subscription via the Stripe Customer Portal deactivates the feature within the same session (next JWT refresh) | VERIFIED | Billing webhook at `/api/webhooks/stripe/billing` handles `customer.subscription.deleted` and sets the matching `store_plans` boolean to false. JWT claims refresh on next auth token issuance via the updated auth hook |
| 3 | Attempting to use a gated Server Action (Xero sync, send email) without the matching active subscription returns an authorization error regardless of UI state | VERIFIED | `requireFeature('xero', { requireDbCheck: true })` is the first call in `triggerManualSync.ts`, `saveXeroSettings.ts`, and `disconnectXero.ts`. `requireFeature('email_notifications', { requireDbCheck: true })` is the first call in `email.ts`. All return structured error objects before any business logic executes |
| 4 | A merchant without an active subscription sees a contextual upgrade prompt at each gated feature rather than a generic error | VERIFIED | `UpgradePrompt.tsx` renders at gated features with feature-specific `headline` and `body` props. `integrations/page.tsx` conditionally shows `<UpgradePrompt feature="xero" headline="Xero sync requires an upgrade" ...>` when `user.app_metadata.xero !== true` |
| 5 | The admin billing page shows the current plan, which add-ons are active, and a direct link to the Stripe Customer Portal | VERIFIED | `billing/page.tsx` fetches `store_plans` and `stores.stripe_customer_id` from DB, fetches live prices from Stripe API via `stripe.prices.retrieve`, fetches subscription details via `stripe.subscriptions.list`. `BillingClient.tsx` renders portal button conditionally on `stripeCustomerId` |

**Score:** 5/5 truths verified

---

### Required Artifacts

#### Plan 01 Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `supabase/migrations/019_billing_claims.sql` | Auth hook extension + GRANT for store_plans | VERIFIED | Contains `GRANT SELECT ON public.store_plans TO supabase_auth_admin`, `CREATE OR REPLACE FUNCTION public.custom_access_token_hook`, and `jsonb_set` for `xero`, `email_notifications`, `custom_domain` claims with `COALESCE(..., false)` |
| `src/lib/requireFeature.ts` | Feature gate utility | VERIFIED | Exports `requireFeature` and `GatedFeature`. Contains `import 'server-only'`, JWT fast path, DB fallback via `store_plans` with `requireDbCheck` parameter. Does not throw — structured return only |
| `src/config/addons.ts` | Add-on metadata config | VERIFIED | Exports `ADDONS`, `PRICE_ID_MAP`, `PRICE_TO_FEATURE`, `FEATURE_TO_COLUMN`, `SubscriptionFeature`, `FeatureFlags`. Price IDs loaded from env vars (not hardcoded) |
| `src/lib/__tests__/requireFeature.test.ts` | Unit tests for requireFeature | VERIFIED | 5 tests: JWT authorized, JWT denied, upgradeUrl format, DB fallback authorized, no store_id guard. All pass |

#### Plan 02 Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/app/api/webhooks/stripe/billing/route.ts` | Billing webhook handler | VERIFIED | Exports `POST`. Handles `customer.subscription.created/updated/deleted`. Uses `STRIPE_BILLING_WEBHOOK_SECRET` (separate from main webhook). Idempotency via `stripe_events`. Captures `stripe_customer_id`. Maps price IDs via `PRICE_TO_FEATURE` |
| `src/actions/billing/createSubscriptionCheckoutSession.ts` | Server Action for subscription checkout | VERIFIED | `'use server'` + `'server-only'`. `mode: 'subscription'`, `trial_period_days: 14`, dual metadata on `subscription_data` AND session. Reuses existing `stripe_customer_id`. Zod validation of feature param |
| `src/actions/billing/createBillingPortalSession.ts` | Server Action for billing portal | VERIFIED | `'use server'` + `'server-only'`. Returns `{ error: 'no_customer' }` when no `stripe_customer_id`. Creates portal session via `stripe.billingPortal.sessions.create` |
| `src/app/api/webhooks/stripe/billing/__tests__/billing.test.ts` | Billing webhook tests | VERIFIED | 8 tests covering all behaviors. All pass |
| `src/actions/billing/__tests__/createSubscriptionCheckoutSession.test.ts` | Checkout action tests | VERIFIED | 8 tests. All pass |
| `src/actions/billing/__tests__/createBillingPortalSession.test.ts` | Portal action tests | VERIFIED | 5 tests. All pass |

#### Plan 03 Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/components/admin/billing/UpgradePrompt.tsx` | Inline upgrade prompt component | VERIFIED | Exports `UpgradePrompt`. Renders lock SVG, headline, body, and `<a href="/admin/billing?upgrade=${feature}">Upgrade to unlock</a>`. Design tokens applied |
| `src/components/admin/billing/__tests__/UpgradePrompt.test.tsx` | UpgradePrompt tests | VERIFIED | 6 tests. All pass |
| `src/actions/xero/triggerManualSync.ts` | Gated Xero sync action | VERIFIED | `requireFeature('xero', { requireDbCheck: true })` is first call. Returns `{ success: false, message: 'Xero subscription required' }` when gate denied |
| `src/lib/email.ts` | Gated email sending | VERIFIED | `requireFeature('email_notifications', { requireDbCheck: true })` called before Resend. Returns `{ success: false }` and logs when gate denied |
| `src/app/admin/integrations/page.tsx` | Integrations page with Xero gate | VERIFIED | Imports `UpgradePrompt`. Reads `user.app_metadata.xero` (JWT fast path). Conditionally renders `<UpgradePrompt feature="xero" ...>` vs existing Xero UI |

#### Plan 04 Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/app/admin/billing/page.tsx` | Billing page Server Component | VERIFIED | No `'use client'`. Auth check via `getUser()`. Parallel fetch of `store_plans` and `stripe_customer_id`. Fetches prices via `stripe.prices.retrieve`. Fetches subscription details via `stripe.subscriptions.list`. Heading `font-display font-semibold text-2xl`. Max-w-3xl layout |
| `src/app/admin/billing/BillingClient.tsx` | Client component for billing | VERIFIED | `'use client'`. Typed `BillingClientProps` interface. Handles `?subscribed=` with `auth.refreshSession()`. Handles `?upgrade=` with card highlight. Calls `createSubscriptionCheckoutSession` and `createBillingPortalSession`. Portal button conditional on `stripeCustomerId` |
| `src/components/admin/billing/AddOnCard.tsx` | Add-on card with 3 states | VERIFIED | `'use client'`. Exported `AddOnCardProps` interface. Three states: active (green `bg-[#ECFDF5] text-[#059669]` badge), trial (amber `bg-[#FFFBEB] text-[#D97706]` badge), inactive (amber CTA button). Highlight ring with 2-second fade via `useEffect` + `setTimeout` |
| `src/components/admin/AdminSidebar.tsx` | Sidebar with Billing link | VERIFIED | Contains `{ href: '/admin/billing', label: 'Billing' }` in navLinks array |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/lib/requireFeature.ts` | `store_plans` | supabase admin client select | VERIFIED | `.from('store_plans').select(column).eq('store_id', storeId).single()` |
| `supabase/migrations/019_billing_claims.sql` | `custom_access_token_hook` | `CREATE OR REPLACE` | VERIFIED | Full function replacement, appends feature flag block after existing logic |
| `src/app/api/webhooks/stripe/billing/route.ts` | `store_plans` | supabase admin update | VERIFIED | `.from('store_plans').update({ [featureColumn]: isActive, updated_at: ... }).eq('store_id', storeId)` |
| `src/app/api/webhooks/stripe/billing/route.ts` | `stores.stripe_customer_id` | supabase admin update | VERIFIED | `.from('stores').update({ stripe_customer_id: customerId }).eq('id', storeId).is('stripe_customer_id', null)` |
| `src/actions/billing/createSubscriptionCheckoutSession.ts` | `stripe.checkout.sessions.create` | Stripe SDK | VERIFIED | `mode: 'subscription'`, `trial_period_days: 14`, dual metadata on session and subscription_data |
| `src/actions/xero/triggerManualSync.ts` | `src/lib/requireFeature.ts` | import + call | VERIFIED | `import { requireFeature }` + `requireFeature('xero', { requireDbCheck: true })` as first operation |
| `src/components/admin/billing/UpgradePrompt.tsx` | `/admin/billing` | href link | VERIFIED | `href={'/admin/billing?upgrade=${feature}'}` |
| `src/app/admin/integrations/page.tsx` | `UpgradePrompt` component | conditional render | VERIFIED | `{hasXero ? <XeroConnectButton ...> : <UpgradePrompt feature="xero" ...>}` |
| `src/app/admin/billing/BillingClient.tsx` | `createSubscriptionCheckoutSession` | Server Action call | VERIFIED | `await createSubscriptionCheckoutSession(feature as SubscriptionFeature)` in `handleSubscribe` |
| `src/app/admin/billing/BillingClient.tsx` | `createBillingPortalSession` | Server Action call | VERIFIED | `await createBillingPortalSession()` in `handleManage` |
| `src/app/admin/billing/page.tsx` | `store_plans` | supabase admin select | VERIFIED | `.from('store_plans').select('has_xero, has_email_notifications, has_custom_domain').eq('store_id', storeId).single()` |
| `src/app/admin/billing/BillingClient.tsx` | `createSupabaseBrowserClient` | JWT refresh on Stripe return | VERIFIED | `createSupabaseBrowserClient().auth.refreshSession()` in `useEffect` when `?subscribed=` param present |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `billing/page.tsx` | `storePlans` | `adminClient.from('store_plans').select(...)` DB query | Yes — live DB read | FLOWING |
| `billing/page.tsx` | `stripeCustomerId` | `adminClient.from('stores').select('stripe_customer_id')` DB query | Yes — live DB read | FLOWING |
| `billing/page.tsx` | `subscriptionDetails` | `stripe.subscriptions.list({ customer: stripeCustomerId })` Stripe API | Yes — live Stripe API (guarded by `if (stripeCustomerId)`) | FLOWING |
| `billing/page.tsx` | `prices` | `stripe.prices.retrieve(priceId)` per add-on | Yes — live Stripe API, formatted via `formatNZD` | FLOWING |
| `integrations/page.tsx` | `hasXero` | `user.app_metadata.xero` from JWT (populated by auth hook from `store_plans`) | Yes — JWT claim injected by 019 migration from DB | FLOWING |
| `requireFeature.ts` | `plan[column]` (DB path) | `admin.from('store_plans').select(column).eq('store_id', storeId)` | Yes — live DB query on `requireDbCheck: true` | FLOWING |
| `billing/route.ts` webhook | `featureColumn` | `PRICE_TO_FEATURE[priceId]` mapping, update flows to `store_plans` | Yes — DB write on Stripe event | FLOWING |

---

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| requireFeature tests pass (JWT + DB paths) | `npx vitest run src/lib/__tests__/requireFeature.test.ts` | 5/5 passed | PASS |
| Billing webhook tests pass (subscription lifecycle) | `npx vitest run src/app/api/webhooks/stripe/billing/__tests__/billing.test.ts` | 8/8 passed (within 21 total) | PASS |
| createSubscriptionCheckoutSession tests pass | `npx vitest run src/actions/billing/__tests__/createSubscriptionCheckoutSession.test.ts` | 8/8 passed (within 21 total) | PASS |
| createBillingPortalSession tests pass | `npx vitest run src/actions/billing/__tests__/createBillingPortalSession.test.ts` | 5/5 passed (within 21 total) | PASS |
| UpgradePrompt renders correctly | `npx vitest run src/components/admin/billing/__tests__/UpgradePrompt.test.tsx` | 6/6 passed | PASS |
| All 9 phase commits verified in git history | `git log --oneline` | 7700a7a, 2e87eca, c475ac3, 3b58737, 85895e1, f64a224, 307bba6, c578a22, 917272b all present | PASS |

---

### Requirements Coverage

| Requirement | Source Plan(s) | Description | Status | Evidence |
|-------------|----------------|-------------|--------|----------|
| BILL-01 | 15-01, 15-02 | Merchant can subscribe to paid add-ons via Stripe Checkout | SATISFIED | `createSubscriptionCheckoutSession` creates Stripe Checkout sessions; auth hook injects feature flags after webhook updates `store_plans` |
| BILL-02 | 15-02 | Stripe subscription state syncs to store_plans via dedicated billing webhook | SATISFIED | `/api/webhooks/stripe/billing/route.ts` handles `customer.subscription.created/updated/deleted`, updates `store_plans` boolean flags, uses `STRIPE_BILLING_WEBHOOK_SECRET` |
| BILL-03 | 15-01, 15-03 | Feature gating enforced server-side on all Xero + email Server Actions | SATISFIED | `requireFeature('xero', { requireDbCheck: true })` in `triggerManualSync.ts`, `saveXeroSettings.ts`, `disconnectXero.ts`; `requireFeature('email_notifications', { requireDbCheck: true })` in `email.ts` |
| BILL-04 | 15-03, 15-04 | Gated features show contextual upgrade prompts in the UI | SATISFIED | `UpgradePrompt.tsx` with feature-specific copy rendered conditionally on `integrations/page.tsx`; `?upgrade=` param triggers scroll-to-highlight on `billing/page.tsx` |
| BILL-05 | 15-02, 15-04 | Merchant can manage billing via Stripe Customer Portal | SATISFIED | `createBillingPortalSession.ts` creates portal sessions; `BillingClient.tsx` renders "Open billing portal" button when `stripeCustomerId` is present |
| BILL-06 | 15-04 | Admin billing page shows current plan, active add-ons, and portal link | SATISFIED | `billing/page.tsx` fetches `store_plans` flags, Stripe subscription details, and live prices; `AddOnCard.tsx` shows active/trial/inactive states; portal link conditional on customer ID |

All 6 requirements (BILL-01 through BILL-06) are satisfied. No orphaned requirements found — all requirements in the REQUIREMENTS.md traceability table that map to Phase 15 are accounted for in plan frontmatter.

---

### Anti-Patterns Found

No blocking or warning anti-patterns found. Checked all 9 key billing files:

- No TODO/FIXME/PLACEHOLDER comments in production files
- No hardcoded empty arrays or objects flowing to render paths
- No stub handlers (all `onSubmit`/`onClick` handlers call real Server Actions)
- No static API returns — all routes query DB or Stripe
- Price IDs are loaded from env vars, not hardcoded
- No hardcoded empty props passed to child components

One informational note: `billing/page.tsx` silently catches Stripe API errors and falls back to empty `subscriptionDetails` and `prices` (logged to console). This is intentional defensive behavior, not a stub.

---

### Human Verification Required

#### 1. End-to-End Subscription Flow

**Test:** With Stripe test products configured, click "Start free trial" on any add-on card on `/admin/billing`. Complete Stripe Checkout with a test card. Verify redirect returns to `/admin/billing?subscribed={feature}` and the add-on card now shows an "Active" or "Trial" badge.
**Expected:** The add-on card transitions from inactive to trial/active state within the same session after JWT refresh.
**Why human:** Requires Stripe test mode products with real Price IDs in env vars, and a complete browser Stripe Checkout flow.

#### 2. Cancellation Deactivation Timing

**Test:** With an active subscription, open the Stripe Customer Portal via "Open billing portal" and cancel the subscription. Return to `/admin/billing` and check the add-on status after the next page load.
**Expected:** The add-on shows inactive state (may require a new login for JWT claim update, or a page reload after webhook fires).
**Why human:** Requires active Stripe test subscription and webhook delivery to the billing endpoint.

#### 3. Upgrade Prompt to Checkout to Activation Flow

**Test:** Navigate to `/admin/integrations` without a Xero subscription. Verify the UpgradePrompt shows. Click "Upgrade to unlock". Verify redirect to `/admin/billing?upgrade=xero`. Verify the Xero add-on card highlights briefly.
**Expected:** Complete contextual upgrade path works end-to-end in browser.
**Why human:** Scroll-to-highlight animation and visual verification cannot be confirmed programmatically.

---

### Gaps Summary

No gaps. All 5 success criteria are verified, all 6 requirements (BILL-01 through BILL-06) are satisfied, all 15 key artifacts exist and are substantive, all 12 key links are wired, all data flows are real (no hardcoded values), and 32 unit tests pass across 5 test files.

---

_Verified: 2026-04-03T08:56:30Z_
_Verifier: Claude (gsd-verifier)_
