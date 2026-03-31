# Phase 3: POS Checkout - Research

**Researched:** 2026-04-01
**Domain:** POS checkout UI, cart state, atomic stock decrement, EFTPOS confirmation, GST distribution, split payment
**Confidence:** HIGH (project codebase fully read, decisions locked in CONTEXT.md, existing patterns verified)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Persistent search bar above the product grid. Filters products by name or SKU as staff types.
- **D-02:** Re-tapping a product already in cart increments its quantity by 1.
- **D-03:** SKU quick-entry text field available alongside the search bar.
- **D-04:** "All" category shown by default (no filter). Tapping a category filters the grid.
- **D-05:** No discount cap or approval step. Staff can apply any discount amount.
- **D-06:** Both per-line and whole-cart discounts supported.
- **D-07:** Discount reason is optional. Dropdown: Staff / Damaged / Loyalty / Other.
- **D-08:** Whole-cart discount GST distribution is Claude's discretion — must be IRD-compliant (pro-rata by line total is expected).
- **D-09:** After sale completes, show full-screen sale summary with items, total, payment method, sale ID. Staff taps "New Sale" to reset.
- **D-10:** Cash payment requires staff to enter amount tendered. POS calculates and displays change due.
- **D-11:** Split payments supported (cash + EFTPOS). Split UX is Claude's discretion.
- **D-12:** Out-of-stock override requires owner PIN.
- **D-13:** Exact stock count on product cards. Color coding: green (in stock), amber (low stock ≤ reorder threshold), red (out of stock).
- **D-14:** Stock data auto-refreshes after each completed sale (revalidatePath) AND on page/tab focus (visibilitychange).
- **D-15:** Atomic stock decrement with conflict detection. Uses Supabase RPC with stock check inside transaction. Second sale fails with "Out of stock" if stock exhausted.

### Claude's Discretion

- Cart state management approach (React state vs localStorage persistence)
- Whole-cart discount GST distribution method (must be IRD-compliant)
- Split payment UI approach (sequential entry vs side-by-side fields)
- Product grid empty state
- Cart empty state design
- Keyboard/numpad behavior for quantity and discount inputs on iPad

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| POS-01 | Staff sees product grid with images, categories, and search on iPad | Component inventory in UI-SPEC, product query pattern from existing DB schema |
| POS-02 | Staff can tap products to add to cart, adjust quantities | Cart state machine documented in UI-SPEC; React useState pattern confirmed |
| POS-03 | Staff can apply percentage or fixed-amount discounts per line item | `calcLineItem` in gst.ts ready; discount_cents field in OrderItemSchema confirmed |
| POS-04 | Cart shows subtotal, GST breakdown (per-line on discounted amounts), and total | `calcOrderGST` in gst.ts; per-line pattern verified; whole-cart distribution algorithm documented below |
| POS-05 | Staff selects payment method (EFTPOS or cash) | Split payment pattern researched; cash tendered + change calculation documented |
| POS-06 | EFTPOS confirmation step — Yes completes sale, No voids | Full-screen overlay pattern from UI-SPEC; state machine confirmed |
| POS-07 | Completed sale atomically decrements stock and creates order record | Supabase RPC pattern documented; migration required (005_pos_rpc.sql) |
| POS-08 | POS re-fetches stock after each sale and on page focus | `revalidatePath` + `visibilitychange` + `router.refresh()` pattern documented |
| POS-09 | Out-of-stock warning displayed, owner can override | Owner PIN re-verification pattern; `verifyStaffPin` already exists |
| DISC-03 | POS staff can apply manual discounts with reason (staff, damaged, loyalty) | Reason dropdown values confirmed; optional field pattern documented |
| DISC-04 | GST recalculates correctly on discounted line items | `calcLineItem(unitPrice, qty, discountCents)` already tested and correct |
</phase_requirements>

---

## Summary

Phase 3 builds on a solid foundation: all monetary types (integer cents), GST functions, Zod schemas, and auth patterns already exist and are tested. The POS page (`src/app/(pos)/pos/page.tsx`) is currently a placeholder. The POS layout already enforces iPad viewport locking (`user-scalable=no`, `touch-manipulation`). The UI-SPEC (`03-UI-SPEC.md`) is complete and signed-off — it defines every component, layout measurement, copy string, and interaction contract.

The three technically hard problems are: (1) atomic stock decrement via Supabase RPC with a stock-check inside the transaction, (2) correct whole-cart GST pro-rata distribution when a whole-cart discount is applied, and (3) staff_session JWT extraction in Server Actions (since the POS does not use Supabase Auth — it uses a custom jose JWT in an httpOnly cookie). The admin client (service role key) must be used for all POS Server Actions that write orders, because the staff_session JWT is not a Supabase JWT and will not satisfy RLS policies.

**Primary recommendation:** Build all 15 POS components per the UI-SPEC component inventory, wire them to a single React `useReducer` cart, and gate every sale write behind a new Supabase RPC `complete_pos_sale` that atomically decrements stock and inserts the order + line items in one transaction.

---

## Standard Stack

### Core (all already installed — no new packages required)

| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| Next.js | 16.2.1 | App Router, Server Actions, `revalidatePath` | Already installed |
| React | 19.2.4 | `useReducer` for cart state, `useEffect` for focus listener | Already installed |
| Supabase JS | ^2.101.1 | Product queries, RPC call for atomic sale | Already installed |
| Zod | ^4.3.6 | Input validation on `completeSale` Server Action | Already installed |
| jose | ^6.2.2 | Staff JWT decode in Server Actions | Already installed |
| lucide-react | (existing) | Icons (minus, plus, x, check, alert) | Established in Phase 1/2 |
| Tailwind CSS | 4.2 | All styling via existing `@theme` tokens | Already installed |

No new dependencies. Zero new installs needed.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `useReducer` for cart | `useState` with helpers | `useReducer` is more maintainable for complex cart transitions (discounts, splits, EFTPOS state). Recommended. |
| `useReducer` for cart | Zustand | Zustand acceptable per CLAUDE.md only if cart state becomes complex. `useReducer` is sufficient. |
| Admin client in Server Action | RLS-authenticated client | Staff JWT is not a Supabase JWT — cannot pass RLS. Admin client (service role) is required for POS writes. |
| Supabase RPC | Two sequential queries | Sequential queries create a TOCTOU race condition on stock. RPC is mandatory for atomicity. |

---

## Architecture Patterns

### Project Structure for This Phase

```
src/
├── app/(pos)/pos/
│   └── page.tsx               # Replace placeholder — Server Component fetches products + categories
├── components/pos/             # All 15 new POS components (per UI-SPEC)
│   ├── POSLayout.tsx
│   ├── POSTopBar.tsx
│   ├── CategoryFilterBar.tsx
│   ├── ProductGrid.tsx
│   ├── ProductCard.tsx
│   ├── StockBadge.tsx
│   ├── CartPanel.tsx
│   ├── CartLineItem.tsx
│   ├── QuantityControl.tsx
│   ├── CartSummary.tsx
│   ├── PaymentMethodToggle.tsx
│   ├── PayButton.tsx
│   ├── DiscountSheet.tsx
│   ├── EftposConfirmScreen.tsx
│   └── OutOfStockDialog.tsx
├── actions/orders/
│   └── completeSale.ts        # New Server Action — validates + calls RPC
├── lib/
│   └── cart.ts                # Cart reducer, types, and GST calculation helpers
└── supabase/migrations/
    └── 005_pos_rpc.sql        # New migration: complete_pos_sale RPC function
```

### Pattern 1: Staff JWT Extraction in Server Actions

The POS uses a custom `staff_session` httpOnly cookie containing a jose JWT (not a Supabase JWT). Server Actions for the POS must extract staff identity from this cookie, not from `supabase.auth.getUser()`.

```typescript
// src/actions/orders/completeSale.ts
'use server'
import { jwtVerify } from 'jose'
import { cookies } from 'next/headers'

const secret = new TextEncoder().encode(process.env.STAFF_JWT_SECRET!)

async function getStaffSession() {
  const cookieStore = await cookies()
  const token = cookieStore.get('staff_session')?.value
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, secret)
    return payload as { role: string; store_id: string; staff_id: string }
  } catch {
    return null
  }
}
```

**Why:** The admin client (`SUPABASE_SERVICE_ROLE_KEY`) bypasses RLS entirely. POS Server Actions that write orders must use the admin client, because the staff_session JWT is not recognized by Supabase Auth RLS policies. The `store_id` and `staff_id` must be extracted from the verified JWT and injected explicitly into every DB insert.

### Pattern 2: Atomic Stock Decrement via Supabase RPC

The entire sale (order insert + order_items insert + stock decrement) must happen in a single Postgres transaction with a stock check. This prevents the race condition where two tablets sell the last item simultaneously.

```sql
-- supabase/migrations/005_pos_rpc.sql
CREATE OR REPLACE FUNCTION complete_pos_sale(
  p_store_id UUID,
  p_staff_id UUID,
  p_payment_method TEXT,
  p_subtotal_cents INTEGER,
  p_gst_cents INTEGER,
  p_total_cents INTEGER,
  p_discount_cents INTEGER,
  p_items JSONB   -- array of {product_id, product_name, unit_price_cents, quantity, discount_cents, line_total_cents, gst_cents}
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order_id UUID;
  v_item JSONB;
  v_current_stock INTEGER;
BEGIN
  -- 1. Check stock for all items atomically (SELECT FOR UPDATE locks rows)
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    SELECT stock_quantity INTO v_current_stock
    FROM products
    WHERE id = (v_item->>'product_id')::UUID
      AND store_id = p_store_id
    FOR UPDATE;

    IF v_current_stock IS NULL THEN
      RAISE EXCEPTION 'PRODUCT_NOT_FOUND:%', v_item->>'product_id';
    END IF;

    IF v_current_stock < (v_item->>'quantity')::INTEGER THEN
      RAISE EXCEPTION 'OUT_OF_STOCK:%', v_item->>'product_id';
    END IF;
  END LOOP;

  -- 2. Insert order
  INSERT INTO orders (store_id, staff_id, channel, status, payment_method,
    subtotal_cents, gst_cents, total_cents, discount_cents)
  VALUES (p_store_id, p_staff_id, 'pos', 'completed', p_payment_method,
    p_subtotal_cents, p_gst_cents, p_total_cents, p_discount_cents)
  RETURNING id INTO v_order_id;

  -- 3. Insert order items + decrement stock
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO order_items (order_id, store_id, product_id, product_name,
      unit_price_cents, quantity, discount_cents, line_total_cents, gst_cents)
    VALUES (v_order_id, p_store_id,
      (v_item->>'product_id')::UUID,
      v_item->>'product_name',
      (v_item->>'unit_price_cents')::INTEGER,
      (v_item->>'quantity')::INTEGER,
      (v_item->>'discount_cents')::INTEGER,
      (v_item->>'line_total_cents')::INTEGER,
      (v_item->>'gst_cents')::INTEGER);

    UPDATE products
    SET stock_quantity = stock_quantity - (v_item->>'quantity')::INTEGER
    WHERE id = (v_item->>'product_id')::UUID
      AND store_id = p_store_id;
  END LOOP;

  RETURN jsonb_build_object('order_id', v_order_id);
END;
$$;
```

**Key:** `SECURITY DEFINER` allows the function to run with the definer's privileges (bypassing RLS), which is necessary because the admin client is calling it with service role. Alternatively, call the RPC from the admin client directly — both work. Use `RAISE EXCEPTION` with structured error codes so the Server Action can parse them.

### Pattern 3: Cart State with useReducer

The cart has a defined state machine (from UI-SPEC). `useReducer` is the right tool.

```typescript
// src/lib/cart.ts
export type CartItem = {
  productId: string
  productName: string
  unitPriceCents: number
  quantity: number
  discountCents: number        // per-line discount
  discountReason?: string
  lineTotalCents: number       // unitPrice * qty - discount
  gstCents: number             // calcLineItem result
}

export type CartState = {
  items: CartItem[]
  paymentMethod: 'eftpos' | 'cash' | null
  cashTenderedCents: number | null
  cartDiscountCents: number    // whole-cart discount (applied pro-rata)
  cartDiscountType: 'percentage' | 'fixed' | null
  phase: 'idle' | 'eftpos_confirm' | 'cash_entry' | 'sale_complete' | 'sale_void'
  completedOrderId: string | null
}

export type CartAction =
  | { type: 'ADD_PRODUCT'; product: ProductRow }
  | { type: 'SET_QUANTITY'; productId: string; quantity: number }
  | { type: 'REMOVE_ITEM'; productId: string }
  | { type: 'APPLY_LINE_DISCOUNT'; productId: string; discountCents: number; reason?: string }
  | { type: 'APPLY_CART_DISCOUNT'; discountCents: number; discountType: 'percentage' | 'fixed' }
  | { type: 'SET_PAYMENT_METHOD'; method: 'eftpos' | 'cash' }
  | { type: 'SET_CASH_TENDERED'; cents: number }
  | { type: 'INITIATE_PAYMENT' }
  | { type: 'CONFIRM_EFTPOS' }
  | { type: 'VOID_SALE' }
  | { type: 'SALE_COMPLETE'; orderId: string }
  | { type: 'NEW_SALE' }
```

**Recommendation:** Keep cart in `useState`/`useReducer` only (no localStorage). iPad POS is single-session; persistence across page reloads is not required and adds complexity. The page is fullscreen and rarely closed mid-sale.

### Pattern 4: Whole-Cart Discount GST Distribution (IRD-Compliant)

When a whole-cart discount is applied (D-06, D-08), it must be distributed pro-rata across line items before GST recalculation. This is the IRD-compliant approach.

```typescript
// Pro-rata distribution algorithm
function applyCartDiscount(items: CartItem[], cartDiscountCents: number): CartItem[] {
  const totalBeforeDiscount = items.reduce((sum, i) => sum + i.unitPriceCents * i.quantity, 0)

  return items.map((item, index, arr) => {
    const lineShare = (item.unitPriceCents * item.quantity) / totalBeforeDiscount
    // Assign rounding remainder to the last item
    const isLast = index === arr.length - 1
    const allocatedDiscount = isLast
      ? cartDiscountCents - arr.slice(0, -1).reduce((s, _, i2) => {
          const share = (arr[i2].unitPriceCents * arr[i2].quantity) / totalBeforeDiscount
          return s + Math.floor(cartDiscountCents * share)
        }, 0)
      : Math.floor(cartDiscountCents * lineShare)

    const totalLineDiscount = item.discountCents + allocatedDiscount
    const { lineTotal, gst } = calcLineItem(item.unitPriceCents, item.quantity, totalLineDiscount)
    return { ...item, lineTotalCents: lineTotal, gstCents: gst }
  })
}
```

**Why pro-rata:** IRD expects GST to be calculated on the actual amount charged per line. Distributing the discount pro-rata and recalculating per-line GST is equivalent to the per-item discount pattern already used in Phase 1 (D-09 in Phase 1 CONTEXT). This satisfies DISC-04.

**Rounding:** Use `Math.floor` for all allocations except the last item, which absorbs the remainder. This ensures `sum(allocatedDiscounts) === cartDiscountCents` exactly.

### Pattern 5: Stock Refresh on Page Focus (POS-08)

`revalidatePath` is server-side. To trigger it on `visibilitychange`, the client must call `router.refresh()` which re-runs Server Component data fetching.

```typescript
// In the POS root Client Component
'use client'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export function useStockRefreshOnFocus() {
  const router = useRouter()
  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === 'visible') {
        router.refresh()
      }
    }
    document.addEventListener('visibilitychange', handler)
    return () => document.removeEventListener('visibilitychange', handler)
  }, [router])
}
```

After a completed sale, the Server Action calls `revalidatePath('/pos')` before returning, which causes the next render to re-fetch products with updated stock counts.

### Pattern 6: Owner PIN Override for Out-of-Stock (D-12)

Reuse the existing `verifyStaffPin` Server Action. The `OutOfStockDialog` shows only to staff; the owner PIN entry field is shown in the dialog. Verify the entered PIN against the staff record with `role === 'owner'`. If valid, set an `overrideGranted` flag in local state and allow the add.

```typescript
// The override dialog calls verifyStaffPin with the owner's staffId + PIN
// The staffId for the owner must be known — fetch it from the store's staff list
// or store it in the staff_session JWT payload
```

**Note:** The staff_session JWT contains `role`, `store_id`, `staff_id`. When the logged-in user is already an `owner`, they can self-override without re-entering a PIN (check `payload.role === 'owner'` from the existing session cookie).

### Pattern 7: Split Payment UX (Claude's Discretion — D-11)

Recommendation: **Sequential entry** (simpler, fewer inputs visible at once on iPad).

Flow: staff enters cash amount first → POS shows change or remainder → staff switches remaining balance to EFTPOS → EFTPOS confirmation step for remainder. Both payment amounts recorded on the order. The `orders` table stores a single `payment_method` — for split payments, store `'split'` and add a `cash_amount_cents` note field, or record as two separate payment events. Simplest approach for v1: store `payment_method = 'cash'` + `notes = "Split: $X cash, $Y EFTPOS"` — avoids schema change.

**Schema note:** Adding a `cash_tendered_cents` column to `orders` would be cleaner. This is a new column, requiring a migration. However, it is not required for the EFTPOS confirmation logic. Include it in migration 005.

### Anti-Patterns to Avoid

- **Calculating GST as `price * 0.15`**: This gives the wrong result. NZ GST is tax-inclusive. The formula is `Math.round(cents * 3 / 23)`. The existing `gstFromInclusiveCents` function is correct — use it.
- **Using the Supabase SSR client for POS order writes**: Staff JWT is not a Supabase JWT. RLS will reject inserts. Always use the admin client for POS writes.
- **Sequential stock check + decrement**: Two queries create a TOCTOU race. The RPC is not optional — it is the only correct implementation for D-15.
- **Storing price in display form**: All calculations in cents. `formatNZD()` is display-only.
- **Adding `font-size < 16px` to inputs**: iOS Safari auto-zooms inputs with `font-size < 16px`, breaking the iPad fullscreen experience. The UI-SPEC mandates 14px minimum for labels but 16px minimum for all input fields.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Atomic stock + order creation | Custom sequential queries | Supabase RPC (`complete_pos_sale`) | Race condition on concurrent terminals |
| GST calculation | Custom formula | `calcLineItem` / `gstFromInclusiveCents` in `gst.ts` | Already tested with IRD specimen cases |
| Money display | Custom formatter | `formatNZD` in `money.ts` | Edge cases (negative, thousands separator) |
| Order schema validation | Custom validation | `CreateOrderSchema` / `OrderItemSchema` in `schemas/order.ts` | Already defined and typed |
| Staff auth verification | Custom PIN check | `verifyStaffPin` in `actions/auth/staffPin.ts` | Already handles lockout, bcrypt, JWT issuance |
| Image display | Raw `<img>` tags | `next/image` with Supabase Storage `remotePatterns` | Optimization, CDN, LCP |

**Key insight:** The GST, money, and schema primitives are complete. This phase is primarily UI composition + the RPC migration. Do not reimplement any of these primitives.

---

## Common Pitfalls

### Pitfall 1: RLS Rejection on Staff-Initiated Writes

**What goes wrong:** `completeSale` Server Action uses `createSupabaseServerClient()` (SSR client with anon key). The staff's `staff_session` cookie is a custom jose JWT, not a Supabase Auth token. Supabase sees an unauthenticated request. RLS rejects the insert.

**Why it happens:** Supabase RLS evaluates `auth.jwt()` which is set only by Supabase's own JWT flow. A custom jose JWT in a different cookie is invisible to RLS.

**How to avoid:** Use `createSupabaseAdminClient()` (service role key) in all POS Server Actions that write data. Extract `store_id` and `staff_id` from the verified jose JWT and pass them explicitly to every insert.

**Warning signs:** `new row violates row-level security policy` error on order insert.

### Pitfall 2: Stale Stock Counts After Sale

**What goes wrong:** `revalidatePath('/pos')` is called in the Server Action but the Client Component's product list does not re-render because the page is not navigated away from.

**Why it happens:** `revalidatePath` marks the cache as stale server-side, but the client does not automatically re-render unless `router.refresh()` is also called on the client.

**How to avoid:** After `completeSale` Server Action returns success, the Client Component should call `router.refresh()`. The Server Action also calls `revalidatePath('/pos')` for the next page load. Both are needed.

**Warning signs:** Stock badge shows old count after completing a sale.

### Pitfall 3: iOS Auto-Zoom on Input Focus

**What goes wrong:** Staff taps the discount amount input or search field. iOS Safari zooms into the input, breaking the fullscreen layout.

**Why it happens:** iOS Safari auto-zooms any input with `font-size < 16px` to improve readability.

**How to avoid:** All `<input>` elements must have `text-base` (16px) Tailwind class minimum. Labels can be 14px but the input itself must be 16px+. Also set `inputmode="numeric"` or `inputmode="decimal"` on numeric fields to show the numpad.

**Warning signs:** Screen zooms on input tap; layout breaks.

### Pitfall 4: Whole-Cart Discount Creates GST Rounding Gap

**What goes wrong:** Cart discount of $10.00 across 3 items: `Math.round(1000/3) = 333` for items 1+2, item 3 gets 334. But then GST is recalculated per-line on the discounted amounts. The sum of line GSTs may differ by 1 cent from `Math.round(totalAfterDiscount * 3/23)`.

**Why it happens:** Integer rounding at each step. This is expected and correct — per-line GST is the defined method (IRD-compliant). The displayed total is the sum of line totals, not a top-down calculation.

**How to avoid:** Always derive order totals by summing line items, never by calculating top-down. The `calcOrderGST(lineGSTs)` function already does this correctly.

**Warning signs:** "GST doesn't add up" in receipt — accept and document as IRD-compliant rounding.

### Pitfall 5: Out-of-Stock Override Race Condition

**What goes wrong:** Staff overrides out-of-stock via owner PIN for the last unit. Between override and sale completion, another terminal sells the same unit. The RPC stock check catches this and returns `OUT_OF_STOCK` error.

**Why it happens:** Override is UI-only — it does not reserve stock. The RPC is the authoritative gate.

**How to avoid:** This is correct behavior per D-15. Display the error as "Out of stock — item was just sold on another terminal. Void this sale." The RPC correctly prevents overselling regardless of override.

**Warning signs:** None — this is the intended design.

---

## Code Examples

### Server Action: completeSale

```typescript
// src/actions/orders/completeSale.ts
'use server'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { jwtVerify } from 'jose'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { CreateOrderSchema } from '@/schemas/order'

const secret = new TextEncoder().encode(process.env.STAFF_JWT_SECRET!)

export async function completeSale(input: unknown) {
  // 1. Verify staff session
  const cookieStore = await cookies()
  const token = cookieStore.get('staff_session')?.value
  if (!token) return { error: 'Not authenticated' }

  let staffPayload: { role: string; store_id: string; staff_id: string }
  try {
    const { payload } = await jwtVerify(token, secret)
    staffPayload = payload as typeof staffPayload
  } catch {
    return { error: 'Session expired — please log in again' }
  }

  // 2. Validate input
  const parsed = CreateOrderSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors }
  }

  // 3. Call RPC — admin client bypasses RLS
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase.rpc('complete_pos_sale', {
    p_store_id: staffPayload.store_id,
    p_staff_id: staffPayload.staff_id,
    p_payment_method: parsed.data.payment_method ?? 'eftpos',
    p_subtotal_cents: parsed.data.subtotal_cents,
    p_gst_cents: parsed.data.gst_cents,
    p_total_cents: parsed.data.total_cents,
    p_discount_cents: parsed.data.discount_cents ?? 0,
    p_items: parsed.data.items,
  })

  if (error) {
    if (error.message.includes('OUT_OF_STOCK')) {
      return { error: 'out_of_stock', productId: error.message.split(':')[1] }
    }
    return { error: error.message }
  }

  revalidatePath('/pos')
  return { success: true, orderId: (data as { order_id: string }).order_id }
}
```

### Cart Totals Calculation

```typescript
// src/lib/cart.ts
import { calcLineItem, calcOrderGST } from './gst'

export function calcCartTotals(items: CartItem[]) {
  const lines = items.map(item =>
    calcLineItem(item.unitPriceCents, item.quantity, item.discountCents)
  )
  const subtotalCents = lines.reduce((s, l) => s + l.lineTotal, 0)
  const gstCents = calcOrderGST(lines.map(l => l.gst))
  const totalCents = subtotalCents  // GST is already included (tax-inclusive pricing)
  return { subtotalCents, gstCents, totalCents }
}
```

Note: In NZ tax-inclusive pricing, `totalCents === subtotalCents`. The GST is extracted from the total, not added to it. Display as: "Total: $X.XX (incl. GST $Y.YY)".

### Product Grid Data Fetch (Server Component)

```typescript
// src/app/(pos)/pos/page.tsx
import { createSupabaseServerClient } from '@/lib/supabase/server'
// NOTE: The server client uses the owner's Supabase session for product reads.
// For POS pages, we need to read products using the admin client OR
// rely on the 'public_read_active' RLS policy which allows unauthenticated reads.
// Use the public_read_active policy — no auth needed to read active products.

export default async function PosPage() {
  const supabase = await createSupabaseServerClient()
  const [productsResult, categoriesResult] = await Promise.all([
    supabase.from('products').select('*').eq('is_active', true).order('name'),
    supabase.from('categories').select('*').order('sort_order'),
  ])
  // Pass to Client Component...
}
```

**Important:** The `public_read_active` RLS policy allows anonymous SELECT on active products. Product reads work without auth. Order inserts require the admin client.

---

## Runtime State Inventory

Phase 3 is a greenfield implementation — no rename, refactor, or migration of existing data. The only new persistent state is:

| Category | Items | Action Required |
|----------|-------|-----------------|
| Stored data | None (no existing orders data) | None |
| DB schema | `complete_pos_sale` RPC function + optional `cash_tendered_cents` column on orders | New migration file: `005_pos_rpc.sql` |
| Live service config | None | None |
| OS-registered state | None | None |
| Secrets/env vars | `STAFF_JWT_SECRET` — already set in Phase 1 | None (no change) |
| Build artifacts | None | None |

The only new DB artifact is the `005_pos_rpc.sql` migration. The plan must include a wave to write and apply this migration before any Server Action code that calls the RPC is implemented.

---

## Environment Availability

Step 2.6: SKIPPED — Phase 3 is purely code + one DB migration. All external dependencies (Supabase, Vercel, Next.js) are already operational from Phase 1/2. No new external dependencies are introduced.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 2.x/3.x |
| Config file | `vitest.config.mts` (exists, configured with jsdom + tsconfigPaths) |
| Quick run command | `npm test` |
| Full suite command | `npm test` |

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| POS-04 | Cart totals: subtotal, GST, total are correct on discounted lines | unit | `npm test -- src/lib/cart.test.ts` | ❌ Wave 0 |
| DISC-04 | GST recalculates on discounted line items | unit | `npm test -- src/lib/gst.test.ts` | ✅ (existing) |
| POS-07 | Atomic stock decrement: `complete_pos_sale` RPC rejects oversell | unit (mock RPC) | `npm test -- src/actions/orders/completeSale.test.ts` | ❌ Wave 0 |
| D-08 | Whole-cart discount pro-rata distribution sums to correct discount_cents | unit | `npm test -- src/lib/cart.test.ts` | ❌ Wave 0 |
| D-10 | Cash change calculation: tendered - total = change | unit | `npm test -- src/lib/cart.test.ts` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `npm test`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/lib/cart.test.ts` — covers POS-04, D-08, D-10 cart calculation correctness
- [ ] `src/actions/orders/completeSale.test.ts` — covers POS-07 (mock admin client, verify RPC called with correct args + error handling)

*(Existing `src/lib/gst.test.ts` already covers DISC-04 fully.)*

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `tailwind.config.js` + `postcss.config.js` | `@import "tailwindcss"` + `@theme` in `globals.css` | Tailwind v4 (2025) | Already adopted in this project |
| `@supabase/auth-helpers-nextjs` | `@supabase/ssr` | 2024 | Already adopted — do not import auth-helpers |
| Zod v3 | Zod v4 (4.3.6) | Installed in Phase 1 | API-compatible, installed as ^4 |
| `useActionState` (React 19) | Same as `useFormState` but renamed | React 19 | Available for form action state if needed |

---

## Open Questions

1. **`cash_tendered_cents` on orders table**
   - What we know: The schema does not currently have this column. It is needed for D-10 (cash tendered + change display) and for end-of-day cash reconciliation (Phase 5 ADMIN-02).
   - What's unclear: Whether to add it in migration 005 now (cleaner) or defer to Phase 5 (minimal scope).
   - Recommendation: Add `cash_tendered_cents INTEGER` to migration 005. It is a nullable column with no default — zero schema risk, and Phase 5 will need it.

2. **Split payment persistence on orders**
   - What we know: `orders.payment_method` is `eftpos | cash | stripe`. No `split` enum value exists.
   - What's unclear: Whether to add `split` to the enum or store split as `notes`.
   - Recommendation: Add `'split'` to the payment_method CHECK constraint in migration 005. Store `cash_amount_cents` as a separate column or in notes. Simplest: add `cash_tendered_cents` column (also covers D-10 cash change) and set `payment_method = 'split'` for split sales.

3. **Products without a Supabase Auth session (POS page Server Component)**
   - What we know: Staff use a custom jose JWT, not Supabase Auth. The SSR client will have no Supabase Auth session in the request.
   - What's unclear: Whether `products.public_read_active` policy is sufficient for the POS product grid read, or whether we need to pass store_id filtering somehow.
   - Recommendation: The `public_read_active` policy only enforces `is_active = true` — it does NOT filter by store_id. For a single-store v1, this is acceptable. For multi-tenant correctness, use the admin client with explicit `eq('store_id', storeId)` filter. Recommended: use admin client + extract store_id from staff JWT for product reads too. This is consistent and avoids multi-tenant data leakage in future.

---

## Project Constraints (from CLAUDE.md)

The planner must verify all implementations comply with these directives:

| Directive | Enforcement |
|-----------|-------------|
| Always read `DESIGN.md` before any visual/UI decisions | UI-SPEC already references DESIGN.md; components must use tokens from `globals.css @theme` block |
| Do not deviate from DESIGN.md without explicit approval | All color, font, spacing decisions locked in UI-SPEC |
| Tech stack is non-negotiable: Next.js App Router + Supabase + Stripe + Tailwind | No alternative frameworks or auth libraries |
| GST 15% tax-inclusive, per-line on discounted amounts, IRD-compliant | Use `calcLineItem` only; formula `Math.round(cents * 3 / 23)` |
| EFTPOS: standalone terminal, manual confirmation step | Full-screen binary confirmation screen (UI-SPEC compliant) |
| No offline mode in v1 | No service workers, no local-first patterns |
| Money stored as integer cents throughout | All new monetary fields: `INTEGER` in DB, `z.number().int()` in Zod |
| Do NOT use `@supabase/auth-helpers-nextjs` | Use `@supabase/ssr` only |
| Do NOT use Prisma, Redux, NextAuth, Clerk, CSS Modules | Not applicable to this phase |
| Do NOT use Tailwind v3 config patterns | CSS-native `@theme` block in globals.css; no `tailwind.config.js` |
| Do NOT use Supabase Realtime for inventory sync | Use `revalidatePath` + `router.refresh()` on visibilitychange |
| Vitest for unit tests (not Jest) | `npm test` runs `vitest run` |
| `server-only` imported in any file with Supabase credentials | Import in Server Actions and server-side Supabase helpers |
| GSD Workflow Enforcement | All edits go through GSD execute-phase |

---

## Sources

### Primary (HIGH confidence — direct codebase inspection)

- `/Users/adam-personal/CODER/IDEAS/NZPOS/src/lib/gst.ts` — GST formula, `calcLineItem`, `calcOrderGST` verified
- `/Users/adam-personal/CODER/IDEAS/NZPOS/src/schemas/order.ts` — `CreateOrderSchema`, `OrderItemSchema` verified
- `/Users/adam-personal/CODER/IDEAS/NZPOS/src/types/database.ts` — `orders`, `order_items`, `products` table shapes
- `/Users/adam-personal/CODER/IDEAS/NZPOS/supabase/migrations/001_initial_schema.sql` — DB schema, CHECK constraints
- `/Users/adam-personal/CODER/IDEAS/NZPOS/supabase/migrations/002_rls_policies.sql` — RLS policies, `public_read_active` pattern
- `/Users/adam-personal/CODER/IDEAS/NZPOS/src/actions/auth/staffPin.ts` — Staff JWT issuance pattern
- `/Users/adam-personal/CODER/IDEAS/NZPOS/src/middleware.ts` — Staff JWT verification pattern
- `/Users/adam-personal/CODER/IDEAS/NZPOS/src/lib/supabase/admin.ts` — Admin client pattern
- `/Users/adam-personal/CODER/IDEAS/NZPOS/.planning/phases/03-pos-checkout/03-UI-SPEC.md` — Full UI contract
- `/Users/adam-personal/CODER/IDEAS/NZPOS/.planning/phases/03-pos-checkout/03-CONTEXT.md` — All user decisions
- `/Users/adam-personal/CODER/IDEAS/NZPOS/DESIGN.md` — Design system tokens
- `/Users/adam-personal/CODER/IDEAS/NZPOS/CLAUDE.md` — Project constraints

### Secondary (MEDIUM confidence — project patterns + Next.js conventions)

- CLAUDE.md stack verdict (2026-03-25): confirmed `revalidatePath` + no Realtime for inventory sync
- Next.js 16 App Router conventions: Server Components fetch, Client Components render, `router.refresh()` re-runs Server Component data fetch
- Supabase RPC `SECURITY DEFINER` pattern: standard PostgreSQL function security pattern for bypassing RLS inside a controlled function boundary

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries installed, all versions verified from package.json
- Architecture patterns: HIGH — derived from existing codebase patterns (staffPin.ts, createProduct.ts, middleware.ts)
- GST / money calculations: HIGH — gst.ts and money.ts read and verified
- Supabase RPC pattern: HIGH — standard PostgreSQL SECURITY DEFINER pattern, well-established
- Pitfalls: HIGH — identified from direct analysis of code interactions (RLS + jose JWT mismatch, iOS zoom)
- UI constraints: HIGH — UI-SPEC is complete and signed-off

**Research date:** 2026-04-01
**Valid until:** 2026-05-01 (stable stack; Supabase/Next.js APIs unlikely to change at this timescale)
