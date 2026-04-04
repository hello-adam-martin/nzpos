---
phase: 23-feature-gating-pos-storefront-integration
verified: 2026-04-04T10:14:32Z
status: human_needed
score: 5/6 success criteria verified
re_verification: false
human_verification:
  - test: "Subscribe to inventory add-on via billing portal in a test/staging environment"
    expected: "After Stripe checkout completes, user is redirected to /admin/billing?subscribed=inventory, a green success banner appears reading 'Inventory add-on activated! Your store now has full stock management.', and the banner auto-dismisses after 4 seconds without re-appearing on page refresh"
    why_human: "Stripe checkout flow requires a live Stripe session; cannot be verified by code inspection alone. The URL param stripping and JWT refresh on return also require a real browser session to confirm"
  - test: "Navigate to /admin/inventory as a store without inventory subscription"
    expected: "Upgrade wall appears with lock icon, 'Inventory management requires an upgrade' headline, body text about stock management, and amber 'Upgrade to unlock' button linking to /admin/billing?upgrade=inventory. The full inventory content is NOT shown."
    why_human: "Requires a real Supabase session with has_inventory=false in JWT app_metadata to confirm the gate works at runtime"
  - test: "Navigate to /admin/inventory as a store WITH inventory subscription"
    expected: "Full inventory page with stock table renders normally. No upgrade wall."
    why_human: "Requires a real Supabase session with has_inventory=true in JWT app_metadata"
  - test: "Confirm inventory JWT claim injects correctly on login"
    expected: "After logging in as a store with has_inventory=true in store_plans, the Supabase auth token should contain app_metadata.inventory=true. Can be verified via Supabase dashboard > Auth > Users > JWT or by inspecting the cookie."
    why_human: "JWT claim injection via custom_access_token_hook requires a live Supabase instance to confirm the hook fires. GATE-04 implementation exists in migration 024 but is not testable from code inspection alone."
---

# Phase 23: Feature Gating + POS/Storefront Integration Verification Report

**Phase Goal:** The inventory add-on is purchasable via Stripe, all inventory mutations are gated behind the subscription, and POS/storefront surfaces stock status when the add-on is active

**Verified:** 2026-04-04T10:14:32Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (from Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Store owner can subscribe to inventory add-on via billing portal and immediately gain access | ? HUMAN | Billing wiring verified in code; Stripe checkout and JWT refresh require live session to confirm |
| 2 | All inventory Server Actions reject requests from stores without active inventory subscription using DB path | VERIFIED | All 5 mutation files have `requireFeature('inventory', { requireDbCheck: true })` |
| 3 | POS product grid shows in-stock / low-stock / out-of-stock badges when inventory add-on is active | VERIFIED | `showStockBadge`, `isOutOfStock`, `isLowStock` implemented in ProductCard.tsx; 7 passing tests confirm behavior |
| 4 | POS blocks adding out-of-stock physical product to cart; service products always addable | VERIFIED | `isDisabled = isOutOfStock && staffRole !== 'owner'` in ProductCard; `OutOfStockDialog` in POSClientShell; 2 passing tests confirm |
| 5 | Storefront shows "sold out" and disables add-to-cart for out-of-stock physical products when add-on active | VERIFIED | `isSoldOut` logic in AddToCartButton and StoreProductCard; `disabled={isSoldOut}` confirmed; 4 passing tests confirm |
| 6 | Super admin can manually override inventory add-on status per store | VERIFIED | `activateAddon.ts` and `deactivateAddon.ts` accept `'inventory'`; `tenants/[id]/page.tsx` queries `has_inventory` and `has_inventory_manual_override` |

**Score:** 5/6 success criteria verified (1 needs human — Stripe live checkout)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/components/pos/__tests__/ProductCard.test.tsx` | Test scaffold for POS stock badge and out-of-stock behavior | VERIFIED | 7 substantive tests, all passing; `describe('ProductCard')` present |
| `src/components/store/__tests__/AddToCartButton.test.tsx` | Test scaffold for sold-out disable behavior | VERIFIED | 4 substantive tests, all passing; `describe('AddToCartButton')` present |
| `src/actions/billing/createSubscriptionCheckoutSession.ts` | Checkout accepting inventory feature | VERIFIED | `z.enum(['xero', 'email_notifications', 'custom_domain', 'inventory'])` at line 13 |
| `src/app/admin/billing/page.tsx` | Billing page with `has_inventory` in query | VERIFIED | `has_inventory` in select (line 33) and fallback object (line 47) |
| `src/app/admin/billing/BillingClient.tsx` | BillingClient with inventory in flagMap and success banner | VERIFIED | `has_inventory: boolean` in type (line 16); `inventory: storePlans.has_inventory` in flagMap (line 110); success banner with `role="alert"` and `bannerShownRef`; `router.replace()` strips URL param |
| `src/actions/super-admin/activateAddon.ts` | Activate addon accepting inventory feature | VERIFIED | `'inventory'` in `ActivateAddonSchema.feature` z.enum (line 11) |
| `src/actions/super-admin/deactivateAddon.ts` | Deactivate addon accepting inventory feature | VERIFIED | `'inventory'` in `DeactivateAddonSchema.feature` z.enum (line 11) |
| `src/app/super-admin/tenants/[id]/page.tsx` | Tenant detail page querying has_inventory columns | VERIFIED | `has_inventory` and `has_inventory_manual_override` in select string (line 33) |
| `src/components/admin/inventory/InventoryUpgradeWall.tsx` | Upgrade wall component for ungated inventory page | VERIFIED | Exists; sources content from `ADDONS.find((a) => a.feature === 'inventory')`; CTA links to `/admin/billing?upgrade=inventory`; uses `<a>` tag not `<button>` |
| `src/app/admin/inventory/page.tsx` | Inventory page with feature gate check | VERIFIED | `hasInventory` gate at line 24-28; `<InventoryUpgradeWall />` returned for non-subscribers; gate is BEFORE `getStockLevels()` call |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `BillingClient.tsx` | `createSubscriptionCheckoutSession.ts` | `handleSubscribe` calls `createSubscriptionCheckoutSession('inventory')` | VERIFIED | `createSubscriptionCheckoutSession.*inventory` pattern confirmed; action accepts 'inventory' in featureSchema |
| `BillingClient.tsx` | `billing/page.tsx` | `storePlans` prop passes `has_inventory` from server query | VERIFIED | `storePlans` passed at line 134 in page.tsx; `has_inventory` in server query and fallback |
| `tenants/[id]/page.tsx` | `activateAddon.ts` | `PlanOverrideRow` submits `feature='inventory'` to `activateAddon` | VERIFIED | `has_inventory` and `has_inventory_manual_override` in query; ADDONS array iteration renders toggle dynamically |
| `inventory/page.tsx` | `InventoryUpgradeWall.tsx` | Conditional render based on JWT `app_metadata.inventory` | VERIFIED | `import { InventoryUpgradeWall }` at line 5; `if (!hasInventory) { return <InventoryUpgradeWall /> }` at lines 26-28 |
| `InventoryUpgradeWall.tsx` | `/admin/billing?upgrade=inventory` | CTA link navigates to billing with upgrade param | VERIFIED | `href="/admin/billing?upgrade=inventory"` in `<a>` tag (line 31) |
| `POSClientShell.tsx` | `ProductCard.tsx` | `hasInventory` prop passed down for badge rendering | VERIFIED | `hasInventory={hasInventory}` at line 342; `hasInventory: boolean` in POSClientShell props at line 42 |
| `pos/page.tsx` | `POSClientShell.tsx` | `has_inventory` queried from DB and passed as `hasInventory` | VERIFIED | `has_inventory` selected at line 65; `hasInventory = storePlanResult.data?.has_inventory === true` at line 75 |
| `storefront/page.tsx` | `StoreProductCard.tsx` / `AddToCartButton.tsx` | `has_inventory` queried from DB and passed as `hasInventory` | VERIFIED | `has_inventory` selected at line 20; `hasInventory = storePlan?.has_inventory === true` at line 23 |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `BillingClient.tsx` (inventory flag) | `storePlans.has_inventory` | DB query in `billing/page.tsx` via `.select('has_xero, has_email_notifications, has_custom_domain, has_inventory')` | Yes — live DB query, not static | FLOWING |
| `BillingClient.tsx` (success banner) | `subscribedFeature` from `searchParams.get('subscribed')` | Stripe checkout success URL redirect (set by `createSubscriptionCheckoutSession`) | Yes — real Stripe redirect | FLOWING |
| `ProductCard.tsx` (stock badges) | `product.stock_quantity`, `product.reorder_threshold`, `hasInventory` | Products from DB, `hasInventory` from `store_plans.has_inventory` via POS page | Yes — real DB data | FLOWING |
| `AddToCartButton.tsx` (sold-out) | `hasInventory`, `product.stock_quantity` | `hasInventory` from storefront page DB query; `product` from product data | Yes — real DB data | FLOWING |
| `InventoryUpgradeWall.tsx` (copy) | `addon.gatedHeadline`, `addon.gatedBody` | `ADDONS.find()` from `src/config/addons.ts` — static config (intentional) | Yes — config-driven, not placeholder | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| POS ProductCard test suite passes | `npx vitest run src/components/pos/__tests__/ProductCard.test.tsx` | 7/7 tests pass | PASS |
| AddToCartButton test suite passes | `npx vitest run src/components/store/__tests__/AddToCartButton.test.tsx` | 4/4 tests pass | PASS |
| `requireFeature('inventory')` present in all 5 mutation actions | `grep -rn "requireFeature.*inventory" src/actions/inventory/` | 5 files: adjustStock, commitStocktake, createStocktakeSession, discardStocktakeSession, updateStocktakeLine | PASS |
| Stripe checkout flow accepts 'inventory' | `grep "inventory" src/actions/billing/createSubscriptionCheckoutSession.ts` | `z.enum([..., 'inventory'])` at line 13 | PASS |
| JWT auth hook injects inventory claim | `grep "app_metadata,inventory" supabase/migrations/024_service_product_type.sql` | `claims := jsonb_set(claims, '{app_metadata,inventory}', to_jsonb(COALESCE(v_has_inventory, false)))` at line 99 | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| GATE-01 | 23-02 | `requireFeature('inventory')` gates all inventory mutation Server Actions using DB path | SATISFIED | All 5 mutation files confirmed with `requireFeature('inventory', { requireDbCheck: true })` |
| GATE-02 | 23-01 | `store_plans` table has `has_inventory` and `has_inventory_manual_override` columns | SATISFIED | Migration 024 adds both columns; billing page queries `has_inventory`; super admin queries both columns |
| GATE-03 | 23-01 | Stripe checkout flow for inventory add-on subscription | SATISFIED | `createSubscriptionCheckoutSession.ts` featureSchema includes `'inventory'`; `PRICE_ID_MAP` has `inventory` key |
| GATE-04 | 23-02 | Auth hook injects `inventory` claim into JWT for fast-path UI rendering | SATISFIED | Migration 024 `custom_access_token_hook` sets `app_metadata.inventory` from `store_plans.has_inventory`; REQUIREMENTS.md checkbox is stale — implementation exists in Phase 21 migration and is consumed by inventory page gate |
| GATE-05 | 23-01 | Super admin can manually override inventory add-on status per store | SATISFIED | `activateAddon.ts` and `deactivateAddon.ts` accept `'inventory'`; tenant page queries `has_inventory_manual_override` |
| POS-01 | 23-00, 23-02 | POS product grid shows stock badges when inventory add-on is active | SATISFIED | `showStockBadge`, `isOutOfStock`, `isLowStock` in ProductCard.tsx; 7 passing tests |
| POS-02 | 23-00, 23-02 | POS blocks adding out-of-stock physical products to cart when add-on active | SATISFIED | `isDisabled = isOutOfStock && staffRole !== 'owner'`; `OutOfStockDialog` in POSClientShell; 2 passing tests |
| POS-03 | 23-00, 23-02 | Storefront shows "sold out" and disables add-to-cart for out-of-stock physical products when add-on active | SATISFIED | `isSoldOut` in AddToCartButton and StoreProductCard; `disabled={isSoldOut}`; 4 passing tests |

**Note on GATE-04:** REQUIREMENTS.md shows this as "Pending" (unchecked) but the implementation was delivered in Phase 21 (migration 024, `custom_access_token_hook` line 99). Phase 23 Plan 02 consumed this claim correctly (`!!(user?.app_metadata as any)?.inventory`). The REQUIREMENTS.md tracking table is stale. All 8 requirements are substantively implemented.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| None found | — | — | — | — |

No TODO, FIXME, placeholder comments, empty return values, or disconnected props found in any Phase 23 modified files.

### Human Verification Required

#### 1. Stripe Inventory Checkout Flow

**Test:** In a staging or test environment, log in as a store owner without the inventory add-on, navigate to `/admin/billing`, and click "Subscribe" on the Inventory Management card. Complete the Stripe checkout using a test card.

**Expected:** After Stripe redirects back to `/admin/billing?subscribed=inventory`, a green success banner appears with text "Inventory add-on activated! Your store now has full stock management." The banner auto-dismisses after 4 seconds. The URL updates to `/admin/billing` (param stripped). A page refresh does not re-show the banner. The inventory add-on card now shows "Active" status.

**Why human:** Stripe checkout requires a live Stripe test session. The URL param stripping (`router.replace`) and JWT session refresh (`supabase.auth.refreshSession()`) both require a real browser session to confirm.

#### 2. Inventory Upgrade Wall (Non-Subscriber)

**Test:** Log in as a store owner with `has_inventory=false` in their `store_plans` row. Navigate directly to `/admin/inventory`.

**Expected:** The full inventory table is NOT shown. Instead, an upgrade wall appears with: a lock icon (32px), headline "Inventory management requires an upgrade", body text about tracking stock quantities, and an amber "Upgrade to unlock" button. Clicking the button navigates to `/admin/billing?upgrade=inventory`.

**Why human:** Requires a real Supabase auth session with `app_metadata.inventory=false` to exercise the JWT fast path gate.

#### 3. Inventory Page (Subscriber)

**Test:** Log in as a store owner with `has_inventory=true` in their `store_plans` row. Navigate to `/admin/inventory`.

**Expected:** The full inventory management page renders normally with the stock levels table. No upgrade wall is shown.

**Why human:** Requires a real Supabase auth session with `app_metadata.inventory=true`.

#### 4. JWT Claim Injection Confirmation (GATE-04)

**Test:** Log in as a store owner whose `store_plans.has_inventory` is `true`. Inspect the Supabase JWT (via browser DevTools > Application > Cookies, decode the access token) or check via Supabase dashboard > Auth > Users.

**Expected:** The JWT `app_metadata` object contains `"inventory": true`.

**Why human:** Custom access token hook (`custom_access_token_hook` in migration 024) execution requires a live Supabase instance. The SQL is correct but must be confirmed to execute on login.

### Gaps Summary

No code-level gaps found. All 8 phase requirements have substantive implementation. The 4 human verification items above are runtime/integration checks that cannot be confirmed by static code analysis — they do not represent code deficiencies.

One administrative note: REQUIREMENTS.md marks GATE-04 as "Pending" (unchecked) but the implementation was delivered in Phase 21 (migration `024_service_product_type.sql`, line 99). The checkbox should be updated to reflect completion.

---

_Verified: 2026-04-04T10:14:32Z_
_Verifier: Claude (gsd-verifier)_
