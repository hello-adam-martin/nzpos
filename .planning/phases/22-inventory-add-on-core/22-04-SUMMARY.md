---
phase: "22"
plan: "04"
subsystem: inventory-ui
tags: [inventory, admin-ui, stock-management, drawer, tab-navigation]
dependency_graph:
  requires: ["22-02"]
  provides: ["/admin/inventory page", "StockAdjustDrawer", "InventoryHistoryTab", "AdminSidebar inventory link"]
  affects: ["AdminSidebar", "ProductFormDrawer", "admin layout"]
tech_stack:
  added: []
  patterns: ["TabButton URL-driven navigation", "fixed right-side drawer with slide animation", "optimistic stock update on adjustment success"]
key_files:
  created:
    - src/app/admin/inventory/page.tsx
    - src/components/admin/inventory/InventoryPageClient.tsx
    - src/components/admin/inventory/StockLevelsTab.tsx
    - src/components/admin/inventory/StockAdjustDrawer.tsx
    - src/components/admin/inventory/InventoryHistoryTab.tsx
    - src/schemas/inventory.ts
    - src/actions/inventory/adjustStock.ts
    - src/actions/inventory/getStockLevels.ts
    - src/actions/inventory/getAdjustmentHistory.ts
  modified:
    - src/components/admin/AdminSidebar.tsx
    - src/app/admin/layout.tsx
    - src/components/admin/products/ProductFormDrawer.tsx
decisions:
  - "Used `as any` casts on inventory server actions to unblock TypeScript before Supabase type generation catches up (stock_adjustments table, product_type column, inventory SubscriptionFeature added by Plans 01-03 — will be resolved when worktrees are merged)"
  - "StockLevelsTab uses optimistic update on onSuccess — no page reload needed after adjustment"
  - "InventoryHistoryTab filters client-side by product name (no separate product search endpoint); server-side filtering by date/reason/page"
  - "ProductFormDrawer checks product_type via (product as any).product_type to avoid breaking existing TypeScript types before Phase 21 types are merged"
metrics:
  duration_minutes: 5
  tasks_completed: 2
  tasks_total: 3
  files_created: 9
  files_modified: 3
  completed_date: "2026-04-04"
---

# Phase 22 Plan 04: Inventory UI — Inventory Page, Adjustment Drawer, History Tab Summary

Inventory management UI built: /admin/inventory page with three-tab navigation, stock levels table with semantic colors and inline adjustment drawer, paginated history tab with filters, conditional sidebar navigation, and read-only stock field with Adjust stock button in product edit form.

## What Was Built

### Task 1: /admin/inventory page, InventoryPageClient, StockLevelsTab, StockAdjustDrawer

Created the complete inventory page hierarchy:

- **`src/app/admin/inventory/page.tsx`** — Server component, calls `getStockLevels()` server-side, passes products and tab param to `InventoryPageClient`
- **`src/components/admin/inventory/InventoryPageClient.tsx`** — URL-driven three-tab navigation (Stock Levels / Stocktakes / History) using TabButton pattern from ReportsPageClient
- **`src/components/admin/inventory/StockLevelsTab.tsx`** — Table with semantic stock colors (`text-error` for zero, `text-warning` for low-stock), amber left border on low-stock rows, hover-visible Adjust stock button per row, optimistic update on adjustment success
- **`src/components/admin/inventory/StockAdjustDrawer.tsx`** — 480px fixed right drawer with slide animation (250ms ease-out/ease-in), toggle between "Adjust by" / "Set to" modes, reason code select from `MANUAL_REASON_CODES`, live new-stock preview, spinner on save, inline error handling

Also created supporting files that will be provided by Plans 01-03 in the full merge:
- `src/schemas/inventory.ts` — Reason codes, labels, Zod schemas
- `src/actions/inventory/adjustStock.ts`
- `src/actions/inventory/getStockLevels.ts`
- `src/actions/inventory/getAdjustmentHistory.ts`

### Task 2: InventoryHistoryTab, AdminSidebar update, ProductFormDrawer update, admin layout update

- **`src/components/admin/inventory/InventoryHistoryTab.tsx`** — Filter bar (product text search, date range, reason code), paginated table with 50 rows/page, prev/next pagination, Geist Mono for change column with semantic colors (+N green / -N red), date-fns formatting, two empty states (no history vs no filter match with Clear filters amber link)
- **`src/components/admin/AdminSidebar.tsx`** — Added `hasInventory?: boolean` prop, conditionally inserts Inventory link after Products in nav order
- **`src/app/admin/layout.tsx`** — Reads `user.app_metadata.inventory` JWT claim, passes `hasInventory` to AdminSidebar
- **`src/components/admin/products/ProductFormDrawer.tsx`** — Added `hasInventory?: boolean` prop; when true and product is physical, makes stock_quantity field read-only with "Stock is managed through the inventory add-on." helper text; adds "Adjust stock" button opening StockAdjustDrawer; onSuccess updates stock_quantity display in form state (no reopen needed)

### Task 3: checkpoint:human-verify (PENDING)

Task 3 is a human verification checkpoint. Plan stops here and waits for human verification of the complete inventory page, adjustment flow, history tab, sidebar navigation, and product form integration.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Inventory actions and schemas not yet in worktree**
- **Found during:** Task 1 start
- **Issue:** This worktree (agent-a95f8227) is on the base main branch before Phase 22. Server actions from Plans 01-03 (`adjustStock`, `getStockLevels`, `getAdjustmentHistory`) and `src/schemas/inventory.ts` did not exist.
- **Fix:** Created all four files with full implementation matching the interface specs in the plan and the actual implementations found in the main repo (which already had them from parallel agents).
- **Files created:** All four action/schema files listed above
- **Note:** TypeScript `as any` casts used in action files where Supabase generated types don't yet include Phase 22 additions (stock_adjustments table, product_type column, inventory SubscriptionFeature, adjust_stock RPC). These casts are safe — the underlying DB will have these when the migration from Plan 01 is applied.

**2. [Rule 2 - Missing functionality] `product_type` field not on `ProductWithCategory` type in this worktree**
- **Found during:** Task 2 (ProductFormDrawer update)
- **Issue:** `ProductWithCategory` interface doesn't include `product_type` field (added by Phase 21 agents in separate worktrees).
- **Fix:** Used `(product as any)?.product_type ?? 'physical'` to read the field safely. Defaults to 'physical' for backward compatibility. When Phase 21 changes are merged, this can be cleaned up.
- **Files modified:** `src/components/admin/products/ProductFormDrawer.tsx`

## Known Stubs

None — all components wire to real server actions. The Stocktakes tab shows a placeholder empty state (no CTA button yet) — this is intentional per plan spec ("placeholder div for stocktakes (Plan 05)").

## Self-Check: PASSED

All 9 created files exist on disk. Both commits (28c21c4, a7c9c71) exist in git log. TypeScript passes with no errors (`npx tsc --noEmit` exits 0).
