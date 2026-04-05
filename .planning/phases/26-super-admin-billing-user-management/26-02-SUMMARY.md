---
phase: 26-super-admin-billing-user-management
plan: 02
subsystem: ui
tags: [stripe, react, super-admin, billing, subscriptions, invoices]

# Dependency graph
requires:
  - phase: 26-super-admin-billing-user-management
    provides: Phase 26 plan 01 — super-admin tenant list with Stripe analytics snapshots

provides:
  - Tenant detail page with Stripe subscription rows (status badges, amounts, billing anchor date)
  - Tenant detail page with recent invoices table (date, description, amount, status badge)
  - Payment overdue warning banner when subscription is past_due/unpaid or invoice is open+overdue
  - Owner email and signup date visible in Store Information card
  - Page gracefully handles null stripe_customer_id (shows empty states, no crash)
  - TenantDetailActions extended with ownerEmail and ownerAuthId props for Plan 03

affects:
  - 26-03 (user management actions — consumes ownerEmail/ownerAuthId from TenantDetailActions)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Promise.allSettled for parallel Stripe + Supabase admin auth fetches after initial query resolves
    - hasPastDue derived from subscription status (not invoice status — invoice has no past_due status)
    - billing_cycle_anchor used for renewal date display (current_period_end absent in Stripe SDK v17)

key-files:
  created: []
  modified:
    - src/app/super-admin/tenants/[id]/page.tsx
    - src/app/super-admin/tenants/[id]/TenantDetailActions.tsx

key-decisions:
  - "Use Promise.allSettled (not Promise.all) for Stripe + owner fetches — partial failure is acceptable; show error inline rather than crashing the page"
  - "hasPastDue checks subscription status for past_due/unpaid, and invoice open+overdue by due_date — Invoice.Status has no past_due value"
  - "billing_cycle_anchor used for renewal date — Stripe SDK v17 Subscription type has no current_period_end field"

patterns-established:
  - "Stripe failure pattern: try/catch via Promise.allSettled, stripeError string displayed inline, page continues rendering with empty state"

requirements-completed: [SA-BILL-01, SA-BILL-02, SA-BILL-03, SA-USER-01]

# Metrics
duration: 15min
completed: 2026-04-05
---

# Phase 26 Plan 02: Tenant Detail Billing + Owner Info Summary

**Stripe subscription and invoice visibility added to super-admin tenant detail page, with payment overdue banner and owner email/signup date from Supabase Auth**

## Performance

- **Duration:** 15 min
- **Started:** 2026-04-05T10:50:00Z
- **Completed:** 2026-04-05T11:05:00Z
- **Tasks:** 1
- **Files modified:** 2

## Accomplishments
- Extended `stores` select to include `stripe_customer_id` and `owner_auth_id`
- Added Subscriptions card with per-subscription status badges, amount/interval display, and billing anchor date
- Added Recent Invoices table with date, description, amount, and status badges (includes overdue detection)
- Added payment overdue warning banner at top of page for past_due/unpaid subscriptions or open+overdue invoices
- Added Owner Email and Owner Signup fields to Store Information card via Supabase Admin Auth API
- Extended TenantDetailActions interface with `ownerEmail` and `ownerAuthId` props for Plan 03 consumption
- Page handles null stripe_customer_id gracefully — shows empty state messages, no crash

## Task Commits

1. **Task 1: Extend tenant detail page with owner info and Stripe billing sections** - `2c2b499` (feat)

**Plan metadata:** (pending final commit)

## Files Created/Modified
- `src/app/super-admin/tenants/[id]/page.tsx` - Extended with Stripe billing sections, owner info, payment warning banner
- `src/app/super-admin/tenants/[id]/TenantDetailActions.tsx` - Added `ownerEmail` and `ownerAuthId` to props interface

## Decisions Made
- Used `Promise.allSettled` for the second parallel fetch (Stripe + owner info) — Stripe failure should not crash the page; owner info is independent
- `hasPastDue` checks subscription `status === 'past_due' || 'unpaid'` AND invoice `open + overdue by due_date` — Invoice.Status in Stripe SDK v17 does not include 'past_due'
- `billing_cycle_anchor` used instead of `current_period_end` for renewal date — the Stripe Subscription type in SDK v17 does not expose `current_period_end` at the top level

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed hasPastDue to use correct Stripe type constraints**
- **Found during:** Task 1 (TypeScript compile check)
- **Issue:** Plan specified `inv.status === 'past_due'` but Invoice.Status type is `'draft' | 'open' | 'paid' | 'uncollectible' | 'void'` — no `past_due` value exists
- **Fix:** hasPastDue now checks subscription.status for `past_due`/`unpaid`, and invoice.status `open` + due_date overdue
- **Files modified:** src/app/super-admin/tenants/[id]/page.tsx
- **Committed in:** 2c2b499 (Task 1 commit)

**2. [Rule 1 - Bug] Fixed Subscription renewal date to use billing_cycle_anchor**
- **Found during:** Task 1 (TypeScript compile check)
- **Issue:** Plan specified `sub.current_period_end` but Stripe Subscription type in SDK v17 has no `current_period_end` field at the top level
- **Fix:** Used `sub.billing_cycle_anchor` instead for the renewal date display (shows as "Anchored [date]")
- **Files modified:** src/app/super-admin/tenants/[id]/page.tsx
- **Committed in:** 2c2b499 (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (both Rule 1 — Bug, Stripe SDK type mismatches with plan's assumed API surface)
**Impact on plan:** Both fixes necessary for TypeScript correctness. Functionality equivalent — overdue detection still works; renewal date still displays. No scope creep.

## Issues Encountered
- Pre-existing TypeScript errors in `adjustStock.ts`, `createProduct.ts`, `importProducts.ts` found during tsc check — out of scope, not fixed, logged here for awareness

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Plan 03 can consume `ownerEmail` and `ownerAuthId` from TenantDetailActions props immediately
- Stripe billing sections are live; super-admin can view subscriptions and invoices per tenant
- Payment overdue banner will appear automatically when Stripe reports past_due subscription status

---
*Phase: 26-super-admin-billing-user-management*
*Completed: 2026-04-05*
