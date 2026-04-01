---
phase: 04-online-store
plan: "06"
subsystem: pos-pickups
tags: [click-and-collect, pos, status-transitions, navigation]
dependency_graph:
  requires:
    - 04-07 (online orders exist to pick up)
  provides:
    - Status transition Server Action for click-and-collect flow
    - POS Pickups tab showing pending/ready orders
    - Navigation link in POS top bar (D-15b)
  affects:
    - src/components/pos/POSTopBar.tsx (added navigation)
    - src/actions/orders/ (new updateOrderStatus action)
    - src/app/(pos)/pickups/ (new route)
tech_stack:
  added: []
  patterns:
    - ALLOWED_TRANSITIONS map for valid status paths
    - useTransition for optimistic button loading in Client Component
    - usePathname for active nav state in POSTopBar
key_files:
  created:
    - src/actions/orders/updateOrderStatus.ts
    - src/app/(pos)/pickups/page.tsx
    - src/components/pos/PickupOrderCard.tsx
  modified:
    - src/components/pos/POSTopBar.tsx
decisions:
  - POSTopBar converted to 'use client' to use usePathname for active nav highlighting
  - updateOrderStatus uses staff JWT cookie (not Supabase auth) consistent with POS auth pattern
  - D-14 email notification explicitly deferred with TODO comment — not in Phase 4 scope
metrics:
  duration: 93s
  completed_date: "2026-04-01T07:42:59Z"
  tasks_completed: 2
  files_changed: 4
---

# Phase 4 Plan 6: Click-and-Collect Status Flow and POS Pickups Tab Summary

**One-liner:** Status transition Server Action (completed->pending_pickup->ready->collected) with POS Pickups tab and updated top bar navigation for click-and-collect (STORE-09, D-15b).

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Create updateOrderStatus Server Action | 49ebbc0 | src/actions/orders/updateOrderStatus.ts |
| 2 | Create POS Pickups tab + PickupOrderCard + update POSTopBar | 3914e4c | src/app/(pos)/pickups/page.tsx, src/components/pos/PickupOrderCard.tsx, src/components/pos/POSTopBar.tsx |

## What Was Built

### updateOrderStatus Server Action
- `'use server'` + `'server-only'` at top
- `ALLOWED_TRANSITIONS` map enforces: completed->pending_pickup, pending_pickup->ready, ready->collected
- Zod validation: orderId (UUID), newStatus (enum of three allowed values)
- Auth via staff JWT cookie (consistent with POS auth pattern from completeSale.ts)
- Fetches order, verifies store_id ownership, then checks transition
- Returns `{ error: 'Invalid status transition from X to Y' }` for invalid paths
- `revalidatePath('/pos/pickups')` and `revalidatePath('/admin/orders')` after update
- TODO D-14 comment for deferred pickup-ready email notification

### POS Pickups Page (`/pos/pickups`)
- Server Component with `export const dynamic = 'force-dynamic'`
- Auth: staff JWT cookie verification, redirect to login if missing
- Queries: `.eq('channel', 'online').in('status', ['pending_pickup', 'ready'])`
- Includes `order_items(product_name, quantity)` — uses product_name column directly from schema
- Two sections: "Awaiting Pickup" and "Ready for Collection" with filtered lists
- Empty state: "No pending pickups" when no orders in pickup-relevant statuses

### PickupOrderCard Component
- `'use client'` directive
- Shows: truncated order ID (monospace), customer email, formatted date, item list, total
- Status badges: "Awaiting Pickup" (blue) and "Ready for Collection" (emerald)
- "Mark Ready" button (navy) for pending_pickup status
- "Mark Collected" button (amber) for ready status
- `useTransition` for loading state — button disabled while pending

### POSTopBar Updated
- Added `'use client'` directive (required for usePathname)
- `usePathname()` for active tab highlighting
- Navigation: POS (/pos) and Pickups (/pos/pickups) links in header
- Active: `text-white font-semibold`, inactive: `text-white/60 hover:text-white/90`
- `onLogout` prop preserved — no breaking change to POSClientShell

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all data sources are wired. PickupOrderCard receives real order data from Supabase query. Status transitions update the database. No placeholder data.

## D-14 Deferral

Email notification when order transitions to 'ready' is explicitly out of scope for Phase 4. The TODO comment in updateOrderStatus.ts documents this for the team and for the Phase 5 admin build.

## Self-Check: PASSED

- src/actions/orders/updateOrderStatus.ts exists: FOUND
- src/app/(pos)/pickups/page.tsx exists: FOUND
- src/components/pos/PickupOrderCard.tsx exists: FOUND
- src/components/pos/POSTopBar.tsx modified with Pickups nav: FOUND
- Commit 49ebbc0 exists: FOUND
- Commit 3914e4c exists: FOUND
