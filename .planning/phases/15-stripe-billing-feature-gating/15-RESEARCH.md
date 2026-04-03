# Phase 15: Stripe Billing + Feature Gating - Research

**Researched:** 2026-04-03
**Domain:** Stripe Subscriptions, Billing Portal, JWT-based feature gating, Server Action guards
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Separate Stripe subscriptions per add-on. Each add-on (Xero, Email Notifications, Custom Domain) is its own Stripe Product + Price. Merchants can subscribe to any combination independently. Maps directly to the 3 boolean flags on `store_plans`.
- **D-02:** Prices managed in Stripe dashboard, not hardcoded. Code references Stripe Price IDs from environment variables or a config table. Pricing can be changed in Stripe without code changes.
- **D-03:** 14-day free trial on all paid add-ons. Stripe handles trial periods natively. After trial, auto-charges if payment method on file, or feature deactivates.
- **D-04:** Stripe Checkout (hosted page) for subscriptions. Same pattern as existing online store checkout. Redirect to Stripe, merchant returns to success URL.
- **D-05:** Webhook flips the flag. `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted` events update `store_plans` boolean flags. Feature available on next page load. Reliable, async, handles edge cases.
- **D-06:** Stripe Customer Portal for cancellation and billing management. Link from admin billing page. Feature deactivates via webhook on period end. Zero custom cancel UI.
- **D-07:** Dual flag source: JWT claims for fast path, DB lookup as fallback. The existing `custom_access_token_hook` adds feature flags to JWT claims. For critical mutations (Xero sync, send email), also verify against `store_plans` DB.
- **D-08:** `requireFeature()` returns structured error with upgrade context: `{ authorized: false, feature: 'xero', upgradeUrl: '/admin/billing?upgrade=xero' }`. Not a thrown error, a returned result.
- **D-09:** All Xero Server Actions and email notification Server Actions must call `requireFeature()` before executing.
- **D-10:** Inline contextual prompts at gated features. Replace gated content area with styled card: icon + feature-specific headline + benefit line + "Upgrade" CTA linking to `/admin/billing?upgrade={feature}`.
- **D-11:** Billing page shows all add-ons with status. Active ones: "Active" badge + manage link. Inactive: price + trial info + "Subscribe" CTA.

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

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| BILL-01 | Merchant can subscribe to paid add-ons (Xero, Email Notifications) via Stripe Checkout | Stripe Checkout session `mode: 'subscription'` with `subscription_data.trial_period_days`, Price ID from env vars, customer ID from `stores.stripe_customer_id` |
| BILL-02 | Stripe subscription state syncs to `store_plans` via dedicated billing webhook endpoint | `customer.subscription.created/updated/deleted` events; map Price ID → feature flag via env var config; idempotency via existing `stripe_events` table pattern |
| BILL-03 | Feature gating enforced server-side (`requireFeature()` on all Xero + email Server Actions) | Dual path: JWT `app_metadata` claims (fast path) + `store_plans` DB fallback for mutations; structured return `{ authorized, feature, upgradeUrl }` |
| BILL-04 | Gated features show contextual upgrade prompts in the UI | `UpgradePrompt` component replacing gated content area; inline, not modal; navigates to `/admin/billing?upgrade={feature}` |
| BILL-05 | Merchant can manage billing via Stripe Customer Portal | `stripe.billingPortal.sessions.create({ customer, return_url })` returns `session.url`; guard: only show when `stripe_customer_id` exists |
| BILL-06 | Admin billing page shows current plan, active add-ons, and portal link | Server Component at `/admin/billing`; reads `store_plans` + `stores.stripe_customer_id`; renders per-add-on card with state; link to portal |
</phase_requirements>

---

## Summary

Phase 15 adds a complete subscription billing layer to NZPOS. The three add-ons (Xero Accounting, Email Notifications, Custom Domain) each map to a Stripe Product+Price pair and a boolean column in `store_plans`. The plumbing is: Stripe Checkout (hosted) creates the subscription → webhook fires → `store_plans` boolean flips → JWT claim updated on next refresh → Server Actions read the claim before executing gated operations.

The codebase already has all the building blocks in place: a working Stripe webhook handler with idempotency (`stripe_events` table), a custom access token hook that injects claims into JWT, a `store_plans` table with the three boolean columns, and the `resolveAuth()` pattern used by every Server Action. This phase wires these together with two new concerns: a `requireFeature()` guard utility and a Stripe Checkout flow specifically for subscriptions (distinct from the existing one-time payment flow).

The key implementation decision at Claude's discretion is **a separate billing webhook endpoint** (`/api/webhooks/stripe/billing`). The existing handler at `/api/webhooks/stripe` processes `checkout.session.completed` for order payments — mixing subscription events there would complicate its logic significantly. A parallel endpoint with its own `STRIPE_BILLING_WEBHOOK_SECRET` env var is cleaner and keeps each handler single-purpose.

**Primary recommendation:** New billing webhook endpoint, `requireFeature()` as a per-action utility function (not middleware), JWT fast path + DB fallback, `stripe_customer_id` created on first checkout (Stripe auto-creates it, we capture from webhook response).

---

## Standard Stack

### Core

The installed Stripe version is **21.0.1** (actual installed, verified via `npm list stripe`). CLAUDE.md documents `^17.x` but the project is already on v21. No migration needed — same API shape, v21 has minor TypeScript type improvements.

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| stripe (node) | **21.0.1** (installed) | Subscription checkout, billing portal, webhook verification | Already installed; `stripe.checkout.sessions.create`, `stripe.billingPortal.sessions.create`, `stripe.webhooks.constructEvent` |
| @supabase/ssr | ^0.x (installed) | Supabase server client for JWT reading + DB updates | Already in use across all Server Actions |
| zod | v4 (installed as ^3.x, resolved to v4) | Input validation on new Server Actions | Project pattern: Zod on every Server Action |

**Note on Zod version:** The STATE.md records `[Phase 14-store-setup-wizard-marketing]: Zod v4 installed despite ^3.x spec — uses .issues[] not .errors[] on ZodError`. All new Server Actions must use `.issues[]` not `.errors[]` when inspecting parse results.

### No new packages needed

This phase requires zero new npm installs. All required functionality is covered by Stripe v21 (already installed), Supabase client (already installed), and project utilities.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Separate billing webhook endpoint | Extend existing `/api/webhooks/stripe` | Existing handler is tightly coupled to order flow; extending it makes the file complex and mixes concerns. Separate endpoint is cleaner. |
| `requireFeature()` per-action utility | Middleware-level gating | Middleware runs on every request but subscription state is only needed on specific actions. Per-action is explicit and testable. |
| JWT fast path + DB fallback | DB lookup only | DB-only on every gated read adds latency. JWT-only misses cancellations between refreshes. Dual path balances both. |
| Stripe auto-creates customer on checkout | Pre-create customer via `stripe.customers.create()` | Stripe Checkout in subscription mode auto-creates a customer from merchant email. Simpler — we capture the `customer` ID from the webhook event and store it on `stores.stripe_customer_id`. |

---

## Architecture Patterns

### Recommended Project Structure for New Files

```
src/
├── lib/
│   └── requireFeature.ts          # Feature gate utility (new)
├── actions/
│   └── billing/
│       ├── createSubscriptionCheckoutSession.ts  # New Server Action
│       ├── createBillingPortalSession.ts         # New Server Action
│       └── __tests__/
│           └── requireFeature.test.ts            # Unit tests
├── app/
│   ├── admin/
│   │   └── billing/
│   │       ├── page.tsx           # Billing page (Server Component)
│   │       └── BillingClient.tsx  # Client Component for interactive cards
│   └── api/
│       └── webhooks/
│           └── stripe/
│               └── billing/
│                   └── route.ts   # New billing webhook endpoint
├── components/
│   └── admin/
│       └── billing/
│           ├── AddOnCard.tsx      # Reusable add-on card (active/inactive/trial states)
│           └── UpgradePrompt.tsx  # Inline gated feature replacement component
└── config/
    └── addons.ts                  # Add-on metadata config (Price IDs from env, copy, etc.)
```

### Pattern 1: Stripe Subscription Checkout Session

**What:** Create a hosted Stripe Checkout session for subscription mode.
**When to use:** Merchant clicks "Start free trial" or "Subscribe" on an add-on card.

```typescript
// src/actions/billing/createSubscriptionCheckoutSession.ts
'use server'
import 'server-only'
import { stripe } from '@/lib/stripe'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { headers } from 'next/headers'

type SubscriptionFeature = 'xero' | 'email_notifications' | 'custom_domain'

// Map feature slugs to Price IDs from environment variables
const PRICE_ID_MAP: Record<SubscriptionFeature, string> = {
  xero: process.env.STRIPE_PRICE_XERO!,
  email_notifications: process.env.STRIPE_PRICE_EMAIL_NOTIFICATIONS!,
  custom_domain: process.env.STRIPE_PRICE_CUSTOM_DOMAIN!,
}

export async function createSubscriptionCheckoutSession(
  feature: SubscriptionFeature
): Promise<{ url: string } | { error: string }> {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.app_metadata?.store_id) {
    return { error: 'not_authenticated' }
  }
  const storeId = user.app_metadata.store_id as string

  const priceId = PRICE_ID_MAP[feature]
  if (!priceId) {
    return { error: 'invalid_feature' }
  }

  // Get existing stripe_customer_id if any (to reuse the customer)
  const admin = createSupabaseAdminClient()
  const { data: store } = await admin
    .from('stores')
    .select('stripe_customer_id, slug')
    .eq('id', storeId)
    .single()

  const headerStore = await headers()
  const host = headerStore.get('host') ?? ''
  const protocol = host.includes('localhost') || host.includes('lvh.me') ? 'http' : 'https'
  const baseUrl = `${protocol}://${host}`

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    // Pass existing customer if present — Stripe reuses payment method
    ...(store?.stripe_customer_id ? { customer: store.stripe_customer_id } : {}),
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: {
      trial_period_days: 14,
      metadata: {
        store_id: storeId,
        feature,
      },
    },
    metadata: {
      store_id: storeId,
      feature,
    },
    success_url: `${baseUrl}/admin/billing?subscribed=${feature}`,
    cancel_url: `${baseUrl}/admin/billing`,
  })

  if (!session.url) return { error: 'stripe_error' }
  return { url: session.url }
}
```

### Pattern 2: Stripe Billing Portal Session

**What:** Create a Stripe Customer Portal session URL and redirect merchant to it.
**When to use:** Merchant clicks "Open billing portal".

```typescript
// src/actions/billing/createBillingPortalSession.ts
'use server'
import 'server-only'
import { stripe } from '@/lib/stripe'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'

export async function createBillingPortalSession(): Promise<
  { url: string } | { error: string }
> {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.app_metadata?.store_id) return { error: 'not_authenticated' }
  const storeId = user.app_metadata.store_id as string

  const admin = createSupabaseAdminClient()
  const { data: store } = await admin
    .from('stores')
    .select('stripe_customer_id')
    .eq('id', storeId)
    .single()

  if (!store?.stripe_customer_id) {
    return { error: 'no_customer' }  // No subscriptions yet — portal unavailable
  }

  const headerStore = await headers()
  const host = headerStore.get('host') ?? ''
  const protocol = host.includes('localhost') || host.includes('lvh.me') ? 'http' : 'https'

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: store.stripe_customer_id,
    return_url: `${protocol}://${host}/admin/billing`,
  })

  return { url: portalSession.url }
}
```

### Pattern 3: Billing Webhook Handler

**What:** Separate Route Handler for subscription events. Decoupled from the existing order webhook.
**When to use:** Stripe fires `customer.subscription.created/updated/deleted`.

```typescript
// src/app/api/webhooks/stripe/billing/route.ts
import 'server-only'
import { headers } from 'next/headers'
import Stripe from 'stripe'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

// Map Price IDs to store_plans column names
const PRICE_TO_FEATURE: Record<string, keyof FeatureFlags> = {
  [process.env.STRIPE_PRICE_XERO!]: 'has_xero',
  [process.env.STRIPE_PRICE_EMAIL_NOTIFICATIONS!]: 'has_email_notifications',
  [process.env.STRIPE_PRICE_CUSTOM_DOMAIN!]: 'has_custom_domain',
}

interface FeatureFlags {
  has_xero: boolean
  has_email_notifications: boolean
  has_custom_domain: boolean
}

export async function POST(req: Request) {
  const rawBody = await req.text()
  const headersList = await headers()
  const signature = headersList.get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_BILLING_WEBHOOK_SECRET!
    )
  } catch {
    return new Response('Webhook signature verification failed', { status: 400 })
  }

  const supabase = createSupabaseAdminClient()

  if (
    event.type === 'customer.subscription.created' ||
    event.type === 'customer.subscription.updated' ||
    event.type === 'customer.subscription.deleted'
  ) {
    const subscription = event.data.object as Stripe.Subscription
    try {
      await handleSubscriptionChange(event.id, event.type, subscription, supabase)
    } catch (err) {
      console.error('[billing-webhook] Error:', err)
      return new Response('Internal server error', { status: 500 })
    }
  }

  return new Response('ok', { status: 200 })
}

async function handleSubscriptionChange(
  eventId: string,
  eventType: string,
  subscription: Stripe.Subscription,
  supabase: ReturnType<typeof createSupabaseAdminClient>
) {
  // Idempotency check — same pattern as existing order webhook
  const { data: existing } = await supabase
    .from('stripe_events')
    .select('id')
    .eq('id', eventId)
    .maybeSingle()
  if (existing) return

  const customerId = typeof subscription.customer === 'string'
    ? subscription.customer
    : subscription.customer.id

  // Resolve store by stripe_customer_id
  // First check: use metadata.store_id if present (fastest)
  let storeId = subscription.metadata?.store_id

  if (!storeId) {
    // Fallback: look up by stripe_customer_id on stores table
    const { data: store } = await supabase
      .from('stores')
      .select('id')
      .eq('stripe_customer_id', customerId)
      .maybeSingle()
    storeId = store?.id
  }

  if (!storeId) {
    // Store this customer_id so future webhooks can resolve — capture on first event
    console.error('[billing-webhook] Cannot resolve store_id for customer:', customerId)
    return
  }

  // Ensure stripe_customer_id is stored on the store (captures on first checkout)
  await supabase
    .from('stores')
    .update({ stripe_customer_id: customerId })
    .eq('id', storeId)
    .is('stripe_customer_id', null)  // Only update if not already set

  // Determine which feature flag to flip
  const priceId = subscription.items.data[0]?.price.id
  if (!priceId) return

  const featureColumn = PRICE_TO_FEATURE[priceId]
  if (!featureColumn) {
    console.warn('[billing-webhook] Unknown price ID:', priceId)
    return
  }

  // Determine new flag value based on subscription status
  const isActive =
    eventType !== 'customer.subscription.deleted' &&
    (subscription.status === 'active' || subscription.status === 'trialing')

  // Update store_plans flag
  await supabase
    .from('store_plans')
    .update({ [featureColumn]: isActive, updated_at: new Date().toISOString() })
    .eq('store_id', storeId)

  // Record for idempotency
  await supabase
    .from('stripe_events')
    .insert({ id: eventId, store_id: storeId, type: eventType })
}
```

### Pattern 4: `requireFeature()` Utility

**What:** Per-action guard that reads JWT fast path then DB fallback.
**When to use:** Every Xero Server Action and email Server Action calls this before doing real work.

```typescript
// src/lib/requireFeature.ts
import 'server-only'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

export type GatedFeature = 'xero' | 'email_notifications' | 'custom_domain'

type FeatureResult =
  | { authorized: true }
  | { authorized: false; feature: GatedFeature; upgradeUrl: string }

const FEATURE_TO_COLUMN: Record<GatedFeature, string> = {
  xero: 'has_xero',
  email_notifications: 'has_email_notifications',
  custom_domain: 'has_custom_domain',
}

/**
 * Fast path: read from JWT claims (zero DB round-trip).
 * Fallback: verify against store_plans DB for critical mutations.
 * Returns structured result — never throws.
 */
export async function requireFeature(
  feature: GatedFeature,
  { requireDbCheck = false }: { requireDbCheck?: boolean } = {}
): Promise<FeatureResult> {
  const upgradeUrl = `/admin/billing?upgrade=${feature}`
  const denied: FeatureResult = { authorized: false, feature, upgradeUrl }

  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.app_metadata?.store_id) return denied

  // Fast path: JWT claims (populated by custom_access_token_hook)
  const jwtValue = user.app_metadata?.[feature] as boolean | undefined

  if (!requireDbCheck) {
    return jwtValue === true ? { authorized: true } : denied
  }

  // DB fallback for critical mutations (Xero sync, email send)
  const storeId = user.app_metadata.store_id as string
  const column = FEATURE_TO_COLUMN[feature]
  const admin = createSupabaseAdminClient()
  const { data: plan } = await admin
    .from('store_plans')
    .select(column)
    .eq('store_id', storeId)
    .single()

  return plan?.[column as keyof typeof plan] === true ? { authorized: true } : denied
}
```

### Pattern 5: Auth Hook Extension (Migration)

**What:** Extend `custom_access_token_hook` to inject feature flags from `store_plans` into JWT.
**When to use:** Auth hook migration file — runs on token issue/refresh.

```sql
-- Addition to custom_access_token_hook (new migration 019_billing_claims.sql)
-- After existing store_id / role injection, add:

DECLARE
  v_has_xero BOOLEAN := false;
  v_has_email_notifications BOOLEAN := false;
  v_has_custom_domain BOOLEAN := false;
BEGIN
  -- ... existing super_admin + staff/customer logic ...

  -- Inject feature flags from store_plans when store_id is known
  IF user_store_id IS NOT NULL THEN
    SELECT has_xero, has_email_notifications, has_custom_domain
    INTO v_has_xero, v_has_email_notifications, v_has_custom_domain
    FROM public.store_plans
    WHERE store_id = user_store_id;

    claims := jsonb_set(claims, '{app_metadata,xero}', to_jsonb(COALESCE(v_has_xero, false)));
    claims := jsonb_set(claims, '{app_metadata,email_notifications}', to_jsonb(COALESCE(v_has_email_notifications, false)));
    claims := jsonb_set(claims, '{app_metadata,custom_domain}', to_jsonb(COALESCE(v_has_custom_domain, false)));
  END IF;
END;
```

The auth hook already has SELECT grant on `staff` table via `supabase_auth_admin`. A new GRANT SELECT on `store_plans` to `supabase_auth_admin` is required.

### Pattern 6: UpgradePrompt Component

**What:** Drop-in component that replaces gated content area when feature is locked.
**When to use:** In any page/component that shows gated content.

```typescript
// src/components/admin/billing/UpgradePrompt.tsx
interface UpgradePromptProps {
  feature: 'xero' | 'email_notifications'
  headline: string
  body: string
}

export function UpgradePrompt({ feature, headline, body }: UpgradePromptProps) {
  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-6 flex flex-col items-start gap-4">
      {/* 32px feature icon, color-text-light */}
      <p className="text-lg font-semibold font-sans text-[var(--color-text)]">{headline}</p>
      <p className="text-base font-sans text-[var(--color-text-muted)]">{body}</p>
      <a
        href={`/admin/billing?upgrade=${feature}`}
        className="bg-[var(--color-amber)] text-white text-sm font-semibold px-4 py-2 rounded-[var(--radius-md)] hover:opacity-90 transition-opacity duration-150"
      >
        Upgrade to unlock
      </a>
    </div>
  )
}
```

### Anti-Patterns to Avoid

- **Hardcoding price amounts in UI:** Price values are runtime data — fetch from a config seeded from env vars or Stripe Products API. The UI-SPEC explicitly calls this out.
- **Throwing on `requireFeature()` failure:** D-08 explicitly says return a structured result, not throw. Throwing makes testing harder and breaks the upgrade prompt pattern.
- **Handling `checkout.session.completed` for subscription activation:** The correct events are `customer.subscription.created/updated/deleted`. The `checkout.session.completed` event fires for both one-time payments and subscriptions, making it ambiguous. Subscription-specific events are unambiguous.
- **Extending the existing order webhook with subscription events:** The existing handler has tight coupling to order metadata (`order_id`, `order_items`). A separate endpoint is cleaner.
- **Storing `stripe_customer_id` only on `store_plans`:** The schema has it on both `stores` and `store_plans`. The `stores` table column is used for portal session creation. Keep them in sync but treat `stores.stripe_customer_id` as the canonical lookup for billing portal.
- **Checking `event.type === 'customer.subscription.deleted'` and immediately zeroing flags:** Subscriptions cancel at `period_end`, so `deleted` fires when the period ends. The flag should go false on `deleted` status, not on receipt of cancellation request in the portal.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Trial period handling | Custom trial countdown + expiry logic | `subscription_data.trial_period_days: 14` in Checkout session | Stripe handles auto-charge, no-payment-method deactivation, trial_end email. Custom logic will have edge cases. |
| Billing management UI (cancel, update card, invoices) | Custom cancel flow, card update form, invoice list | Stripe Customer Portal via `stripe.billingPortal.sessions.create()` | D-06 explicitly forbids custom cancel UI. Portal is PCI-compliant and maintenance-free. |
| Webhook deduplication | Custom table or in-memory dedup | Existing `stripe_events` table pattern | Already in the codebase and tested. Idempotency: check-before-insert pattern. |
| Subscription status polling | Cron job to check Stripe API for subscription status | Webhook-driven `customer.subscription.updated` events | Webhooks are real-time and reliable. Polling adds latency, API rate limit risk, and complexity. |
| Feature flag enforcement in middleware | Global middleware that reads subscription on every request | `requireFeature()` per-action utility | Middleware runs on every route — subscription check on every page load is expensive. Per-action is targeted. |
| Price ID configuration | Hardcoded price IDs in code | Env vars (`STRIPE_PRICE_XERO`, etc.) | D-02: prices managed in Stripe dashboard without code changes. |

**Key insight:** Stripe's subscription infrastructure handles all the billing complexity that looks simple but isn't (trial-to-paid conversion, prorations, dunning, card declines). Use it completely.

---

## Common Pitfalls

### Pitfall 1: Webhook Receives Events Before `stripe_customer_id` Is Stored

**What goes wrong:** The subscription webhook fires almost simultaneously with the user returning from Stripe Checkout. If the webhook arrives before the Success URL page load tries to store the customer ID (which it shouldn't — the Success URL does nothing except revalidate), there's no `stores.stripe_customer_id` to look up the store.

**Why it happens:** Webhooks are async. Stripe fires them before the Checkout redirect completes. The first webhook has no `store_id` on the subscription metadata unless we set it during checkout.

**How to avoid:** Set `metadata.store_id` on the Stripe Checkout session (not just `subscription_data.metadata`). The webhook handler reads `subscription.metadata.store_id` first, then falls back to customer lookup. Also set `subscription_data.metadata.store_id` so it's on the subscription object itself.

**Warning signs:** Webhook logs showing `Cannot resolve store_id for customer: cus_xxx`.

### Pitfall 2: Feature Flag Not in JWT After Subscription Activates

**What goes wrong:** Merchant subscribes, returns to billing page — add-on still shows as inactive because the JWT hasn't been refreshed to pick up the new claim.

**Why it happens:** JWT claims are baked at token-issue time. The `custom_access_token_hook` runs on token refresh, not on every request. After the webhook flips `store_plans.has_xero`, the merchant's existing JWT still has `xero: false`.

**How to avoid:** The billing page Success URL (`/admin/billing?subscribed=xero`) should trigger a session refresh. In the `BillingClient` component, on mount with `subscribed` query param, call `supabase.auth.refreshSession()` to force a new JWT. The billing page Server Component will then re-render with the correct claim.

**Warning signs:** Feature shows as inactive after successful payment return.

### Pitfall 3: Zod `errors` vs `issues` Field

**What goes wrong:** `parsed.error.errors` is undefined — Zod v4 changed the property name.

**Why it happens:** The project resolved to Zod v4 (documented in STATE.md). Zod v4 uses `.issues[]` not `.errors[]`.

**How to avoid:** Use `parsed.error.issues` or `parsed.error.flatten().fieldErrors` consistently. This is already the pattern in Phase 14 actions.

**Warning signs:** Build-time TypeScript error or runtime `undefined` on `.errors`.

### Pitfall 4: `subscription_data.metadata` vs `checkout.session.metadata`

**What goes wrong:** `subscription.metadata.store_id` is `undefined` in the webhook because you set `metadata` on the session but not on `subscription_data.metadata`.

**Why it happens:** Session `metadata` is on the Checkout Session object. Subscription `metadata` is separate and must be explicitly set via `subscription_data.metadata`. When the webhook receives `customer.subscription.created`, it gets the Subscription object, not the Session object.

**How to avoid:** Set metadata in BOTH locations in the Checkout session create call:
```typescript
metadata: { store_id: storeId, feature },  // On the session (for checkout.session.completed)
subscription_data: {
  trial_period_days: 14,
  metadata: { store_id: storeId, feature },  // On the subscription (for subscription.* events)
},
```

**Warning signs:** `subscription.metadata` is empty `{}` in webhook logs.

### Pitfall 5: Missing GRANT on `store_plans` for Auth Hook

**What goes wrong:** The `custom_access_token_hook` queries `store_plans` but gets permission denied — the auth hook runs as `supabase_auth_admin`, which has SELECT on `staff` and `super_admins` but not on `store_plans`.

**Why it happens:** Each table the auth hook queries needs an explicit `GRANT SELECT ... TO supabase_auth_admin`. The 014 migration added `GRANT SELECT ON super_admins`, but `store_plans` was never granted.

**How to avoid:** The new migration (019) must include:
```sql
GRANT SELECT ON public.store_plans TO supabase_auth_admin;
```

**Warning signs:** Auth hook silently fails — JWT has no feature flags, but no error is surfaced. Debugging requires Supabase logs.

### Pitfall 6: Stripe Customer Portal Returns 400 When No Configuration Exists

**What goes wrong:** `stripe.billingPortal.sessions.create()` throws a Stripe API error: "No portal configuration exists for this account."

**Why it happens:** Stripe requires at least one Billing Portal configuration to exist before you can create sessions. It must be set up in the Stripe Dashboard under Billing > Customer Portal.

**How to avoid:** The Wave 0 setup task must configure the Stripe Customer Portal in the dashboard: enable subscription cancellation, invoice history. This is a one-time dashboard operation, not code. Document in `Wave 0` plan.

**Warning signs:** `stripe.billingPortal.sessions.create()` throws with error code `resource_missing`.

---

## Code Examples

### Extending `triggerManualSync` with `requireFeature`

```typescript
// src/actions/xero/triggerManualSync.ts — after requireFeature is implemented
'use server'
import 'server-only'
import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { executeManualSync } from '@/lib/xero/sync'
import { requireFeature } from '@/lib/requireFeature'

export async function triggerManualSync(): Promise<{
  success: boolean
  message: string
  invoiceNumber?: string
}> {
  // Feature gate — DB check for mutation (D-07: requireDbCheck for critical writes)
  const gate = await requireFeature('xero', { requireDbCheck: true })
  if (!gate.authorized) {
    return { success: false, message: 'Xero subscription required' }
  }

  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, message: 'Not authenticated' }

  const storeId = user.app_metadata?.store_id as string | undefined
  if (!storeId) return { success: false, message: 'Not authenticated' }

  const result = await executeManualSync(storeId)
  revalidatePath('/admin/integrations')
  return result
}
```

### Conditional `UpgradePrompt` in Integrations Page

```typescript
// src/app/admin/integrations/page.tsx — checking JWT claim to gate Xero UI
const hasXero = (user?.app_metadata?.xero ?? false) as boolean

return (
  <section className={cardClass}>
    {hasXero ? (
      <>
        <XeroConnectButton ... />
        <XeroAccountCodeForm ... />
      </>
    ) : (
      <UpgradePrompt
        feature="xero"
        headline="Xero sync requires an upgrade"
        body="Connect your Xero account and sync sales automatically. No manual data entry."
      />
    )}
  </section>
)
```

### Idempotency Pattern (mirrors existing webhook)

```typescript
// Check before insert — allows retry if processing fails after check but before insert
const { data: existing } = await supabase
  .from('stripe_events')
  .select('id')
  .eq('id', eventId)
  .maybeSingle()

if (existing) return  // Already processed — skip

// ... do work ...

// Insert AFTER success — a failed insert means next retry will reprocess (correct behaviour)
const { error: dedupError } = await supabase
  .from('stripe_events')
  .insert({ id: eventId, store_id: storeId, type: eventType })

if (dedupError && dedupError.code !== '23505') {
  console.error('[billing-webhook] Dedup insert failed:', dedupError.message)
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `stripe ^17.x` (CLAUDE.md docs) | `stripe ^21.x` (installed: 21.0.1) | Already installed | Same API, use what's installed |
| Zod `.error.errors[]` | Zod `.error.issues[]` | Phase 14 (Zod v4 resolved) | All new actions must use `.issues[]` |
| Auth hook injects only `store_id` + `role` | Auth hook injects `store_id`, `role`, `is_super_admin`, plus new feature flags | This phase (migration 019) | JWT becomes the fast-path feature cache |
| No billing page | `/admin/billing` with add-on cards | This phase | Merchants self-serve billing |

**Deprecated/outdated in this project context:**
- `@supabase/auth-helpers-nextjs`: Not in use (replaced by `@supabase/ssr`). Do not reference.
- Stripe Terminal SDK: Deferred to v1.1. Not in scope.

---

## Open Questions

1. **Stripe Customer Portal Configuration**
   - What we know: A portal configuration must exist in the Stripe Dashboard before `billingPortal.sessions.create()` works.
   - What's unclear: Whether to configure it to allow merchants to cancel individual subscriptions (per-add-on) vs cancel all at once. The Customer Portal groups subscriptions.
   - Recommendation: Wave 0 task to configure the portal in Stripe Dashboard. Enable: cancel subscription, update payment method, view invoices. Each add-on subscription appears separately in the portal.

2. **`stripe_events` Table Schema Compatibility**
   - What we know: The `stripe_events` table has columns `id`, `store_id`, `type`. It is used by the order webhook.
   - What's unclear: Whether there is a unique constraint on `id` only, or on `(id, type)`. If `id` only, the dedup pattern works perfectly. If `type` is part of the key, inserting the same event with a different type handler would fail correctly.
   - Recommendation: Read `stripe_events` table definition before implementation. The `23505` (unique violation) catch in the existing handler suggests `id` is the unique key — this is correct for idempotency.

3. **Session Refresh After Subscription**
   - What we know: JWT claims must refresh to pick up new feature flags. `supabase.auth.refreshSession()` forces this.
   - What's unclear: Whether to call `refreshSession()` on the billing page client component (on mount with `?subscribed=` param) or to rely on the next natural token refresh (up to 3600 seconds).
   - Recommendation: Call `refreshSession()` client-side when `?subscribed={feature}` param is present. This gives immediate feedback to the merchant.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Stripe Node SDK | Subscription checkout, portal, webhook | Yes | 21.0.1 | — |
| Supabase (local) | All DB operations | Yes | local dev running | — |
| Node.js | Server Actions, webhook route | Yes | v22.22.0 | — |
| `STRIPE_SECRET_KEY` | All Stripe API calls | Assumed set (existing webhook uses it) | — | — |
| `STRIPE_BILLING_WEBHOOK_SECRET` | Billing webhook verification | Not yet set | — | Must add for new endpoint |
| `STRIPE_PRICE_XERO` | Subscription checkout | Not yet set | — | Must add (Stripe Dashboard: create Product + Price) |
| `STRIPE_PRICE_EMAIL_NOTIFICATIONS` | Subscription checkout | Not yet set | — | Must add |
| `STRIPE_PRICE_CUSTOM_DOMAIN` | Subscription checkout | Not yet set | — | Must add |

**Missing dependencies with no fallback:**
- `STRIPE_BILLING_WEBHOOK_SECRET` — New webhook endpoint requires its own webhook secret from Stripe Dashboard
- `STRIPE_PRICE_XERO`, `STRIPE_PRICE_EMAIL_NOTIFICATIONS`, `STRIPE_PRICE_CUSTOM_DOMAIN` — Stripe Products and Prices must be created in Stripe Dashboard before these env vars can be set
- Stripe Customer Portal configuration — must be configured in Stripe Dashboard (one-time, no code)

**Resolution:** Wave 0 plan must include Stripe Dashboard setup tasks (create 3 Products + Prices, register billing webhook endpoint, configure Customer Portal, copy IDs to `.env.local`).

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 2.x/3.x (installed) |
| Config file | `vitest.config.mts` (project root) |
| Quick run command | `npx vitest run src/actions/billing` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| BILL-01 | `createSubscriptionCheckoutSession` returns Stripe URL for valid feature | unit | `npx vitest run src/actions/billing/__tests__/createSubscriptionCheckoutSession.test.ts` | No — Wave 0 |
| BILL-01 | Invalid feature slug returns `{ error: 'invalid_feature' }` | unit | same file | No — Wave 0 |
| BILL-02 | Webhook updates `store_plans.has_xero = true` on `customer.subscription.created` (status: trialing) | unit | `npx vitest run src/app/api/webhooks/stripe/billing/__tests__/billing.test.ts` | No — Wave 0 |
| BILL-02 | Webhook sets `has_xero = false` on `customer.subscription.deleted` | unit | same file | No — Wave 0 |
| BILL-02 | Webhook is idempotent (duplicate event ID is a no-op) | unit | same file | No — Wave 0 |
| BILL-03 | `requireFeature('xero')` returns `{ authorized: true }` when JWT `xero: true` | unit | `npx vitest run src/lib/__tests__/requireFeature.test.ts` | No — Wave 0 |
| BILL-03 | `requireFeature('xero')` returns `{ authorized: false, upgradeUrl: '/admin/billing?upgrade=xero' }` when JWT `xero: false` | unit | same file | No — Wave 0 |
| BILL-03 | `requireFeature('xero', { requireDbCheck: true })` queries DB regardless of JWT | unit | same file | No — Wave 0 |
| BILL-04 | `UpgradePrompt` renders headline, body, and correct upgrade link | unit | `npx vitest run src/components/admin/billing/__tests__/UpgradePrompt.test.tsx` | No — Wave 0 |
| BILL-05 | `createBillingPortalSession` returns error when `stripe_customer_id` is null | unit | `npx vitest run src/actions/billing/__tests__/createBillingPortalSession.test.ts` | No — Wave 0 |
| BILL-06 | Billing page renders all three add-on cards | manual | Load `/admin/billing` in browser | — |
| BILL-06 | Portal link hidden when no `stripe_customer_id` | manual | Check with fresh store account | — |

### Sampling Rate
- **Per task commit:** `npx vitest run src/actions/billing src/lib/__tests__/requireFeature.test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/actions/billing/__tests__/createSubscriptionCheckoutSession.test.ts` — covers BILL-01
- [ ] `src/actions/billing/__tests__/createBillingPortalSession.test.ts` — covers BILL-05
- [ ] `src/app/api/webhooks/stripe/billing/__tests__/billing.test.ts` — covers BILL-02
- [ ] `src/lib/__tests__/requireFeature.test.ts` — covers BILL-03
- [ ] `src/components/admin/billing/__tests__/UpgradePrompt.test.tsx` — covers BILL-04

---

## Project Constraints (from CLAUDE.md)

The following directives from CLAUDE.md are binding on this phase:

| Constraint | Detail |
|-----------|--------|
| Tech stack non-negotiable | Next.js App Router + Supabase + Stripe + Tailwind CSS |
| No Prisma, no Redux | Use Supabase JS client directly. Server Components for data fetching. |
| Stripe Checkout hosted (not custom Elements) | D-04 confirms this: hosted redirect flow |
| No `@supabase/auth-helpers-nextjs` | Use `@supabase/ssr` exclusively |
| Tailwind v4 | CSS custom properties pattern, no `tailwind.config.js` |
| Zod on every Server Action | `.safeParse()` with `.issues[]` (Zod v4) |
| `server-only` import | All server-side files must import `server-only` |
| Vitest (not Jest) | For all unit tests |
| No Realtime | Webhook-driven flag updates only — confirmed by project constraint |
| DESIGN.md is authoritative | UI work must read DESIGN.md. Phase 15 has a 15-UI-SPEC.md that is authoritative for this phase. |
| GSD workflow | No direct repo edits outside GSD workflow |

---

## Sources

### Primary (HIGH confidence)
- Stripe Billing Subscriptions docs — build-subscriptions flow, `mode: 'subscription'` Checkout params
- Stripe API reference — `billingPortal.sessions.create()` parameters, Subscription object fields
- Stripe Webhooks docs — `customer.subscription.created/updated/deleted` event types and data structure
- Project codebase — `src/app/api/webhooks/stripe/route.ts` (idempotency pattern), `supabase/migrations/014_multi_tenant_schema.sql` (store_plans schema), `supabase/migrations/016_super_admin.sql` (auth hook pattern)

### Secondary (MEDIUM confidence)
- WebSearch confirmation — `subscription_data.trial_period_days` is the correct param for free trials in Checkout sessions
- WebSearch confirmation — Stripe auto-creates Customer in subscription mode Checkout (no pre-create needed)

### Tertiary (LOW confidence)
- None

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already installed, APIs verified against Stripe docs
- Architecture: HIGH — patterns follow established project conventions (webhook handler, auth hook, Server Actions)
- Pitfalls: HIGH — webhook metadata propagation, Zod v4, auth hook GRANT are all verified against actual codebase
- Test map: HIGH — mirrors existing test structure in project

**Research date:** 2026-04-03
**Valid until:** 2026-05-03 (Stripe API is stable; Supabase auth hook pattern is stable)
