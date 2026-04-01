---
phase: 05-admin-reporting
plan: "03"
subsystem: ui
tags: [next.js, react, supabase, tailwind, server-components, pagination]

# Dependency graph
requires:
  - phase: 05-01
    provides: OrderStatusBadge and ChannelBadge components used in OrderDataTable

provides:
  - /admin/orders page with server-side paginated order list
  - OrdersPageClient client shell managing drawer state
  - OrderDataTable with 7 columns, sortable, click-to-select rows
  - OrderFilterBar with URL-driven filters (status, channel, payment, date range, search)
  - OrderDetailDrawer with line items, GST breakdown, click-and-collect transitions, refund trigger

affects:
  - 05-04 (refund plan will wire into onRefundClick handler in OrderDetailDrawer)
  - future plans referencing /admin/orders

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Server Component page with URL-driven filters passed to Supabase query
    - Client-side filter bar using useSearchParams + useRouter to update URL params
    - Drawer open/close managed in client shell (OrdersPageClient), not page
    - Input validation for filter enum values (status/channel/payment_method) before Supabase .eq()
    - unknown type assertion for Supabase joined query result (staff relation)

key-files:
  created:
    - src/app/admin/orders/page.tsx
    - src/app/admin/orders/loading.tsx
    - src/components/admin/orders/OrdersPageClient.tsx
    - src/components/admin/orders/OrderDataTable.tsx
    - src/components/admin/orders/OrderFilterBar.tsx
    - src/components/admin/orders/OrderDetailDrawer.tsx
  modified: []

key-decisions:
  - "VALID_STATUSES/VALID_CHANNELS/VALID_PAYMENT_METHODS Sets used to validate filter params before passing to Supabase .eq() — prevents TypeScript enum mismatch and guards against invalid values in URL"
  - "Staff join result typed as unknown then asserted to OrderWithStaff — Supabase JS type inference can't resolve staff->orders relation name at compile time"
  - "Refund button calls onRefundClick prop (no inline logic) — actual refund processing is in Plan 04"

patterns-established:
  - "URL-driven filter pattern: useSearchParams reads current params, updateParam builds new URLSearchParams and router.push() — each filter change resets page to 1"
  - "Server-side pagination: page/offset calculated from URL searchParams, .range(offset, offset + PAGE_SIZE - 1) applied to Supabase query"

requirements-completed:
  - ADMIN-07

# Metrics
duration: 4min
completed: "2026-04-01"
---

# Phase 05 Plan 03: Orders Summary

**Paginated /admin/orders page with URL-driven filter bar, sortable data table, and slide-out order detail drawer with GST breakdown and click-and-collect status transitions**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-04-01T09:24:51Z
- **Completed:** 2026-04-01T09:28:28Z
- **Tasks:** 3
- **Files modified:** 6 created, 0 modified

## Accomplishments

- Server Component `/admin/orders` page fetches paginated orders (50/page) with server-side URL-driven filters and auth guard
- OrderDataTable with 7 columns (ID, date, total, channel, payment, status, staff) — navy header, 48px rows, sortable via URL params
- OrderDetailDrawer with full line items table, GST breakdown, click-and-collect transition buttons (Mark Ready / Mark Collected), and Refund Order trigger

## Task Commits

1. **Task 1: Orders Server Component page with pagination and filter query** - `3d99762` (feat)
2. **Task 2: OrdersPageClient, OrderDataTable, OrderFilterBar components** - `563ca73` (feat)
3. **Task 3: OrderDetailDrawer with line items, status, and click-and-collect transitions** - `92b8bee` (feat)

## Files Created/Modified

- `src/app/admin/orders/page.tsx` - Server Component, Supabase auth guard, PAGE_SIZE=50 pagination, URL-driven filters
- `src/app/admin/orders/loading.tsx` - Animated skeleton matching table structure
- `src/components/admin/orders/OrdersPageClient.tsx` - Client shell, selectedOrder state, pagination controls
- `src/components/admin/orders/OrderDataTable.tsx` - 7-column table, navy header, sortable columns, empty states
- `src/components/admin/orders/OrderFilterBar.tsx` - URL-driven selects, date range inputs, order ID search
- `src/components/admin/orders/OrderDetailDrawer.tsx` - Slide-in panel, line items, GST summary, C&C transitions, refund button

## Decisions Made

- VALID_STATUSES/VALID_CHANNELS/VALID_PAYMENT_METHODS Sets guard filter URL params before Supabase `.eq()` to avoid TypeScript enum mismatch
- Staff join result typed via `unknown` assertion — Supabase TS inference cannot resolve `orders->staff` relation name at compile time (pre-existing limitation)
- Refund button wired to `onRefundClick` prop only (no inline logic) — actual refund processing will be implemented in Plan 04

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

TypeScript type error on Supabase joined query result: the `staff(name)` join returns a `SelectQueryError` type at compile time because Supabase cannot statically resolve the relation name. Fixed by validating filter params with a `Set` (Rule 1 — bug fix) and using `unknown` type assertion for the orders data passed to `OrdersPageClient`.

## User Setup Required

None - no external service configuration required.

## Known Stubs

None. All components receive real data from the server. The `onRefundClick` handler in `OrdersPageClient` currently sets state and closes the drawer — the actual refund API call is intentionally deferred to Plan 04 as documented in the plan.

## Next Phase Readiness

- `/admin/orders` page is fully functional with real Supabase data
- `OrderDetailDrawer` exposes `onRefundClick` prop — Plan 04 can wire the refund flow by wrapping `OrdersPageClient` or extending the drawer
- Click-and-collect transitions call `updateOrderStatus` Server Action directly from the drawer

---
*Phase: 05-admin-reporting*
*Completed: 2026-04-01*
