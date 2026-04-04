---
phase: 23-feature-gating-pos-storefront-integration
plan: "02"
subsystem: admin-inventory-gating
tags: [feature-gating, inventory, upgrade-wall, pos, storefront]
dependency_graph:
  requires: [23-00]
  provides: [inventory-upgrade-wall, inventory-page-gate]
  affects: [admin-inventory, pos-stock-badges, storefront-sold-out]
tech_stack:
  added: []
  patterns: [jwt-fast-path-gating, server-component-upgrade-wall]
key_files:
  created:
    - src/components/admin/inventory/InventoryUpgradeWall.tsx
  modified:
    - src/app/admin/inventory/page.tsx
decisions:
  - "InventoryUpgradeWall is self-contained (no props) — sources all content from ADDONS config, not hardcoded strings"
  - "JWT app_metadata.inventory fast path used for page-level gate (not requireFeature DB check) — consistent with layout.tsx pattern"
  - "getStockLevels() call is skipped entirely for non-subscribed stores — no wasted DB query"
metrics:
  duration_minutes: 5
  completed_date: "2026-04-04"
  tasks_completed: 1
  tasks_total: 2
  files_created: 1
  files_modified: 1
requirements_covered: [GATE-01, GATE-04, POS-01, POS-02, POS-03]
---

# Phase 23 Plan 02: Inventory Upgrade Wall and Feature Gate Verification Summary

**One-liner:** InventoryUpgradeWall component gates /admin/inventory for non-subscribed stores via JWT fast path; POS/storefront stock integration verified intact from Phases 21-22.

## What Was Built

### Task 1: Create InventoryUpgradeWall component and gate inventory page (COMPLETE)

**`src/components/admin/inventory/InventoryUpgradeWall.tsx`** — New Server Component.
- Lock icon (32px, matches UpgradePrompt.tsx pattern)
- Headline and body sourced from `ADDONS.find((a) => a.feature === 'inventory')` — no hardcoded copy
- Amber CTA button (`<a>` tag, not `<button>`) linking to `/admin/billing?upgrade=inventory`
- `w-full text-center` on CTA, `py-2.5` for 44px touch target
- No `role=` attribute on the card (per UI-SPEC accessibility contract)
- Centered in content area with `pt-[var(--space-2xl)]` offset

**`src/app/admin/inventory/page.tsx`** — Modified to add feature gate.
- Reads `!!(user?.app_metadata as any)?.inventory` after auth check
- Returns `<InventoryUpgradeWall />` for non-subscribed stores (no redirect)
- Subscribed stores continue to full InventoryPageClient render
- `getStockLevels()` never called for non-subscribed stores (clean fast path)

### Task 2: Verify POS/storefront stock integration and requireFeature guards (CHECKPOINT)

All automated verifications passed before checkpoint:

**requireFeature guards (GATE-01) — ALL 5 FILES PRESENT:**
- `src/actions/inventory/adjustStock.ts` — `requireFeature('inventory', { requireDbCheck: true })`
- `src/actions/inventory/commitStocktake.ts` — `requireFeature('inventory', { requireDbCheck: true })`
- `src/actions/inventory/createStocktakeSession.ts` — `requireFeature('inventory', { requireDbCheck: true })`
- `src/actions/inventory/discardStocktakeSession.ts` — `requireFeature('inventory', { requireDbCheck: true })`
- `src/actions/inventory/updateStocktakeLine.ts` — `requireFeature('inventory', { requireDbCheck: true })`

**POS stock integration (POS-01, POS-02) — VERIFIED:**
- `ProductCard.tsx` has `showStockBadge`, `isOutOfStock`, `isLowStock` — badge states at lines 24-27
- `POSClientShell.tsx` passes `hasInventory`, renders `OutOfStockDialog`, triggers at line 163
- POS page (`/pos/page.tsx`) queries `has_inventory` from store_plans

**Storefront stock integration (POS-03) — VERIFIED:**
- `AddToCartButton.tsx` has `isSoldOut` with `hasInventory === true` strict check, disabled state
- `StoreProductCard.tsx` has `isSoldOut` and `<SoldOutBadge />` render
- Storefront page queries `has_inventory` from store_plans

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all components are wired to real data (ADDONS config, JWT app_metadata, store_plans query).

## Self-Check: PASSED

- `src/components/admin/inventory/InventoryUpgradeWall.tsx` — EXISTS
- `src/app/admin/inventory/page.tsx` — MODIFIED with `hasInventory` gate
- Task 1 commit: `64fbe69`
- All 506 vitest tests passing
