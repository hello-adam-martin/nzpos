# Phase 23: Feature Gating + POS/Storefront Integration - Context

**Gathered:** 2026-04-04
**Status:** Ready for planning

<domain>
## Phase Boundary

The inventory add-on is purchasable via Stripe, all inventory mutations are gated behind the subscription, and POS/storefront surfaces stock status when the add-on is active. This phase wires up the billing checkout flow for the inventory feature, adds the `inventory` enum to all gating schemas, builds the upgrade wall page, connects super admin overrides, and ensures stock badges and sold-out states display correctly in POS and storefront for subscribed stores.

Requirements covered: GATE-01, GATE-02, GATE-03, GATE-04, GATE-05, POS-01, POS-02, POS-03

</domain>

<decisions>
## Implementation Decisions

### Gating UX
- **D-01:** When a store without the inventory add-on navigates to `/admin/inventory`, show an upgrade wall page — the page shell with a centered upgrade CTA card explaining what they get, linking to billing. Matches existing add-on card pattern.
- **D-02:** Inventory Server Actions called without subscription return `{ error: 'Feature not available', upgradeUrl: '/admin/billing' }` — matches existing `requireFeature` pattern.
- **D-03:** POS shows no stock badges or inventory references for non-subscribed stores. Clean POS cards with name, price, image only. Consistent with Phase 21 decision D-12.
- **D-04:** Storefront shows no stock info for non-subscribed stores. All products always purchasable. Consistent with Phase 21 decision D-13.

### Billing Activation
- **D-05:** After Stripe checkout completion, redirect back to `/admin/billing?success=inventory` with a success toast ("Inventory add-on activated!"). Feature goes live once webhook fires (typically <2 seconds).
- **D-06:** No polling for webhook race condition. Billing page shows current DB state. If webhook hasn't fired yet, a page refresh picks it up. Simple, no client-side polling complexity.

### Stock Badge Behavior
- **D-07:** Low-stock threshold uses the existing per-product `reorder_threshold` field (default 5, already in schema). Owner sets it when editing a product.
- **D-08:** If a store cancels the inventory add-on, all stock badges, sold-out states, and cart blocking disappear immediately when `has_inventory` flips to false via webhook. Products become freely sellable again. Stock data stays in DB.
- **D-09:** POS cart blocking: owners can override and add out-of-stock items to cart (with a warning). Staff cannot override. Covers receiving-then-selling scenarios where stock hasn't been adjusted yet.

### Super Admin Override
- **D-10:** Toggle switch on the tenant detail page next to "Inventory" in the add-ons section. Matches existing pattern for xero/email/custom_domain overrides.
- **D-11:** Manual override acts as a floor, not a ceiling. If super admin activates and store later subscribes via Stripe, both flags are true. If Stripe cancels, manual override keeps inventory active.
- **D-12:** No separate audit log for overrides. The `has_inventory_manual_override` column already tracks whether override is active. Sufficient for v1.

### Claude's Discretion
- Exact upgrade wall page layout and copy (follow existing add-on card patterns)
- Toast notification implementation details
- Owner override UX in POS (warning dialog vs inline warning)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Billing & Checkout
- `src/actions/billing/createSubscriptionCheckoutSession.ts` — **CRITICAL:** Line 13 `featureSchema` enum missing `'inventory'` — must add it
- `src/actions/billing/createBillingPortalSession.ts` — Billing portal (no changes needed)
- `src/app/api/webhooks/stripe/billing/route.ts` — Webhook handler (already generic, works for inventory)
- `src/app/admin/billing/page.tsx` — **Line 33:** Query missing `has_inventory` in select

### Feature Gating
- `src/lib/requireFeature.ts` — Feature gating utility (JWT fast path + DB fallback) — already handles `inventory`
- `src/config/addons.ts` — Add-on config with `inventory` already registered in SubscriptionFeature type

### Super Admin
- `src/app/super-admin/tenants/[id]/page.tsx` — **Lines 32-34:** Query missing `has_inventory*` columns
- `src/actions/super-admin/activateAddon.ts` — **Line 11:** Zod enum missing `'inventory'`
- `src/actions/super-admin/deactivateAddon.ts` — Zod enum likely missing `'inventory'` (check)

### POS Components
- `src/components/pos/ProductCard.tsx` — Already has `hasInventory` prop, stock badges, and out-of-stock logic. Owner override (D-09) needs to be added
- `src/components/pos/POSClientShell.tsx` — Passes `hasInventory` down the component chain

### Storefront Components
- `src/components/store/StoreProductCard.tsx` — Already has `hasInventory` prop and sold-out badge logic
- `src/components/store/AddToCartButton.tsx` — Already has `hasInventory` prop and sold-out disable logic

### Database
- `supabase/migrations/024_service_product_type.sql` — Phase 21 migration: `has_inventory` + `has_inventory_manual_override` columns, auth hook with inventory JWT claim
- `supabase/migrations/025_inventory_addon.sql` — Phase 22 migration: stock_adjustments, stocktake tables

### Admin Layout
- `src/components/admin/AdminSidebar.tsx` — Sidebar nav (Inventory item should be gated behind `has_inventory`)

### Requirements & Roadmap
- `.planning/REQUIREMENTS.md` — v3.0 requirements (GATE-01–05, POS-01–03)
- `.planning/ROADMAP.md` — Phase 23 success criteria

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `requireFeature('inventory')` — Feature gating already functional for inventory
- `ADDONS` array in `addons.ts` — Inventory add-on metadata with benefit line and gated messaging, ready for upgrade wall
- `ProductCard` with `hasInventory` prop — Stock badge rendering already implemented
- `StoreProductCard` / `AddToCartButton` — Sold-out logic already implemented
- Webhook handler — Fully generic, maps STRIPE_PRICE_INVENTORY automatically

### Established Patterns
- Feature enum additions: Add `'inventory'` to Zod enums in checkout, activate, deactivate schemas
- Billing page query pattern: Select feature columns from `store_plans`
- Super admin toggle pattern: Toggle switch + manual_override column (existing for xero, email, custom_domain)
- JWT claim flow: Auth hook → `app_metadata.inventory` → `requireFeature` reads it

### Integration Points
- 5 enum/schema additions to wire billing flow (checkout, billing page, super admin query, activate, deactivate)
- Upgrade wall page: New component at `/admin/inventory` for ungated stores
- AdminSidebar: Gate inventory nav item behind `hasInventory`
- POS ProductCard: Add owner override logic for out-of-stock (D-09)
- Billing page: Add `has_inventory` to store_plans query and display

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 23-feature-gating-pos-storefront-integration*
*Context gathered: 2026-04-04*
