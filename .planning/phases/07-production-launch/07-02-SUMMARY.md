---
phase: 07-production-launch
plan: 02
status: complete
started: 2026-04-02T15:30:00.000Z
completed: 2026-04-02T17:00:00.000Z
---

# Plan 07-02 Summary: Production Infrastructure Setup

## What was built

Production infrastructure for NZPOS deployed and verified:

1. **Supabase production project** — all 9 migrations applied, auth hook registered, product-images storage bucket confirmed, owner auth account created, store and staff records inserted
2. **Vercel production deployment** — all 7 env vars configured, successful build and deploy at nzpos.vercel.app
3. **Type fixes** — regenerated database.ts from production Supabase to include all tables and RPCs; fixed null/undefined mismatches and implicit any types that blocked the build

## Key decisions

- **Auth hook workaround:** The Supabase Dashboard hook toggle did not persist correctly. Resolved by writing `role` and `store_id` directly into `auth.users.raw_app_meta_data`. Hook remains registered for future dynamic use.
- **Region:** ap-southeast-2 (Sydney) for NZ latency

## Issues encountered

- **Build failure:** Hand-maintained database.ts was missing `complete_pos_sale` RPC and several tables (xero_connections, xero_sync_log, rate_limits). Regenerated from production Supabase and fixed 10 type errors.
- **Auth hook not firing:** Despite being enabled in Supabase Dashboard, the custom_access_token_hook did not inject claims into JWTs. Workaround: set raw_app_meta_data directly on the auth user.

## Key files

### Modified
- `src/types/database.ts` — regenerated from production (all tables + RPCs)
- `src/actions/orders/completeSale.ts` — null→undefined for optional RPC params
- `src/actions/orders/processRefund.ts` — type-safe status array cast
- `src/actions/promos/validatePromoCode.ts` — null guard on min_order_cents
- `src/app/api/webhooks/stripe/route.ts` — null→undefined for optional param
- `src/app/(store)/order/[id]/confirmation/page.tsx` — explicit OrderItem type
- `src/app/(store)/order/[id]/page.tsx` — explicit OrderItem type
- `src/components/admin/PromoList.tsx` — null guard on min_order_cents
- `src/actions/orders/__tests__/processRefund.test.ts` — mock type fix

## Self-Check: PASSED

- [x] Supabase production has full schema (9 migrations)
- [x] Auth hook registered (workaround for claim injection applied)
- [x] Storage bucket exists
- [x] Owner can log in to admin dashboard
- [x] Storefront is publicly accessible
- [x] Stripe test mode banner visible on both admin and storefront
- [x] Vercel crons registered (2 jobs)
- [x] TypeScript compilation passes
- [x] All tests pass
