---
phase: 25-admin-operational-ui
plan: 03
subsystem: ui
tags: [customers, supabase, react, server-actions, zod, tailwind, auth-ban]

# Dependency graph
requires:
  - phase: 25-admin-operational-ui
    plan: 01
    provides: Migration 028 adding is_active to customers, AdminSidebar Customers link
provides:
  - getCustomers Server Action — list with order counts
  - getCustomerDetail Server Action — profile + order history
  - disableCustomer Server Action — two-step DB flag + auth ban with rollback
  - enableCustomer Server Action — two-step DB flag + auth unban with rollback
  - Customer list page with search and pagination
  - Customer detail page with profile header and order history
  - DisableCustomerModal with confirmation flow
affects: [storefront-auth, customer-access-control]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Two-step DB+auth operation with rollback pattern (disable: set DB flag, then ban auth user; rollback DB on auth failure)"
    - "Admin client used for all customer queries (bypasses RLS for owner cross-table joins)"
    - "Client-side data fetching in detail page via useEffect+Server Action (not Server Component) — enables optimistic UI updates after disable/enable"

key-files:
  created:
    - src/actions/customers/getCustomers.ts
    - src/actions/customers/getCustomerDetail.ts
    - src/actions/customers/disableCustomer.ts
    - src/actions/customers/enableCustomer.ts
    - src/app/admin/customers/page.tsx
    - src/app/admin/customers/[id]/page.tsx
    - src/components/admin/customers/CustomersPageClient.tsx
    - src/components/admin/customers/CustomerTable.tsx
    - src/components/admin/customers/DisableCustomerModal.tsx
  modified: []

key-decisions:
  - "Customer detail page implemented as 'use client' component — enables data refresh after disable/enable without full page navigation"
  - "orders table has no order_number column (plan referenced non-existent column) — uses first 8 chars of UUID displayed in font-mono as order reference"
  - "getCustomers uses adminClient for all queries — bypasses RLS complexity when owner needs cross-store join visibility"

patterns-established:
  - "Two-step disable/enable with rollback: DB update → auth ban → rollback if auth fails"
  - "useEffect + Server Action for client-side data refresh in detail pages"

requirements-completed: [CUST-01, CUST-02, CUST-03, CUST-04]

# Metrics
duration: 15min
completed: 2026-04-05
---

# Phase 25 Plan 03: Customer Management Summary

**Complete customer management feature: paginated list with search, detail page with order history, and two-step disable/enable account functionality using Supabase Auth ban**

## Performance

- **Duration:** 15 min
- **Started:** 2026-04-05T03:14:00Z
- **Completed:** 2026-04-05T03:29:41Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments

- Four Server Actions for customer CRUD: getCustomers (list with order counts), getCustomerDetail (profile + orders), disableCustomer (two-step DB flag + 876600h auth ban), enableCustomer (two-step DB flag + auth unban)
- All Server Actions are owner-only with Zod validation and rollback on Step B failure
- Customer list page renders paginated table (20/page) with 300ms debounced search, autofocused on mount per D-01 focal point spec
- Customer detail page shows profile header with Active/Disabled status badge, Disable Account/Enable Account buttons
- Disable flow: button → DisableCustomerModal confirmation → two-step DB+auth ban → revalidate
- Enable flow: button → immediate two-step DB+auth unban → revalidate (non-destructive, no modal per D-03)
- All copywriting matches UI-SPEC contract exactly

## Task Commits

Each task was committed atomically:

1. **Task 1: Customer Server Actions (getCustomers, getCustomerDetail, disableCustomer, enableCustomer)** - `657bd7c` (feat)
2. **Task 2: Customer list page, detail page, client components, and disable modal** - `d6109c7` (feat)

## Files Created/Modified

- `src/actions/customers/getCustomers.ts` - Server Action: owner auth, admin client, order counts via countMap
- `src/actions/customers/getCustomerDetail.ts` - Server Action: customer profile + order history by auth_user_id
- `src/actions/customers/disableCustomer.ts` - Server Action: two-step disable with rollback (ban_duration: 876600h)
- `src/actions/customers/enableCustomer.ts` - Server Action: two-step enable with rollback (ban_duration: none)
- `src/app/admin/customers/page.tsx` - Server Component: calls getCustomers, error boundary, passes to CustomersPageClient
- `src/app/admin/customers/[id]/page.tsx` - Client Component: profile header, disable/enable, paginated order history
- `src/components/admin/customers/CustomersPageClient.tsx` - Client: search (300ms debounce, autoFocus), 20/page pagination, empty states
- `src/components/admin/customers/CustomerTable.tsx` - Client: clickable rows, status badges (Active/Disabled), overflow-x-auto
- `src/components/admin/customers/DisableCustomerModal.tsx` - Confirmation modal: Disable/Keep Account Active, Disabling... loading state

## Decisions Made

- Customer detail page is a `'use client'` component (not a Server Component) to support immediate UI update after disable/enable without requiring full page navigation
- `order_number` column doesn't exist in the orders schema — using first 8 characters of UUID displayed in `font-mono` as order reference identifier
- All customer queries use `createSupabaseAdminClient()` to bypass RLS complexity for the owner context

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] orders.order_number column does not exist in schema**
- **Found during:** Task 1 (TypeScript compilation)
- **Issue:** Plan specified `order_number` column in orders table for display in order history. The column doesn't exist in any migration or database.ts types. `tsc --noEmit` emitted `SelectQueryError<"column 'order_number' does not exist on 'orders'">`
- **Fix:** Removed `order_number` from CustomerOrder type and select query. Display uses `order.id.slice(0, 8).toUpperCase()` in `font-mono` — achieves the visual requirement of a short order reference in monospace font
- **Files modified:** src/actions/customers/getCustomerDetail.ts, src/app/admin/customers/[id]/page.tsx
- **Commit:** `657bd7c`

---

**Total deviations:** 1 auto-fixed (1 missing column)
**Impact on plan:** Functional equivalent achieved — order reference displayed in font-mono as required by UI-SPEC

## Issues Encountered

- Pre-existing TypeScript errors in `src/actions/inventory/adjustStock.ts`, `src/actions/products/createProduct.ts`, `src/actions/products/importProducts.ts` — out of scope, pre-existing.

## Known Stubs

None — all Server Actions wire to real Supabase queries. All UI components use real data.

## User Setup Required

- Migration 028 must be applied for `is_active` column to exist on customers table: `npx supabase db push` or `npx supabase migration up`
- No new migrations required for this plan

## Self-Check: PASSED
