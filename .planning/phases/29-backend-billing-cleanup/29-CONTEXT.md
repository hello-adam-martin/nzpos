# Phase 29: Backend & Billing Cleanup - Context

**Gathered:** 2026-04-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Remove all feature gating, billing integration, and subscription requirements for email notifications so the system treats email as a core free feature. This phase covers backend code, config, migrations, auth hook, and Stripe billing — no UI changes (those are Phase 30/31).

</domain>

<decisions>
## Implementation Decisions

### Migration Strategy
- **D-01:** Single SQL migration: `UPDATE store_plans SET has_email_notifications = true WHERE has_email_notifications = false`. Atomic, runs in seconds. No batching needed at current scale.

### Auth Hook
- **D-02:** Remove the `email_notifications` claim from JWT entirely. The auth hook (`custom_access_token_hook`) should stop reading `has_email_notifications` from `store_plans` and stop setting it in `app_metadata`. No wasted JWT space, no dead reads. The `has_email_notifications` column stays in `store_plans` (always true) for backwards compatibility per v6.0 scoping decision.

### Stripe Cleanup
- **D-03:** Full removal of `email_notifications` from all Stripe-related code:
  - Remove from `SubscriptionFeature` union type
  - Remove from `PRICE_ID_MAP`, `PRICE_TO_FEATURE`, `FEATURE_TO_COLUMN`
  - Remove from `ADDONS` array (email entry)
  - Remove from `featureSchema` in `createSubscriptionCheckoutSession`
  - Remove `STRIPE_PRICE_EMAIL_NOTIFICATIONS` env var references (from `.env.example`, docs, etc.)
  - Remove from `FeatureFlags` interface

### Feature Gate Removal
- **D-04:** Remove the `requireFeature('email_notifications')` call from `email.ts` entirely. Email just sends — no gate check, no authorization logic for this feature. Since the JWT claim is also being removed, the gate would fail anyway.

### Test Handling
- **D-05:** Fix all backend tests that reference `email_notifications` in Phase 29 alongside the code changes. Tests that reference the removed types/config will break at compile time — can't leave broken tests between phases. This covers: `requireFeature.test.ts`, `createSubscriptionCheckoutSession.test.ts`, `billing.test.ts`, `schema.test.ts`, `syncStripeSnapshot.test.ts`, `activateAddon.test.ts`, `deactivateAddon.test.ts`. Admin UI tests remain in Phase 30.

### Claude's Discretion
- Migration numbering and naming convention
- Order of operations within plans (migration first vs code changes first)
- Whether to consolidate into 1 or 2 plans

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Feature Gating System
- `src/config/addons.ts` — Central add-on config: types, price mappings, feature-to-column mappings, ADDONS display array
- `src/lib/requireFeature.ts` — JWT fast-path / DB fallback feature gate utility
- `src/lib/email.ts` — Email sending with requireFeature gate (lines 25-29)

### Auth Hook
- `supabase/migrations/003_auth_hook.sql` — Original auth hook (store_id + role only)
- `supabase/migrations/019_billing_claims.sql` — Added subscription feature claims to auth hook
- `supabase/migrations/024_service_product_type.sql` — Latest auth hook version (includes inventory claim)

### Billing & Stripe
- `src/actions/billing/createSubscriptionCheckoutSession.ts` — Checkout session creation with feature schema
- `src/app/api/webhooks/stripe/billing/` — Stripe billing webhook handler

### Store Provisioning
- `supabase/migrations/017_provision_store_rpc.sql` — Store provisioning RPC (creates store_plans row)
- `src/actions/auth/provisionStore.ts` — Server-side provisioning action

### Super Admin
- `src/actions/super-admin/activateAddon.ts` — Addon activation (includes email_notifications in schema)
- `src/actions/super-admin/deactivateAddon.ts` — Addon deactivation (includes email_notifications in schema)

### Tests (to update)
- `src/lib/__tests__/requireFeature.test.ts` — Tests email_notifications gate path
- `src/actions/billing/__tests__/createSubscriptionCheckoutSession.test.ts` — Tests email_notifications checkout
- `src/app/api/webhooks/stripe/billing/__tests__/billing.test.ts` — Tests webhook email_notifications mapping
- `src/lib/stripe/syncStripeSnapshot.test.ts` — Tests snapshot sync with email price
- `src/lib/__tests__/schema.test.ts` — Tests store_plans schema including has_email_notifications
- `src/actions/super-admin/__tests__/activateAddon.test.ts` — Tests addon activation
- `src/actions/super-admin/__tests__/deactivateAddon.test.ts` — Tests addon deactivation

### Database Types
- `src/types/database.ts` — Generated Supabase types (has_email_notifications fields at lines 833-834, 849-850, 865-866)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `requireFeature()` pattern well-established — removal is straightforward (delete call, not refactor)
- Auth hook has been migrated 3 times (003 → 019 → 024) — pattern for new migration is clear

### Established Patterns
- Feature claims added to JWT via `jsonb_set` in auth hook SQL function
- `ADDONS` array drives both billing UI and checkout session creation
- `SubscriptionFeature` union type is the single source of truth for valid features
- `PRICE_TO_FEATURE` reverse map drives webhook handler feature toggling
- Store provisioning RPC creates `store_plans` row with all features defaulting to false

### Integration Points
- `store_plans.has_email_notifications` column: kept as always-true, migration flips existing rows
- `custom_access_token_hook` function: needs new migration to remove email_notifications variables and claim
- `provision_store` RPC: may need update if it explicitly sets `has_email_notifications = false`
- `.env.example` / `.env.local`: `STRIPE_PRICE_EMAIL_NOTIFICATIONS` to remove

</code_context>

<specifics>
## Specific Ideas

No specific requirements — standard removal/cleanup patterns apply.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 29-backend-billing-cleanup*
*Context gathered: 2026-04-06*
