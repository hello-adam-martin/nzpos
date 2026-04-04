# Phase 21: Service Product Type + Free-Tier Simplification - Research

**Researched:** 2026-04-04
**Domain:** PostgreSQL schema migration, RPC modification, React conditional rendering, Zod schema extension, CSV import logic
**Confidence:** HIGH

## Summary

This phase adds a `product_type` enum column (`physical` | `service`) to the products table and wires it through the entire stack: schema → Zod validation → server actions → PostgreSQL RPCs → UI. The RPC changes are the highest-risk work because `complete_pos_sale` and `complete_online_sale` sit on the checkout hot path and are locked down to `service_role` only (migration 021).

The free-tier simplification is a pure conditional-rendering task. The existing `requireFeature` / JWT pattern is the correct mechanism, but Phase 23 owns the `has_inventory` column on `store_plans` and the Stripe billing integration for it. Phase 21 must add the `has_inventory` column to `store_plans` and inject it into the JWT hook so that `requireFeature('inventory')` works — but it must NOT add billing or upgrade CTAs, which are Phase 23 scope.

The stock-restore concern in refund actions (PROD-03) is fully contained in two application-layer files that call the existing `restore_stock` RPC. The fix is a guard: if `product_type = 'service'`, skip the `restore_stock` RPC call. No RPC modification needed for refunds.

**Primary recommendation:** Write one migration file (`024_service_product_type.sql`) covering the DB column, RPC rewrites, `store_plans` column, and auth hook update. All five layers (DB, RPCs, schemas, actions, UI) must be touched in a single coherent wave to avoid partial-apply failures.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Product Type UX**
- D-01: Radio buttons for physical/service selection on product create/edit form — two options side by side, always visible
- D-02: Default product type for new products is `physical` — matches existing implicit behavior
- D-03: When product type is set to `service`, hide stock_quantity and reorder_threshold fields entirely (not disabled/greyed)
- D-04: Allow product type changes freely at any time, even after sales history — no warning dialog, no locking. Stock quantity stays in DB but is ignored for services

**Free-Tier Cleanup**
- D-05: Hide stock_quantity and reorder_threshold fields entirely from admin product form for stores without inventory add-on
- D-06: Hide the Low Stock Alerts dashboard widget and Stock Levels report completely for free-tier stores — no upgrade CTA replacement
- D-07: Remove the Stock column from the admin product data table for free-tier stores
- D-08: Skip stock quantity input in the store setup wizard product step for free-tier stores

**CSV Import Behavior**
- D-09: Default `product_type` to `physical` when CSV has no product_type column — preserves backward compatibility with existing CSV templates
- D-10: When a CSV row has product_type=service AND a stock_quantity value, silently ignore the stock_quantity value
- D-11: Reject CSV rows with invalid product_type values (anything other than physical/service) — show error in import preview, row is skipped unless fixed

**Stock Display States**
- D-12: POS product cards for free-tier stores show no stock badge at all — cleaner card with name, price, image only
- D-13: Storefront product cards for free-tier stores show no stock/sold-out badges — clean card
- D-14: Service products show no visual indicator differentiating them from physical products in POS or storefront — they look like any other product

### Claude's Discretion
- No areas deferred to Claude's discretion — all decisions made by user

### Deferred Ideas (OUT OF SCOPE)
- None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PROD-01 | Admin can set a product as "physical" or "service" type when creating or editing | D-01/D-02/D-03 drive the form change; `product_type` column + Zod schema update enables persistence |
| PROD-02 | Service products skip all stock decrement logic in POS and online sale RPCs | `complete_pos_sale` and `complete_online_sale` must be rewritten to check `product_type` before locking stock; see RPC analysis below |
| PROD-03 | Service products skip stock restore logic in refund and partial refund actions | `processRefund.ts` and `processPartialRefund.ts` call `restore_stock` RPC per item; guard on `product_type` prevents service restores |
| PROD-04 | CSV import supports `product_type` column and never overwrites `stock_quantity` without explicit flag | `ImportRowSchema` and `importProducts.ts` need `product_type` field with D-09/D-10/D-11 rules |
| FREE-01 | Stores without inventory add-on see no stock quantities, badges, or alerts in admin/POS/storefront | `has_inventory` JWT claim gates form fields, dashboard widget, table column, POS card badge, storefront card |
| FREE-02 | Products sell freely (no out-of-stock blocking) when inventory add-on is inactive | POS `handleAddToCart` and storefront `AddToCartButton` and `createCheckoutSession` must skip stock checks when `has_inventory = false` |
| FREE-03 | Stock decrements continue silently in RPCs regardless of add-on status (data stays accurate) | RPC does NOT check `has_inventory` — decrements always happen. Only UI checks are add-on-gated |
| POS-04 | Service products are always sellable in POS and storefront regardless of add-on status | In `complete_pos_sale` and `AddToCartButton`, service products bypass the `stock_quantity < quantity` check |
</phase_requirements>

---

## Standard Stack

### Core (all pre-existing in project)
| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| @supabase/supabase-js | ^2.x | DB mutations and queries | Already the project data layer |
| zod | ^3.x | Schema validation | Already used for all server action inputs |
| Next.js Server Actions | 16.2 | Mutations | Already the mutation pattern throughout |
| PostgreSQL (via Supabase) | 15+ (managed) | Enum column, RPC conditional | CASE/IF already in use in existing RPCs |

### No New Libraries Needed
This phase requires zero new npm dependencies. Every tool is already installed. The work is:
1. SQL migration extending existing tables and RPCs
2. TypeScript changes to existing schemas, actions, and components

---

## Architecture Patterns

### Recommended Project Structure

No new directories. Changes are in-place modifications to:
```
supabase/migrations/024_service_product_type.sql   (new)
src/schemas/product.ts                              (modify)
src/actions/products/createProduct.ts               (modify)
src/actions/products/updateProduct.ts               (modify)
src/actions/products/importProducts.ts              (modify)
src/actions/orders/processRefund.ts                 (modify)
src/actions/orders/processPartialRefund.ts          (modify)
src/components/admin/products/ProductFormDrawer.tsx (modify)
src/components/admin/products/ProductDataTable.tsx  (modify)
src/components/admin/dashboard/page.tsx (via Server Component) (modify)
src/components/admin/reports/page.tsx (via Server Component)   (modify)
src/components/pos/ProductCard.tsx                  (modify)
src/components/pos/POSClientShell.tsx               (modify)
src/components/store/AddToCartButton.tsx            (modify)
src/components/wizard/FirstProductStep.tsx          (modify)
src/components/admin/csv/ColumnMapperStep.tsx       (modify)
src/config/addons.ts                                (modify)
```

### Pattern 1: product_type column as DB enum with DEFAULT

```sql
-- 024_service_product_type.sql
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS product_type TEXT NOT NULL DEFAULT 'physical'
  CHECK (product_type IN ('physical', 'service'));
```

**Why NOT a PostgreSQL ENUM type:** ALTER TABLE ADD COLUMN with a CHECK constraint is safer for migration rollback and doesn't require `CREATE TYPE` with a separate object. Existing rows get `physical` automatically. Confidence: HIGH (standard Postgres pattern).

### Pattern 2: RPC conditional stock skip (PROD-02)

The `complete_pos_sale` RPC must be rewritten to:
1. Skip the `SELECT FOR UPDATE` lock for service products
2. Skip the `UPDATE products SET stock_quantity = ...` for service products

The items JSONB already contains `product_id`. The RPC must look up `product_type` from the products table to decide whether to apply stock logic.

**Critical constraint from the existing GRANT pattern (migration 021):** When `complete_pos_sale` is rewritten, the function signature MUST remain identical or the GRANT/REVOKE in migration 021 becomes stale. The safest approach is a `CREATE OR REPLACE FUNCTION` with the same signature. The new migration does NOT need to re-issue REVOKE/GRANT if the signature is unchanged — PostgreSQL preserves grants on `CREATE OR REPLACE` with identical signatures.

```sql
-- In 024_service_product_type.sql
CREATE OR REPLACE FUNCTION complete_pos_sale(
  -- same params as 010_checkout_speed.sql
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order_id UUID;
  v_item JSONB;
  v_current_stock INTEGER;
  v_product_type TEXT;
BEGIN
  -- 1. Lock and check stock for PHYSICAL products only
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    SELECT stock_quantity, product_type
      INTO v_current_stock, v_product_type
    FROM products
    WHERE id = (v_item->>'product_id')::UUID
      AND store_id = p_store_id
    FOR UPDATE;

    IF v_current_stock IS NULL THEN
      RAISE EXCEPTION 'PRODUCT_NOT_FOUND:%', v_item->>'product_id';
    END IF;

    -- Service products skip stock check (PROD-02, POS-04)
    IF v_product_type = 'physical' THEN
      IF v_current_stock < (v_item->>'quantity')::INTEGER THEN
        RAISE EXCEPTION 'OUT_OF_STOCK:%:% has only % units',
          v_item->>'product_id',
          v_item->>'product_name',
          v_current_stock;
      END IF;
    END IF;
  END LOOP;

  -- 2. Insert order (unchanged)
  ...

  -- 3. Insert order items and conditionally decrement stock
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO order_items (...) VALUES (...);

    -- Only decrement for physical products (PROD-02, FREE-03)
    SELECT product_type INTO v_product_type
    FROM products
    WHERE id = (v_item->>'product_id')::UUID AND store_id = p_store_id;

    IF v_product_type = 'physical' THEN
      UPDATE products
      SET stock_quantity = stock_quantity - (v_item->>'quantity')::INTEGER,
          updated_at = now()
      WHERE id = (v_item->>'product_id')::UUID AND store_id = p_store_id;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('order_id', v_order_id);
END;
$$;
```

**Optimization note:** The LOOP already runs twice (once for checks, once for inserts+decrements). Product type can be fetched in the first loop and stored in a local variable or JSONB enrichment to avoid a second per-item SELECT in loop 2. Use a `DECLARE v_product_types JSONB` accumulator or re-query inside loop 2. Either works — simplicity wins for this phase.

### Pattern 3: Refund stock restore guard (PROD-03)

Both `processRefund.ts` and `processPartialRefund.ts` call `restore_stock` RPC per order item. The fix is: before calling `restore_stock`, check the product's `product_type`. If service, skip.

**processPartialRefund.ts already fetches order items including `product_id`.** The server action must add `product_type` to the order_items join OR query product types separately.

**Cleanest approach:** When fetching `order_items` in the refund actions, also join `products(product_type)`:
```typescript
// In processPartialRefund.ts / processRefund.ts
const { data: order } = await adminClient
  .from('orders')
  .select('*, order_items(*, products(product_type))')
  ...

// Then in the restore loop:
for (const item of itemRefundAmounts) {
  const orderItem = orderItemsMap.get(item.orderItemId) as any
  if (orderItem?.products?.product_type === 'service') continue
  await adminClient.rpc('restore_stock', { ... })
}
```

**Note on `processRefund.ts`:** This file is marked `@deprecated` — use `processPartialRefund` instead. Both must be patched for safety since deprecated actions can still be called.

### Pattern 4: has_inventory feature flag

Phase 21 must add `has_inventory` to `store_plans` and inject it into the JWT hook. This is prerequisite infrastructure for the free-tier UI gating (FREE-01, FREE-02).

**Steps:**
1. Migration: `ALTER TABLE store_plans ADD COLUMN has_inventory BOOLEAN NOT NULL DEFAULT false`
2. Update `FEATURE_TO_COLUMN`, `SubscriptionFeature` type, `PRICE_ID_MAP`, and `ADDONS` in `src/config/addons.ts` to include `inventory`
3. Update `custom_access_token_hook` in migration to inject `inventory` claim from `store_plans.has_inventory`

**Phase 23 owns:** The Stripe Price ID, billing webhook handling, and any upgrade UI. Phase 21 only adds the column and JWT injection so `requireFeature('inventory')` returns `{ authorized: false }` for all current stores (since default is `false`).

**Important:** Since ALL existing stores have `has_inventory = false` after the migration, Phase 21 ships full free-tier UI hiding from day one. No store currently has inventory add-on, so the free-tier path is the universal path until Phase 23 adds billing.

### Pattern 5: Free-tier UI gating

The `has_inventory` JWT claim is read in Server Components via `supabase.auth.getUser()`:

```typescript
// In Server Component (dashboard/page.tsx, reports/page.tsx)
const hasInventory = user?.app_metadata?.inventory === true
```

For Client Components (`ProductFormDrawer`, `ProductDataTable`, `ProductCard`), the `has_inventory` flag must be passed down as a prop from the Server Component parent. It must NOT be fetched client-side.

**Key pattern (established in codebase):** Server Components read JWT claims, pass flags as props to Client Components. This is the same pattern as `staffRole` passed to `ProductCard`.

### Pattern 6: CSV product_type handling

The `ColumnMapping` type in `src/lib/csv/validateRows.ts` and the `ImportRowSchema` in `importProducts.ts` must each gain a `product_type` field.

**D-11 (reject invalid values) requires special handling:** The existing import flow validates at the `ImportRowSchema` level. An invalid `product_type` causes `safeParse` to fail for that row. The import action currently fails the entire chunk on DB error but handles row-level schema errors differently. The planner needs to handle row-level rejection (not chunk-level) for `product_type` validation.

**Current flow:** All rows are Zod-validated together as `ImportSchema.safeParse({ rows })`. A single invalid row in a chunk causes the whole parse to fail. For per-row rejection (D-11), the schema must validate rows individually or use `z.array(ImportRowSchema)` with `.superRefine()` to collect per-row errors.

**Simplest D-11 implementation:** Pre-validate each row individually before the batch operation, collecting errors by row index. The `ImportPreviewTable` already shows per-row errors.

### Anti-Patterns to Avoid
- **Don't put product_type logic in UI components only.** The RPC is the authoritative stock gate. UI checks are defense-in-depth.
- **Don't re-issue REVOKE/GRANT if RPC signature unchanged.** Migration 021 already restricted `complete_pos_sale` and `complete_online_sale` to `service_role`. A `CREATE OR REPLACE` with identical signature preserves those grants.
- **Don't add `has_inventory` to PRICE_ID_MAP with a hardcoded price.** Phase 23 owns billing. Phase 21 should use `process.env.STRIPE_PRICE_INVENTORY` in the map but the env var can be absent for now — the billing path won't be triggered until Phase 23.
- **Don't add upgrade CTA when hiding stock UI.** D-06 explicitly says no upgrade CTA replacement — just hide.
- **Don't query product type inside the RPC by re-joining after inserts.** Fetch `product_type` in the first SELECT FOR UPDATE loop and carry it through to loop 2.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Enum validation | Custom type-check string | `z.enum(['physical', 'service'])` in Zod | Already project-standard; handles unknown values cleanly |
| Feature flag check | Manual JWT parse in component | `requireFeature('inventory')` or `user.app_metadata.inventory` pattern | Already established; consistent with xero/email_notifications |
| Atomic stock skip | Application-layer IF before RPC call | PostgreSQL `IF v_product_type = 'physical' THEN` inside RPC | Race condition safety requires DB-level gate |
| Per-row CSV errors | Re-throw Zod array errors | Validate rows individually before batch, collect per-row errors | Matches existing `errors: Array<{row, message}>` return type |

---

## Common Pitfalls

### Pitfall 1: RPC Signature Must Stay Identical
**What goes wrong:** Rewriting `complete_pos_sale` with a changed signature (e.g. adding a `p_product_types` param) orphans the REVOKE/GRANT in migration 021 which references the exact overloaded signature.
**Why it happens:** PostgreSQL function overloading — GRANT is tied to specific argument types.
**How to avoid:** Use `CREATE OR REPLACE` with the exact same parameter list as in `010_checkout_speed.sql`. Verify against migration 021's REVOKE line: `complete_pos_sale(UUID, UUID, TEXT, INTEGER, INTEGER, INTEGER, INTEGER, INTEGER, TEXT, JSONB, JSONB, TEXT)`.
**Warning signs:** Migration applies but subsequent `SELECT complete_pos_sale(...)` returns permission denied.

### Pitfall 2: Database Types Out of Sync with TypeScript
**What goes wrong:** After adding `product_type` to the products table, `src/types/database.ts` (generated types) is stale — code that uses `ProductRow` type won't have the field.
**Why it happens:** `database.ts` is generated from the Supabase schema via `supabase gen types`. In this project it's checked in.
**How to avoid:** After writing the migration, regenerate `src/types/database.ts` via `npx supabase gen types typescript --local > src/types/database.ts` (if local Supabase is running) or manually add the field to the `products` Row/Insert/Update types.
**Warning signs:** TypeScript build errors on `product.product_type` access.

### Pitfall 3: JWT Claim Staleness After Adding has_inventory
**What goes wrong:** After deploying migration (adds `has_inventory` to hook), existing logged-in sessions don't see the new claim — users need to log out and back in.
**Why it happens:** JWTs are issued at login time; `custom_access_token_hook` only runs on new token issuance.
**How to avoid:** This is expected behavior — document in the verification plan. For testing, use a fresh login session.
**Warning signs:** `user.app_metadata.inventory` is `undefined` on an existing session even after migration.

### Pitfall 4: free-tier Check in Client Component Without Prop
**What goes wrong:** `ProductCard`, `ProductFormDrawer`, and `ProductDataTable` are Client Components — they cannot call `requireFeature()` directly (server-only). If the `has_inventory` flag isn't passed as a prop, the component has no way to know.
**Why it happens:** Common mistake: calling a server function from a client component.
**How to avoid:** Server Component parent reads `user.app_metadata?.inventory === true` and passes `hasInventory: boolean` prop to all Client Components that need it. Follow the existing `staffRole` prop pattern in `ProductCard`.
**Warning signs:** Build error "You're importing a component that needs server-only" or silent always-false behavior.

### Pitfall 5: complete_online_sale Skips Product Type Lookup
**What goes wrong:** `complete_online_sale` also does stock lock and decrement. Forgetting to update it means service products sold online still block and decrement.
**Why it happens:** Two separate RPCs — easy to update one and miss the other.
**How to avoid:** Both `complete_pos_sale` and `complete_online_sale` must be rewritten in the same migration. The `complete_online_sale` RPC has a different signature structure (no receipt/email params, different param names).
**Warning signs:** Online checkout for service products fails with `Insufficient stock` error.

### Pitfall 6: createCheckoutSession Stock Check Must Also Be Gated
**What goes wrong:** `createCheckoutSession.ts` (application layer) has its own `if (product.stock_quantity < item.quantity)` check BEFORE calling the RPC. Service products will be blocked here even if the RPC is fixed.
**Why it happens:** Defense-in-depth check in the server action predates product types.
**How to avoid:** `createCheckoutSession.ts` must also check `product_type` on each product when it fetches them, and skip the stock check for service products. The `select` query must include `product_type`.
**Warning signs:** Test passes at RPC level but online checkout for service products returns `{ error: 'out_of_stock' }`.

### Pitfall 7: POSClientShell Out-of-Stock Check
**What goes wrong:** `POSClientShell.tsx` line 159: `if (product.stock_quantity === 0)` blocks adding out-of-stock products. Service products with `stock_quantity = 0` will be blocked in the POS.
**Why it happens:** Client-side guard in the POS shell predates product types.
**How to avoid:** The `handleAddToCart` function must also check `product.product_type`. If `product_type === 'service'`, skip the stock check entirely. `product_type` must be included in the products query that feeds the POS.
**Warning signs:** Service products with `stock_quantity = 0` can't be added to cart in POS.

---

## Code Examples

### Migration: product_type column + store_plans column + RPC update

```sql
-- 024_service_product_type.sql (filename — next after 023_performance_indexes.sql)

-- 1. Add product_type to products
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS product_type TEXT NOT NULL DEFAULT 'physical'
  CHECK (product_type IN ('physical', 'service'));

-- 2. Add has_inventory to store_plans (Phase 23 adds billing; Phase 21 adds the column)
ALTER TABLE public.store_plans
  ADD COLUMN IF NOT EXISTS has_inventory BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_inventory_manual_override BOOLEAN NOT NULL DEFAULT false;

-- 3. Update auth hook to inject inventory claim
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event JSONB)
-- (full replacement preserving existing logic + adding inventory claim)

-- 4. CREATE OR REPLACE complete_pos_sale (same signature as 010_checkout_speed.sql)
-- (service products skip stock lock and decrement)

-- 5. CREATE OR REPLACE complete_online_sale (same signature as 006_online_store.sql)
-- (service products skip stock lock and decrement)

-- 6. Grant SELECT on updated store_plans to supabase_auth_admin (for hook)
-- (idempotent re-grant)
```

### Zod Schema Extension

```typescript
// src/schemas/product.ts
import { z } from 'zod'

export const ProductTypeSchema = z.enum(['physical', 'service']).default('physical')

export const CreateProductSchema = z.object({
  name: z.string().min(1).max(200),
  sku: z.string().max(50).optional(),
  barcode: z.string().max(50).optional(),
  price_cents: z.number().int().min(0),
  category_id: z.string().uuid().optional(),
  product_type: ProductTypeSchema,
  stock_quantity: z.number().int().min(0).default(0),
  reorder_threshold: z.number().int().min(0).default(0),
  image_url: z.string().url().optional(),
})

export const UpdateProductSchema = CreateProductSchema.partial()
```

### addons.ts Extension

```typescript
// src/config/addons.ts — add inventory to SubscriptionFeature union
export type SubscriptionFeature = 'xero' | 'email_notifications' | 'custom_domain' | 'inventory'

// Add to FeatureFlags:
interface FeatureFlags {
  has_xero: boolean
  has_email_notifications: boolean
  has_custom_domain: boolean
  has_inventory: boolean  // NEW
}

// Add to FEATURE_TO_COLUMN:
export const FEATURE_TO_COLUMN: Record<SubscriptionFeature, keyof FeatureFlags> = {
  xero: 'has_xero',
  email_notifications: 'has_email_notifications',
  custom_domain: 'has_custom_domain',
  inventory: 'has_inventory',  // NEW
}

// PRICE_ID_MAP: add inventory (Phase 23 sets the env var; can be placeholder for now)
export const PRICE_ID_MAP: Record<SubscriptionFeature, string> = {
  ...existing,
  inventory: process.env.STRIPE_PRICE_INVENTORY ?? '',  // Phase 23 fills this
}
```

### Server Component reading has_inventory

```typescript
// Pattern: in any Server Component parent that needs to pass flag to Client Components
const hasInventory = (user?.app_metadata?.inventory as boolean | undefined) === true
// Pass as prop: <ProductFormDrawer hasInventory={hasInventory} ... />
```

### ProductFormDrawer conditional rendering

```typescript
// Conditional: show stock fields only if (hasInventory && productType === 'physical')
{hasInventory && productType === 'physical' && (
  <StockQuantityField ... />
)}
{hasInventory && productType === 'physical' && (
  <ReorderThresholdField ... />
)}
```

### CSV ImportRowSchema with product_type

```typescript
// src/actions/products/importProducts.ts
const ImportRowSchema = z.object({
  ...existing fields,
  product_type: z.enum(['physical', 'service']).default('physical'),  // D-09: default physical
  stock_quantity: z.number().int().min(0).optional(),
  reorder_threshold: z.number().int().min(0).optional(),
})

// In insertRows mapping (D-10: ignore stock_quantity for service):
const isService = row.product_type === 'service'
return {
  ...other fields,
  product_type: row.product_type,
  stock_quantity: isService ? 0 : (row.stock_quantity ?? 0),
  reorder_threshold: isService ? 0 : (row.reorder_threshold ?? 0),
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| All products assumed physical with stock | product_type enum discriminates service vs physical | This phase | Stock logic becomes conditional throughout |
| store_plans has no inventory column | store_plans gains has_inventory + manual_override | This phase | Free-tier gating infrastructure ready for Phase 23 billing |
| complete_pos_sale always decrements stock | complete_pos_sale skips decrement for services | This phase | Service items can be sold unlimited times |

**No deprecated patterns introduced.** This phase extends the existing patterns without replacing them.

---

## Open Questions

1. **Optimistic lock in complete_pos_sale for service items**
   - What we know: The RPC currently does `SELECT FOR UPDATE` on ALL items including services. For service items, this lock is unnecessary — it serializes concurrent service-product sales for no reason.
   - What's unclear: Whether to skip the `FOR UPDATE` clause for service items or keep it for simplicity.
   - Recommendation: Skip `FOR UPDATE` for service products — there is no stock to protect. Do the product_type check, skip the lock if service, raise PRODUCT_NOT_FOUND if product doesn't exist.

2. **database.ts regeneration mechanism**
   - What we know: `src/types/database.ts` is checked in and appears manually maintained (no `supabase gen types` script in package.json visible).
   - What's unclear: Whether there is a `npm run types` or similar script.
   - Recommendation: Planner should include a task to manually add `product_type: string` (and `has_inventory: boolean`) to the relevant Row/Insert/Update types in `database.ts`.

---

## Environment Availability

Step 2.6: SKIPPED — this phase is code and migration changes only. No new external services, CLI tools, or runtimes are required beyond what is already running for the project.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest ^2.x / ^3.x |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run --coverage` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PROD-01 | product_type field persisted on create/update | unit | `npx vitest run src/actions/products/ -t "product_type"` | ❌ Wave 0 |
| PROD-02 | RPC skips stock decrement for service products | unit (mock RPC) | `npx vitest run src/actions/orders/__tests__/completeSale.test.ts` | ❌ Wave 0 |
| PROD-03 | Refund skips restore_stock for service products | unit | `npx vitest run src/actions/orders/__tests__/processPartialRefund.test.ts` | ✅ (has file — needs new test case) |
| PROD-04 | CSV import sets product_type, ignores stock for service | unit | `npx vitest run src/actions/products/__tests__/importProducts.test.ts` | ❌ Wave 0 |
| FREE-01 | Stock fields hidden when has_inventory=false | component | `npx vitest run src/components/admin/products/` | ❌ Wave 0 |
| FREE-02 | createCheckoutSession allows service items with 0 stock | unit | `npx vitest run src/actions/orders/__tests__/createCheckoutSession.test.ts` | ❌ Wave 0 |
| FREE-03 | RPC decrements stock regardless of has_inventory (DB-level) | manual only | n/a — requires Supabase local | manual |
| POS-04 | Service products always sellable in POS | component | `npx vitest run src/components/pos/` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run --coverage`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/actions/products/__tests__/createProduct.test.ts` — covers PROD-01 (product_type persistence)
- [ ] `src/actions/products/__tests__/updateProduct.test.ts` — covers PROD-01 (product_type update)
- [ ] `src/actions/orders/__tests__/completeSale.test.ts` — covers PROD-02 (service product stock skip)
- [ ] `src/actions/products/__tests__/importProducts.test.ts` — covers PROD-04 (CSV product_type)
- [ ] `src/actions/orders/__tests__/createCheckoutSession.test.ts` — covers FREE-02 / POS-04 (service sellable online)
- [ ] New test case in `src/actions/orders/__tests__/processPartialRefund.test.ts` — covers PROD-03
- [ ] `src/components/pos/__tests__/ProductCard.test.tsx` — covers FREE-01 / POS-04 (no stock badge, service sellable)
- [ ] `StoreProductCard.test.tsx` already exists with `.todo` tests — implement the stock-related ones for FREE-01/D-13

---

## Sources

### Primary (HIGH confidence)
- Direct codebase read — migration files 005, 006, 009, 010, 019, 021 (exact RPC source, grant restrictions, auth hook)
- Direct codebase read — `src/config/addons.ts`, `src/lib/requireFeature.ts` (feature gating pattern)
- Direct codebase read — `src/schemas/product.ts`, `src/actions/products/createProduct.ts`, `src/actions/products/updateProduct.ts` (schema and action patterns)
- Direct codebase read — `src/actions/orders/processRefund.ts`, `src/actions/orders/processPartialRefund.ts` (restore_stock call sites)
- Direct codebase read — `src/components/pos/ProductCard.tsx`, `src/components/pos/POSClientShell.tsx` (stock check locations)
- Direct codebase read — `src/components/store/AddToCartButton.tsx`, `src/actions/orders/createCheckoutSession.ts` (online stock checks)
- Direct codebase read — `src/components/wizard/FirstProductStep.tsx` (wizard product step — no stock quantity field, so D-08 is already satisfied here)
- Direct codebase read — `src/components/admin/csv/ColumnMapperStep.tsx`, `src/actions/products/importProducts.ts` (CSV pipeline)

### Secondary (MEDIUM confidence)
- PostgreSQL documentation: `CHECK` constraint approach vs `CREATE TYPE ENUM` — verified as established pattern

---

## Project Constraints (from CLAUDE.md)

- **Tech stack:** Next.js App Router + Supabase + Stripe + Tailwind CSS. Non-negotiable.
- **No ORM:** Use Supabase JS client. No Prisma/Drizzle.
- **No new auth libraries:** Supabase Auth is the auth system.
- **Zod required:** Every Server Action must validate inputs with `z.safeParse()` before touching the database.
- **server-only:** Import `server-only` in any file with Supabase credentials, session logic, or Server Actions.
- **No Supabase Realtime:** Refresh-on-transaction pattern only.
- **Testing:** Vitest for unit tests, not Jest.
- **GSD workflow:** All file changes go through GSD workflow.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new libraries; all existing tools
- Architecture (RPC modification): HIGH — exact source code read, migration pattern established
- Architecture (free-tier gating): HIGH — `requireFeature` / JWT pattern fully understood
- Architecture (CSV): HIGH — importProducts.ts source read
- Pitfalls: HIGH — all identified from direct source inspection (not assumptions)

**Research date:** 2026-04-04
**Valid until:** 2026-05-04 (stable codebase; only invalidated by conflicting concurrent changes)
