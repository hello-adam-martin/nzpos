---
phase: 15-stripe-billing-feature-gating
plan: 02
subsystem: payments
tags: [stripe, webhooks, subscriptions, server-actions, vitest, tdd]

# Dependency graph
requires:
  - phase: 15-01
    provides: PRICE_TO_FEATURE map, PRICE_ID_MAP, SubscriptionFeature type, addons.ts config

provides:
  - Billing webhook handler for Stripe subscription lifecycle events
  - Server Action to create Stripe Checkout subscription sessions (with 14-day trial)
  - Server Action to create Stripe Billing Portal sessions
  - Unit tests for all three files (21 tests total)
  - stripe_customer_id capture from first webhook event

affects:
  - 15-03 (RLS policies and middleware need store_plans updated by this webhook)
  - 15-04 (billing UI page calls these Server Actions)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Separate Stripe instance per Route Handler (do not import shared stripe client in webhook routes)
    - Dual metadata placement: subscription_data.metadata AND session metadata (Research Pitfall 4)
    - Idempotency via stripe_events table: check-before-insert pattern
    - Fallback store resolution: metadata.store_id first, then stores table lookup by stripe_customer_id
    - Auth check via supabase.auth.getUser() extracting store_id from app_metadata JWT claims

key-files:
  created:
    - src/app/api/webhooks/stripe/billing/route.ts
    - src/app/api/webhooks/stripe/billing/__tests__/billing.test.ts
    - src/actions/billing/createSubscriptionCheckoutSession.ts
    - src/actions/billing/createBillingPortalSession.ts
    - src/actions/billing/__tests__/createSubscriptionCheckoutSession.test.ts
    - src/actions/billing/__tests__/createBillingPortalSession.test.ts
  modified: []

key-decisions:
  - "Billing webhook uses STRIPE_BILLING_WEBHOOK_SECRET (not STRIPE_WEBHOOK_SECRET) — separate endpoint, separate secret"
  - "stripe_customer_id captured on first webhook event via UPDATE...WHERE stripe_customer_id IS NULL — no duplicate writes"
  - "No server-only import in Route Handler — API routes are already server-side, import causes build issues"
  - "Protocol auto-detected from host header (http for localhost/lvh.me, https otherwise) — no hardcoded protocol"

patterns-established:
  - "Webhook Pattern 3: separate Route Handler per webhook category with own signing secret"
  - "Server Action auth pattern: getUser() -> app_metadata.store_id -> adminClient for DB queries"

requirements-completed: [BILL-01, BILL-02, BILL-05]

# Metrics
duration: 2min
completed: 2026-04-03
---

# Phase 15 Plan 02: Stripe Billing Plumbing Summary

**Stripe billing webhook handler + subscription checkout + billing portal Server Actions, with 21 unit tests covering all lifecycle events, idempotency, trial periods, and auth guards**

## Performance

- **Duration:** 2 min
- **Started:** 2026-04-03T05:37:01Z
- **Completed:** 2026-04-03T05:39:30Z
- **Tasks:** 2 (both TDD)
- **Files created:** 6

## Accomplishments

- Billing webhook handler processes `customer.subscription.created/updated/deleted` events, updating `store_plans` boolean flags and capturing `stripe_customer_id` on first event
- Subscription checkout Server Action creates Stripe Checkout sessions with 14-day trial, dual metadata placement (session + subscription_data), and customer reuse for existing Stripe customers
- Billing portal Server Action creates self-service sessions, guarding against missing `stripe_customer_id` with structured error response
- 21 unit tests across all 3 files using `vi.hoisted()` pattern, covering all behaviors including idempotency, auth failures, deleted subscriptions, and trialing status

## Task Commits

Each task was committed atomically:

1. **Task 1: Billing webhook handler with tests** - `85895e1` (feat)
2. **Task 2: Subscription checkout + billing portal Server Actions with tests** - `f64a224` (feat)

## Files Created/Modified

- `src/app/api/webhooks/stripe/billing/route.ts` - Billing webhook Route Handler for subscription events
- `src/app/api/webhooks/stripe/billing/__tests__/billing.test.ts` - 8 unit tests for webhook handler
- `src/actions/billing/createSubscriptionCheckoutSession.ts` - Server Action for subscription Checkout sessions
- `src/actions/billing/createBillingPortalSession.ts` - Server Action for Billing Portal sessions
- `src/actions/billing/__tests__/createSubscriptionCheckoutSession.test.ts` - 8 tests for checkout action
- `src/actions/billing/__tests__/createBillingPortalSession.test.ts` - 5 tests for portal action

## Decisions Made

- **No `server-only` import in billing Route Handler** — Route Handlers already run server-side; this import can cause build issues in API routes. Only used in Server Actions.
- **Separate Stripe instance per Route Handler** — webhook handlers need raw constructor access for `constructEvent`; don't import from shared `@/lib/stripe`.
- **Protocol auto-detected** — `http` for localhost/lvh.me, `https` otherwise, from the `host` header. No environment variable needed.
- **`stripe_customer_id` captured with WHERE IS NULL guard** — prevents overwriting existing customer ID if multiple events arrive.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

External services require manual configuration before this plan's code works end-to-end. See plan frontmatter `user_setup` section:
- Create 3 Stripe Products (Xero Accounting, Email Notifications, Custom Domain) with monthly recurring NZD prices
- Add env vars: `STRIPE_BILLING_WEBHOOK_SECRET`, `STRIPE_PRICE_XERO`, `STRIPE_PRICE_EMAIL_NOTIFICATIONS`, `STRIPE_PRICE_CUSTOM_DOMAIN`
- Create billing webhook endpoint in Stripe Dashboard pointing to `/api/webhooks/stripe/billing`
- Configure Stripe Customer Portal (enable subscription cancellation + invoice history)

## Next Phase Readiness

- Billing webhook, checkout action, and portal action are all ready
- Plan 03 (RLS policies) will add store_plans access control so middleware can read feature flags
- Plan 04 (billing UI) will call `createSubscriptionCheckoutSession` and `createBillingPortalSession` from the `/admin/billing` page

## Self-Check

- [x] `src/app/api/webhooks/stripe/billing/route.ts` — exists, verified
- [x] `src/actions/billing/createSubscriptionCheckoutSession.ts` — exists, verified
- [x] `src/actions/billing/createBillingPortalSession.ts` — exists, verified
- [x] All 6 test files exist
- [x] `85895e1` commit exists (Task 1)
- [x] `f64a224` commit exists (Task 2)
- [x] 21 tests passing (3 test files, all green)

## Self-Check: PASSED

---
*Phase: 15-stripe-billing-feature-gating*
*Completed: 2026-04-03*
