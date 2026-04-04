# Phase 22: Inventory Add-on Core - Research

**Researched:** 2026-04-04
**Domain:** Inventory management — stock adjustments, audit trail, stocktake sessions, admin UI
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Stock adjustment triggered inline from product edit/detail view via "Adjust stock" button — no dedicated adjustment page
- **D-02:** Adjustment form opens in a slide-out drawer (matches existing ProductFormDrawer pattern)
- **D-03:** Single product adjustment only — no bulk adjustment mode
- **D-04:** Adjustment input supports both modes: relative (±delta) and absolute (set to X). Toggle between "Adjust by" and "Set to"
- **D-05:** Stocktake uses a single page with tabs: Count tab and Review tab. Commit button at top
- **D-06:** Count entry view is a scrollable table: product name, SKU/barcode, count input. Filter/search at top. Barcode scan auto-focuses matching row
- **D-07:** System quantity hidden during counting phase (anti-anchoring). Only shown on Review tab alongside counted qty and variance
- **D-08:** Stocktake sessions auto-save as user types. Session stays open until committed or discarded. Can close browser and resume later
- **D-09:** Adjustment history lives as a tab on the inventory page (alongside Stock Levels and Stocktakes tabs)
- **D-10:** History table columns: Date, Product, Reason, Quantity change (±), New total, Notes, User
- **D-11:** Filter controls: Product picker, date range, reason code dropdown
- **D-12:** Reason codes stored as a fixed enum in code (not a DB table)
- **D-13:** Manual adjustment reason codes: `received`, `damaged`, `theft_shrinkage`, `correction`, `return_to_supplier`, `other`
- **D-14:** System-generated reason codes (`sale`, `refund`, `stocktake`) are auto-set and not user-selectable for manual adjustments
- **D-15:** New `/admin/inventory` page with three tabs: Stock Levels, Stocktakes, History
- **D-16:** Stock Levels tab shows all physical products with current stock quantities (STOCK-05)
- **D-17:** Stocktakes tab shows list of stocktake sessions with status (in-progress, committed, discarded)

### Claude's Discretion

- Exact tab component implementation (reuse existing tab pattern or new)
- Pagination strategy for history and stock levels tables
- Stocktake session creation UX (scope selection: full inventory vs filtered by category)
- Auto-save debounce timing and optimistic UI strategy

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| STOCK-01 | Admin can manually adjust stock quantity for a physical product with a reason code and optional notes | D-01/D-02/D-04: StockAdjustDrawer component; `adjustStock` server action with Zod validation; SECURITY DEFINER `adjust_stock` RPC inserts into `stock_adjustments` and updates `products.stock_quantity` atomically |
| STOCK-02 | System records all stock mutations in an append-only history table | New `stock_adjustments` table (insert-only via SECURITY DEFINER RPCs); sale/refund RPCs updated to INSERT rows; manual adjustments and stocktake commit also insert rows |
| STOCK-03 | Admin can view adjustment history filtered by product, date range, and reason code | InventoryHistoryTab component; Supabase query with `.eq()`, `.gte()`, `.lte()` filters passed via searchParams |
| STOCK-04 | Low-stock alerts visible only when inventory add-on is active | Already partially done in reports/dashboard; inventory page Stock Levels tab highlights `stock_quantity <= reorder_threshold` rows |
| STOCK-05 | Admin can view current stock levels for all physical products | StockLevelsTab on `/admin/inventory`; query products WHERE product_type='physical'; reuse ProductDataTable display patterns |
| TAKE-01 | Admin can create a stocktake session (full inventory or filtered by category) | `createStocktakeSession` server action; inserts `stocktake_sessions` row + `stocktake_lines` rows (one per physical product in scope); category filter optional |
| TAKE-02 | Admin can enter counted quantities for each product in the stocktake | StocktakeCountTab: scrollable table with `<input type="number">` per line; auto-save via debounced `updateStocktakeLine` server action |
| TAKE-03 | System calculates and displays variance (counted vs system quantity) | StocktakeReviewTab: shows `counted_quantity - system_snapshot_quantity` per line; computed client-side from line data |
| TAKE-04 | Admin can commit stocktake, atomically adjusting stock and recording adjustments | `commitStocktake` server action calls SECURITY DEFINER `complete_stocktake` RPC; atomic UPDATE of products.stock_quantity + INSERT of stock_adjustments rows for all variance lines |
| TAKE-05 | Barcode scanner can be used to look up products during stocktake count entry | Reuse `BarcodeScannerSheet` + `lookupBarcode`; on product match, auto-scroll/focus the matching row's count input in StocktakeCountTab |
</phase_requirements>

---

## Summary

Phase 22 builds the inventory management core: a stock adjustments system with audit trail, and a full stocktake flow. All decisions are locked from CONTEXT.md — the architecture is a new `/admin/inventory` page with three tabs (Stock Levels, Stocktakes, History), a drawer for manual adjustments, and a dedicated stocktake session page with Count and Review phases.

The technical foundation is a migration (025) that creates three new tables: `stock_adjustments` (append-only audit log), `stocktake_sessions`, and `stocktake_lines`. Two SECURITY DEFINER RPCs handle mutations atomically: `adjust_stock` for single-product adjustments (plus the updated sale/refund RPCs which will INSERT into `stock_adjustments`), and `complete_stocktake` for atomic stocktake commit. All server actions use `requireFeature('inventory', { requireDbCheck: true })` for mutations and JWT fast-path for UI rendering — identical to the existing feature gating pattern.

The existing codebase provides all the building blocks: `ProductFormDrawer` for the drawer pattern, `BarcodeScannerSheet` + `lookupBarcode` for TAKE-05, the tab navigation pattern from `ReportsPageClient`, and `AdminSidebar` needing a new "Inventory" nav item. The tab pattern already exists (URL-based, `TabButton` with `href` + `active` props) and should be reused verbatim.

**Primary recommendation:** Build bottom-up — migration first, then server actions, then UI. The migration is the highest-risk piece; get the schema and RPCs right before writing any React.

---

## Standard Stack

### Core (already in project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js App Router | 16.2 | Route `/admin/inventory`, `/admin/inventory/stocktake/[id]` | Project-committed stack |
| Supabase JS | ^2.x | DB queries, RLS-compliant reads | Project-committed stack |
| Zod | ^3.x | Server action input validation | Project-committed; every action uses `z.safeParse()` |
| Tailwind CSS v4 | 4.2 | UI styling | Project-committed stack |
| `server-only` | latest | Guard server actions from client import | Project pattern: all actions import this |

### No New Dependencies
Phase 22 requires zero new npm packages. All building blocks exist:
- Drawer pattern: `ProductFormDrawer` (copy/adapt)
- Barcode: `BarcodeScannerSheet` + `lookupBarcode` (reuse directly)
- Tab UI: `TabButton` pattern from `ReportsPageClient` (reuse)
- Feature gating: `requireFeature` (already supports `'inventory'`)
- Auth: `resolveAuth` (used in `lookupBarcode`, use same pattern)

---

## Architecture Patterns

### Recommended Project Structure (new files)
```
supabase/migrations/
└── 025_inventory_core.sql           # All schema + RPC changes in one file

src/actions/inventory/
├── adjustStock.ts                   # STOCK-01: manual stock adjustment
├── createStocktakeSession.ts        # TAKE-01: create session + lines
├── updateStocktakeLine.ts           # TAKE-02: save counted qty (auto-save target)
├── commitStocktake.ts               # TAKE-04: calls complete_stocktake RPC
└── discardStocktakeSession.ts       # Discard in-progress session

src/schemas/
└── inventory.ts                     # Zod schemas for adjustment + stocktake inputs

src/app/admin/inventory/
├── page.tsx                         # Server component: fetches + passes to InventoryPageClient
└── stocktake/
    └── [sessionId]/
        └── page.tsx                 # Server component: loads session + lines

src/components/admin/inventory/
├── InventoryPageClient.tsx          # 'use client' — tab state + renders tabs
├── StockLevelsTab.tsx               # STOCK-05: physical products table
├── StocktakesTab.tsx                # D-17: list of sessions with status
├── InventoryHistoryTab.tsx          # STOCK-03: adjustment history with filters
├── StockAdjustDrawer.tsx            # STOCK-01: drawer for manual adjustment
├── StocktakeSessionPage.tsx         # TAKE-01 through TAKE-05: single stocktake page
├── StocktakeCountTab.tsx            # TAKE-02: count entry table
└── StocktakeReviewTab.tsx           # TAKE-03: variance review table
```

### Pattern 1: Tab Navigation (URL-based, reuse ReportsPageClient pattern)
**What:** Tabs are `<a>` links that set `?tab=` in the URL. Active tab determined by `useSearchParams()` on the client, with SSR fallback from `searchParams` prop.
**When to use:** All three inventory page tabs (Stock Levels, Stocktakes, History).
**Example:**
```typescript
// Source: src/components/admin/reports/ReportsPageClient.tsx (lines 238-251)
function TabButton({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className={`px-4 py-2 text-sm font-bold border-b-2 -mb-px transition-colors ${
        active
          ? 'border-navy text-navy'
          : 'border-transparent text-muted hover:text-primary hover:border-border'
      }`}
    >
      {children}
    </a>
  )
}
```
The inventory page tabs: `?tab=stock-levels` (default), `?tab=stocktakes`, `?tab=history`.

### Pattern 2: Feature-Gated Server Action (DB check for mutations)
**What:** All inventory mutations call `requireFeature('inventory', { requireDbCheck: true })` before touching the DB. UI rendering reads JWT claim only.
**When to use:** Every server action in `src/actions/inventory/`.
**Example:**
```typescript
// Source: src/lib/requireFeature.ts (established pattern)
'use server'
import 'server-only'
import { requireFeature } from '@/lib/requireFeature'

export async function adjustStock(productId: string, formData: FormData) {
  const gate = await requireFeature('inventory', { requireDbCheck: true })
  if (!gate.authorized) return { error: 'feature_not_active' as const }
  // ... Zod parse, RPC call
}
```

### Pattern 3: SECURITY DEFINER RPC for Atomic Mutations
**What:** Stock adjustments and stocktake commit happen inside SECURITY DEFINER PostgreSQL functions that atomically UPDATE `products.stock_quantity` AND INSERT into `stock_adjustments`. Application code never does these as two separate operations.
**When to use:** `adjust_stock` RPC (STOCK-01, STOCK-02) and `complete_stocktake` RPC (TAKE-04).
**Why:** Prevents partial writes (stock decremented but no audit row, or vice versa). Consistent with how `complete_pos_sale` works.

### Pattern 4: Drawer (adapt ProductFormDrawer)
**What:** Fixed-position right drawer with backdrop, escape key close, dirty-state confirm. Header + scrollable form + footer with Save/Cancel.
**When to use:** `StockAdjustDrawer` for STOCK-01.
**Key props to adapt:**
```typescript
interface StockAdjustDrawerProps {
  product: { id: string; name: string; stock_quantity: number }
  onClose: () => void
  onSuccess: (newQuantity: number) => void
}
```
The drawer is triggered by the "Adjust stock" button on the product edit view (inside `ProductFormDrawer`, gated by `hasInventory && productType === 'physical'`).

### Pattern 5: Auto-Save for Stocktake Count Entry
**What:** Each count input change triggers a debounced server action call (~500ms debounce). Uses `useTransition` + `startTransition` to avoid blocking UI. Visual "Saving..." indicator per-row or page-level.
**When to use:** `StocktakeCountTab` — every input change in TAKE-02.
**Implementation guidance:**
```typescript
// useTransition for non-blocking auto-save
const [isPending, startTransition] = useTransition()

function handleCountChange(lineId: string, value: number) {
  setLocalCounts(prev => ({ ...prev, [lineId]: value }))
  // Debounce the server action
  clearTimeout(debounceRef.current[lineId])
  debounceRef.current[lineId] = setTimeout(() => {
    startTransition(async () => {
      await updateStocktakeLine(lineId, value)
    })
  }, 500)
}
```

### Pattern 6: Barcode Scanner Auto-Focus for Stocktake
**What:** `BarcodeScannerSheet` is rendered on the stocktake count page. On `onProductFound`, instead of adding to cart, find the matching line by `product_id` and scroll/focus its count input.
**When to use:** TAKE-05 in `StocktakeCountTab`.
**Key adaptation:** `onProductFound` callback scrolls to and focuses the matching row's `<input>` element using a `Map<string, HTMLInputElement>` ref keyed by product_id.

### Anti-Patterns to Avoid
- **Two-step stock mutation:** Never UPDATE `products.stock_quantity` in application code then separately INSERT into `stock_adjustments`. Always use the RPC. STOCK-02 requires every mutation be logged — two-step is a partial-write risk.
- **JWT-only auth on mutations:** All inventory mutations use `requireDbCheck: true`. JWT claims can be stale (token not yet refreshed after downgrade). Fast-path only for UI show/hide.
- **Mutable audit log:** `stock_adjustments` is append-only. No UPDATE or DELETE policies. The RLS policy allows INSERT only (not UPDATE/DELETE) for tenant rows.
- **Client-side variance calculation with stale data:** The Review tab must show variance based on `system_snapshot_quantity` captured when the stocktake session was created, not the current `products.stock_quantity`. Store the snapshot in `stocktake_lines.system_snapshot_quantity` at session creation time.
- **Stocktake commit as application loop:** Never loop over lines in a server action calling `adjustStock` N times. Use a single `complete_stocktake(p_session_id)` RPC that processes all lines atomically.

---

## Database Schema (Migration 025)

### New Tables

```sql
-- Append-only audit log for all stock mutations
CREATE TABLE public.stock_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id),
  product_id UUID NOT NULL REFERENCES public.products(id),
  reason TEXT NOT NULL CHECK (reason IN (
    'sale', 'refund', 'stocktake',
    'received', 'damaged', 'theft_shrinkage', 'correction', 'return_to_supplier', 'other'
  )),
  quantity_delta INTEGER NOT NULL,   -- positive = stock in, negative = stock out
  quantity_after INTEGER NOT NULL,   -- snapshot of stock_quantity after this adjustment
  notes TEXT,
  order_id UUID REFERENCES public.orders(id),      -- populated for sale/refund reasons
  stocktake_session_id UUID,                        -- populated for stocktake reason (FK added after table creation)
  staff_id UUID REFERENCES public.staff(id),        -- who triggered it (NULL for automated)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Stocktake sessions
CREATE TABLE public.stocktake_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id),
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'committed', 'discarded')),
  scope TEXT NOT NULL DEFAULT 'full' CHECK (scope IN ('full', 'category')),
  category_id UUID REFERENCES public.categories(id),  -- populated when scope='category'
  created_by UUID REFERENCES public.staff(id),
  committed_at TIMESTAMPTZ,
  discarded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One line per product in the stocktake scope
CREATE TABLE public.stocktake_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stocktake_session_id UUID NOT NULL REFERENCES public.stocktake_sessions(id),
  store_id UUID NOT NULL REFERENCES public.stores(id),
  product_id UUID NOT NULL REFERENCES public.products(id),
  system_snapshot_quantity INTEGER NOT NULL,   -- stock_quantity at session creation time (D-07)
  counted_quantity INTEGER,                     -- NULL until admin enters a count
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(stocktake_session_id, product_id)
);

-- FK back-reference after both tables exist
ALTER TABLE public.stock_adjustments
  ADD CONSTRAINT fk_stocktake_session
  FOREIGN KEY (stocktake_session_id) REFERENCES public.stocktake_sessions(id);
```

### Indexes
```sql
CREATE INDEX idx_stock_adj_store ON public.stock_adjustments(store_id);
CREATE INDEX idx_stock_adj_product ON public.stock_adjustments(store_id, product_id);
CREATE INDEX idx_stock_adj_created ON public.stock_adjustments(store_id, created_at);
CREATE INDEX idx_stock_adj_reason ON public.stock_adjustments(store_id, reason);
CREATE INDEX idx_stocktake_store ON public.stocktake_sessions(store_id);
CREATE INDEX idx_stocktake_status ON public.stocktake_sessions(store_id, status);
CREATE INDEX idx_stocktake_lines_session ON public.stocktake_lines(stocktake_session_id);
CREATE INDEX idx_stocktake_lines_product ON public.stocktake_lines(store_id, product_id);
```

### RLS Policies
```sql
-- stock_adjustments: tenant INSERT only (append-only — no UPDATE/DELETE for tenants)
ALTER TABLE public.stock_adjustments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_insert" ON public.stock_adjustments
  FOR INSERT WITH CHECK (store_id = (auth.jwt() -> 'app_metadata' ->> 'store_id')::UUID);
CREATE POLICY "tenant_select" ON public.stock_adjustments
  FOR SELECT USING (store_id = (auth.jwt() -> 'app_metadata' ->> 'store_id')::UUID);
-- NOTE: No UPDATE or DELETE policies — intentional, audit log is immutable

-- stocktake_sessions + stocktake_lines: standard tenant isolation
ALTER TABLE public.stocktake_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON public.stocktake_sessions
  FOR ALL USING (store_id = (auth.jwt() -> 'app_metadata' ->> 'store_id')::UUID);

ALTER TABLE public.stocktake_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON public.stocktake_lines
  FOR ALL USING (store_id = (auth.jwt() -> 'app_metadata' ->> 'store_id')::UUID);
```

### SECURITY DEFINER RPCs

**adjust_stock** — called by `adjustStock` server action (STOCK-01, STOCK-02):
```sql
CREATE OR REPLACE FUNCTION adjust_stock(
  p_store_id UUID,
  p_product_id UUID,
  p_quantity_delta INTEGER,    -- positive or negative
  p_reason TEXT,
  p_notes TEXT DEFAULT NULL,
  p_staff_id UUID DEFAULT NULL,
  p_order_id UUID DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_current_stock INTEGER;
  v_new_stock INTEGER;
BEGIN
  SELECT stock_quantity INTO v_current_stock
  FROM products
  WHERE id = p_product_id AND store_id = p_store_id AND product_type = 'physical'
  FOR UPDATE;

  IF v_current_stock IS NULL THEN
    RAISE EXCEPTION 'PRODUCT_NOT_FOUND:%', p_product_id;
  END IF;

  v_new_stock := v_current_stock + p_quantity_delta;

  -- Prevent stock going below 0 for manual adjustments (system can go negative via absolute set)
  -- For absolute set: quantity_delta = target - current, no floor check needed

  UPDATE products
  SET stock_quantity = v_new_stock, updated_at = now()
  WHERE id = p_product_id AND store_id = p_store_id;

  INSERT INTO stock_adjustments (
    store_id, product_id, reason, quantity_delta, quantity_after,
    notes, staff_id, order_id
  ) VALUES (
    p_store_id, p_product_id, p_reason, p_quantity_delta, v_new_stock,
    p_notes, p_staff_id, p_order_id
  );

  RETURN jsonb_build_object('new_quantity', v_new_stock);
END;
$$;
```

**complete_stocktake** — called by `commitStocktake` server action (TAKE-04):
```sql
CREATE OR REPLACE FUNCTION complete_stocktake(
  p_session_id UUID,
  p_store_id UUID,
  p_staff_id UUID DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_line RECORD;
  v_delta INTEGER;
  v_new_stock INTEGER;
  v_lines_committed INTEGER := 0;
BEGIN
  -- Verify session exists, belongs to store, is in_progress
  IF NOT EXISTS (
    SELECT 1 FROM stocktake_sessions
    WHERE id = p_session_id AND store_id = p_store_id AND status = 'in_progress'
  ) THEN
    RAISE EXCEPTION 'INVALID_SESSION:%', p_session_id;
  END IF;

  -- Process only lines where counted_quantity IS NOT NULL (lines with actual counts)
  FOR v_line IN
    SELECT * FROM stocktake_lines
    WHERE stocktake_session_id = p_session_id
      AND counted_quantity IS NOT NULL
    FOR UPDATE
  LOOP
    v_delta := v_line.counted_quantity - v_line.system_snapshot_quantity;

    -- Only write adjustments for lines with variance (delta != 0)
    -- Always update stock to counted quantity regardless
    SELECT stock_quantity INTO v_new_stock
    FROM products WHERE id = v_line.product_id AND store_id = p_store_id;

    -- Set stock to counted quantity (not delta from current — from snapshot)
    -- Use delta = counted - CURRENT stock to reconcile
    v_delta := v_line.counted_quantity - v_new_stock;

    UPDATE products
    SET stock_quantity = v_line.counted_quantity, updated_at = now()
    WHERE id = v_line.product_id AND store_id = p_store_id;

    INSERT INTO stock_adjustments (
      store_id, product_id, reason, quantity_delta, quantity_after,
      stocktake_session_id, staff_id
    ) VALUES (
      p_store_id, v_line.product_id, 'stocktake', v_delta, v_line.counted_quantity,
      p_session_id, p_staff_id
    );

    v_lines_committed := v_lines_committed + 1;
  END LOOP;

  -- Mark session committed
  UPDATE stocktake_sessions
  SET status = 'committed', committed_at = now(), updated_at = now()
  WHERE id = p_session_id AND store_id = p_store_id;

  RETURN jsonb_build_object('lines_committed', v_lines_committed);
END;
$$;
```

### Sale/Refund RPC Updates (STOCK-02)
The existing `complete_pos_sale` and `complete_online_sale` RPCs must be updated to INSERT into `stock_adjustments` when they decrement stock. Same pattern as Phase 21's rewrite — full `CREATE OR REPLACE` preserving the exact signature. Add one INSERT after each stock decrement:
```sql
INSERT INTO stock_adjustments (store_id, product_id, reason, quantity_delta, quantity_after, order_id)
VALUES (p_store_id, (v_item->>'product_id')::UUID, 'sale',
        -(v_item->>'quantity')::INTEGER,
        (SELECT stock_quantity FROM products WHERE id = (v_item->>'product_id')::UUID),
        v_order_id);
```
Similar INSERT needed in refund action (currently in application code — `processRefund.ts` / `processPartialRefund.ts`) for the `refund` reason.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Atomic stock mutation + audit row | Two separate DB calls in server action | `adjust_stock` SECURITY DEFINER RPC | Race condition if two calls; partial write risk |
| Barcode scanning in stocktake | New camera component | `BarcodeScannerSheet` + `lookupBarcode` | Already production-quality with consensus buffer, manual fallback, iOS audio |
| Drawer UI | New drawer from scratch | Adapt `ProductFormDrawer` pattern | Established dirty-state handling, backdrop, escape key, discard confirm |
| Tab navigation | New tab component library | `TabButton` from `ReportsPageClient` (copy/adapt) | URL-based, zero extra deps, SSR-compatible |
| Reason code validation | Custom string checks | Zod enum + DB CHECK constraint | Type-safe + DB enforced; validated at both layers |
| Stocktake variance calculation | Complex server logic | `counted_quantity - system_snapshot_quantity` client-side | Simple subtraction; snapshot captured at session creation |

---

## Common Pitfalls

### Pitfall 1: System snapshot vs current quantity in stocktake
**What goes wrong:** When the admin is counting stock and a sale happens, `products.stock_quantity` changes. If the Review tab shows `counted - current` instead of `counted - snapshot`, the variance is wrong.
**Why it happens:** Forgetting that stock can change between session creation and commit.
**How to avoid:** Store `system_snapshot_quantity` in `stocktake_lines` at session creation time (already in schema above). Review tab reads `counted_quantity - system_snapshot_quantity`. The commit RPC reconciles to counted qty.
**Warning signs:** Variance numbers change between page refreshes before committing.

### Pitfall 2: Migration 025 must update BOTH sale RPCs
**What goes wrong:** `complete_pos_sale` is updated to INSERT into `stock_adjustments`, but `complete_online_sale` is missed. Online sales have no audit trail.
**Why it happens:** Two separate RPCs maintain the same logic.
**How to avoid:** STOCK-02 success criteria says "all stock mutations" — checklist: `complete_pos_sale`, `complete_online_sale`, `adjust_stock` RPC, `complete_stocktake` RPC. Four mutation paths, all must log.
**Warning signs:** History tab shows manual adjustments but no sale entries.

### Pitfall 3: Refund actions are in application code, not RPCs
**What goes wrong:** `processRefund.ts` and `processPartialRefund.ts` call Supabase client directly to restore stock. They are not RPCs. Adding audit logging requires updating these server actions, not a migration.
**Why it happens:** Refunds were built as server actions before the RPC-for-mutations convention.
**How to avoid:** In migration 025, create an `adjust_stock` RPC that can be called from refund server actions. Update `processRefund.ts` and `processPartialRefund.ts` to call the RPC for the stock restore step.
**Warning signs:** Checking: `src/actions/orders/processRefund.ts` — confirm it's a server action doing direct Supabase update.

### Pitfall 4: AdminSidebar is a static nav array
**What goes wrong:** New "Inventory" link is missed or added without feature gating.
**Why it happens:** `AdminSidebar` has a hardcoded `navLinks` array (not dynamic).
**How to avoid:** Pass `hasInventory` prop to `AdminSidebar` from `AdminLayout`. Conditionally include the Inventory link. AdminLayout already reads `user?.app_metadata?.inventory` for other purposes (see reports page pattern).
**Warning signs:** Inventory link shows for all stores, including free-tier stores without the add-on.

### Pitfall 5: Supabase RLS blocks SECURITY DEFINER RPCs
**What goes wrong:** `adjust_stock` RPC fails with permission error because `stock_adjustments` table has RLS enabled but the RPC tries to INSERT as the calling user (who may lack INSERT rights via RLS).
**Why it happens:** SECURITY DEFINER runs as the function owner (postgres/supabase role), which bypasses RLS. However, the GRANT on the function must exist.
**How to avoid:** Add `GRANT EXECUTE ON FUNCTION adjust_stock TO authenticated, anon;` in the migration. The `SECURITY DEFINER` + proper GRANT pattern is already established in migrations 009–021. Follow the same grant pattern.
**Warning signs:** RPC returns permission denied in Supabase logs.

### Pitfall 6: Auto-save creates too many server action calls
**What goes wrong:** Stocktake count tab calls `updateStocktakeLine` on every keystroke for a store with 200 products. Rapid typing causes server action backlog.
**Why it happens:** No debounce or optimistic UI.
**How to avoid:** Debounce at 500ms minimum. Keep local state as source of truth for the input value. Only fire the server action after the debounce window. Use `useTransition` so the pending state doesn't block typing.
**Warning signs:** Count inputs feel laggy; network tab shows hundreds of requests.

### Pitfall 7: Stocktake commit with uncounted lines
**What goes wrong:** Admin creates a 200-product stocktake, counts only 50, and hits Commit. The other 150 lines have `counted_quantity = NULL`.
**Why it happens:** The commit RPC processes all lines, but NULL lines are ambiguous — do they mean "0 counted" or "not counted yet"?
**How to avoid:** The `complete_stocktake` RPC above only processes lines where `counted_quantity IS NOT NULL`. Stock for uncounted products is NOT touched. Show a warning in the Review tab: "X products not counted — they will not be adjusted." This is the correct UX — partial stocktakes are valid.
**Warning signs:** Accidental stock-zeroing of uncounted products.

---

## Code Examples

### Adjustment mode toggle (D-04: "Adjust by" / "Set to")
```typescript
// Source: established pattern — D-04 decision
type AdjustMode = 'delta' | 'absolute'

const [mode, setMode] = useState<AdjustMode>('delta')
const [value, setValue] = useState<number>(0)

// When calling the server action:
const quantityDelta = mode === 'delta'
  ? value                              // e.g. +5 or -3
  : value - product.stock_quantity     // e.g. set to 10 when current is 7 → delta = +3
```

### Reason code enum (D-12, D-13, D-14)
```typescript
// Source: src/schemas/inventory.ts (to be created)
import { z } from 'zod'

export const MANUAL_REASON_CODES = [
  'received', 'damaged', 'theft_shrinkage', 'correction', 'return_to_supplier', 'other'
] as const

export const SYSTEM_REASON_CODES = ['sale', 'refund', 'stocktake'] as const

export const ALL_REASON_CODES = [...MANUAL_REASON_CODES, ...SYSTEM_REASON_CODES] as const

export type ManualReasonCode = typeof MANUAL_REASON_CODES[number]
export type ReasonCode = typeof ALL_REASON_CODES[number]

export const AdjustStockSchema = z.object({
  product_id: z.string().uuid(),
  quantity_delta: z.number().int(),
  reason: z.enum(MANUAL_REASON_CODES),
  notes: z.string().max(500).optional(),
})
```

### History filter query pattern
```typescript
// Source: established Supabase filter pattern in this codebase
let query = supabase
  .from('stock_adjustments')
  .select('*, products(name, sku)')
  .eq('store_id', storeId)
  .order('created_at', { ascending: false })
  .limit(100)

if (productId) query = query.eq('product_id', productId)
if (fromDate) query = query.gte('created_at', fromDate)
if (toDate) query = query.lte('created_at', toDate)
if (reason) query = query.eq('reason', reason)
```

### AdminSidebar with inventory gate
```typescript
// Pattern: pass hasInventory from AdminLayout (reads JWT claim)
// Inventory nav item only rendered when hasInventory === true
const navLinks = [
  { href: '/admin/dashboard', label: 'Dashboard' },
  { href: '/admin/products', label: 'Products' },
  // ... other links
]

// Conditional inventory link — pass alongside userEmail prop
interface AdminSidebarProps {
  userEmail?: string | null
  hasInventory?: boolean  // NEW prop
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| updateProduct sets stock directly | `adjustStock` RPC creates audit row atomically | Phase 22 (this phase) | Once 025 migration runs, direct stock edits on products table still work but bypass audit trail — product form stock_quantity field should be removed or made read-only for inventory stores |
| No stock audit trail | `stock_adjustments` append-only table | Phase 22 (this phase) | Historical context now available; reports can query it |

**Note on ProductFormDrawer stock field:** The existing `ProductFormDrawer` shows a `stock_quantity` number input for inventory stores. Once Phase 22 ships, directly editing `stock_quantity` via the product form would bypass the audit trail. The stock field in `ProductFormDrawer` should become read-only (display-only) for physical products when `hasInventory` is true — with a note: "Use Adjust Stock to change stock." This is a small but important correctness fix to scope into Phase 22.

---

## Open Questions

1. **Refund server actions and the RPC boundary**
   - What we know: `processRefund.ts` and `processPartialRefund.ts` restore stock via direct Supabase client calls
   - What's unclear: Whether to wrap the stock restore in the `adjust_stock` RPC call or add a separate lightweight `log_refund_stock` helper
   - Recommendation: Call `adjust_stock` RPC from refund server actions for the stock restore step. This keeps all stock mutations going through the same RPC and audit trail.

2. **LowStockAlertList on dashboard — STOCK-04**
   - What we know: `LowStockAlertList` component exists in `src/components/admin/dashboard/LowStockAlertList.tsx`. The dashboard page already reads `hasInventory` from JWT.
   - What's unclear: STOCK-04 says "low-stock alerts visible only when inventory add-on is active" — the component exists but need to verify it's conditionally shown in `dashboard/page.tsx`
   - Recommendation: Verify in the plan and add conditional render if missing. Likely a minor task.

3. **ProductFormDrawer stock_quantity field — read-only for Phase 22?**
   - What we know: The field exists and sets `stock_quantity` directly via `updateProduct` which does NOT create an audit row
   - What's unclear: Whether Phase 22 should make it read-only (showing current qty only) or if that's deferred
   - Recommendation: Make the stock_quantity field in `ProductFormDrawer` read-only (display) for physical products when `hasInventory === true`. Small scope addition that prevents accidental audit bypass.

---

## Environment Availability

Step 2.6: SKIPPED — Phase 22 is code/config changes + DB migration. No external service dependencies beyond the existing Supabase project already confirmed in prior phases.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 2.x/3.x |
| Config file | `vitest.config.mts` (project root) |
| Quick run command | `npx vitest run src/actions/inventory` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| STOCK-01 | `adjustStock` validates input, calls RPC, returns new quantity | unit | `npx vitest run src/actions/inventory/__tests__/adjustStock.test.ts -x` | ❌ Wave 0 |
| STOCK-02 | Adjustment rows created for sale, refund, manual, stocktake | unit (mocked RPC) | `npx vitest run src/actions/inventory/__tests__/adjustStock.test.ts -x` | ❌ Wave 0 |
| STOCK-03 | History query applies filters correctly | unit | `npx vitest run src/actions/inventory/__tests__/getAdjustmentHistory.test.ts -x` | ❌ Wave 0 |
| STOCK-04 | Low-stock alert component renders conditionally | manual-only | — | — |
| STOCK-05 | Stock levels query returns physical products only | unit | Covered by STOCK-01 test file | ❌ Wave 0 |
| TAKE-01 | `createStocktakeSession` creates session + lines with snapshot qty | unit | `npx vitest run src/actions/inventory/__tests__/createStocktakeSession.test.ts -x` | ❌ Wave 0 |
| TAKE-02 | `updateStocktakeLine` validates and saves counted qty | unit | `npx vitest run src/actions/inventory/__tests__/updateStocktakeLine.test.ts -x` | ❌ Wave 0 |
| TAKE-03 | Variance = counted - system_snapshot; correct for positive/negative/zero | unit | `npx vitest run src/schemas/__tests__/inventory.test.ts -x` | ❌ Wave 0 |
| TAKE-04 | `commitStocktake` rejects non-in_progress sessions; processes only counted lines | unit | `npx vitest run src/actions/inventory/__tests__/commitStocktake.test.ts -x` | ❌ Wave 0 |
| TAKE-05 | Barcode lookup integration in stocktake | manual-only | — | — |

### Sampling Rate
- **Per task commit:** `npx vitest run src/actions/inventory`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/actions/inventory/__tests__/adjustStock.test.ts` — covers STOCK-01, STOCK-02
- [ ] `src/actions/inventory/__tests__/createStocktakeSession.test.ts` — covers TAKE-01
- [ ] `src/actions/inventory/__tests__/updateStocktakeLine.test.ts` — covers TAKE-02
- [ ] `src/actions/inventory/__tests__/commitStocktake.test.ts` — covers TAKE-04
- [ ] `src/actions/inventory/__tests__/getAdjustmentHistory.test.ts` — covers STOCK-03
- [ ] `src/schemas/__tests__/inventory.test.ts` — covers reason code enum, variance calculation helpers (TAKE-03)

---

## Project Constraints (from CLAUDE.md)

All of these apply to Phase 22 implementation:

| Directive | Applies To |
|-----------|-----------|
| Use Next.js App Router + Supabase + Stripe + Tailwind v4. Non-negotiable. | All new files |
| No Prisma, no Redux/Zustand, no NextAuth/Clerk, no CSS Modules | Do not introduce |
| GST 15% tax-inclusive. IRD-compliant. | Not directly relevant to stock, but note GST on order_items is used in sale/refund audit entries |
| `@supabase/ssr` not `@supabase/auth-helpers-nextjs` | All server clients |
| Every Server Action must validate inputs with `z.safeParse()` before touching DB | All `src/actions/inventory/` files |
| `server-only` import in any file with Supabase credentials, session logic, or Server Actions | All `src/actions/inventory/` files |
| Use Vitest + RTL for unit tests, Playwright for E2E | Test files |
| Read DESIGN.md before making visual/UI decisions | All new components |
| Do not use Tailwind v3 config patterns (no `tailwind.config.js`) | CSS utility usage |
| Use `requireFeature('inventory', { requireDbCheck: true })` for critical mutations | All inventory server actions |
| All stock mutations through SECURITY DEFINER RPCs — no application-layer loops | `adjustStock`, `commitStocktake` |

---

## Sources

### Primary (HIGH confidence)
- `supabase/migrations/024_service_product_type.sql` — current RPC structure for complete_pos_sale and complete_online_sale; auth hook; store_plans columns
- `src/lib/requireFeature.ts` — exact feature gating API
- `src/config/addons.ts` — SubscriptionFeature type with 'inventory' already registered
- `src/components/admin/products/ProductFormDrawer.tsx` — canonical drawer pattern
- `src/components/pos/BarcodeScannerSheet.tsx` — barcode scanner component (reuse as-is)
- `src/components/admin/reports/ReportsPageClient.tsx` — tab navigation pattern (TabButton)
- `src/components/admin/AdminSidebar.tsx` — nav structure to extend
- `supabase/migrations/001_initial_schema.sql` — products table structure with stock_quantity
- `.planning/phases/22-inventory-add-on-core/22-CONTEXT.md` — all locked decisions

### Secondary (MEDIUM confidence)
- PostgreSQL SECURITY DEFINER + SELECT FOR UPDATE pattern: consistent with existing RPCs in 005/006/010/024 — HIGH confidence by code inspection
- RLS append-only pattern (INSERT without UPDATE/DELETE): established pattern in 002/015 migrations

### Tertiary (LOW confidence)
- None — all findings are from direct codebase inspection or established project decisions

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already in project, no new dependencies
- Architecture: HIGH — directly adapted from existing patterns in codebase
- Database schema: HIGH — follows exact conventions from migrations 001–024
- Pitfalls: HIGH — identified from direct code inspection of RPCs and server actions
- Test gaps: HIGH — test infrastructure confirmed working; specific test files are new (Wave 0)

**Research date:** 2026-04-04
**Valid until:** 2026-05-04 (stable stack, no fast-moving dependencies)
