# Phase 15: Stripe Billing + Feature Gating - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md -- this log preserves the alternatives considered.

**Date:** 2026-04-03
**Phase:** 15-stripe-billing-feature-gating
**Areas discussed:** Subscription model + pricing, Checkout + activation flow, Server-side gating enforcement, Upgrade prompt UX

---

## Subscription Model + Pricing

### How should add-ons be structured in Stripe?

| Option | Description | Selected |
|--------|-------------|----------|
| Separate subscriptions per add-on | Each add-on is its own Stripe Product + Price. Independent combinations. | ✓ |
| Single subscription with tiers | One plan with tier bundles (Free, Pro, Business). Less flexible. | |
| Single subscription + add-on line items | Base subscription with add-on line items. Most complex. | |

**User's choice:** Separate subscriptions per add-on
**Notes:** Maps cleanly to 3 boolean flags on store_plans.

### What are the price points?

| Option | Description | Selected |
|--------|-------------|----------|
| $10-15/mo per add-on | Competitive NZ market pricing. | |
| You decide | Claude picks reasonable prices. | |
| Free for now, gate later | Enable all free during beta. | |

**User's choice:** User asked "are we able to manage and control in the admin area?"
**Notes:** Prices managed in Stripe dashboard, referenced by Price IDs in env vars. No hardcoding. Super admin panel (Phase 16) may surface pricing management.

### Should there be a trial period?

| Option | Description | Selected |
|--------|-------------|----------|
| 14-day free trial | Stripe handles trials natively. Auto-charges after. | ✓ |
| No trial | Pay to unlock immediately. | |
| You decide | Claude picks standard approach. | |

**User's choice:** 14-day free trial

---

## Checkout + Activation Flow

### How should the upgrade checkout work?

| Option | Description | Selected |
|--------|-------------|----------|
| Stripe Checkout (hosted page) | Redirect to Stripe. Already using this pattern for orders. | ✓ |
| Stripe embedded checkout | Checkout form embedded via Elements. More code. | |
| Stripe Payment Links | Pre-built links. Least customizable. | |

**User's choice:** Stripe Checkout (hosted page)

### How should features activate after payment?

| Option | Description | Selected |
|--------|-------------|----------|
| Webhook flips the flag | subscription.created/updated events update store_plans. | ✓ |
| Success URL polls until active | Success page polls API until webhook processed. | |
| Both -- webhook + optimistic UI | Webhook is truth, success redirect shows optimistic state. | |

**User's choice:** Webhook flips the flag

### How should cancellation work?

| Option | Description | Selected |
|--------|-------------|----------|
| Stripe Customer Portal | Hosted portal for cancel, payment methods, invoices. | ✓ |
| Cancel button in admin | Custom cancel flow with confirmation dialog. | |
| You decide | Claude picks standard approach. | |

**User's choice:** Stripe Customer Portal

---

## Server-Side Gating Enforcement

### How should feature flags be checked?

| Option | Description | Selected |
|--------|-------------|----------|
| DB lookup via store_plans | Query store_plans on each gated action. Simple, always accurate. | |
| JWT claims via custom_access_token_hook | Add flags to JWT. Zero DB lookup. Stale until refresh. | |
| Both -- JWT fast path, DB fallback | JWT for reads, DB for critical mutations. | ✓ |

**User's choice:** Both -- JWT for fast path, DB as fallback

### What should requireFeature() return on failure?

| Option | Description | Selected |
|--------|-------------|----------|
| Structured error with upgrade context | Returns { authorized, feature, upgradeUrl }. UI shows contextual prompt. | ✓ |
| Throw an error / redirect | Throws AuthorizationError. Simpler but less UI context. | |
| You decide | Claude designs the error shape. | |

**User's choice:** Structured error with upgrade context

---

## Upgrade Prompt UX

### What should merchants see at gated features?

| Option | Description | Selected |
|--------|-------------|----------|
| Inline contextual prompt | Styled card replaces gated content. Icon + headline + CTA. | ✓ |
| Full-page upgrade gate | Redirect to dedicated upgrade page. | |
| Modal overlay | Pop up modal with feature info. | |
| You decide | Claude picks the pattern. | |

**User's choice:** Inline contextual prompt

### Should billing page show all add-ons or only active?

| Option | Description | Selected |
|--------|-------------|----------|
| All add-ons with status | Each add-on as card: active badge or subscribe CTA. | ✓ |
| Active only + upgrade section | Split active subscriptions and available add-ons. | |
| You decide | Claude designs the layout. | |

**User's choice:** All add-ons with status

---

## Claude's Discretion

- Stripe Product/Price ID environment variable naming
- Webhook handler structure (extend vs separate)
- requireFeature() implementation details
- JWT claim key naming
- Billing page layout and card design
- Upgrade prompt copy and visual style
- Stripe Customer Portal configuration
- stripe_customer_id creation timing
- Success/cancel URL paths

## Deferred Ideas

None.
