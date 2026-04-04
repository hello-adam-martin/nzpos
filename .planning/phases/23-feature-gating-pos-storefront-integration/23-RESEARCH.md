# Phase 23: Feature Gating + POS/Storefront Integration - Research

**Researched:** 2026-04-04
**Domain:** Stripe billing wiring, feature gating, upgrade wall UX, POS/storefront stock display
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Upgrade wall at `/admin/inventory` for non-subscribed stores — page shell with centered upgrade CTA card explaining benefits, linking to billing. Matches existing add-on card pattern.
- **D-02:** Inventory Server Actions return `{ error: 'Feature not available', upgradeUrl: '/admin/billing' }` — matches existing `requireFeature` pattern.
- **D-03:** POS shows no stock badges or inventory references for non-subscribed stores. Clean cards with name, price, image only.
- **D-04:** Storefront shows no stock info for non-subscribed stores. All products always purchasable.
- **D-05:** After Stripe checkout completion, redirect to `/admin/billing?success=inventory` with success toast ("Inventory add-on activated!"). Feature goes live once webhook fires.
- **D-06:** No polling for webhook race condition. Billing page shows current DB state. Page refresh picks up webhook when fired.
- **D-07:** Low-stock threshold uses existing per-product `reorder_threshold` field (default 5).
- **D-08:** Cancellation flips `has_inventory` false via webhook — badges/blocking disappear immediately. Stock data stays in DB.
- **D-09:** POS cart blocking — owners can override out-of-stock (warning); staff cannot.
- **D-10:** Toggle switch on tenant detail page for inventory add-on override. Matches existing xero/email/custom_domain pattern.
- **D-11:** Manual override acts as floor, not ceiling — both `has_inventory` and `has_inventory_manual_override` can be true simultaneously.
- **D-12:** No separate audit log for overrides. `has_inventory_manual_override` column is sufficient tracking.

### Claude's Discretion

- Exact upgrade wall page layout and copy (follow existing add-on card patterns)
- Toast notification implementation details
- Owner override UX in POS (warning dialog vs inline warning)

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.

</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| GATE-01 | `requireFeature('inventory')` gates all inventory Server Actions using DB path for mutations | Already implemented in all inventory actions — no new gating code needed. Inventory page (`/admin/inventory/page.tsx`) lacks gate — needs upgrade wall check. |
| GATE-02 | `store_plans` has `has_inventory` and `has_inventory_manual_override` columns | Already in DB via migration 024. Both billing page query and super admin query are missing these columns in their SELECT. |
| GATE-03 | Stripe checkout flow for inventory add-on subscription via `STRIPE_PRICE_INVENTORY` | `createSubscriptionCheckoutSession.ts` line 13 `featureSchema` enum is missing `'inventory'`. One-line fix. `STRIPE_PRICE_INVENTORY` already in `PRICE_ID_MAP` (addons.ts). Webhook handler already generic. |
| GATE-04 | Auth hook injects `inventory` claim into JWT | Already done in migration 024 (`custom_access_token_hook`). Admin layout already reads `user.app_metadata.inventory`. No new work. |
| GATE-05 | Super admin can manually override inventory add-on status per store | `activateAddon.ts` and `deactivateAddon.ts` Zod enums missing `'inventory'`. Super admin tenant query missing `has_inventory*` columns. Three-line fixes. |
| POS-01 | POS product grid shows stock badges when inventory add-on active | `ProductCard.tsx` already has `showStockBadge`, in/low/out-of-stock rendering. `POSClientShell` already passes `hasInventory`. POS page already queries `store_plans.has_inventory`. Fully implemented. |
| POS-02 | POS blocks adding out-of-stock physical products to cart | `POSClientShell.handleAddToCart` already blocks staff; owner path dispatches directly. `OutOfStockDialog` already exists. Fully implemented. |
| POS-03 | Storefront shows "sold out" and disables add-to-cart for out-of-stock physical products | `StoreProductCard.tsx` and `AddToCartButton.tsx` both have `isSoldOut` logic gated on `hasInventory === true`. Storefront page already queries `store_plans.has_inventory`. Fully implemented. |

</phase_requirements>

---

## Summary

Phase 23 is primarily a **wiring phase**, not a build phase. The majority of the feature gating and POS/storefront integration was implemented in Phases 21 and 22. The core logic — `requireFeature('inventory')` on all mutations, JWT claim injection, `hasInventory` prop threading through POS and storefront components, and the generic Stripe webhook handler — is complete and verified in the codebase.

The outstanding work consists of five targeted enum/schema/query additions, one new page (upgrade wall at `/admin/inventory` for ungated stores), and two secondary fixes (billing page `BillingClient.tsx` `flagMap` and `has_inventory` in the billing page query). The existing `OutOfStockDialog`, stock badge rendering, and sold-out states are fully implemented.

The most significant new work item is the **upgrade wall page**: when a store without `has_inventory` navigates to `/admin/inventory`, they should see a gated page instead of the inventory content. Currently `InventoryPage` renders content unconditionally — it checks only for auth, not for feature access.

**Primary recommendation:** This phase ships in a single wave. Five enum patches + one upgrade wall page + one billing page query fix + BillingClient flagMap addition. No database migrations required.

---

## Standard Stack

### Core (unchanged from project CLAUDE.md)
| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| Next.js App Router | 16.2 | Server Components, Server Actions | Feature-gated pages are Server Components; gating checks run server-side |
| Zod | ^3.x | Schema validation | Enum additions follow existing `z.enum([...])` pattern |
| Supabase JS | ^2.x | DB queries for store_plans | All feature flag reads come from store_plans table |
| Stripe (node) | ^17.x | Checkout session creation | Webhook handler already generic for inventory |

### No New Dependencies
This phase adds no new packages. All required tools are already installed.

---

## Architecture Patterns

### Pattern 1: Enum Addition Pattern
**What:** Three Server Actions have Zod enums listing allowed features. Adding `'inventory'` unblocks routing those actions to the inventory feature.

**Files requiring enum addition:**

1. `src/actions/billing/createSubscriptionCheckoutSession.ts` — line 13:
   ```typescript
   // BEFORE
   const featureSchema = z.enum(['xero', 'email_notifications', 'custom_domain'])
   // AFTER
   const featureSchema = z.enum(['xero', 'email_notifications', 'custom_domain', 'inventory'])
   ```

2. `src/actions/super-admin/activateAddon.ts` — line 11:
   ```typescript
   // BEFORE
   feature: z.enum(['xero', 'email_notifications', 'custom_domain']),
   // AFTER
   feature: z.enum(['xero', 'email_notifications', 'custom_domain', 'inventory']),
   ```

3. `src/actions/super-admin/deactivateAddon.ts` — line 10:
   ```typescript
   // BEFORE
   feature: z.enum(['xero', 'email_notifications', 'custom_domain']),
   // AFTER
   feature: z.enum(['xero', 'email_notifications', 'custom_domain', 'inventory']),
   ```

### Pattern 2: DB Query Extension Pattern
**What:** Two Server Components select specific columns from `store_plans` and are missing `has_inventory` and `has_inventory_manual_override`.

**Files requiring query additions:**

1. `src/app/admin/billing/page.tsx` — line 33 select string:
   ```typescript
   // BEFORE
   .select('has_xero, has_email_notifications, has_custom_domain')
   // AFTER
   .select('has_xero, has_email_notifications, has_custom_domain, has_inventory')
   ```
   Also update the `storePlans` fallback object and pass `has_inventory` to `BillingClient`.

2. `src/app/super-admin/tenants/[id]/page.tsx` — lines 32-34 select string:
   ```typescript
   // BEFORE
   .select('has_xero, has_email_notifications, has_custom_domain, has_xero_manual_override, has_email_notifications_manual_override, has_custom_domain_manual_override')
   // AFTER
   .select('has_xero, has_email_notifications, has_custom_domain, has_inventory, has_xero_manual_override, has_email_notifications_manual_override, has_custom_domain_manual_override, has_inventory_manual_override')
   ```

### Pattern 3: BillingClient flagMap Extension
**What:** `BillingClient.tsx` has a hardcoded `flagMap` for determining add-on active status. It's missing `inventory`.

```typescript
// In src/app/admin/billing/BillingClient.tsx, getStatus() function
// BEFORE
const flagMap: Record<string, boolean> = {
  xero: storePlans.has_xero,
  email_notifications: storePlans.has_email_notifications,
  custom_domain: storePlans.has_custom_domain,
}
// AFTER
const flagMap: Record<string, boolean> = {
  xero: storePlans.has_xero,
  email_notifications: storePlans.has_email_notifications,
  custom_domain: storePlans.has_custom_domain,
  inventory: storePlans.has_inventory,
}
```
Also update `BillingClientProps.storePlans` type to include `has_inventory: boolean`.

### Pattern 4: Upgrade Wall Page Pattern
**What:** `/admin/inventory` currently renders content for all authenticated users. It must check `has_inventory` from JWT and conditionally render either the upgrade wall or the inventory content.

**How admin layout passes hasInventory:** `AdminLayout` reads `user.app_metadata.inventory` from the Supabase session and passes `hasInventory` to `AdminSidebar`. The inventory PAGE itself does not receive this prop — it must read from auth context or JWT independently.

**Implementation approach (Server Component pattern):**
```typescript
// src/app/admin/inventory/page.tsx — add at top after auth check
const hasInventory = !!(user?.app_metadata as any)?.inventory

if (!hasInventory) {
  return <InventoryUpgradeWall />
}
// ... rest of page (getStockLevels, InventoryPageClient)
```

**Upgrade wall component**: New `src/components/admin/inventory/InventoryUpgradeWall.tsx`. Follows `AddOnCard` pattern from `src/components/admin/billing/AddOnCard.tsx`. Content sourced from `ADDONS` config:
- `gatedHeadline`: "Inventory management requires an upgrade"
- `gatedBody`: "Track stock quantities, adjust inventory, and run stocktakes with variance reporting."
- CTA button: links to `/admin/billing?upgrade=inventory`

**Note:** `AdminSidebar` already conditionally hides the Inventory nav item when `hasInventory === false` (added in Phase 21). The upgrade wall handles direct URL navigation.

### Pattern 5: Success Toast on Billing Return
**What:** After Stripe checkout for inventory, return URL is `/admin/billing?subscribed=inventory`. `BillingClient.tsx` already handles `?subscribed=` param to trigger `supabase.auth.refreshSession()`. Need to display a success toast when `subscribed=inventory` is in the URL.

**Existing pattern:** `BillingClient` reads `searchParams.get('subscribed')` and `searchParams.get('upgrade')`. No toast is currently displayed. The D-05 decision says to show "Inventory add-on activated!" toast.

**Implementation:** Add toast state in `BillingClient.tsx` triggered when `subscribedFeature === 'inventory'` (or any feature). Can use a simple in-page notification div with `useEffect` + `setTimeout` dismiss, consistent with existing error display patterns in the file.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Feature flag check | Custom JWT parsing | `requireFeature('inventory', {requireDbCheck: true})` | Already implemented, handles JWT fast path + DB fallback |
| Stripe billing flow | Custom payment form | `createSubscriptionCheckoutSession` + existing webhook | Webhook already maps `STRIPE_PRICE_INVENTORY` to `has_inventory` |
| Super admin override | New toggle component | `PlanOverrideRow` (already renders from ADDONS array) | Tenant page iterates ADDONS dynamically — just adding `inventory` to the DB query is sufficient |
| Stock badge display | New badge components | Existing `ProductCard` has `showStockBadge` logic | Already complete — do not rebuild |
| Sold-out enforcement | Cart context changes | Existing `AddToCartButton` and `StoreProductCard` | Already complete — do not rebuild |
| JWT claim injection | New auth middleware | `custom_access_token_hook` in migration 024 | Already injects `inventory` claim |

---

## What Already Works (Do Not Re-implement)

This is critical to avoid overbuilding in the plan:

| Component/File | Status | Evidence |
|----------------|--------|---------|
| `requireFeature('inventory', {requireDbCheck: true})` in all inventory actions | DONE | `adjustStock.ts`, `createStocktakeSession.ts`, `commitStocktake.ts` all call it |
| `has_inventory` + `has_inventory_manual_override` DB columns | DONE | Migration 024 `ALTER TABLE store_plans ADD COLUMN IF NOT EXISTS...` |
| Auth hook `inventory` JWT claim injection | DONE | Migration 024 `custom_access_token_hook` injects `app_metadata.inventory` |
| `AdminLayout` reads `hasInventory` from JWT | DONE | `src/app/admin/layout.tsx` line 13 |
| `AdminSidebar` conditionally shows Inventory nav | DONE | `AdminSidebar.tsx` inserts `/admin/inventory` only when `hasInventory === true` |
| POS page queries `store_plans.has_inventory` | DONE | `src/app/(pos)/pos/page.tsx` `storePlanResult` |
| `POSClientShell` passes `hasInventory` down | DONE | Props and `ProductGrid` call both verified |
| `ProductCard` stock badge rendering | DONE | `showStockBadge`, `isOutOfStock`, `isLowStock`, badge text |
| `POSClientShell.handleAddToCart` owner override | DONE | Lines 160-172: owner dispatches directly, staff gets `OutOfStockDialog` |
| `OutOfStockDialog` component | DONE | Already imported and rendered in `POSClientShell` |
| Storefront page queries `store_plans.has_inventory` | DONE | `src/app/(store)/page.tsx` |
| `StoreProductCard` sold-out badge | DONE | `isSoldOut` logic, `SoldOutBadge` render |
| `AddToCartButton` sold-out disable | DONE | `isSoldOut` logic, button `disabled` |
| `PRICE_TO_FEATURE` maps `STRIPE_PRICE_INVENTORY` | DONE | `addons.ts` conditional spread |
| Webhook handler maps inventory price to `has_inventory` | DONE | Generic column update via `PRICE_TO_FEATURE` |
| `PlanOverrideRow` renders for all ADDONS dynamically | DONE | Tenant page iterates `ADDONS` array |

---

## What Needs Building

| Item | File | Change Type | Size |
|------|------|-------------|------|
| Add `'inventory'` to checkout featureSchema | `createSubscriptionCheckoutSession.ts` | 1-line enum patch | Trivial |
| Add `has_inventory` to billing page query | `src/app/admin/billing/page.tsx` | Query + type update | Small |
| Add `has_inventory` to BillingClient props + flagMap | `src/app/admin/billing/BillingClient.tsx` | Type + flagMap | Small |
| Add success toast for `?subscribed=inventory` | `src/app/admin/billing/BillingClient.tsx` | UI addition | Small |
| Add `'inventory'` to activateAddon schema | `activateAddon.ts` | 1-line enum patch | Trivial |
| Add `'inventory'` to deactivateAddon schema | `deactivateAddon.ts` | 1-line enum patch | Trivial |
| Add `has_inventory*` to super admin tenant query | `super-admin/tenants/[id]/page.tsx` | Query update | Small |
| Add feature gate check to inventory page | `src/app/admin/inventory/page.tsx` | Auth check + branch | Small |
| New `InventoryUpgradeWall` component | `src/components/admin/inventory/InventoryUpgradeWall.tsx` | New component | Medium |

---

## Common Pitfalls

### Pitfall 1: Forgetting BillingClient Type and flagMap
**What goes wrong:** Billing page query adds `has_inventory` to the select, but `BillingClientProps.storePlans` type and the `getStatus()` `flagMap` are not updated. TypeScript may not catch the runtime mismatch if the prop type uses a wider type.
**Why it happens:** The billing page and billing client are separate files. Easy to update one without the other.
**How to avoid:** Update both the `storePlans` type in `BillingClientProps` and the `flagMap` in `getStatus()` in the same commit.

### Pitfall 2: Upgrade Wall vs. Redirect
**What goes wrong:** Redirecting non-subscribed users away from `/admin/inventory` instead of showing an upgrade wall. Redirect means users never see the upgrade opportunity.
**Why it happens:** Redirect is the first instinct for feature gating.
**How to avoid:** Per D-01, show the upgrade wall inline at the same URL. The page component conditionally renders `<InventoryUpgradeWall />` or `<InventoryPageClient />` — not a `redirect()`.

### Pitfall 3: Reading hasInventory in the Wrong Place
**What goes wrong:** Using `requireFeature('inventory')` (DB check) in `InventoryPage` for the render gate, when the JWT fast path is appropriate for UI rendering.
**Why it happens:** Conflating the mutation-gate pattern (requireDbCheck: true) with the render-gate pattern.
**How to avoid:** For page rendering, read from `user.app_metadata.inventory` (JWT fast path), identical to how `AdminLayout` does it. Only mutations use `requireDbCheck: true`.

### Pitfall 4: Super Admin Toggle Not Working Despite Enum Fix
**What goes wrong:** Super admin fixes enum in `activateAddon` but forgets the tenant page query. The `PlanOverrideRow` component receives `isActive={Boolean(plans[col])}` where `col = 'has_inventory'`, but `has_inventory` was never selected in the query, so it's `undefined`. The toggle renders but shows wrong state.
**Why it happens:** `ADDONS` array now includes `inventory`, so `PlanOverrideRow` renders — but the data feed is incomplete.
**How to avoid:** The super admin query in `tenants/[id]/page.tsx` must be updated in the same task as the enum fixes.

### Pitfall 5: Toast Appearing on Every Billing Page Visit
**What goes wrong:** Toast state is derived from URL params directly without clearing — refreshing the page while `?subscribed=inventory` is in the URL re-shows the toast.
**Why it happens:** `useSearchParams` is reactive. Without clearing the URL param after showing toast, the toast re-fires.
**How to avoid:** Use `useEffect` with `router.replace` to strip the `?subscribed` param after showing the toast, or use a `useRef` flag to show once per mount.

---

## Architecture Patterns: Upgrade Wall

### Recommended Structure
```typescript
// src/components/admin/inventory/InventoryUpgradeWall.tsx
// Server or Client component — can be server-only (no interactivity needed)
// Uses ADDONS config to pull messaging, links to /admin/billing?upgrade=inventory

export function InventoryUpgradeWall() {
  // Source copy from ADDONS.find(a => a.feature === 'inventory')
  // Centered card with:
  // - Feature name heading
  // - Benefit list (from gatedBody)
  // - Single CTA: "Upgrade to unlock inventory" → /admin/billing?upgrade=inventory
}
```

The billing page already handles `?upgrade=inventory` — it scrolls to and highlights the inventory AddOnCard. This creates a clean user journey: upgrade wall → billing page highlighted on inventory card → subscribe → return with `?subscribed=inventory` → success toast.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest ^2.x / ^3.x |
| Config file | `vitest.config.ts` (root) |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run --coverage` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| GATE-01 | `requireFeature('inventory', {requireDbCheck: true})` on mutations | unit | `npx vitest run src/actions/inventory/__tests__/ --reporter=verbose` | Yes (5 test files) |
| GATE-02 | Billing page query includes `has_inventory` | smoke | Manual verify — no existing billing page test | No — Wave 0 gap |
| GATE-03 | Checkout action accepts `'inventory'` feature | unit | `npx vitest run src/actions/billing/__tests__/ --reporter=verbose` | No — Wave 0 gap |
| GATE-04 | JWT claim injection | integration | Manual verify via Supabase dashboard | N/A (migration already applied) |
| GATE-05 | Super admin activate/deactivate accept `'inventory'` | unit | `npx vitest run src/actions/super-admin/__tests__/ --reporter=verbose` | No — Wave 0 gap |
| POS-01 | Stock badges render when `hasInventory=true` | unit | `npx vitest run src/components/pos/__tests__/ --reporter=verbose` | No — Wave 0 gap |
| POS-02 | Cart blocking for out-of-stock | unit | `npx vitest run src/components/pos/__tests__/ --reporter=verbose` | No — Wave 0 gap |
| POS-03 | Storefront sold-out disable | unit | `npx vitest run src/components/store/__tests__/ --reporter=verbose` | No — Wave 0 gap |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run --coverage`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/actions/billing/__tests__/createSubscriptionCheckoutSession.test.ts` — covers GATE-03 (inventory enum acceptance)
- [ ] `src/actions/super-admin/__tests__/activateAddon.test.ts` — covers GATE-05 (inventory enum in activate)
- [ ] `src/actions/super-admin/__tests__/deactivateAddon.test.ts` — covers GATE-05 (inventory enum in deactivate)
- [ ] `src/components/pos/__tests__/ProductCard.test.tsx` — covers POS-01, POS-02 (badge rendering, cart block)
- [ ] `src/components/store/__tests__/AddToCartButton.test.tsx` — covers POS-03 (sold-out disable)

**Note:** `src/actions/inventory/__tests__/` has 5 existing test files that already cover GATE-01. These pass today and should remain green throughout Phase 23.

---

## Environment Availability

Step 2.6: SKIPPED (no external dependencies beyond existing project stack — this phase makes no new external service calls, adds no new CLI tools, and requires no new infrastructure).

The only external dependency is `STRIPE_PRICE_INVENTORY` env var. It is referenced in `addons.ts` with a `?? ''` fallback, so the app does not crash if unset. For a real inventory subscription to work, this env var must be set in Vercel and Stripe must have a real price ID created. This is a deployment configuration concern, not a code concern.

---

## Code Examples

### Checkout Enum Fix (verified from source)
```typescript
// src/actions/billing/createSubscriptionCheckoutSession.ts — line 13
// Source: codebase read 2026-04-04
const featureSchema = z.enum(['xero', 'email_notifications', 'custom_domain', 'inventory'])
```

### Billing Page Query Fix (verified from source)
```typescript
// src/app/admin/billing/page.tsx — storePlansResult query
// Source: codebase read 2026-04-04
adminClient
  .from('store_plans')
  .select('has_xero, has_email_notifications, has_custom_domain, has_inventory')
  .eq('store_id', storeId)
  .single()
```

### Inventory Page Gate (pattern from AdminLayout)
```typescript
// src/app/admin/inventory/page.tsx — add after auth check, before getStockLevels
// Source: mirrors AdminLayout pattern at src/app/admin/layout.tsx line 13
const hasInventory = !!(user?.app_metadata as any)?.inventory
if (!hasInventory) {
  return <InventoryUpgradeWall />
}
```

### Super Admin Query Fix (verified from source)
```typescript
// src/app/super-admin/tenants/[id]/page.tsx — plansResult query
// Source: codebase read 2026-04-04
(admin as any)
  .from('store_plans')
  .select(
    'has_xero, has_email_notifications, has_custom_domain, has_inventory, ' +
    'has_xero_manual_override, has_email_notifications_manual_override, ' +
    'has_custom_domain_manual_override, has_inventory_manual_override'
  )
  .eq('store_id', id)
  .single()
```

---

## Open Questions

1. **STRIPE_PRICE_INVENTORY env var existence**
   - What we know: Referenced in `addons.ts` with `?? ''` fallback. Code does not crash if unset.
   - What's unclear: Whether a real Stripe Price ID has been created for the inventory add-on in the project's Stripe dashboard.
   - Recommendation: Plan should include a note that this env var must be set in Vercel + `.env.local` before the billing flow can be tested end-to-end. If the price doesn't exist yet, create it in Stripe dashboard during implementation.

2. **Toast implementation style**
   - What we know: `BillingClient.tsx` uses error `<p role="alert">` for inline feedback. No existing toast component in the project.
   - What's unclear: Whether to use a fixed-position overlay toast or an inline success banner below the billing header.
   - Recommendation: Use an inline success banner at the top of the billing page (consistent with existing error display pattern). Fixed-position toasts require a portal and more state management. Per D-05 decision, Claude has discretion on implementation details.

---

## Sources

### Primary (HIGH confidence)
- Codebase: `src/actions/billing/createSubscriptionCheckoutSession.ts` — confirmed featureSchema enum on line 13
- Codebase: `src/lib/requireFeature.ts` — confirmed full implementation with JWT + DB path
- Codebase: `src/config/addons.ts` — confirmed `SubscriptionFeature` type includes `'inventory'`, `PRICE_TO_FEATURE` includes inventory
- Codebase: `src/actions/super-admin/activateAddon.ts` — confirmed enum missing `'inventory'` on line 11
- Codebase: `src/actions/super-admin/deactivateAddon.ts` — confirmed enum missing `'inventory'` on line 10
- Codebase: `src/app/admin/billing/page.tsx` — confirmed `has_inventory` missing from select on line 33
- Codebase: `src/app/super-admin/tenants/[id]/page.tsx` — confirmed `has_inventory*` missing from select on lines 32-34
- Codebase: `src/components/pos/ProductCard.tsx` — confirmed full stock badge and out-of-stock logic
- Codebase: `src/components/pos/POSClientShell.tsx` — confirmed `handleAddToCart` owner override, `OutOfStockDialog` usage
- Codebase: `src/components/store/StoreProductCard.tsx` — confirmed `isSoldOut` logic
- Codebase: `src/components/store/AddToCartButton.tsx` — confirmed `isSoldOut` disable
- Codebase: `src/app/admin/inventory/page.tsx` — confirmed no feature gate, renders content for all authenticated users
- Codebase: `src/app/admin/layout.tsx` — confirmed `hasInventory` from JWT, `AdminSidebar` gating
- Codebase: `src/app/(store)/page.tsx` — confirmed `has_inventory` query and `hasInventory` pass
- Codebase: `src/app/(pos)/pos/page.tsx` — confirmed `storePlanResult` and `hasInventory` pass
- Codebase: `supabase/migrations/024_service_product_type.sql` — confirmed `has_inventory` columns and auth hook injection
- Codebase: `src/app/api/webhooks/stripe/billing/route.ts` — confirmed generic handler via `PRICE_TO_FEATURE`
- Codebase: `src/app/admin/billing/BillingClient.tsx` — confirmed `flagMap` missing `inventory`, `storePlans` type missing `has_inventory`

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new libraries; all existing stack verified in codebase
- Architecture: HIGH — exact file paths, line numbers, and code diffs verified from source reads
- Pitfalls: HIGH — all pitfalls derived from actual code gaps found in codebase
- Test gaps: HIGH — vitest.config.ts confirmed, existing test files confirmed, missing test files confirmed by glob

**Research date:** 2026-04-04
**Valid until:** 2026-05-04 (stable pattern — no fast-moving dependencies)
