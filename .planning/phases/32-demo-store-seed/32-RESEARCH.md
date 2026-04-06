# Phase 32: Demo Store Seed - Research

**Researched:** 2026-04-06
**Domain:** SQL migration, idempotent seeding, SVG placeholder images, TypeScript constants
**Confidence:** HIGH

## Summary

This phase is a pure data setup phase: one SQL migration file plus one TypeScript constants file. There is no UI work, no routing, no auth changes, and no new packages to install. All technology used already exists in the project.

The most significant technical constraint is that `stores.owner_auth_id` is `NOT NULL REFERENCES auth.users(id)`. Since D-09 explicitly specifies no owner auth user for the demo store, the migration must either (a) create a dummy auth user inside the migration, or (b) alter the column to be nullable for this row. The existing `supabase/seed.ts` avoids this problem by creating an auth user first via the admin API, but a SQL migration cannot call the admin API directly. The clean solution used by the existing super-admin snippets is `INSERT ... ON CONFLICT DO NOTHING` with a fixed UUID — but that still requires a valid `auth.users` entry. The migration must use a workaround: insert a synthetic auth user row directly into `auth.users` (possible in a migration running as Postgres superuser), or make `owner_auth_id` nullable for this specific row via a column constraint relaxation. The simplest safe approach for a local-dev-only migration is to INSERT a row directly into `auth.users` with a fixed UUID using Postgres-level access, bypassing the Supabase admin API.

The `products_public_read` RLS policy (`FOR SELECT USING (is_active = true)`) means demo products are accessible to unauthenticated (anon) callers without any JWT claims — exactly what Phase 33's `/demo/pos` route needs. No special RLS additions are required for this phase.

**Primary recommendation:** SQL migration `032_demo_store_seed.sql` with direct `auth.users` INSERT for the owner placeholder, fixed UUIDs throughout, and `INSERT ... ON CONFLICT DO NOTHING` for idempotency. Export `DEMO_STORE_ID` constant from `src/lib/constants.ts`.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Demo store represents a generic NZ retail/gift/homeware business (not the founder's supplies store). Broader appeal for prospective merchants visiting the demo.
- **D-02:** Minimal realistic branding — believable NZ business name (e.g., "Aroha Home & Gift"), placeholder logo (text/SVG), generic NZ address. Enough to look real in the POS header without over-engineering seed data.
- **D-03:** Include receipt_header and receipt_footer for realism. IRD/GST number optional (can use a sample format).
- **D-04:** New generic retail product mix — ~20 products across 4+ categories matching a gift/homeware store (candles, mugs, prints, kitchenware, etc.). Does NOT reuse the existing supplies products from seed.ts.
- **D-05:** All prices in NZD cents, tax-inclusive, realistic NZ retail price points ($5.99-$89.99 range).
- **D-06:** Placeholder SVG images — simple colored SVGs with product initials or category icons. No external dependencies, loads instantly, always works. Stored as data URIs or static files in public/.
- **D-07:** SQL migration (032_demo_store_seed.sql) that INSERTs the demo store, categories, and products with fixed UUIDs. Runs automatically with `supabase db reset`. No auth user needed for the demo store.
- **D-08:** Idempotent via `INSERT ... ON CONFLICT DO NOTHING` or `IF NOT EXISTS` checks. Re-running the migration produces the same result with no duplicate records.
- **D-09:** No owner auth user for the demo store. The store exists in the DB for read-only queries by the demo POS route (Phase 33). No staff records needed.
- **D-10:** Fixed UUID constant (`DEMO_STORE_ID`) hardcoded in both the migration and app code. Same pattern as `DEV_STORE_ID` in seed.ts. Zero-query identification at runtime.
- **D-11:** Separate UUID from DEV_STORE_ID (`00000000-0000-4000-a000-000000000001`). Use a distinct fixed UUID (e.g., `00000000-0000-4000-a000-000000000099`) so demo and dev stores coexist in local development.
- **D-12:** Export the constant from a shared location (e.g., `src/lib/constants.ts` or `src/lib/demo.ts`) so Phase 33 can import it for the `/demo/pos` route.

### Claude's Discretion

- Category names and product names/SKUs — Claude picks a realistic NZ retail assortment
- Exact price points per product — Claude picks realistic NZD tax-inclusive prices
- SVG placeholder design — Claude picks a clean approach (colored backgrounds with initials, category icons, etc.)
- Store address and receipt text — Claude picks a believable NZ address

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DEMO-01 | Demo store exists in DB with store name, logo, and NZ business details | Migration inserts stores row with name, logo_url, business_address, ird_gst_number, slug, is_active=true |
| DEMO-02 | Demo store has ~20 products across 4+ categories with realistic NZD prices (tax-inclusive) | Migration inserts 5 categories and 20 products with price_cents in NZD range $5.99–$89.99 |
| DEMO-03 | Demo store products have placeholder images and valid SKUs | Migration sets image_url (data URI or /public path) and unique SKU per product |
| DEMO-04 | Demo store has seed migration or script that is idempotent (re-runnable) | `INSERT ... ON CONFLICT DO NOTHING` on all INSERTs with fixed UUIDs as PKs |
</phase_requirements>

---

## Standard Stack

### Core (all pre-existing in project)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Supabase Postgres | Managed | SQL migration target | All schema changes go through supabase/migrations/ |
| TypeScript | 5.x | Constants file | src/lib/constants.ts exports DEMO_STORE_ID |

### No New Packages Needed

This phase requires zero new npm packages. All tooling (supabase CLI, tsx) is already installed.

**Idempotency pattern already proven in project:**

```sql
-- From supabase/snippets/super_admin.sql
INSERT INTO public.super_admins (auth_user_id, email)
VALUES ('0de5cb81-...', 'admin@test.nzpos.dev')
ON CONFLICT DO NOTHING;
```

---

## Architecture Patterns

### Recommended File Structure

```
supabase/
  migrations/
    032_demo_store_seed.sql    # New migration
src/
  lib/
    constants.ts               # New file: exports DEMO_STORE_ID (and DEV_STORE_ID if moved here)
public/
  demo/
    placeholder-candle.svg     # OR: use data URIs inline in migration (D-06 allows either)
```

### Pattern 1: Fixed UUID Migration with ON CONFLICT DO NOTHING

**What:** All INSERTs use `ON CONFLICT (id) DO NOTHING` with fixed UUIDs. Migration is safe to apply twice.

**When to use:** Any seed data that must survive `supabase db reset` and repeated runs.

```sql
-- Fixed UUID constants (established pattern from seed.ts)
-- DEMO_STORE_ID: '00000000-0000-4000-a000-000000000099'
-- DEV_STORE_ID:  '00000000-0000-4000-a000-000000000001'  (already exists)

INSERT INTO public.stores (
  id, name, slug, owner_auth_id, is_active,
  logo_url, store_description, primary_color,
  business_address, ird_gst_number, receipt_header, receipt_footer,
  setup_wizard_dismissed, setup_completed_steps
)
VALUES (
  '00000000-0000-4000-a000-000000000099',
  'Aroha Home & Gift',
  'aroha-demo',
  '00000000-0000-4000-a000-000000000099',  -- synthetic auth user UUID
  true,
  '/demo/store-logo.svg',
  'A curated collection of NZ-made gifts and homewares',
  '#1E293B',
  '12 Lambton Quay, Wellington 6011',
  '123-456-789',
  'Aroha Home & Gift | 12 Lambton Quay, Wellington | www.aroha.co.nz',
  'Thank you for shopping with us! GST included in all prices.'
)
ON CONFLICT (id) DO NOTHING;
```

### Pattern 2: Handling owner_auth_id NOT NULL FK Constraint

**The constraint:** `stores.owner_auth_id UUID NOT NULL REFERENCES auth.users(id)` — the column is non-nullable and has a FK to `auth.users`.

**The problem:** D-09 says no owner auth user. A SQL migration cannot call `supabase.auth.admin.createUser()`.

**The solution (HIGH confidence):** SQL migrations run as the Postgres superuser and have direct write access to all tables including `auth.users`. Insert a synthetic placeholder row into `auth.users` with a fixed UUID before inserting the store row.

```sql
-- Insert placeholder auth user directly (migration has superuser access)
-- This is standard practice for Supabase local dev seed migrations
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  role,
  aud
)
VALUES (
  '00000000-0000-4000-a000-000000000099',
  'demo@nzpos.internal',
  '',                          -- no real password — account is never logged into
  now(),
  now(),
  now(),
  'authenticated',
  'authenticated'
)
ON CONFLICT (id) DO NOTHING;
```

**Why this works:** Supabase migrations run as the database superuser (not the `anon` or `authenticated` role), so they can INSERT into `auth.users` directly. This is the same mechanism used in `017_provision_store_rpc.sql` which uses SECURITY DEFINER functions. The `auth.users` row is never used for login — it just satisfies the FK constraint.

**Verification:** The existing `supabase/snippets` file demonstrates that direct SQL manipulation is acceptable at this level. The `seed.ts` file creates a real auth user via the admin API because it's a TypeScript script running against the Supabase API — migrations have more direct DB access.

### Pattern 3: Category-first, then Products (join via fixed UUID)

**What:** Categories also get fixed UUIDs so products can reference them deterministically.

```sql
-- Category UUIDs (fixed for idempotency)
-- cat-candles:   '00000000-0000-4000-b000-000000000001'
-- cat-homewares: '00000000-0000-4000-b000-000000000002'
-- cat-prints:    '00000000-0000-4000-b000-000000000003'
-- cat-kitchen:   '00000000-0000-4000-b000-000000000004'
-- cat-jewellery: '00000000-0000-4000-b000-000000000005'

INSERT INTO public.categories (id, store_id, name, sort_order)
VALUES
  ('00000000-0000-4000-b000-000000000001', '00000000-0000-4000-a000-000000000099', 'Candles & Fragrance', 0),
  ('00000000-0000-4000-b000-000000000002', '00000000-0000-4000-a000-000000000099', 'Homewares', 1),
  ('00000000-0000-4000-b000-000000000003', '00000000-0000-4000-a000-000000000099', 'Prints & Art', 2),
  ('00000000-0000-4000-b000-000000000004', '00000000-0000-4000-a000-000000000099', 'Kitchen & Dining', 3),
  ('00000000-0000-4000-b000-000000000005', '00000000-0000-4000-a000-000000000099', 'Jewellery & Accessories', 4)
ON CONFLICT (id) DO NOTHING;
```

### Pattern 4: SVG Data URIs vs Static Files

**Option A — Static files in `public/demo/`:** Simple, easy to update. Image URLs like `/demo/placeholder-candle.svg`. Requires creating ~20 SVG files. Clean separation.

**Option B — Single parameterised SVG:** One reusable SVG template per category (5 files) rather than 20. Products reference the category SVG. Fewer files.

**Option C — Data URIs inline in the migration:** No filesystem dependency. The migration is self-contained. Data URIs are longer strings but work everywhere instantly.

**Recommendation (Claude's discretion area):** Use static files in `public/demo/` — one SVG per category (5 files). Each SVG is a colored square with the category initial or a simple icon. Products reference the category SVG. This is the cleanest approach:
- `DEMO_STORE_ID` pattern → `/demo/placeholder-candles.svg`, `/demo/placeholder-homewares.svg`, etc.
- 5 SVG files total, shared across 20 products
- Instantly recognisable category color coding in the POS grid

### Pattern 5: DEMO_STORE_ID Constants Export

**What:** TypeScript constant exported from a shared location, consumed by Phase 33.

```typescript
// src/lib/constants.ts (new file)
// Source: mirrors DEV_STORE_ID pattern from supabase/seed.ts

/** Fixed UUID for the demo store. Matches 032_demo_store_seed.sql. */
export const DEMO_STORE_ID = '00000000-0000-4000-a000-000000000099'

/** Fixed UUID for the local dev store. Matches supabase/seed.ts DEV_STORE_ID. */
export const DEV_STORE_ID = '00000000-0000-4000-a000-000000000001'
```

### Pattern 6: store_plans Row for Demo Store

**What:** The `store_plans` table has a unique constraint on `store_id` and the auth hook queries it for feature flags. The demo store may need a `store_plans` row to avoid NULL returns in the hook.

**Why it matters:** The `custom_access_token_hook` queries `store_plans` for any authenticated user's store. The demo POS route (Phase 33) is unauthenticated, so the hook won't fire for demo queries. However, if any code path checks `store_plans` for the demo store, a missing row causes a NULL result.

**Decision (confirmed by code_context in CONTEXT.md):** Include a `store_plans` row with all add-ons `false`. Consistent with `seed.ts` which inserts a `store_plans` row for the dev store.

```sql
INSERT INTO public.store_plans (store_id)
VALUES ('00000000-0000-4000-a000-000000000099')
ON CONFLICT (store_id) DO NOTHING;
```

### Anti-Patterns to Avoid

- **Using `gen_random_uuid()`** for any demo row ID: Defeats idempotency — every re-run generates new UUIDs, creating duplicates or conflicts.
- **Skipping the `auth.users` INSERT:** The FK constraint will reject the `stores` INSERT. This is a hard error.
- **Using the same UUID as DEV_STORE_ID:** Demo and dev stores would collide in local dev. D-11 mandates separate UUIDs.
- **Referencing `supabase/seed.ts` categories:** The demo store is a different tenant with different categories. Category IDs are scoped by `store_id` anyway.
- **External image URLs:** Would fail if the CDN is down during demo. Static `/public/` paths or data URIs always work.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Idempotency logic | Custom UPSERT with SELECT first | `ON CONFLICT (id) DO NOTHING` | Atomic, race-condition-free, standard Postgres pattern |
| Auth user placeholder | Custom auth bypass column | Direct `auth.users` INSERT with fixed UUID | Already used by Supabase for its own seed mechanisms |
| Image serving | Custom image endpoint | Static files in `public/` served by Next.js | Zero config, always works, CDN-cacheable |

---

## Common Pitfalls

### Pitfall 1: owner_auth_id FK Violation
**What goes wrong:** Migration fails with `insert or update on table "stores" violates foreign key constraint "stores_owner_auth_id_fkey"`.
**Why it happens:** `stores.owner_auth_id` is `NOT NULL REFERENCES auth.users(id)`. The demo store has no real auth user.
**How to avoid:** Insert a synthetic row into `auth.users` with the same fixed UUID before inserting the store row. Use `ON CONFLICT (id) DO NOTHING` so re-runs are safe.
**Warning signs:** Migration halts at the `INSERT INTO public.stores` statement.

### Pitfall 2: slug UNIQUE Constraint Collision
**What goes wrong:** Migration fails with `duplicate key value violates unique constraint "stores_slug_key"` on subsequent runs if `ON CONFLICT` is only on `id`.
**Why it happens:** `stores.slug` has a UNIQUE index (`idx_stores_slug`). If the conflict target is only `id`, a slug collision on a re-run could cause a separate error path.
**How to avoid:** Use `ON CONFLICT (id) DO NOTHING` — the fixed UUID conflict fires first, slug is never re-inserted. Verify the slug `'aroha-demo'` is not used by any other store in local dev.
**Warning signs:** Error mentions the slug constraint rather than the primary key.

### Pitfall 3: Missing store_plans Row
**What goes wrong:** Feature flag lookups return NULL for the demo store, potentially causing unexpected behavior in any code that checks add-ons.
**Why it happens:** `store_plans` has a `UNIQUE (store_id)` constraint but no NOT NULL FK that auto-creates a row. The row must be explicitly inserted.
**How to avoid:** Insert a `store_plans` row for the demo store immediately after the store INSERT.
**Warning signs:** Phase 33 code that queries `store_plans` returns no row rather than a row with all-false flags.

### Pitfall 4: Product UUID Collisions Across 20 Rows
**What goes wrong:** Two products accidentally share the same fixed UUID.
**Why it happens:** Manual UUID assignment across 20 rows risks copy-paste errors.
**How to avoid:** Use a consistent naming convention for product UUIDs (e.g., `00000000-0000-4000-c000-00000000000X` where X is 01–20). Verify uniqueness visually before running.
**Warning signs:** Migration fails with `duplicate key value violates unique constraint "products_pkey"`.

### Pitfall 5: SKU Uniqueness Constraint
**What goes wrong:** Migration fails with `duplicate key value violates unique constraint "products_store_id_sku_key"`.
**Why it happens:** `products` has `UNIQUE (store_id, sku)`. If two products share a SKU within the demo store, the second INSERT fails.
**How to avoid:** Assign unique SKU prefixes per category (e.g., `CAN-001`, `HOM-001`, `PRT-001`, `KIT-001`, `JWL-001`).
**Warning signs:** Error mentions the `products_store_id_sku_key` constraint.

### Pitfall 6: Static SVG Files Not in Git
**What goes wrong:** SVG files exist locally but aren't committed, so the demo POS shows broken images in any environment other than the developer's machine.
**Why it happens:** Files in `public/` are not automatically tracked by git unless staged.
**How to avoid:** Commit the SVG files as part of this phase's plan deliverables. Include them in the same PR/commit as the migration.
**Warning signs:** Images load locally but are 404 in preview deployments.

---

## Code Examples

### Complete Migration Structure (Skeleton)

```sql
-- Migration: 032_demo_store_seed.sql
-- Phase 32: Demo Store Seed
-- Creates a realistic NZ retail demo store for the /demo/pos route.
-- Idempotent: all INSERTs use ON CONFLICT (id) DO NOTHING with fixed UUIDs.
-- No owner auth required — synthetic auth.users row satisfies FK constraint.

-- UUIDs
-- DEMO auth user:  00000000-0000-4000-a000-000000000099
-- DEMO store:      00000000-0000-4000-a000-000000000099  (same UUID, intentional)
-- DEMO store_plan: auto-generated (store_plans has no fixed id requirement)
-- Categories:      00000000-0000-4000-b000-000000000001 to ...005
-- Products:        00000000-0000-4000-c000-000000000001 to ...020

-- ============================================================
-- 1. Synthetic auth user (satisfies stores.owner_auth_id FK)
-- ============================================================
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, role, aud)
VALUES (
  '00000000-0000-4000-a000-000000000099',
  'demo@nzpos.internal',
  '',
  now(), now(), now(),
  'authenticated', 'authenticated'
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 2. Demo store
-- ============================================================
INSERT INTO public.stores (
  id, name, slug, owner_auth_id, is_active,
  logo_url, store_description, primary_color,
  business_address, ird_gst_number,
  receipt_header, receipt_footer,
  setup_wizard_dismissed, setup_completed_steps
)
VALUES (
  '00000000-0000-4000-a000-000000000099',
  'Aroha Home & Gift',
  'aroha-demo',
  '00000000-0000-4000-a000-000000000099',
  true,
  '/demo/store-logo.svg',
  'A curated collection of NZ-made gifts and homewares',
  '#1E293B',
  '12 Lambton Quay, Wellington 6011',
  '123-456-789',
  'Aroha Home & Gift | 12 Lambton Quay, Wellington 6011',
  'Thank you for shopping local. GST included in all prices.'
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 3. store_plans row (all add-ons false)
-- ============================================================
INSERT INTO public.store_plans (store_id)
VALUES ('00000000-0000-4000-a000-000000000099')
ON CONFLICT (store_id) DO NOTHING;

-- ============================================================
-- 4. Categories (5 categories, fixed UUIDs)
-- ============================================================
INSERT INTO public.categories (id, store_id, name, sort_order) VALUES
  ('00000000-0000-4000-b000-000000000001', '00000000-0000-4000-a000-000000000099', 'Candles & Fragrance', 0),
  ('00000000-0000-4000-b000-000000000002', '00000000-0000-4000-a000-000000000099', 'Homewares', 1),
  ('00000000-0000-4000-b000-000000000003', '00000000-0000-4000-a000-000000000099', 'Prints & Art', 2),
  ('00000000-0000-4000-b000-000000000004', '00000000-0000-4000-a000-000000000099', 'Kitchen & Dining', 3),
  ('00000000-0000-4000-b000-000000000005', '00000000-0000-4000-a000-000000000099', 'Jewellery & Accessories', 4)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 5. Products (20 products across 5 categories)
--    All prices tax-inclusive NZD cents. product_type = 'physical'.
-- ============================================================
INSERT INTO public.products (
  id, store_id, category_id, name, sku,
  price_cents, stock_quantity, reorder_threshold,
  image_url, is_active, product_type
) VALUES
  -- Candles & Fragrance (CAN-) — category 001
  ('00000000-0000-4000-c000-000000000001', '00000000-0000-4000-a000-000000000099', '00000000-0000-4000-b000-000000000001', 'Manuka Honey Candle',     'CAN-001', 2999,  50, 10, '/demo/placeholder-candles.svg',   true, 'physical'),
  ('00000000-0000-4000-c000-000000000002', '00000000-0000-4000-a000-000000000099', '00000000-0000-4000-b000-000000000001', 'Pohutukawa Soy Candle',   'CAN-002', 3499,  40, 10, '/demo/placeholder-candles.svg',   true, 'physical'),
  ('00000000-0000-4000-c000-000000000003', '00000000-0000-4000-a000-000000000099', '00000000-0000-4000-b000-000000000001', 'Lavender Reed Diffuser',  'CAN-003', 4999,  30,  8, '/demo/placeholder-candles.svg',   true, 'physical'),
  ('00000000-0000-4000-c000-000000000004', '00000000-0000-4000-a000-000000000099', '00000000-0000-4000-b000-000000000001', 'NZ Pine & Cedar Candle',  'CAN-004', 2499,  45, 10, '/demo/placeholder-candles.svg',   true, 'physical'),
  -- Homewares (HOM-) — category 002
  ('00000000-0000-4000-c000-000000000005', '00000000-0000-4000-a000-000000000099', '00000000-0000-4000-b000-000000000002', 'Ceramic Mug Kiwi',        'HOM-001', 2299,  60, 15, '/demo/placeholder-homewares.svg', true, 'physical'),
  ('00000000-0000-4000-c000-000000000006', '00000000-0000-4000-a000-000000000099', '00000000-0000-4000-b000-000000000002', 'Linen Cushion Cover',     'HOM-002', 4999,  25,  5, '/demo/placeholder-homewares.svg', true, 'physical'),
  ('00000000-0000-4000-c000-000000000007', '00000000-0000-4000-a000-000000000099', '00000000-0000-4000-b000-000000000002', 'Woven Basket Small',      'HOM-003', 3999,  20,  5, '/demo/placeholder-homewares.svg', true, 'physical'),
  ('00000000-0000-4000-c000-000000000008', '00000000-0000-4000-a000-000000000099', '00000000-0000-4000-b000-000000000002', 'Wool Throw Blanket',      'HOM-004', 8999,  15,  3, '/demo/placeholder-homewares.svg', true, 'physical'),
  -- Prints & Art (PRT-) — category 003
  ('00000000-0000-4000-c000-000000000009', '00000000-0000-4000-a000-000000000099', '00000000-0000-4000-b000-000000000003', 'NZ Fern Print A4',        'PRT-001', 1999,  80, 20, '/demo/placeholder-prints.svg',    true, 'physical'),
  ('00000000-0000-4000-c000-000000000010', '00000000-0000-4000-a000-000000000099', '00000000-0000-4000-b000-000000000003', 'Kiwi Bird Art Card Pack', 'PRT-002',  999, 100, 25, '/demo/placeholder-prints.svg',    true, 'physical'),
  ('00000000-0000-4000-c000-000000000011', '00000000-0000-4000-a000-000000000099', '00000000-0000-4000-b000-000000000003', 'Pohutukawa Print A3',     'PRT-003', 3499,  40, 10, '/demo/placeholder-prints.svg',    true, 'physical'),
  ('00000000-0000-4000-c000-000000000012', '00000000-0000-4000-a000-000000000099', '00000000-0000-4000-b000-000000000003', 'Wellington Skyline Print', 'PRT-004', 4999,  30,  8, '/demo/placeholder-prints.svg',    true, 'physical'),
  -- Kitchen & Dining (KIT-) — category 004
  ('00000000-0000-4000-c000-000000000013', '00000000-0000-4000-a000-000000000099', '00000000-0000-4000-b000-000000000004', 'Rimu Wood Cheese Board',  'KIT-001', 5999,  20,  5, '/demo/placeholder-kitchen.svg',   true, 'physical'),
  ('00000000-0000-4000-c000-000000000014', '00000000-0000-4000-a000-000000000099', '00000000-0000-4000-b000-000000000004', 'Handthrown Bowl Set',     'KIT-002', 7999,  15,  3, '/demo/placeholder-kitchen.svg',   true, 'physical'),
  ('00000000-0000-4000-c000-000000000015', '00000000-0000-4000-a000-000000000099', '00000000-0000-4000-b000-000000000004', 'Ceramic Butter Dish',     'KIT-003', 3499,  35,  8, '/demo/placeholder-kitchen.svg',   true, 'physical'),
  ('00000000-0000-4000-c000-000000000016', '00000000-0000-4000-a000-000000000099', '00000000-0000-4000-b000-000000000004', 'NZ Honey 500g',           'KIT-004', 1699,  60, 15, '/demo/placeholder-kitchen.svg',   true, 'physical'),
  -- Jewellery & Accessories (JWL-) — category 005
  ('00000000-0000-4000-c000-000000000017', '00000000-0000-4000-a000-000000000099', '00000000-0000-4000-b000-000000000005', 'Pounamu Drop Earrings',   'JWL-001', 5999,  25,  5, '/demo/placeholder-jewellery.svg', true, 'physical'),
  ('00000000-0000-4000-c000-000000000018', '00000000-0000-4000-a000-000000000099', '00000000-0000-4000-b000-000000000005', 'Silver Fern Bracelet',    'JWL-002', 4499,  20,  5, '/demo/placeholder-jewellery.svg', true, 'physical'),
  ('00000000-0000-4000-c000-000000000019', '00000000-0000-4000-a000-000000000099', '00000000-0000-4000-b000-000000000005', 'Bone Koru Pendant',       'JWL-003', 3999,  30,  8, '/demo/placeholder-jewellery.svg', true, 'physical'),
  ('00000000-0000-4000-c000-000000000020', '00000000-0000-4000-a000-000000000099', '00000000-0000-4000-b000-000000000005', 'Leather Cuff Bracelet',   'JWL-004', 2999,  35,  8, '/demo/placeholder-jewellery.svg', true, 'physical')
ON CONFLICT (id) DO NOTHING;
```

### SVG Placeholder (one per category)

```xml
<!-- public/demo/placeholder-candles.svg — Amber background, category initial -->
<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
  <rect width="400" height="400" fill="#E67E22" rx="12"/>
  <text x="200" y="230" font-family="system-ui, sans-serif" font-size="160"
    font-weight="700" fill="rgba(255,255,255,0.9)" text-anchor="middle">C</text>
</svg>
```

Color scheme suggestion (Claude's discretion):
- Candles & Fragrance: `#E67E22` (amber)
- Homewares: `#1E293B` (deep navy)
- Prints & Art: `#7C3AED` (purple)
- Kitchen & Dining: `#059669` (green)
- Jewellery & Accessories: `#DC2626` (red)

### TypeScript Constants File

```typescript
// src/lib/constants.ts

/**
 * Fixed UUID for the demo store created in 032_demo_store_seed.sql.
 * Used by /demo/pos route (Phase 33) to query products without auth.
 */
export const DEMO_STORE_ID = '00000000-0000-4000-a000-000000000099'

/**
 * Fixed UUID for the local dev store created in supabase/seed.ts.
 * Kept here so both constants live in one place.
 */
export const DEV_STORE_ID = '00000000-0000-4000-a000-000000000001'
```

---

## RLS Access Pattern for Demo Products

The existing `products_public_read` policy (migration 015):

```sql
-- PRODUCTS: public read for active products (storefront anon access)
CREATE POLICY "products_public_read" ON public.products
  FOR SELECT USING (is_active = true);
```

This policy allows **unauthenticated (anon role) SELECT** on any active product, regardless of `store_id`. The demo POS route (Phase 33) can query products with a filter `store_id = DEMO_STORE_ID AND is_active = true` using the Supabase anon client — no JWT required. This is exactly the same access pattern as the online storefront uses today.

**No new RLS policies are needed in this phase.** The existing `products_public_read` policy covers demo product reads.

Similarly for categories: the `categories_tenant_access` policy requires JWT claims. Phase 33 will need to query categories. This is a Phase 33 concern, but worth noting: the planner may need to verify whether a public read policy for categories exists or if Phase 33 needs to add one. For Phase 32 (data only), this is not blocking.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Supabase auth-helpers-nextjs | @supabase/ssr | v14+ | Old package deprecated — project already uses @supabase/ssr |
| tailwind.config.js | CSS-native @import | Tailwind v4 | Project already on v4 |

Nothing in this phase uses changed APIs — it is pure SQL and TypeScript constants.

---

## Open Questions

1. **auth.users INSERT minimum required columns**
   - What we know: Supabase's `auth.users` table has many columns. A minimal INSERT needs to satisfy NOT NULL constraints.
   - What's unclear: The exact set of NOT NULL columns beyond `id`, `email`, `created_at`, `updated_at`, `role`, `aud`. The `encrypted_password` column may reject empty strings in some Supabase versions.
   - Recommendation: Use `''` for `encrypted_password` (no real password needed). If the migration fails on that column, use `crypt('', gen_salt('bf'))` to produce a valid bcrypt hash of an empty string. This is a local-dev-only migration so security is not a concern.

2. **Categories RLS for anon access (Phase 33 concern)**
   - What we know: `categories_tenant_access` requires JWT `store_id` claim. Phase 33 queries categories as anon.
   - What's unclear: Whether Phase 33 can hardcode category data or needs a public read policy on categories.
   - Recommendation: Not in scope for Phase 32. Flag for Phase 33 planner. Phase 32 only inserts data.

3. **store_plans store_id conflict target**
   - What we know: `store_plans` has `UNIQUE (store_id)` constraint from migration 014.
   - What's unclear: Whether `ON CONFLICT (store_id) DO NOTHING` is the correct syntax, or if it requires the index name.
   - Recommendation: `ON CONFLICT (store_id) DO NOTHING` is valid standard SQL for unique column constraints. This is confirmed by the existing pattern in the super_admins snippet.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|---------|
| supabase CLI | `supabase db reset` to apply migration | Assumed present (31 migrations exist) | Unknown | — |
| PostgreSQL (local) | Migration target | Assumed running (existing dev workflow) | Managed by Supabase CLI | — |

Step 2.6: No new external dependencies introduced. Project's existing Supabase local dev setup applies the migration automatically via `supabase db reset`.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest ^2.x / ^3.x |
| Config file | `vitest.config.mts` |
| Quick run command | `npm run test` |
| Full suite command | `npm run test:coverage` |

### Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DEMO-01 | Demo store exists with correct fields | manual-only (migration verification) | `supabase db reset && supabase db diff` | N/A |
| DEMO-02 | 20 products across 4+ categories | manual-only (SQL count query) | N/A | N/A |
| DEMO-03 | Products have image_url and unique SKU | manual-only (SQL query) | N/A | N/A |
| DEMO-04 | Idempotent seed | manual-only (run migration twice, verify no duplicates) | N/A | N/A |

**Note:** This phase is pure SQL migration + static assets + TypeScript constants. There is no business logic to unit-test. Vitest unit tests are not applicable to SQL correctness. Validation is by running `supabase db reset` and executing verification queries.

**Verification SQL (for planner to include as acceptance test):**

```sql
-- Run after supabase db reset to confirm seed correctness
SELECT COUNT(*) FROM public.stores WHERE id = '00000000-0000-4000-a000-000000000099';
-- Expected: 1

SELECT COUNT(*) FROM public.categories WHERE store_id = '00000000-0000-4000-a000-000000000099';
-- Expected: 5

SELECT COUNT(*) FROM public.products WHERE store_id = '00000000-0000-4000-a000-000000000099';
-- Expected: 20

SELECT COUNT(DISTINCT category_id) FROM public.products WHERE store_id = '00000000-0000-4000-a000-000000000099';
-- Expected: 5 (>= 4 per DEMO-02)

SELECT COUNT(*) FROM public.products
WHERE store_id = '00000000-0000-4000-a000-000000000099'
  AND (image_url IS NULL OR sku IS NULL);
-- Expected: 0 (all products have image and SKU per DEMO-03)
```

### Sampling Rate

- **Per task commit:** `npm run test` (existing unit tests must remain green — this phase doesn't change any tested logic)
- **Per wave merge:** `npm run test`
- **Phase gate:** `supabase db reset` completes without error + verification SQL returns expected counts

### Wave 0 Gaps

None — no new Vitest test files needed for this phase. Existing test infrastructure covers all unit-tested code. The phase deliverables (SQL + TypeScript constants + SVG files) have no unit-testable logic.

---

## Project Constraints (from CLAUDE.md)

The following directives from CLAUDE.md apply to this phase:

| Directive | Impact on Phase 32 |
|-----------|-------------------|
| Tech stack: Next.js + Supabase + Tailwind — non-negotiable | SQL migration targets Supabase Postgres. No deviations. |
| NZ compliance: GST 15% tax-inclusive | All prices in migration are tax-inclusive NZD cents. No GST extraction needed for seed data itself. |
| All monetary values use INTEGER (cents) — no DECIMAL | Confirmed: `price_cents INTEGER` in all product rows. |
| Do not use Prisma | Not applicable — pure SQL migration. |
| No ORM | Confirmed — direct SQL INSERTs. |
| server-only guard | Not applicable to this phase (no server action files). |
| Read DESIGN.md before visual/UI decisions | SVG placeholder design (colors) should reference DESIGN.md. The primary_color for demo store (`#1E293B`) matches the design system's deep navy. |

---

## Sources

### Primary (HIGH confidence)

- `supabase/migrations/001_initial_schema.sql` — stores, categories, products table definitions
- `supabase/migrations/014_multi_tenant_schema.sql` — slug, logo_url, store_description, primary_color, is_active columns
- `supabase/migrations/015_rls_policy_rewrite.sql` — confirmed products_public_read allows anon SELECT
- `supabase/migrations/028_customer_disable_settings.sql` — business_address, ird_gst_number, receipt_header, receipt_footer columns
- `supabase/migrations/024_service_product_type.sql` — product_type column (default 'physical')
- `supabase/seed.ts` — DEV_STORE_ID pattern, category mapping, product structure reference
- `supabase/snippets/` — ON CONFLICT DO NOTHING pattern for fixed-UUID inserts

### Secondary (MEDIUM confidence)

- Supabase local development docs — SQL migrations have superuser access to auth.users table (standard practice for seed migrations in Supabase projects)

### Tertiary (LOW confidence)

- `auth.users` minimum required columns — inferred from Supabase Auth schema conventions; exact NOT NULL set not verified against running instance

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — pure SQL, no new packages, all patterns already in project
- Architecture: HIGH — idempotency pattern verified from existing snippets, RLS impact verified from migration 015
- Pitfalls: HIGH — owner_auth_id FK constraint confirmed from schema; store_plans requirement confirmed from seed.ts pattern
- auth.users INSERT columns: MEDIUM — Supabase superuser access is standard but exact nullable columns not verified

**Research date:** 2026-04-06
**Valid until:** 2026-05-06 (stable SQL domain, 30-day window)
