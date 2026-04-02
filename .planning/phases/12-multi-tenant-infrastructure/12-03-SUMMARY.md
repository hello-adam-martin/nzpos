---
phase: 12-multi-tenant-infrastructure
plan: "03"
subsystem: database
tags: [rls, security, migration, multi-tenant, super-admin, auth-hook]
dependency_graph:
  requires: [12-01 (super_admins table, store_plans table)]
  provides: [015_rls_policy_rewrite.sql, 016_super_admin.sql, is_super_admin JWT claim]
  affects: [Plan 04 (middleware uses is_super_admin claim), any code querying refunds/refund_items (now fixed)]
tech_stack:
  added: []
  patterns: [unified-rls-naming, app_metadata-jwt-path, super-admin-jwt-injection]
key_files:
  created:
    - supabase/migrations/015_rls_policy_rewrite.sql
    - supabase/migrations/016_super_admin.sql
  modified: []
decisions:
  - "orders_public_read policy preserved from 006 (guest checkout confirmation requires anon read of online orders)"
  - "store_plans owner-read only (not staff) — billing info is owner-sensitive"
  - "super admin check runs before staff/customer in auth hook (D-12: cross-tenant, no store_id required)"
metrics:
  duration_minutes: 5
  completed_date: "2026-04-03"
  tasks_completed: 2
  tasks_total: 2
  files_created: 2
  files_modified: 0
---

# Phase 12 Plan 03: RLS Policy Rewrite + Super Admin Auth Hook Summary

**One-liner:** Full RLS rewrite (D-14) with unified app_metadata JWT path, super admin cross-tenant SELECT, fixed refund policies, and auth hook extended to inject is_super_admin claim from super_admins table.

## What Was Built

Migration 015 drops all existing RLS policies across all tables and recreates them with a unified, auditable pattern:

1. **Clean slate DROP** — All policies from migrations 002, 006, 012, and 013 are dropped with IF EXISTS. The broken `current_setting('request.jwt.claims')` path used in 013 is eliminated.
2. **Unified naming** — `{table}_{role}_{access_type}` (e.g., `products_tenant_access`, `orders_super_admin_read`).
3. **Correct JWT path** — Every tenant-scoped policy uses `auth.jwt() -> 'app_metadata' ->> 'store_id'` without exception.
4. **Super admin SELECT** — Every table gets a `{table}_super_admin_read` policy allowing cross-tenant reads for `is_super_admin = true`.
5. **Customer isolation** — `orders_customer_read` scoped to `customer_id = auth.uid()`. `order_items_customer_read` via subquery to customer's own orders.
6. **Public read preserved** — `products_public_read` (is_active = true), `promo_codes_public_read` (is_active + not expired), `orders_public_read` (channel = 'online' for guest checkout).
7. **Refunds fixed** — `refunds_staff_access` and `refund_items_staff_read/insert` now use correct `app_metadata` path.
8. **store_plans** — Owner-read only (not staff). Super admin read. No write policies (service role only via billing webhook).

Migration 016 extends the auth hook (CREATE OR REPLACE over 012's version):

1. **Super admin check first** — Queries `super_admins` table before staff/customer lookup.
2. **Dual role support** — A super admin who is also a store owner gets both `is_super_admin=true` AND their `store_id`/`role` injected (D-13).
3. **Staff + customer chain preserved** — Existing lookup logic from 012 unchanged.
4. **GRANT re-issued** — `GRANT SELECT ON public.super_admins TO supabase_auth_admin` (safe re-grant from 014).

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Create migration 015_rls_policy_rewrite.sql | 14d856d | supabase/migrations/015_rls_policy_rewrite.sql |
| 2 | Create migration 016_super_admin.sql (auth hook extension) | 9966066 | supabase/migrations/016_super_admin.sql |

## Verification Results

- `npx supabase db reset` completes without errors — migrations 015 and 016 apply cleanly on top of 014
- No `current_setting('request.jwt.claims')` in 015 (only appears in comment line)
- All 14 tables covered: stores, staff, categories, products, orders, order_items, promo_codes, stripe_events, cash_sessions, customers, refunds, refund_items, store_plans
- 13 occurrences of `is_super_admin` in 015 (one per super_admin SELECT policy + comment)
- 6 occurrences of `is_super_admin` in 016 (declaration, check, inject, comment)
- NOTICEs during reset expected: 012 already dropped `tenant_isolation` on orders/order_items, so DROP IF EXISTS in 015 skips gracefully

## Deviations from Plan

**1. [Rule 2 - Missing Functionality] Preserved orders_public_read policy from migration 006**

- **Found during:** Task 1 — reviewing migration 006 before writing DROP section
- **Issue:** Migration 006 added `"Public can read orders by id"` (channel = 'online') for guest checkout order confirmation. This policy was not mentioned in the plan's DROP section.
- **Fix:** Added `DROP POLICY IF EXISTS "Public can read orders by id" ON public.orders` in Section 1, then recreated as `orders_public_read` in Section 2 to preserve guest checkout confirmation functionality.
- **Files modified:** supabase/migrations/015_rls_policy_rewrite.sql
- **Commit:** 14d856d

## Known Stubs

None — no UI components created in this plan, no placeholder data flows.

## Self-Check: PASSED

- [x] `supabase/migrations/015_rls_policy_rewrite.sql` exists
- [x] `supabase/migrations/016_super_admin.sql` exists
- [x] Commit 14d856d exists (Task 1)
- [x] Commit 9966066 exists (Task 2)
- [x] No `current_setting` SQL in 015
- [x] All 14 tables have policies in 015
- [x] `npx supabase db reset` completes without errors
