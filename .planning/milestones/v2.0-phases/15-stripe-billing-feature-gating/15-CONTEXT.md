# Phase 15: Stripe Billing + Feature Gating - Context

**Gathered:** 2026-04-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Merchants can subscribe to paid add-ons (Xero sync, Email Notifications, Custom Domain) via Stripe Checkout, the platform enforces access server-side via requireFeature(), and merchants can self-serve their billing through a dedicated admin billing page and the Stripe Customer Portal.

</domain>

<decisions>
## Implementation Decisions

### Subscription Model + Pricing
- **D-01:** Separate Stripe subscriptions per add-on. Each add-on (Xero, Email Notifications, Custom Domain) is its own Stripe Product + Price. Merchants can subscribe to any combination independently. Maps directly to the 3 boolean flags on `store_plans`.
- **D-02:** Prices managed in Stripe dashboard, not hardcoded. Code references Stripe Price IDs from environment variables or a config table. Pricing can be changed in Stripe without code changes. Super admin panel (Phase 16) may surface this.
- **D-03:** 14-day free trial on all paid add-ons. Stripe handles trial periods natively. After trial, auto-charges if payment method on file, or feature deactivates.

### Checkout + Activation Flow
- **D-04:** Stripe Checkout (hosted page) for subscriptions. Same pattern as existing online store checkout. Redirect to Stripe, merchant returns to success URL. Handles card input, SCA, receipts.
- **D-05:** Webhook flips the flag. `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted` events update `store_plans` boolean flags. Feature available on next page load. Reliable, async, handles edge cases.
- **D-06:** Stripe Customer Portal for cancellation and billing management. Link from admin billing page. Merchant manages cancellation, payment methods, invoices there. Feature deactivates via webhook on period end. Zero custom cancel UI.

### Server-Side Gating Enforcement
- **D-07:** Dual flag source: JWT claims for fast path, DB lookup as fallback. The existing `custom_access_token_hook` adds feature flags to JWT claims (zero DB lookup on reads). For critical mutations (Xero sync, send email), also verify against `store_plans` DB to catch cancellations between JWT refreshes.
- **D-08:** `requireFeature()` returns structured error with upgrade context: `{ authorized: false, feature: 'xero', upgradeUrl: '/admin/billing?upgrade=xero' }`. UI can render contextual upgrade prompts from this shape. Not a thrown error, a returned result.
- **D-09:** All Xero Server Actions and email notification Server Actions must call `requireFeature()` before executing. This is the enforcement layer regardless of what the UI shows.

### Upgrade Prompt UX
- **D-10:** Inline contextual prompts at gated features. Replace the gated content area with a styled card: icon + feature-specific headline ("Sync your sales to Xero") + benefit line + "Upgrade" CTA button linking to `/admin/billing?upgrade={feature}`. Stays on the same page.
- **D-11:** Billing page shows all add-ons with status. Each add-on rendered as a card: active ones show "Active" badge + manage link (Stripe Customer Portal), inactive ones show price + trial info + "Subscribe" CTA. One-stop billing overview.

### Claude's Discretion
- Stripe Product/Price ID environment variable naming and config structure
- Webhook handler implementation details (extend existing handler vs separate endpoint)
- `requireFeature()` implementation details (middleware vs per-action call)
- JWT claim key naming for feature flags
- Billing page layout and card design
- Upgrade prompt copy and visual style
- Stripe Customer Portal configuration (which features to enable)
- Whether to create a separate billing webhook endpoint or extend the existing one
- How to handle `stripe_customer_id` creation (on first checkout vs on signup)
- Success/cancel URL paths after Stripe Checkout

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Database & Schema
- `supabase/migrations/014_multi_tenant_schema.sql` -- `store_plans` table with `has_xero`, `has_email_notifications`, `has_custom_domain`, `stripe_customer_id`, `stripe_subscription_id` columns. This is the source of truth for feature flags.
- `supabase/migrations/015_rls_policy_rewrite.sql` -- RLS policies for `store_plans`: owner can read own, super admin can read all, no INSERT/UPDATE (service role only).
- `supabase/migrations/017_provision_store_rpc.sql` -- `provision_store()` RPC creates `store_plans` row with all flags `false` on signup.

### Existing Stripe Integration
- `src/lib/stripe.ts` -- Stripe server client initialization. Reuse for subscription API calls.
- `src/app/api/webhooks/stripe/route.ts` -- Existing webhook handler for `checkout.session.completed` (order checkout). Extend or create separate handler for subscription events.
- `src/actions/orders/createCheckoutSession.ts` -- Existing Stripe Checkout pattern. Reference for subscription checkout implementation.

### Auth & Custom Claims
- `supabase/config.toml` section `[auth.hook.custom_access_token]` -- Custom access token hook already enabled, points to `public.custom_access_token_hook`. Feature flags should be added to JWT claims here.
- `src/middleware.ts` -- Admin route protection, session refresh, role checks. Feature gating may extend this or operate at Server Action level.
- `src/lib/resolveAuth.ts` -- Server-side auth resolution. Used by all admin Server Actions.

### Features to Gate
- `src/lib/xero/sync.ts` -- Xero daily sync logic. Must be gated by `has_xero`.
- `src/lib/xero/client.ts` -- Xero API client.
- `src/app/admin/integrations/page.tsx` -- Xero admin UI. Show upgrade prompt when `has_xero` is false.
- `src/lib/email.ts` -- Email sending via Resend. Gate by `has_email_notifications`.

### Admin Pages
- `src/app/admin/settings/page.tsx` -- Existing settings page. Billing page follows similar Server Component + Client Component pattern.
- `src/app/admin/dashboard/page.tsx` -- Dashboard page. May link to billing.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/stripe.ts` -- Stripe server client, reuse for subscription API calls
- `src/app/api/webhooks/stripe/route.ts` -- Webhook verification pattern with `stripe_events` idempotency table
- `src/actions/orders/createCheckoutSession.ts` -- Checkout Session creation pattern (metadata, success/cancel URLs)
- `src/lib/resolveAuth.ts` -- Auth resolution for Server Actions, extend for feature checks
- `custom_access_token_hook` -- Already adding `role` and `store_id` to JWT claims, extend with feature flags

### Established Patterns
- Server Actions with Zod validation for all mutations
- Webhook idempotency via `stripe_events` table
- Admin pages: Server Component for data fetching + Client Component for interactivity
- Middleware-based route protection and session refresh

### Integration Points
- `custom_access_token_hook` SQL function: add `has_xero`, `has_email_notifications`, `has_custom_domain` to JWT claims from `store_plans`
- Existing webhook handler: extend with subscription event types or create parallel endpoint
- Admin nav: add "Billing" link to admin sidebar/navigation
- Xero integration page: wrap content with feature gate check
- Email notification actions: add `requireFeature('email_notifications')` guard

</code_context>

<specifics>
## Specific Ideas

- Stripe Customer Portal handles all billing self-service (cancel, update card, view invoices) so no custom billing management UI needed
- Price IDs in environment variables means pricing changes are a Stripe dashboard operation, not a code deploy
- The dual JWT + DB gating approach balances performance (most reads from JWT) with accuracy (critical writes check DB) and handles the edge case where subscription was cancelled between JWT refreshes

</specifics>

<deferred>
## Deferred Ideas

None -- discussion stayed within phase scope.

</deferred>

---

*Phase: 15-stripe-billing-feature-gating*
*Context gathered: 2026-04-03*
