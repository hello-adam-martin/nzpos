---
phase: 10-customer-accounts
plan: "01"
subsystem: database + middleware
tags: [customers, auth-hook, rls, middleware, supabase]
dependency_graph:
  requires: [003_auth_hook.sql, 002_rls_policies.sql, src/middleware.ts]
  provides: [customers table, customer JWT claims, role-guarded RLS, customer route blocking]
  affects: [orders RLS, order_items RLS, auth hook, POS routes, admin routes]
tech_stack:
  added: []
  patterns: [SECURITY DEFINER RPC, CREATE OR REPLACE auth hook extension, role-guarded RLS replacement]
key_files:
  created:
    - supabase/migrations/012_customer_accounts.sql
  modified:
    - src/middleware.ts
decisions:
  - "customer_id on orders references auth.users(id) directly (not customers.id) for simpler RLS without joins"
  - "DROP + CREATE for tenant_isolation on orders/order_items to prevent customers from accessing all store orders"
  - "posSupabase created at top of /pos block to catch customer role before staffToken is checked"
metrics:
  duration: "~2 minutes"
  completed: "2026-04-02"
  tasks_completed: 2
  tasks_total: 2
  files_created: 1
  files_modified: 1
requirements: [CUST-04, CUST-05]
---

# Phase 10 Plan 01: Customer Accounts Database Foundation Summary

**One-liner:** Customers table, JWT role injection for customer role, role-guarded RLS replacing broad tenant_isolation, and middleware blocking customers from POS/admin routes.

## What Was Built

### Task 1: Database Migration (supabase/migrations/012_customer_accounts.sql)

Seven-section migration establishing the full customer accounts infrastructure:

1. **Customers table** — mirrors the `staff` table pattern. UUID PK, `store_id` (tenant isolation), `auth_user_id` (unique FK to auth.users), `name`, `email`, `preferences` JSONB with default `{"email_receipts": true, "marketing_emails": false}`, timestamps. Indexes on `auth_user_id` and `email`.

2. **customer_id on orders** — `ALTER TABLE public.orders ADD COLUMN customer_id UUID REFERENCES auth.users(id)`. References `auth.users(id)` directly (not `customers.id`) so RLS can use `customer_id = auth.uid()` without a join.

3. **RLS on customers** — Two policies: `customer_own_profile` (ALL using `auth_user_id = auth.uid()`) and `staff_read_customers` (SELECT for owner/staff in same store).

4. **Role-guarded orders RLS** — Drops the broad `tenant_isolation` policy and replaces with `staff_owner_orders` (ALL for owner/staff with role IN check) and `customer_own_orders` (SELECT scoped to `customer_id = auth.uid()`).

5. **Role-guarded order_items RLS** — Same pattern as orders: drops `tenant_isolation`, creates `staff_owner_order_items` and `customer_own_order_items` (via subquery on orders).

6. **Auth hook extension** — `CREATE OR REPLACE` of `custom_access_token_hook`. After failing to find a staff record, falls through to look up `public.customers` and injects `role='customer'` and `store_id` into JWT. `GRANT SELECT ON public.customers TO supabase_auth_admin` added.

7. **Order-linking RPC** — `link_customer_orders(p_auth_user_id, p_email)` as `SECURITY DEFINER`. Updates all orders where `customer_email = p_email AND customer_id IS NULL`. Returns count of linked orders. Called after signup to auto-link past orders (D-11).

### Task 2: Middleware Extension (src/middleware.ts)

Two changes to `src/middleware.ts` per D-10 (customers silently redirected to `/`, no error message):

- **`/admin` block:** Added `if (role === 'customer') { return NextResponse.redirect(new URL('/', request.url)) }` before the existing `role !== 'owner'` check. Customers never see the `/unauthorized` page.

- **`/pos` block:** Added customer check at the top of the `/pos` block (after the `/pos/login` passthrough), before the `staffToken` cookie check. Uses `posSupabase` / `posUser` distinct variables to avoid shadowing the later owner-fallback Supabase client. A customer with a stale `staff_session` cookie is still blocked.

## Verification

- All acceptance criteria passed for both tasks
- `npx vitest run` — 218 tests pass, 3 pre-existing failures in `email-sender.test.ts` (unrelated to this plan, confirmed pre-existing)
- Migration SQL syntactically reviewed: no missing semicolons, correct DROP/CREATE ordering

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — this plan is pure schema/middleware infrastructure. No UI components or data-wiring stubs.

## Commits

| Task | Hash | Message |
|------|------|---------|
| 1 | 8f48332 | feat(10-01): add customers table, auth hook extension, and role-guarded RLS |
| 2 | c29e8d0 | feat(10-01): extend middleware to block customer role from /admin and /pos |

## Self-Check: PASSED

- FOUND: supabase/migrations/012_customer_accounts.sql
- FOUND: src/middleware.ts
- FOUND: .planning/phases/10-customer-accounts/10-01-SUMMARY.md
- FOUND: commit 8f48332
- FOUND: commit c29e8d0
