---
phase: 37-loyalty-points-add-on
plan: "01"
subsystem: loyalty
tags: [loyalty, billing, migration, addons, sidebar]
dependency_graph:
  requires: ["37-00"]
  provides: ["loyalty DB schema", "loyalty billing pipeline", "loyalty admin nav"]
  affects: ["src/config/addons.ts", "src/app/admin/layout.tsx", "src/components/admin/AdminSidebar.tsx", "supabase/migrations/035_loyalty.sql"]
tech_stack:
  added: []
  patterns: ["SECURITY DEFINER RPC", "billing webhook map extension", "conditional sidebar section"]
key_files:
  created:
    - supabase/migrations/035_loyalty.sql
    - src/lib/loyalty-utils.ts
  modified:
    - src/lib/__tests__/loyalty-utils.test.ts
    - src/config/addons.ts
    - src/app/admin/layout.tsx
    - src/components/admin/AdminSidebar.tsx
    - src/actions/billing/createSubscriptionCheckoutSession.ts
    - .env.example
decisions:
  - "loyalty_settings uses separate table (Option B) for clean upsert and future extensibility"
  - "earn_loyalty_points/redeem_loyalty_points are SECURITY DEFINER RPCs accessible only to service_role"
  - "redeem_loyalty_points uses SELECT FOR UPDATE to prevent concurrent redemption race conditions"
  - "PRICE_TO_FEATURE uses conditional spread to guard against empty STRIPE_PRICE_LOYALTY env var"
metrics:
  duration_minutes: 4
  completed_date: "2026-04-07"
  tasks_completed: 2
  tasks_total: 2
  files_changed: 8
---

# Phase 37 Plan 01: DB Migration + Billing Foundation Summary

**One-liner:** Loyalty Points add-on foundation — Postgres schema with 3 tables and 2 SECURITY DEFINER RPCs, billing pipeline wired via addons.ts + STRIPE_PRICE_LOYALTY, admin sidebar nav gated by has_loyalty_points.

## What Was Built

### Task 1: DB Migration + loyalty-utils Pure Functions

**Migration `supabase/migrations/035_loyalty.sql`:**
- Adds `has_loyalty_points BOOLEAN NOT NULL DEFAULT false` to `store_plans` (with `IF NOT EXISTS` guard)
- Creates `loyalty_settings` table (store-scoped, earn_rate_cents + redeem_rate_cents nullable for D-10 gate)
- Creates `loyalty_points` table (denormalized balance ledger, `UNIQUE(store_id, customer_id)`, `CHECK points_balance >= 0`)
- Creates `loyalty_transactions` table (append-only audit log, points_delta + balance_after snapshot)
- Performance indexes: `idx_loyalty_points_store_customer`, `idx_loyalty_transactions_customer` (DESC), `idx_loyalty_transactions_order`
- RLS policies on all 3 tables using `current_setting('app.store_id', true)::uuid` pattern
- `earn_loyalty_points` SECURITY DEFINER RPC: D-10 gate (is_active + both rates non-null), UPSERT balance, INSERT transaction log
- `redeem_loyalty_points` SECURITY DEFINER RPC: SELECT FOR UPDATE row lock, validate balance, deduct, INSERT transaction log
- Both RPCs: `REVOKE FROM PUBLIC`, `GRANT TO service_role`

**`src/lib/loyalty-utils.ts`:**
- `calculatePointsEarned(netAmountCents, earnRateCents)` — `Math.floor(net / rate)`, returns 0 for invalid inputs
- `calculateRedemptionDiscount(pointsToRedeem, redeemRateCents)` — `points * rate`, returns 0 for invalid inputs
- `formatLoyaltyDisplay(pointsBalance, redeemRateCents)` — formats as "450 pts ($4.50 available)" per D-05
- All functions pure (no side effects), import `formatNZD` from `@/lib/money`

**Tests:** 8 tests GREEN in `src/lib/__tests__/loyalty-utils.test.ts` (converted from RED stubs)

### Task 2: Billing Pipeline + Admin Navigation

**`src/config/addons.ts`:**
- Added `'loyalty_points'` to `SubscriptionFeature` union type
- Added `has_loyalty_points: boolean` to `FeatureFlags` interface
- Added `loyalty_points: process.env.STRIPE_PRICE_LOYALTY ?? ''` to `PRICE_ID_MAP`
- Added conditional spread `{ [STRIPE_PRICE_LOYALTY]: 'has_loyalty_points' }` to `PRICE_TO_FEATURE`
- Added `loyalty_points: 'has_loyalty_points'` to `FEATURE_TO_COLUMN`
- Added Loyalty Points entry to `ADDONS` array with benefit line and gated copy

**`src/actions/billing/createSubscriptionCheckoutSession.ts`:**
- Added `'loyalty_points'` to `featureSchema` z.enum

**`src/app/admin/layout.tsx`:**
- Added `hasLoyaltyPoints` variable, queried from `store_plans.has_loyalty_points`
- Updated select query to include `has_loyalty_points`
- Passes `hasLoyaltyPoints` prop to `<AdminSidebar>`

**`src/components/admin/AdminSidebar.tsx`:**
- Added `hasLoyaltyPoints?: boolean` to `AdminSidebarProps`
- Updated Add-ons section condition to include `hasLoyaltyPoints === true`
- Added `/admin/loyalty` link block under Add-ons when `hasLoyaltyPoints` is true (same styling pattern as Gift Cards)

**`.env.example`:** Added `STRIPE_PRICE_LOYALTY=price_xxx`

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None. All three loyalty-utils functions are fully implemented with real assertions.

## Self-Check: PASSED

Files exist:
- supabase/migrations/035_loyalty.sql — FOUND
- src/lib/loyalty-utils.ts — FOUND
- src/lib/__tests__/loyalty-utils.test.ts — FOUND (8 tests passing)

Commits:
- 0964325 feat(37-01): DB migration + loyalty-utils pure functions — FOUND
- 7bad543 feat(37-01): billing pipeline + admin navigation for loyalty_points add-on — FOUND
