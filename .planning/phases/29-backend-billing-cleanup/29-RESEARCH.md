# Phase 29: Backend & Billing Cleanup - Research

**Researched:** 2026-04-06
**Domain:** Feature gating removal, Stripe billing cleanup, SQL migration, auth hook modification
**Confidence:** HIGH

## Summary

Phase 29 is a surgical removal of `email_notifications` from the feature gating, billing, and auth hook systems. The codebase is well-structured with a single source of truth for add-on configuration (`src/config/addons.ts`), making the change set predictable. The core pattern is: remove `email_notifications` from all type unions, config maps, and display arrays, remove the feature gate call from `email.ts`, write a SQL migration to (a) flip all existing `has_email_notifications` to true and (b) rewrite the auth hook to stop injecting the `email_notifications` JWT claim.

All seven test files that reference `email_notifications` have been audited. Changes range from removing specific test cases (requireFeature test 3), updating mock data (billing test PRICE_TO_FEATURE mock), to adjusting schema assertions (schema.test.ts). The `database.ts` types file is auto-generated from Supabase and should NOT be manually edited in this phase since the column remains in the database.

**Primary recommendation:** Execute in two waves -- (1) SQL migration first (data + auth hook), then (2) TypeScript code changes + test updates in a single pass. The migration must deploy before code changes because the code will remove `email_notifications` from config maps that the webhook handler uses at runtime.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Single SQL migration: `UPDATE store_plans SET has_email_notifications = true WHERE has_email_notifications = false`. Atomic, runs in seconds.
- **D-02:** Remove the `email_notifications` claim from JWT entirely. The auth hook stops reading `has_email_notifications` from `store_plans` and stops setting it in `app_metadata`. The `has_email_notifications` column stays in `store_plans` (always true) for backwards compatibility.
- **D-03:** Full removal of `email_notifications` from all Stripe-related code: `SubscriptionFeature` union type, `PRICE_ID_MAP`, `PRICE_TO_FEATURE`, `FEATURE_TO_COLUMN`, `ADDONS` array, `featureSchema`, `STRIPE_PRICE_EMAIL_NOTIFICATIONS` env var references, `FeatureFlags` interface.
- **D-04:** Remove the `requireFeature('email_notifications')` call from `email.ts` entirely. Email just sends -- no gate check.
- **D-05:** Fix all backend tests that reference `email_notifications` in Phase 29 alongside code changes. Covers: `requireFeature.test.ts`, `createSubscriptionCheckoutSession.test.ts`, `billing.test.ts`, `schema.test.ts`, `syncStripeSnapshot.test.ts`, `activateAddon.test.ts`, `deactivateAddon.test.ts`.

### Claude's Discretion
- Migration numbering and naming convention
- Order of operations within plans (migration first vs code changes first)
- Whether to consolidate into 1 or 2 plans

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| GATE-01 | Email sending works for all stores without feature gate check | Remove `requireFeature('email_notifications')` from `email.ts` lines 25-29 |
| GATE-02 | Auth hook -- email_notifications claim | **OVERRIDDEN by D-02**: Remove the claim entirely (not set to true). Rewrite auth hook to drop `v_has_email_notifications` variable and `email_notifications` claim injection |
| GATE-03 | All existing stores have email notifications enabled via migration | SQL migration: `UPDATE store_plans SET has_email_notifications = true WHERE has_email_notifications = false` |
| GATE-04 | New stores provisioned with email notifications enabled by default | `provision_store` RPC uses `INSERT INTO store_plans (store_id) VALUES (v_store_id)` -- column default is `false`. Migration must change column default to `true` via `ALTER TABLE store_plans ALTER COLUMN has_email_notifications SET DEFAULT true` |
| BILL-01 | Email notifications removed from ADDONS config and Stripe price mappings | Remove from `SubscriptionFeature`, `PRICE_ID_MAP`, `PRICE_TO_FEATURE`, `FEATURE_TO_COLUMN`, `ADDONS` array, `FeatureFlags` in `addons.ts` |
| BILL-02 | Email notifications removed from subscription checkout session creation | Remove `'email_notifications'` from `featureSchema` z.enum in `createSubscriptionCheckoutSession.ts` |
| BILL-03 | Stripe billing webhook no longer toggles email_notifications feature flag | Removing from `PRICE_TO_FEATURE` in `addons.ts` is sufficient -- webhook handler uses that map dynamically |
</phase_requirements>

## Architecture Patterns

### Change Dependency Graph

```
SQL Migration (must run first)
  |-- UPDATE store_plans SET has_email_notifications = true
  |-- ALTER TABLE store_plans ALTER COLUMN has_email_notifications SET DEFAULT true
  |-- CREATE OR REPLACE custom_access_token_hook (remove email_notifications)

Then: TypeScript code changes (can all happen in parallel)
  |-- src/config/addons.ts (remove from types, maps, ADDONS array)
  |-- src/lib/email.ts (remove requireFeature gate)
  |-- src/lib/requireFeature.ts (no changes needed -- it's generic)
  |-- src/actions/billing/createSubscriptionCheckoutSession.ts (remove from featureSchema)
  |-- src/actions/super-admin/activateAddon.ts (remove from z.enum)
  |-- src/actions/super-admin/deactivateAddon.ts (remove from z.enum)
  |-- .env.example (remove STRIPE_PRICE_EMAIL_NOTIFICATIONS)
  |-- 7 test files (update mocks, remove email_notifications test cases)
```

### Anti-Patterns to Avoid
- **Do NOT manually edit `src/types/database.ts`**: This is auto-generated by `supabase gen types`. The `has_email_notifications` column stays in the DB, so the generated types are correct as-is.
- **Do NOT remove `has_email_notifications` from `store_plans` table**: Kept for backwards compatibility per v6.0 scoping decision.
- **Do NOT remove `has_email_notifications_manual_override` column**: Same backwards compatibility principle applies.

## Detailed File-Level Change Map

### 1. SQL Migration (new file: `supabase/migrations/029_free_email_notifications.sql`)

**Section A: Data migration**
```sql
UPDATE public.store_plans SET has_email_notifications = true WHERE has_email_notifications = false;
```

**Section B: Column default change (GATE-04)**
```sql
ALTER TABLE public.store_plans ALTER COLUMN has_email_notifications SET DEFAULT true;
```
This ensures `provision_store` RPC's `INSERT INTO store_plans (store_id)` creates rows with `has_email_notifications = true` without modifying the RPC itself.

**Section C: Auth hook rewrite (D-02)**
Full `CREATE OR REPLACE` of `custom_access_token_hook`. Remove:
- `v_has_email_notifications BOOLEAN := false;` declaration (line 40 of migration 024)
- `sp.has_email_notifications` from the SELECT (line 86 of migration 024)
- `, v_has_email_notifications` from the INTO clause (line 87)
- The `jsonb_set` line for `email_notifications` claim (line 97)

Keep all other variables and claims (`v_has_xero`, `v_has_custom_domain`, `v_has_inventory`) unchanged.

### 2. `src/config/addons.ts` -- Central config (BILL-01)

**Remove from `SubscriptionFeature` union type** (line 4):
```typescript
// Before: 'xero' | 'email_notifications' | 'custom_domain' | 'inventory'
// After:  'xero' | 'custom_domain' | 'inventory'
```

**Remove from `FeatureFlags` interface** (line 8):
```typescript
// Remove: has_email_notifications: boolean
```

**Remove from `PRICE_ID_MAP`** (line 16):
```typescript
// Remove: email_notifications: process.env.STRIPE_PRICE_EMAIL_NOTIFICATIONS!,
```

**Remove from `PRICE_TO_FEATURE`** (line 24):
```typescript
// Remove: [process.env.STRIPE_PRICE_EMAIL_NOTIFICATIONS!]: 'has_email_notifications',
```

**Remove from `FEATURE_TO_COLUMN`** (line 34):
```typescript
// Remove: email_notifications: 'has_email_notifications',
```

**Remove email entry from `ADDONS` array** (lines 48-55):
Remove the entire object with `feature: 'email_notifications'`.

### 3. `src/lib/email.ts` -- Feature gate removal (GATE-01, D-04)

**Remove lines 4, 25-29:**
- Line 4: `import { requireFeature } from '@/lib/requireFeature'`
- Lines 25-29: The entire gate block:
```typescript
  const gate = await requireFeature('email_notifications', { requireDbCheck: true })
  if (!gate.authorized) {
    console.log('[email] Email notifications not active — skipping send')
    return { success: false }
  }
```

### 4. `src/actions/billing/createSubscriptionCheckoutSession.ts` (BILL-02)

**Line 13:** Remove `'email_notifications'` from featureSchema:
```typescript
// Before: z.enum(['xero', 'email_notifications', 'custom_domain', 'inventory'])
// After:  z.enum(['xero', 'custom_domain', 'inventory'])
```

### 5. `src/actions/super-admin/activateAddon.ts` (D-03)

**Line 11:** Remove from z.enum:
```typescript
// Before: z.enum(['xero', 'email_notifications', 'custom_domain', 'inventory'])
// After:  z.enum(['xero', 'custom_domain', 'inventory'])
```

### 6. `src/actions/super-admin/deactivateAddon.ts` (D-03)

**Line 11:** Remove from z.enum:
```typescript
// Before: z.enum(['xero', 'email_notifications', 'custom_domain', 'inventory'])
// After:  z.enum(['xero', 'custom_domain', 'inventory'])
```

### 7. `.env.example` (D-03)

**Line 31:** Remove `STRIPE_PRICE_EMAIL_NOTIFICATIONS=price_your_email_addon_price_id`

### 8. Test File Changes

#### `src/lib/__tests__/requireFeature.test.ts`
- **Remove Test 3** (lines 78-91): Tests `email_notifications` feature specifically. Since `email_notifications` is no longer a valid `SubscriptionFeature`, this test would fail at compile time. The generic requireFeature function itself is unchanged -- it still works for xero, custom_domain, inventory.

#### `src/actions/billing/__tests__/createSubscriptionCheckoutSession.test.ts`
- **Line 58-59 in mock:** Remove `email_notifications: 'price_email_test'` from `PRICE_ID_MAP` mock
- **Lines 182-188 (last test):** Remove or rewrite the test that calls `createSubscriptionCheckoutSession('email_notifications')` and checks for `price_email_test`. Replace with a test for `'inventory'` or `'custom_domain'` if needed, or simply delete it.

#### `src/app/api/webhooks/stripe/billing/__tests__/billing.test.ts`
- **Line 63 in mock:** Remove `price_email_test: 'has_email_notifications'` from `PRICE_TO_FEATURE` mock
- No test cases specifically test email_notifications webhook flow (they all use xero price), so no test case removal needed.

#### `src/lib/stripe/syncStripeSnapshot.test.ts`
- **Line 36 in mock:** Remove `price_email_monthly: 'has_email_notifications'` from `PRICE_TO_FEATURE` mock
- **Lines 285-332:** Remove or rewrite the test `'resolves addon_type for email_notifications price ID'`. This test specifically creates a subscription with `price_email_monthly` price and asserts `addon_type === 'email_notifications'`. Since that price ID will no longer be in the map, the test is invalid. Delete it.

#### `src/lib/__tests__/schema.test.ts`
- **Line 37:** Remove `has_email_notifications` from the `.select()` call
- **Line 44:** Remove `expect(data![0].has_email_notifications).toBe(false)` assertion
- Note: After the migration runs, the value would be `true` anyway. But more importantly, this test runs against a live local Supabase and the column still exists. The select can keep the column, but the assertion should be updated to `true` instead of `false`. **Decision point:** Since the column stays and the migration sets it to true, change assertion to `expect(data![0].has_email_notifications).toBe(true)`.

#### `src/actions/super-admin/__tests__/activateAddon.test.ts`
- **Lines 104-111 in `setupAdminClient` default data:** Remove `has_email_notifications: false` and `has_email_notifications_manual_override: false` from mock data objects. These are used in the `beforeEach` setup. Since the action's z.enum will no longer accept `email_notifications`, the mock data just needs to not include it. However, since the tests all test with `feature: 'xero'`, they will still pass -- the mock data keys that aren't used won't cause errors. **Conservative approach:** Remove the email_notifications keys from mock data for cleanliness.

#### `src/actions/super-admin/__tests__/deactivateAddon.test.ts`
- **Lines 104-111 in `setupAdminClient` default data:** Same as activateAddon -- remove `has_email_notifications: false` and `has_email_notifications_manual_override: false` from mock data for cleanliness.

## Common Pitfalls

### Pitfall 1: GATE-04 -- New Store Provisioning
**What goes wrong:** Forgetting to change the column default means new stores still get `has_email_notifications = false`.
**Why it happens:** The `provision_store` RPC does `INSERT INTO store_plans (store_id)` which relies on column defaults. The default is currently `false` (set in migration 014).
**How to avoid:** Include `ALTER TABLE store_plans ALTER COLUMN has_email_notifications SET DEFAULT true` in the migration.
**Warning signs:** New signups after deployment don't get email notifications.

### Pitfall 2: Auth Hook Rewrite Breaks Other Claims
**What goes wrong:** Copy-paste error in the auth hook rewrite accidentally removes xero, custom_domain, or inventory claims.
**Why it happens:** The auth hook is rewritten with `CREATE OR REPLACE` -- the entire function body must be correct.
**How to avoid:** The new migration should be a careful edit of the current version (migration 024). Diff against 024 to verify only email_notifications lines are removed.
**Warning signs:** Other feature gates stop working after migration.

### Pitfall 3: PRICE_TO_FEATURE Runtime Initialization
**What goes wrong:** Removing `STRIPE_PRICE_EMAIL_NOTIFICATIONS` env var but not removing it from `PRICE_TO_FEATURE` causes `undefined` key in the reverse map.
**Why it happens:** `PRICE_TO_FEATURE` is built at module load time using env vars. If the env var is deleted but the code still references it, `process.env.STRIPE_PRICE_EMAIL_NOTIFICATIONS` becomes `undefined`, creating a map entry with key `'undefined'`.
**How to avoid:** Remove from both `PRICE_ID_MAP` and `PRICE_TO_FEATURE` in the same commit as the env var removal.
**Warning signs:** Webhook handler incorrectly matches unrelated price IDs.

### Pitfall 4: schema.test.ts Runs Against Live DB
**What goes wrong:** Test expects `has_email_notifications = false` but migration has set it to `true`.
**Why it happens:** `schema.test.ts` queries a real local Supabase instance, not mocks. After the migration runs, the seed data has `has_email_notifications = true`.
**How to avoid:** Update the assertion from `false` to `true`, or remove the assertion entirely.
**Warning signs:** schema.test.ts fails in CI after migration is applied.

### Pitfall 5: TypeScript Compile Errors from database.ts
**What goes wrong:** Removing `has_email_notifications` from `FeatureFlags` interface creates a mismatch with auto-generated `database.ts` types.
**Risk assessment:** LOW. The `FeatureFlags` interface in `addons.ts` is a standalone type, not derived from `database.ts`. The `FEATURE_TO_COLUMN` map uses `keyof FeatureFlags` as the value type, so removing `has_email_notifications` from both the key and value sides keeps it consistent. Code that reads `store_plans` via Supabase client uses the generated types directly, not `FeatureFlags`.
**How to avoid:** Verify no code imports `FeatureFlags` and expects `has_email_notifications` to be present.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Migration numbering | Custom numbering scheme | Follow existing pattern: `0XX_descriptive_name.sql` | Consistency with 24 existing migrations |
| Auth hook testing | Manual JWT inspection | Run `supabase db reset` + check token claims | Auth hook runs inside Supabase, not in Node |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 2.x |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run --reporter=verbose` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| GATE-01 | Email sends without feature gate | unit | `npx vitest run src/lib/email.ts --reporter=verbose` (no test file for email.ts currently) | N/A -- verify by code inspection |
| GATE-02 | Auth hook drops email_notifications claim | manual | `supabase db reset` + inspect JWT | N/A -- SQL migration |
| GATE-03 | Existing stores have has_email_notifications=true | manual | `supabase db reset` + query store_plans | N/A -- SQL migration |
| GATE-04 | New stores provisioned with email_notifications=true | integration | `npx vitest run src/lib/__tests__/schema.test.ts -x` | Exists (needs update) |
| BILL-01 | Email removed from ADDONS config | unit | `npx vitest run --reporter=verbose` (compile check) | Compile-time verification |
| BILL-02 | Email removed from checkout session | unit | `npx vitest run src/actions/billing/__tests__/createSubscriptionCheckoutSession.test.ts -x` | Exists (needs update) |
| BILL-03 | Webhook no longer toggles email flag | unit | `npx vitest run src/app/api/webhooks/stripe/billing/__tests__/billing.test.ts -x` | Exists (needs update) |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run --reporter=verbose`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
None -- existing test infrastructure covers all phase requirements. Tests need updating, not creating.

## Open Questions

1. **Migration numbering: 029 or next available?**
   - What we know: Latest migration is `024_service_product_type.sql`. There may be migrations 025-028 from phases 25-28.
   - What's unclear: Exact next migration number.
   - Recommendation: Check `supabase/migrations/` directory at execution time and use next available number. Name it `{N}_free_email_notifications.sql`.

2. **`has_email_notifications_manual_override` column behavior**
   - What we know: Column exists, stays in DB. No code changes target it in this phase.
   - What's unclear: Should the migration also set all `has_email_notifications_manual_override = false` since manual overrides are meaningless for a free feature?
   - Recommendation: Leave as-is. The column is inert -- super admin UI cleanup is Phase 30. Setting it to false is harmless but unnecessary work.

## Sources

### Primary (HIGH confidence)
- Direct code audit of all 15 source files listed in canonical references
- `src/config/addons.ts` -- single source of truth for feature config
- `supabase/migrations/024_service_product_type.sql` -- current auth hook version
- `supabase/migrations/014_multi_tenant_schema.sql` -- original `store_plans` schema with `DEFAULT false`
- `supabase/migrations/017_provision_store_rpc.sql` -- provision_store RPC (does not explicitly set has_email_notifications)

### Secondary (MEDIUM confidence)
- None needed -- all findings from direct code inspection

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new dependencies, all changes are removals
- Architecture: HIGH -- single source of truth pattern makes changes predictable
- Pitfalls: HIGH -- all identified through direct code audit, no speculation

**Research date:** 2026-04-06
**Valid until:** 2026-05-06 (stable -- removal-only phase, no external dependencies)
