# Architecture Research

**Domain:** Inventory management add-on + service product types for existing multi-tenant SaaS POS
**Researched:** 2026-04-04
**Confidence:** HIGH — based on direct codebase inspection, all claims verified against source

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Next.js App Router Layer                             │
├──────────────┬──────────────┬──────────────┬─────────────────────────────────┤
│  /pos        │  /admin      │  /(store)    │  /api/webhooks/stripe            │
│  POS shell   │  Inventory   │  Storefront  │  Billing + stock restore         │
│  (staff JWT) │  pages (new) │  (public)    │  (service role)                  │
└──────┬───────┴──────┬───────┴──────┬───────┴──────────────┬──────────────────┘
       │              │              │                       │
       ▼              ▼              ▼                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Server Actions (48 existing + ~8 new)                │
│  completeSale  updateProduct  createProduct  adjustStock(NEW)                │
│  processRefund importProducts              recordStocktake(NEW)              │
│  [all validated with Zod, guarded with server-only, admin client for RPCs]   │
└──────────────────────────────────┬──────────────────────────────────────────┘
                                   │
       ┌───────────────────────────┼───────────────────────────────────┐
       ▼                           ▼                                   ▼
┌─────────────┐      ┌─────────────────────────┐          ┌──────────────────────┐
│ requireFeat │      │  Supabase Admin Client   │          │  JWT Claims / Auth   │
│ ure('inven  │      │  (service role -- RPCs,  │          │  hook injects:       │
│ tory') NEW  │      │  stock writes bypass RLS)│          │  inventory: boolean  │
└─────────────┘      └────────────┬────────────┘          │  (NEW claim needed)  │
                                  │                        └──────────────────────┘
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Supabase Postgres (RLS on all tables)                │
├─────────────────┬─────────────────┬──────────────────┬───────────────────────┤
│ products        │ stock_adjust-   │ stocktakes       │ store_plans           │
│ +product_type   │ ments (NEW)     │ (NEW)            │ +has_inventory (NEW)  │
│ (physical|svc)  │                 │                  │ +has_inventory_       │
│                 │                 │                  │  manual_override (NEW)│
├─────────────────┴─────────────────┴──────────────────┴───────────────────────┤
│ EXISTING: complete_pos_sale RPC   (modified: skip stock check for services)   │
│ EXISTING: complete_online_sale RPC (modified: skip stock check for services)  │
│ EXISTING: restore_stock RPC       (no change -- service items have no stock)  │
│ NEW:      adjust_stock RPC        (manual adjustment with audit trail)        │
│ NEW:      complete_stocktake RPC  (apply variance, write history)             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Current State |
|-----------|----------------|---------------|
| `products` table | Source of truth for product catalog, stock levels | EXISTS -- needs `product_type` column |
| `stock_adjustments` table | Audit log for all manual stock changes (adjustments + stocktake variances) | NEW |
| `stocktakes` / `stocktake_items` tables | Snapshot of counted quantities with variance vs system | NEW |
| `store_plans` table | Per-tenant feature flags linked to Stripe billing | EXISTS -- needs `has_inventory` column |
| `complete_pos_sale` RPC | Atomic POS sale: lock then check stock then insert order then decrement | EXISTS -- must be modified |
| `complete_online_sale` RPC | Atomic online sale: same as above for Stripe webhook path | EXISTS -- must be modified |
| `adjust_stock` RPC | SECURITY DEFINER: apply manual stock adjustment + write audit row | NEW |
| `complete_stocktake` RPC | SECURITY DEFINER: apply variance adjustments + write stocktake record | NEW |
| `requireFeature('inventory')` | Guard for all inventory Server Actions and admin UI pages | NEW call site wiring |
| `custom_access_token_hook` | Injects `inventory: boolean` into JWT app_metadata | EXISTS -- must be modified |
| `addons.ts` config | Central registry of all add-on features, Stripe Price IDs, column mappings | EXISTS -- must be extended |

## Recommended Project Structure

```
src/
├── actions/
│   ├── products/
│   │   ├── createProduct.ts          # MODIFY: add product_type field
│   │   └── updateProduct.ts          # MODIFY: add product_type field
│   └── inventory/                    # NEW directory
│       ├── adjustStock.ts            # NEW: manual adjustment action
│       ├── recordStocktake.ts        # NEW: save counted quantities
│       └── completeStocktake.ts      # NEW: apply variance + finalise
├── schemas/
│   ├── product.ts                    # MODIFY: add product_type to Zod schema
│   └── inventory.ts                  # NEW: AdjustStockSchema, StocktakeSchema
├── config/
│   └── addons.ts                     # MODIFY: add 'inventory' to SubscriptionFeature
├── components/
│   ├── pos/
│   │   └── ProductCard.tsx           # MODIFY: hide stock badge if !hasInventory
│   └── admin/
│       └── inventory/                # NEW directory
│           ├── StockAdjustmentForm.tsx
│           ├── StocktakeSheet.tsx
│           └── StockHistoryTable.tsx
├── app/
│   └── admin/
│       └── inventory/                # NEW route group
│           ├── page.tsx              # Stock overview (requires inventory feature)
│           ├── adjust/page.tsx       # Manual adjustment form
│           └── stocktake/page.tsx    # Stocktake workflow
└── types/
    └── database.ts                   # REGENERATE after migrations applied
```

### Structure Rationale

- **`actions/inventory/`:** Separate action directory follows the existing pattern (`actions/products/`, `actions/orders/`). Keeps inventory mutations isolated.
- **`config/addons.ts`:** Already the single source of truth for feature/Stripe/column mappings. Extending it (not duplicating) is the correct pattern.
- **`app/admin/inventory/`:** Matches the existing admin route group pattern (`app/admin/reports/`, `app/admin/orders/`).

## Architectural Patterns

### Pattern 1: Feature Gate at the Server Action Entry Point

**What:** Every Server Action that touches inventory calls `requireFeature('inventory', { requireDbCheck: true })` before any DB work. The `{ requireDbCheck: true }` option forces a DB read against `store_plans` -- critical for mutations where a stale JWT claim would allow inventory writes after a cancelled subscription.

**When to use:** All write paths (adjustStock, recordStocktake, completeStocktake). Read paths (stock history display) can use the JWT fast path.

**Trade-offs:** One extra DB round-trip per mutation. Acceptable -- inventory adjustments are low-frequency, correctness matters more than latency.

**Example:**
```typescript
export async function adjustStock(input: unknown) {
  'use server'
  import 'server-only'

  const result = await requireFeature('inventory', { requireDbCheck: true })
  if (!result.authorized) {
    return { success: false, error: 'FEATURE_GATED', upgradeUrl: result.upgradeUrl }
  }
  // ... rest of action
}
```

### Pattern 2: Service Products Skip All Stock Logic

**What:** The `product_type` column (`'physical' | 'service'`) is the single gate for all stock operations. Services never have stock checked, never decrement, never show stock badges. This gate lives in three places: the two SECURITY DEFINER RPCs (DB layer), the POS ProductCard component (UI layer), and the storefront product page (UI layer).

**When to use:** Everywhere stock quantity is read or written. The RPC is the authoritative gating point -- UI checks are defense-in-depth.

**Trade-offs:** Requires modifying existing RPCs. The RPCs are SECURITY DEFINER so one migration changes the actual stock logic. UI changes are additive (conditional rendering).

**Example -- RPC modification pattern:**
```sql
-- In complete_pos_sale, branch on product_type in the item JSONB:
IF (v_item->>'product_type') IS DISTINCT FROM 'service' THEN
  SELECT stock_quantity INTO v_current_stock
  FROM products WHERE id = (v_item->>'product_id')::UUID ...
  FOR UPDATE;
  -- check and decrement as before
END IF;
```

### Pattern 3: Append-Only Audit Log for Stock Changes

**What:** All stock changes (sale decrement, refund restore, manual adjustment, stocktake variance) write a row to `stock_adjustments`. The `products.stock_quantity` column is the live total; `stock_adjustments` is the history. Never rewrite history rows.

**When to use:** Always. This is the audit trail for IRD compliance and theft detection.

**Trade-offs:** Slightly more writes per transaction. The `adjust_stock` and `complete_stocktake` RPCs handle this atomically so there is no risk of orphaned history rows.

**Note on scope:** For v3.0, `stock_adjustments` rows for sales (reason='sale') can be written inside the modified RPCs. This keeps the audit trail complete without any extra application-layer work.

## Data Flow

### Manual Stock Adjustment Flow

```
Admin UI (StockAdjustmentForm)
    -> Server Action: adjustStock(input)
    -> requireFeature('inventory', { requireDbCheck: true })
    -> Zod: AdjustStockSchema.safeParse(input)
    -> adminClient.rpc('adjust_stock', { p_product_id, p_delta, p_reason, p_note, p_staff_id })
         -> SECURITY DEFINER RPC (atomic):
              SELECT stock_quantity FOR UPDATE
              UPDATE products SET stock_quantity = stock_quantity + p_delta
              INSERT INTO stock_adjustments (quantity_before, quantity_after, ...)
    -> revalidatePath('/admin/inventory')
    -> revalidatePath('/pos')  -- POS needs refreshed stock
```

### POS Sale with Service Product

```
POS Cart contains: [Widget (physical, qty=2), Installation (service, qty=1)]
    -> completeSale() Server Action
    -> resolveStaffAuth()  (staff PIN JWT)
    -> CreateOrderSchema.safeParse()
    -> adminClient.rpc('complete_pos_sale', { p_items: [...] })
         -> SECURITY DEFINER RPC:
              FOR EACH item:
                IF product_type != 'service': lock + check + decrement stock
                IF product_type == 'service': skip stock entirely
              INSERT order + order_items (service items recorded for revenue)
```

### Feature Flag Injection (new `inventory` claim)

```
User logs in -> Supabase Auth -> custom_access_token_hook fires
    -> Reads store_plans WHERE store_id = user's store
    -> Injects into app_metadata:
         xero: boolean (existing)
         email_notifications: boolean (existing)
         custom_domain: boolean (existing)
         inventory: boolean (NEW)
    -> JWT signed and returned to client
    -> requireFeature('inventory') reads user.app_metadata.inventory (fast path)
    -> requireFeature('inventory', { requireDbCheck: true }) reads store_plans.has_inventory (DB path)
```

### Stocktake Flow

```
Admin opens Stocktake page
    -> Server Component: loads all physical products (name, sku, current stock_quantity)
    -> Staff counts physical quantities, enters into StocktakeSheet form
    -> Server Action: recordStocktake(items[]) -- saves draft, computes variance
    -> Staff reviews variance report (counted vs system)
    -> Server Action: completeStocktake(stocktake_id)
         -> requireFeature('inventory', { requireDbCheck: true })
         -> adminClient.rpc('complete_stocktake', { p_stocktake_id, p_staff_id })
              -> SECURITY DEFINER RPC (atomic):
                   FOR EACH stocktake_item with variance != 0:
                     UPDATE products.stock_quantity (set to counted value)
                     INSERT stock_adjustments (reason='stocktake', delta=variance)
                   UPDATE stocktakes SET status='completed', completed_at=now()
```

## Schema Changes

### New Column: `products.product_type`

```sql
-- In migration 024
ALTER TABLE public.products
  ADD COLUMN product_type TEXT NOT NULL DEFAULT 'physical'
  CHECK (product_type IN ('physical', 'service'));
```

All existing products default to `'physical'` -- no data migration needed. The `product_type` must be passed in the RPC item JSONB so RPCs can branch without an extra DB lookup per item.

### New Column: `store_plans.has_inventory`

```sql
ALTER TABLE public.store_plans
  ADD COLUMN has_inventory BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN has_inventory_manual_override BOOLEAN NOT NULL DEFAULT false;
```

Follows the exact pattern of `has_xero` / `has_xero_manual_override` already in the table (migration 020).

### New Tables

```sql
-- stock_adjustments: append-only audit log for all stock changes
CREATE TABLE public.stock_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id),
  product_id UUID NOT NULL REFERENCES public.products(id),
  adjusted_by UUID REFERENCES public.staff(id),  -- NULL for RPC-driven (sale/refund)
  reason TEXT NOT NULL CHECK (reason IN (
    'sale', 'refund', 'manual_add', 'manual_remove',
    'stocktake', 'damage', 'shrinkage', 'correction', 'opening_count'
  )),
  quantity_delta INTEGER NOT NULL,
  quantity_before INTEGER NOT NULL,
  quantity_after INTEGER NOT NULL,
  note TEXT,
  order_id UUID REFERENCES public.orders(id),  -- populated for sale/refund entries
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- stocktakes: header record for each physical count session
CREATE TABLE public.stocktakes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id),
  created_by UUID NOT NULL REFERENCES public.staff(id),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'completed')),
  completed_at TIMESTAMPTZ,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- stocktake_items: counted quantities per product
CREATE TABLE public.stocktake_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stocktake_id UUID NOT NULL REFERENCES public.stocktakes(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES public.stores(id),
  product_id UUID NOT NULL REFERENCES public.products(id),
  product_name TEXT NOT NULL,          -- snapshot
  system_quantity INTEGER NOT NULL,    -- snapshot at time of stocktake creation
  counted_quantity INTEGER NOT NULL,
  variance INTEGER GENERATED ALWAYS AS (counted_quantity - system_quantity) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Modified RPCs

**`complete_pos_sale`** -- Add `product_type` to item JSONB; skip stock check and decrement for services.

**`complete_online_sale`** -- Same service-skip logic as POS.

**`restore_stock`** -- No change. Callers (`processRefund`, `processPartialRefund`) must check `product_type` in the Server Action and skip calling it for service items.

**`custom_access_token_hook`** -- Add `v_has_inventory` variable; read `sp.has_inventory` in the store_plans SELECT; inject `inventory` claim into app_metadata.

### New RPCs

**`adjust_stock(p_store_id, p_product_id, p_delta, p_reason, p_note, p_adjusted_by)`** -- SECURITY DEFINER: atomic SELECT FOR UPDATE then UPDATE products then INSERT stock_adjustments. Returns `quantity_after`.

**`complete_stocktake(p_stocktake_id, p_store_id, p_staff_id)`** -- SECURITY DEFINER: applies all non-zero variances, writes stock_adjustments rows, marks stocktake completed.

## Integration Points

### Existing Code to Modify

| File | Change | Risk |
|------|--------|------|
| `supabase/migrations/005_pos_rpc.sql` (via new migration) | `complete_pos_sale`: accept `product_type` in item JSONB; skip stock for services | HIGH -- touches sale critical path |
| `supabase/migrations/006_online_store.sql` (via new migration) | `complete_online_sale`: same service-skip logic | HIGH -- Stripe webhook path |
| `supabase/migrations/019_billing_claims.sql` (via new migration) | `custom_access_token_hook`: add `has_inventory` claim injection | LOW -- additive, proven pattern |
| `src/config/addons.ts` | Add `'inventory'` to `SubscriptionFeature` type, all maps, `ADDONS` array | LOW -- purely additive |
| `src/schemas/product.ts` | Add `product_type` field to `CreateProductSchema` and `UpdateProductSchema` | LOW |
| `src/actions/products/createProduct.ts` | Pass `product_type` to DB insert | LOW |
| `src/actions/products/updateProduct.ts` | Pass `product_type` to DB update | LOW |
| `src/actions/orders/processRefund.ts` | Check `product_type` before calling `restore_stock` -- skip for service items | MEDIUM |
| `src/actions/orders/processPartialRefund.ts` | Same service check as processRefund | MEDIUM |
| `src/components/pos/ProductCard.tsx` | Conditionally hide stock badge when inventory add-on inactive OR product is a service | LOW -- UI only |
| `src/app/(store)/products/[slug]/page.tsx` | Hide "X in stock" / "Sold out" for service products | LOW |
| `src/app/admin/dashboard/page.tsx` | Gate low-stock widget behind inventory feature flag | LOW |
| `src/app/admin/reports/page.tsx` | Gate stock levels section behind inventory feature flag | LOW |
| `src/app/api/cron/daily-summary/route.ts` | Gate low-stock email block behind inventory feature check | LOW |
| `src/types/database.ts` | Regenerate after migrations applied | LOW -- tooling handles this |

### New Code

| What | Where | Notes |
|------|-------|-------|
| Migration 024 | `supabase/migrations/024_inventory_addon.sql` | All schema changes in one file: new tables, new columns, modified RPCs, new RPCs, RLS policies, indexes, auth hook update |
| `adjustStock` Server Action | `src/actions/inventory/adjustStock.ts` | Calls `adjust_stock` RPC via admin client |
| `recordStocktake` Server Action | `src/actions/inventory/recordStocktake.ts` | Inserts `stocktakes` + `stocktake_items` draft |
| `completeStocktake` Server Action | `src/actions/inventory/completeStocktake.ts` | Calls `complete_stocktake` RPC |
| `AdjustStockSchema` + `StocktakeSchema` | `src/schemas/inventory.ts` | Zod validation for new actions |
| Admin inventory pages | `src/app/admin/inventory/` | Route group with feature gate in layout |
| Inventory UI components | `src/components/admin/inventory/` | StockAdjustmentForm, StocktakeSheet, StockHistoryTable |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Server Action -> RPC | `adminClient.rpc('adjust_stock', ...)` | Admin client required -- SECURITY DEFINER RPCs need service role |
| POS sale -> stock_adjustments | Inside modified `complete_pos_sale` RPC | No application layer; atomicity guaranteed |
| Feature gate -> store_plans | `requireFeature('inventory', { requireDbCheck: true })` | DB path for mutations, JWT path for reads |
| Auth hook -> store_plans | `SELECT has_inventory FROM store_plans WHERE store_id = ...` | Additive to existing SELECT |
| Admin pages -> feature gate | Layout-level `requireFeature` check for `/admin/inventory/` route group | Redirect to billing upgrade page on deny |

## RLS Policy Requirements for New Tables

All new tables need RLS enabled. Follow the existing pattern:

```sql
-- stock_adjustments: staff read only; no direct write (SECURITY DEFINER RPCs only)
ALTER TABLE public.stock_adjustments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can read stock adjustments for their store"
  ON public.stock_adjustments FOR SELECT
  USING (
    store_id = (auth.jwt() -> 'app_metadata' ->> 'store_id')::uuid
    AND (auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'staff')
  );

-- No INSERT/UPDATE policies -- written by SECURITY DEFINER RPCs (admin client) only

-- stocktakes: staff can read and create drafts; only complete_stocktake RPC updates status
-- stocktake_items: staff can read and insert counted items
```

## Build Order

The dependency graph drives this ordering:

1. **Migration first** (`024_inventory_addon.sql`) -- schema changes enable everything else. One file to keep it atomic: new tables, `product_type` column, `has_inventory` columns, modified RPCs, new RPCs, updated auth hook, RLS policies, indexes.

2. **`addons.ts` config** -- adds `'inventory'` type and maps. All subsequent TypeScript compiles against this.

3. **Product schema + actions** -- add `product_type` to Zod schema; update createProduct, updateProduct, importProducts.

4. **Refund actions** -- add `product_type` guard before `restore_stock` calls. Unblocks correctness for service products without needing any new UI.

5. **Inventory Server Actions** -- `adjustStock`, `recordStocktake`, `completeStocktake` (depend on migration + addons.ts).

6. **Admin UI -- inventory pages** -- depend on Server Actions being available.

7. **POS + storefront UI** -- conditional rendering for service products and inventory gate (depends on addons.ts + product schema).

8. **Super admin panel** -- add inventory add-on to activate/deactivate flows. Follows the xero/email_notifications pattern exactly.

9. **`database.ts` regeneration** -- run after all migrations applied to update generated types.

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| Current (single store in prod) | No changes needed. Existing indexes on `products(store_id)` are sufficient. |
| 1k-100k stores | Add index `stock_adjustments(store_id, created_at DESC)` for stock history queries. The `stock_adjustments` table grows fast for high-volume stores. |
| 100k+ stores | `stock_adjustments` will be the largest table. Consider partitioning by `store_id` or archiving old rows. `products.stock_quantity` column stays fast regardless. |

### Scaling Priorities

1. **First bottleneck:** `stock_adjustments` table size on high-volume stores. Compound index `(store_id, product_id, created_at DESC)` handles history queries. Add `(store_id, created_at DESC)` for store-level history.
2. **Second bottleneck:** Stocktake page loading all products. Already mitigated by `idx_products_store` existing index. Filter to `product_type = 'physical'` and paginate if needed.

## Anti-Patterns

### Anti-Pattern 1: Add Product Type Check Only in the UI Layer

**What people do:** Check `product.product_type === 'service'` in the React component and skip adding it to cart; never modify the RPCs.

**Why it's wrong:** The `complete_pos_sale` and `complete_online_sale` RPCs will still try to lock and decrement stock for service items, causing `OUT_OF_STOCK` errors on service products that have `stock_quantity = 0`. The RPC is the only atomic layer and cannot be bypassed.

**Do this instead:** Modify both RPCs to skip stock logic for service items. Pass `product_type` in the item JSONB so the RPC knows without a second lookup per item.

### Anti-Pattern 2: Mix Service Skip Logic with Inventory Add-on Gate in the RPC

**What people do:** Add a `has_inventory` check inside `complete_pos_sale` -- skip stock checks if the store doesn't have the inventory add-on.

**Why it's wrong:** Service-product skip and inventory-add-on gate are different concerns. A store without the inventory add-on must still have services work correctly (services are always sellable). Mixing them in the RPC creates a logic tangle when the add-on is later activated.

**Do this instead:** `product_type` is unconditional -- services always skip stock regardless of the add-on. The inventory add-on gate lives at the Server Action / UI layer (whether stock badges display, whether the admin inventory section is accessible). They are orthogonal concerns.

### Anti-Pattern 3: Write `stock_adjustments` from Application Layer

**What people do:** After calling `adjust_stock` RPC, write a separate `stock_adjustments` row from the Server Action (two DB calls).

**Why it's wrong:** If the application crashes between the two calls, stock is updated but no audit history exists. This is the exact race condition the SECURITY DEFINER RPC pattern is designed to prevent.

**Do this instead:** The `adjust_stock` RPC updates `products.stock_quantity` and inserts the `stock_adjustments` row in a single transaction. The Server Action gets one atomic call.

### Anti-Pattern 4: Multiple Migration Files for Tightly Coupled Changes

**What people do:** Create `024_product_type.sql`, `025_inventory_tables.sql`, `026_modify_rpcs.sql` separately.

**Why it's wrong:** The modified RPCs reference the new `stock_adjustments` table. If migrations run in order but one fails mid-way, the RPCs may reference tables that do not exist. Rolling back is complex.

**Do this instead:** One migration file (`024_inventory_addon.sql`) for all inventory changes. The entire feature either applies or rolls back as a unit.

## Sources

- Direct codebase inspection: `supabase/migrations/001_initial_schema.sql` -- products table structure, `stock_quantity`, `reorder_threshold` columns
- Direct codebase inspection: `supabase/migrations/005_pos_rpc.sql` -- `complete_pos_sale` full RPC source, SELECT FOR UPDATE pattern
- Direct codebase inspection: `supabase/migrations/006_online_store.sql` -- `complete_online_sale` full RPC source
- Direct codebase inspection: `supabase/migrations/009_security_fixes.sql` -- `restore_stock` SECURITY DEFINER RPC pattern
- Direct codebase inspection: `supabase/migrations/013_partial_refunds.sql` -- new table + RLS pattern (refunds/refund_items)
- Direct codebase inspection: `supabase/migrations/014_multi_tenant_schema.sql` -- `store_plans` table structure with has_xero, has_email_notifications
- Direct codebase inspection: `supabase/migrations/019_billing_claims.sql` -- full `custom_access_token_hook` source, feature flag injection pattern
- Direct codebase inspection: `supabase/migrations/020_super_admin_panel.sql` -- `has_xero_manual_override` column pattern
- Direct codebase inspection: `supabase/migrations/021_security_audit_fixes.sql` -- REVOKE/GRANT pattern for SECURITY DEFINER RPCs
- Direct codebase inspection: `src/lib/requireFeature.ts` -- JWT fast path + DB fallback dual-path implementation
- Direct codebase inspection: `src/config/addons.ts` -- `SubscriptionFeature` type, `FEATURE_TO_COLUMN`, `PRICE_TO_FEATURE` maps
- Direct codebase inspection: `src/components/pos/ProductCard.tsx` -- current stock badge rendering using `stock_quantity` and `reorder_threshold`
- Direct codebase inspection: `src/actions/orders/completeSale.ts` -- Server Action + admin client RPC call pattern
- Direct codebase inspection: `src/actions/orders/processRefund.ts` -- `restore_stock` call with `restoreStock` boolean gate

---
*Architecture research for: Inventory management add-on + service product types*
*Researched: 2026-04-04*
