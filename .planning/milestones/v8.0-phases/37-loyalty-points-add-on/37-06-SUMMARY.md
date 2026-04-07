---
phase: 37-loyalty-points-add-on
plan: "06"
subsystem: admin-customers
tags: [loyalty, admin, customers, points, transaction-history]
dependency_graph:
  requires: ["37-01", "37-04"]
  provides: [loyalty-points-column, loyalty-transaction-history]
  affects: [admin-customer-table, admin-customer-detail]
tech_stack:
  added: []
  patterns: [conditional-column-visibility, server-action-feature-flag, client-state-from-server-action]
key_files:
  created: []
  modified:
    - src/actions/customers/getCustomers.ts
    - src/actions/customers/getCustomerDetail.ts
    - src/app/admin/customers/page.tsx
    - src/components/admin/customers/CustomerTable.tsx
    - src/components/admin/customers/CustomersPageClient.tsx
    - src/app/admin/customers/[id]/page.tsx
decisions:
  - "hasLoyaltyPoints fetched in both CustomersPage and getCustomerDetail separately — each query is cheap and avoids prop-drilling through the client component boundary"
  - "loyalty_points batch query uses any-cast admin client — Supabase generated types not yet regenerated to include Phase 37 tables, consistent with Phase 35/36 pattern"
  - "LoyaltySection returns null when hasLoyaltyPoints=false — zero render cost when add-on not subscribed"
metrics:
  duration: "~10 min"
  completed_date: "2026-04-06"
  tasks_completed: 2
  files_modified: 6
requirements_satisfied: [LOYAL-10]
---

# Phase 37 Plan 06: Admin Customer Loyalty Visibility Summary

Merchant loyalty admin visibility — points column in customer table and transaction history in customer detail. LOYAL-10 satisfied.

## What Was Built

### Task 1: Loyalty Points Column in Admin Customer Table

- `getCustomers.ts`: Extended `CustomerListItem` type with `points_balance: number`. Batch-fetches loyalty points after the customer query using `loyalty_points` table. Uses `Map<string, number>` for O(1) lookups. Falls back to `0` for customers without a loyalty record.
- `CustomerTable.tsx`: Added conditional `Points` column (header + cell) gated by `hasLoyaltyPoints` prop. Right-aligned with `tabular-nums` class for numeric alignment.
- `CustomersPageClient.tsx`: Accepts and forwards `hasLoyaltyPoints` prop to `CustomerTable`.
- `src/app/admin/customers/page.tsx`: Fetches `has_loyalty_points` from `store_plans` table and passes as `hasLoyaltyPoints` to client component.

### Task 2: Customer Detail Loyalty Transaction History

- `getCustomerDetail.ts`: Extended return type with `loyalty: CustomerLoyalty` and `hasLoyaltyPoints: boolean`. Queries `loyalty_points` for balance and `loyalty_transactions` for last 50 transactions (ordered desc). New exported types: `LoyaltyTransaction`, `CustomerLoyalty`.
- Customer detail page (`[id]/page.tsx`): Added `LoyaltySection` component. Renders only when `hasLoyaltyPoints=true`. Shows current points balance prominently. Transaction table columns: Date, Type, Points (colored), Balance After, Order (Geist Mono link), Channel badge. Empty state: "No loyalty transactions yet." per copywriting contract. Positive points in green (#059669), negative in amber (#E67E22).

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all data is wired from live Supabase queries.

## Self-Check

- [x] `src/actions/customers/getCustomers.ts` contains `loyalty_points` and `points_balance`
- [x] `src/app/admin/customers/page.tsx` fetches `hasLoyaltyPoints` from `store_plans`
- [x] `src/components/admin/customers/CustomerTable.tsx` has "Points" column header and `points_balance` cell
- [x] `src/components/admin/customers/CustomerTable.tsx` has `hasLoyaltyPoints` conditional visibility
- [x] `src/actions/customers/getCustomerDetail.ts` contains `loyalty_transactions` and `loyalty_points` queries
- [x] `src/actions/customers/getCustomerDetail.ts` return shape contains `loyalty` object with `pointsBalance` and `transactions`
- [x] Customer detail page has loyalty transaction table rendering
- [x] Customer detail page has "No loyalty transactions yet." empty state
- [x] TypeScript compiles clean on all modified files (pre-existing errors in unrelated files)

## Self-Check: PASSED
