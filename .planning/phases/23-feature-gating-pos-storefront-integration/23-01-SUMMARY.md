---
phase: 23-feature-gating-pos-storefront-integration
plan: 01
subsystem: billing
tags: [feature-gating, inventory, billing, super-admin, stripe]
dependency_graph:
  requires: [23-00]
  provides: [inventory-billing-wired, inventory-super-admin-override, billing-success-banner]
  affects: [billing-page, super-admin-tenant-detail, stripe-checkout]
tech_stack:
  added: []
  patterns: [zod-enum-extension, router-replace-url-cleanup, useRef-defense-in-depth]
key_files:
  created: []
  modified:
    - src/actions/billing/createSubscriptionCheckoutSession.ts
    - src/actions/super-admin/activateAddon.ts
    - src/actions/super-admin/deactivateAddon.ts
    - src/app/super-admin/tenants/[id]/page.tsx
    - src/app/admin/billing/page.tsx
    - src/app/admin/billing/BillingClient.tsx
decisions:
  - "Used established ?subscribed= param convention (not ?success= per D-05) — checkout action already uses ?subscribed="
  - "bannerShownRef provides defense-in-depth for same render cycle; router.replace() strips URL param to prevent refresh re-show"
metrics:
  duration_seconds: 106
  completed_date: "2026-04-04"
  tasks_completed: 2
  files_modified: 6
---

# Phase 23 Plan 01: Wire Inventory Add-On into Billing and Super Admin Summary

**One-liner:** Inventory add-on wired into Stripe checkout, super admin activate/deactivate, billing page display, and auto-dismiss success banner with URL param cleanup.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Wire inventory enum into billing checkout and super admin actions | ba835af | createSubscriptionCheckoutSession.ts, activateAddon.ts, deactivateAddon.ts, tenants/[id]/page.tsx |
| 2 | Update billing page query, BillingClient type/flagMap, and add success banner | 6cb9744 | billing/page.tsx, BillingClient.tsx |

## What Was Built

**Task 1 — Enum extensions:**
- `createSubscriptionCheckoutSession.ts`: Added `'inventory'` to `featureSchema` z.enum — Stripe checkout now accepts inventory as a valid feature
- `activateAddon.ts`: Added `'inventory'` to `ActivateAddonSchema.feature` z.enum — super admin can manually activate inventory
- `deactivateAddon.ts`: Added `'inventory'` to `DeactivateAddonSchema.feature` z.enum — super admin can manually deactivate inventory
- `tenants/[id]/page.tsx`: Extended store_plans select to include `has_inventory` and `has_inventory_manual_override` — PlanOverrideRow renders inventory toggle automatically via ADDONS array iteration

**Task 2 — Billing page and client:**
- `billing/page.tsx`: Added `has_inventory` to store_plans select query and fallback object
- `BillingClient.tsx`: Added `has_inventory: boolean` to `BillingClientProps.storePlans` type
- `BillingClient.tsx`: Added `inventory: storePlans.has_inventory` to `getStatus()` flagMap
- `BillingClient.tsx`: Added `showSuccessBanner` state with 4-second auto-dismiss, `role="alert"` for screen readers, inventory-specific message, and `router.replace()` to strip `?subscribed` param preventing refresh re-show

## Verification

All 8 plan verification checks passed:
1. `createSubscriptionCheckoutSession.ts` contains `'inventory'` in featureSchema
2. `activateAddon.ts` contains `'inventory'` in ActivateAddonSchema
3. `deactivateAddon.ts` contains `'inventory'` in DeactivateAddonSchema
4. `tenants/[id]/page.tsx` select contains `has_inventory` and `has_inventory_manual_override`
5. `billing/page.tsx` select and fallback contain `has_inventory`
6. `BillingClient.tsx` contains inventory in flagMap, storePlans type, and success banner
7. `BillingClient.tsx` contains `router.replace` for URL param stripping
8. All 434 vitest tests pass (13 skipped, 44 todo — unchanged from baseline)

## Deviations from Plan

None — plan executed exactly as written.

The plan's own note about `?subscribed=` vs `?success=` URL convention was already addressed in the plan text itself (D-05 note in Task 2 action). No deviation required.

## Known Stubs

None. All data flows are wired end-to-end:
- `has_inventory` is queried from `store_plans` and passed through to `BillingClient`
- `flagMap` uses live data from `storePlans.has_inventory`
- Success banner only shows when `subscribedFeature` is set from the URL param (i.e., when Stripe redirects back)

## Self-Check: PASSED

All modified files confirmed present. Both task commits (ba835af, 6cb9744) confirmed in git log.
