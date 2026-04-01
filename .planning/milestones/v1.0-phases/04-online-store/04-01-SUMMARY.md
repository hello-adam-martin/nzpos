---
phase: 04-online-store
plan: 01
subsystem: online-store-foundation
tags: [schema, migration, types, utilities, test-stubs, stripe, rate-limit]
dependency_graph:
  requires: []
  provides:
    - supabase/migrations/006_online_store.sql
    - src/types/database.ts (corrected)
    - src/lib/slugify.ts
    - src/lib/stripe.ts
    - src/lib/rateLimit.ts
    - Wave 0 test stubs (5 files)
  affects:
    - All Phase 4 plans (depend on corrected types and migration 006)
    - src/app/api/webhooks/stripe/ (webhook handler in plan 04-05)
    - src/components/store/ (storefront components in plans 04-02, 04-03)
tech_stack:
  added:
    - stripe singleton server client (src/lib/stripe.ts)
    - slugify utility (src/lib/slugify.ts)
    - in-memory rate limiter (src/lib/rateLimit.ts)
  patterns:
    - SECURITY DEFINER RPC pattern (same as complete_pos_sale in 005)
    - SELECT FOR UPDATE stock locking (atomic inventory decrement)
    - server-only import guard on Stripe client
    - Wave 0 test stubs (describe + test.todo) for Nyquist compliance
key_files:
  created:
    - supabase/migrations/006_online_store.sql
    - src/lib/slugify.ts
    - src/lib/stripe.ts
    - src/lib/rateLimit.ts
    - src/lib/storeCart.test.ts
    - src/lib/promoDiscount.test.ts
    - src/lib/rateLimit.test.ts
    - src/app/api/webhooks/stripe/webhook.test.ts
    - src/components/store/StoreProductCard.test.tsx
  modified:
    - src/types/database.ts
decisions:
  - "complete_online_sale updates existing PENDING order (created before Stripe redirect) rather than inserting — matches Stripe Checkout hosted flow"
  - "Public RLS policies added for products (is_active=true) and orders (channel='online') to support unauthenticated storefront reads"
  - "stripe_events id is TEXT PRIMARY KEY (Stripe event ID is the PK) for O(1) dedup on INSERT"
metrics:
  duration: "~10 minutes"
  completed_date: "2026-04-01"
  tasks_completed: 3
  files_changed: 10
---

# Phase 4 Plan 01: Schema Fixes, Migration 006, Server Utilities, and Wave 0 Test Stubs

Schema fixes for 4 pre-existing type mismatches, migration 006 with slug column and complete_online_sale RPC, 3 server utility modules (Stripe singleton, slugify, rate limiter), and 5 Wave 0 test stubs for Nyquist compliance.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 0 | Wave 0 test stubs (5 files) | 580b312 | src/lib/storeCart.test.ts, promoDiscount.test.ts, rateLimit.test.ts, src/app/api/webhooks/stripe/webhook.test.ts, src/components/store/StoreProductCard.test.tsx |
| 1 | Migration 006 — slug, RPC, RLS policies | 415e062 | supabase/migrations/006_online_store.sql |
| 2 | Fix database.ts types + server utilities | e6d76f5 | src/types/database.ts, src/lib/slugify.ts, src/lib/stripe.ts, src/lib/rateLimit.ts |

## What Was Built

**Migration 006** (`supabase/migrations/006_online_store.sql`):
- `ALTER TABLE products ADD COLUMN slug TEXT` with unique index per store
- URL-safe slug backfill for existing products
- `idx_stripe_events_store` index for idempotency queries
- `complete_online_sale` RPC: SELECT FOR UPDATE stock locking, UPDATE existing PENDING order to COMPLETED, SECURITY DEFINER
- `CREATE POLICY "Public can read active products"` for unauthenticated storefront
- `CREATE POLICY "Public can read orders by id"` for guest order confirmation

**Type Fixes** (`src/types/database.ts`):
- `promo_codes.discount_type`: `'percent'` → `'percentage'` (matches SQL CHECK constraint)
- `promo_codes.use_count`: → `current_uses` (matches SQL column name)
- `stripe_events`: Completely replaced — id is TEXT PK (Stripe event ID), added store_id, replaced `processed: boolean` with `processed_at: string`
- `products`: Added `slug: string | null` to Row, Insert, Update
- `Functions`: Added `complete_online_sale` with correct Args and Returns: void

**Server Utilities**:
- `src/lib/slugify.ts`: Pure function, lowercase + hyphenate + trim hyphens
- `src/lib/stripe.ts`: `new Stripe(process.env.STRIPE_SECRET_KEY!)` with `import 'server-only'` guard and `typescript: true`
- `src/lib/rateLimit.ts`: In-memory Map tracking count + resetAt per IP, 1-minute sliding window

**Wave 0 Test Stubs** (5 files, 27 total `test.todo` entries):
- storeCart.test.ts (8 todos), promoDiscount.test.ts (5 todos), rateLimit.test.ts (4 todos)
- webhook.test.ts (5 todos), StoreProductCard.test.tsx (5 todos)

## Decisions Made

1. **complete_online_sale updates, not inserts**: The online order flow creates a PENDING order before Stripe redirect. The RPC updates that existing order to COMPLETED after webhook confirmation. This matches Stripe Checkout hosted flow.

2. **Public RLS policies**: The storefront Server Component has no JWT (guest checkout). Two public policies added: products filtered by `is_active = true`, orders filtered by `channel = 'online'`. Server Component additionally filters by `store_id` from env var.

3. **stripe_events id TEXT PK**: Stripe event ID is the primary key for O(1) dedup on INSERT — duplicate events are caught by PK violation without needing a separate lookup.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all files created in this plan are either migrations, corrected types, pure utility functions, or intentional test stubs (Wave 0 pattern).

## Self-Check: PASSED

Files verified:
- supabase/migrations/006_online_store.sql: FOUND
- src/types/database.ts: FOUND (contains 'percentage', 'current_uses', 'processed_at', 'slug', 'complete_online_sale')
- src/lib/slugify.ts: FOUND
- src/lib/stripe.ts: FOUND
- src/lib/rateLimit.ts: FOUND
- src/lib/storeCart.test.ts: FOUND
- src/lib/promoDiscount.test.ts: FOUND
- src/lib/rateLimit.test.ts: FOUND
- src/app/api/webhooks/stripe/webhook.test.ts: FOUND
- src/components/store/StoreProductCard.test.tsx: FOUND

Commits verified:
- 580b312: test(04-01): add Wave 0 test stubs
- 415e062: feat(04-01): create migration 006
- e6d76f5: feat(04-01): fix database types and server utilities
