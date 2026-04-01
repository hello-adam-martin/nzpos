# Phase 5: Admin & Reporting - Research

**Researched:** 2026-04-01
**Domain:** Next.js App Router admin dashboard — data tables, reporting queries, Stripe refunds, cash session tracking
**Confidence:** HIGH

## Summary

Phase 5 builds the owner's command center: a dashboard, orders table with refund flow, cash session tracking, and sales/GST reports. All the necessary infrastructure already exists — the database schema (including `cash_sessions` table), auth patterns, GST module, money formatting, and component patterns (data table, form drawer) are in place from prior phases.

The main technical work is: (1) writing efficient Supabase queries that aggregate order/item data for reports, (2) integrating Recharts for bar/donut charts, (3) implementing the Stripe Refunds API call in a new Server Action, (4) building the cash session open/close flow against the existing `cash_sessions` table, and (5) extending the admin sidebar and POS top bar with new entry points.

One critical schema discrepancy to resolve: the DB migration (`001_initial_schema.sql`) and `database.ts` types use different column names for `cash_sessions` — migration has `opened_by`/`closed_by`/`closing_cash_cents` but `database.ts` has `staff_id`/`actual_cash_cents`/`closing_float_cents`. The migration is ground truth. A Wave 0 migration will reconcile the types file.

**Primary recommendation:** Follow the established Server Component page → Client shell → data table + drawer pattern exactly. Use `createSupabaseServerClient()` with `store_id` from `user.app_metadata` for all admin data fetching. No new libraries except Recharts.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Dashboard
- **D-01:** Sales-first layout. Hero cards at top: today's sales total, order count, POS vs online channel split. Low stock alerts and summary below.
- **D-02:** Today's numbers only — no trend charts or historical data on dashboard. Charts are out of scope per v1 constraints (advanced analytics deferred to v2), except for the reports section.
- **D-03:** Low stock alerts displayed as a list section below hero cards. Shows product name, current stock, and reorder threshold for all products at or below threshold.
- **D-04:** No recent orders feed on dashboard. Order details live on the dedicated Orders page only. Dashboard stays minimal.

#### Cash-Up Workflow
- **D-05:** Full session tracking. Owner or staff opens a cash session with opening float amount. At close, enter counted cash. System calculates expected cash (from cash sales during session) and shows variance.
- **D-06:** Both owner and staff can open/close cash sessions. Not owner-only.
- **D-07:** Cash-up accessible from both POS top bar and admin dashboard. Same session data, two entry points.
- **D-08:** Primary input is a single total cash counted. Optional denomination breakdown (NZ notes: $100, $50, $20, $10, $5; coins: $2, $1, 50c, 20c, 10c) that sums into the total when used.

#### Reporting
- **D-09:** Sales report: data tables + simple charts. Daily sales bar chart and channel breakdown visual alongside tabular data.
- **D-10:** Date range presets: Today, Yesterday, This Week, This Month, Last Month, Custom Range, plus GST-aligned periods matching NZ filing frequencies (1-month, 2-month, 6-month).
- **D-11:** GST period summary has both views: summary totals (total sales, total GST collected, GST-exclusive total) for quick filing, plus drill-down to per-line detail for accountant review.
- **D-12:** CSV export available on all reports. No PDF generation.

#### Refund Process
- **D-13:** Refund triggered from order detail view. Owner opens order in the slide-out drawer, clicks Refund button, confirmation step before processing.
- **D-14:** Restock prompt per refund: "Restock items?" Owner chooses whether to restore stock based on item condition.
- **D-15:** Online Stripe orders: refund automatically calls Stripe Refund API. Customer gets money back without owner needing Stripe dashboard.
- **D-16:** Refund reason required — dropdown: Customer request, Damaged, Wrong item, Other. Required before confirming.
- **D-17:** Full refund only (per REQUIREMENTS.md — partial refunds out of scope for v1).

#### Order Management
- **D-18:** Order list as data table with columns: Order ID, date/time, total, channel (POS/online), payment method, status, staff name. Sortable.
- **D-19:** Full filter bar: status (completed/refunded/pending_pickup/ready/collected), channel (POS/online), payment method, date range. Search by order ID.
- **D-20:** Order detail in slide-out drawer (consistent with product form pattern from Phase 2). Shows: line items with GST breakdown, payment info, status history, refund button, pickup status transitions.
- **D-21:** Click-and-collect status transitions (PENDING_PICKUP -> READY -> COLLECTED) available in the admin order detail drawer, in addition to the POS Pickups tab built in Phase 4.

### Claude's Discretion
- Chart library choice for simple bar/pie charts in reports
- Cash session table schema design (opening_float, closing_cash, expected_cash, variance, opened_by, closed_by, timestamps)
- Cash-up UI placement on POS top bar (button/icon design)
- Denomination breakdown UI component design
- Order detail drawer layout and section ordering
- Report page layout and tab/section structure
- Low stock alert threshold display styling
- Pagination strategy for order list (server-side recommended given potentially large datasets)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ADMIN-01 | Dashboard shows today's sales total, order count, by channel (POS vs online) | Supabase aggregate query on `orders` filtered by `created_at >= today` grouped by `channel`. Both `completed` and non-expired statuses. |
| ADMIN-02 | End-of-day cash-up report: totals by payment method, expected vs actual cash, variance | `cash_sessions` table exists in migration. Close session computes expected_cash = opening_float + sum(cash payments in session). variance = actual - expected. |
| ADMIN-03 | Cash sessions tracked (opening float, close time, closed by) | `cash_sessions` table already in schema. Needs Server Actions: openCashSession, closeCashSession. Schema reconciliation needed (see pitfall #1). |
| ADMIN-04 | Basic sales reports: daily totals, top products, stock levels | Aggregate query on `orders`+`order_items` for daily totals and top products. Products table for stock levels snapshot. Date range filter via search params. |
| ADMIN-05 | GST period summary with breakdown for filing | Use existing `gst.ts` functions (gstFromInclusiveCents) on order_items. Per-line detail from `order_items.gst_cents`. Summary from `orders.gst_cents`. |
| ADMIN-06 | Low stock alerts on dashboard when products hit reorder threshold | Simple Supabase query: `products WHERE stock_quantity <= reorder_threshold AND is_active = true`. |
| ADMIN-07 | Order list with status, channel, payment method, staff, date | Join `orders` with `staff` table (for staff name). Sortable. Server-side pagination (50 rows/page). Filter via URL search params. |
| REF-01 | Owner can process full refund (marks order as refunded) | New `processRefund` Server Action: verify owner auth, fetch order, for online orders call `stripe.refunds.create({ payment_intent: order.stripe_payment_intent_id })`, update `orders.status = 'refunded'`, optionally restore stock. |
| REF-02 | Refunded orders visible in reporting with refund status | `refunded` is already in the status enum in schema. Query includes refunded orders; filter/badge display handled by existing enum. |
</phase_requirements>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.2.1 | App Router framework | Already installed. Server Components for data fetching, Server Actions for mutations. |
| Supabase JS | ^2.101.1 | Data layer | Already installed. `createSupabaseServerClient()` for Server Components, admin client for mutations requiring RLS bypass. |
| Stripe (node) | ^21.0.1 | Refund API | Already installed. `stripe.refunds.create()` for online order refunds. |
| Zod | ^4.3.6 | Input validation | Already installed. Every Server Action validates via `z.safeParse()`. |
| date-fns | ^4.1.0 | Date range math | Already installed. ISO week starts, month boundaries for GST period presets. |

### New Library — Recharts
| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| recharts | 3.8.1 (latest) | Bar chart + donut chart | Decided in UI-SPEC (D-09, Claude's Discretion). React-native, composable, no build step. Used for SalesBarChart and ChannelBreakdownChart only. |

**Installation:**
```bash
npm install recharts
```

**Recharts import discipline (from UI-SPEC):** Import only named exports actually used:
```typescript
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
```

### Supporting (already installed)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| jose | ^6.2.2 | Staff JWT verification | Verify `staff_session` cookie in Server Actions accessible to both owner and staff (cash-up open/close). |
| papaparse | ^5.5.3 | CSV export | `Papa.unparse()` to generate CSV strings for download. |
| lucide-react | ^1.7.0 | Icons | Available but UI-SPEC mandates inline SVG (Heroicons-style). Do NOT switch to lucide for this phase. |

---

## Architecture Patterns

### Recommended Project Structure (new files this phase)

```
src/
├── app/admin/
│   ├── dashboard/page.tsx          # REPLACE placeholder with real dashboard (Server Component)
│   ├── orders/
│   │   ├── page.tsx                # Server Component — fetches paginated orders
│   │   └── loading.tsx             # Skeleton
│   ├── reports/
│   │   ├── page.tsx                # Server Component — default to today's data
│   │   └── loading.tsx
│   └── cash-up/
│       └── page.tsx                # Server Component — cash session history
├── components/admin/
│   ├── dashboard/
│   │   ├── DashboardHeroCard.tsx
│   │   └── LowStockAlertList.tsx
│   ├── orders/
│   │   ├── OrdersPageClient.tsx    # Client shell with table + drawer state
│   │   ├── OrderDataTable.tsx      # Follows ProductDataTable exactly
│   │   ├── OrderFilterBar.tsx      # Follows ProductFilterBar exactly
│   │   ├── OrderDetailDrawer.tsx   # Follows ProductFormDrawer exactly
│   │   ├── OrderStatusBadge.tsx
│   │   ├── ChannelBadge.tsx
│   │   └── RefundConfirmationStep.tsx
│   ├── reports/
│   │   ├── ReportsPageClient.tsx
│   │   ├── ReportDateRangePicker.tsx
│   │   ├── SalesSummaryTable.tsx
│   │   ├── SalesBarChart.tsx
│   │   ├── ChannelBreakdownChart.tsx
│   │   ├── GSTSummaryBlock.tsx
│   │   └── ExportCSVButton.tsx
│   └── cash-up/
│       ├── CashUpModal.tsx
│       ├── CashSessionBanner.tsx
│       └── DenominationBreakdown.tsx
├── actions/
│   ├── orders/
│   │   ├── processRefund.ts        # New Server Action
│   │   └── getOrders.ts            # Paginated order fetch (or inline in page)
│   └── cash-sessions/
│       ├── openCashSession.ts
│       └── closeCashSession.ts
└── supabase/migrations/
    └── 007_cash_sessions_fix.sql   # Reconcile schema vs types (see pitfall #1)
```

### Pattern 1: Server Component + URL Search Params for Filters

All report filtering and order list pagination uses URL search params (not useState). This makes pages bookmarkable and allows Server Component data fetching.

```typescript
// Source: Next.js App Router pattern — established in Phase 4 storefront
// src/app/admin/orders/page.tsx
import { createSupabaseServerClient } from '@/lib/supabase/server'

interface OrdersPageProps {
  searchParams: Promise<{
    page?: string
    status?: string
    channel?: string
    payment_method?: string
    from?: string
    to?: string
    q?: string
  }>
}

export default async function OrdersPage({ searchParams }: OrdersPageProps) {
  const params = await searchParams
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  const storeId = user?.app_metadata?.store_id as string

  const page = parseInt(params.page ?? '1')
  const PAGE_SIZE = 50
  const offset = (page - 1) * PAGE_SIZE

  let query = supabase
    .from('orders')
    .select('*, staff(name)', { count: 'exact' })
    .eq('store_id', storeId)
    .order('created_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1)

  if (params.status) query = query.eq('status', params.status)
  if (params.channel) query = query.eq('channel', params.channel)
  if (params.payment_method) query = query.eq('payment_method', params.payment_method)
  if (params.from) query = query.gte('created_at', params.from)
  if (params.to) query = query.lte('created_at', params.to)

  const { data: orders, count } = await query
  // pass to Client shell
}
```

**Confidence:** HIGH — this is the established Next.js App Router pattern used in Phase 4.

### Pattern 2: Dashboard Aggregate Query

Today's data needs two separate queries — one for order totals, one for low stock. Avoid computing these client-side.

```typescript
// Dashboard — today's sales
const todayStart = new Date()
todayStart.setHours(0, 0, 0, 0)

const { data: todayOrders } = await supabase
  .from('orders')
  .select('total_cents, channel')
  .eq('store_id', storeId)
  .in('status', ['completed', 'pending_pickup', 'ready', 'collected'])
  .gte('created_at', todayStart.toISOString())

// Low stock
const { data: lowStock } = await supabase
  .from('products')
  .select('name, stock_quantity, reorder_threshold')
  .eq('store_id', storeId)
  .eq('is_active', true)
  .filter('stock_quantity', 'lte', supabase.rpc) // use: .lte('stock_quantity', supabase.rpc('stock_quantity'))
  // Actually: Supabase JS does not support column-to-column comparisons directly.
  // Use a DB view or RPC, OR fetch all active products and filter client-side.
  // For v1 with small product catalogs, client-side filter is acceptable.
```

**Important caveat:** Supabase JS client cannot do column-to-column comparisons (`stock_quantity <= reorder_threshold`) in a single filter. Options:
1. Fetch all active products, filter in JS (`p.stock_quantity <= p.reorder_threshold`) — acceptable for small catalogs (<500 products)
2. Create a Postgres view `low_stock_products` — cleaner for larger catalogs
3. Use `.lte('stock_quantity', maxThreshold)` with a known max threshold — not general enough

**Recommendation:** For v1 with a single small store, fetch active products and filter in JS. This avoids an extra migration.

### Pattern 3: Stripe Refund Server Action

```typescript
// Source: Stripe Node.js docs — stripe.refunds.create()
// src/actions/orders/processRefund.ts
'use server'
import 'server-only'
import { z } from 'zod'
import { stripe } from '@/lib/stripe'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

const RefundSchema = z.object({
  orderId: z.string().uuid(),
  reason: z.enum(['customer_request', 'damaged', 'wrong_item', 'other']),
  restoreStock: z.boolean(),
})

export async function processRefund(input: unknown) {
  // 1. Verify owner auth (Supabase session — NOT staff PIN JWT)
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  const storeId = user.app_metadata?.store_id as string | undefined
  if (!storeId) return { error: 'No store context' }

  // 2. Validate input
  const parsed = RefundSchema.safeParse(input)
  if (!parsed.success) return { error: 'Invalid input' }

  const { orderId, reason, restoreStock } = parsed.data

  // 3. Fetch order (admin client for RLS bypass — needed to also update stock)
  const adminClient = createSupabaseAdminClient()
  const { data: order } = await adminClient
    .from('orders')
    .select('*, order_items(*)')
    .eq('id', orderId)
    .eq('store_id', storeId)
    .single()

  if (!order) return { error: 'Order not found' }
  if (order.status === 'refunded') return { error: 'Order already refunded' }

  // 4. Stripe refund for online orders
  if (order.channel === 'online' && order.stripe_payment_intent_id) {
    const refund = await stripe.refunds.create({
      payment_intent: order.stripe_payment_intent_id,
    })
    if (refund.status !== 'succeeded' && refund.status !== 'pending') {
      return { error: 'Stripe refund failed. Check your Stripe dashboard.' }
    }
  }

  // 5. Update order status
  await adminClient
    .from('orders')
    .update({ status: 'refunded', notes: reason })
    .eq('id', orderId)

  // 6. Restore stock if requested
  if (restoreStock) {
    for (const item of order.order_items) {
      await adminClient.rpc('increment_stock', {
        p_product_id: item.product_id,
        p_quantity: item.quantity,
      })
      // If no RPC exists: manual read-then-increment is safe for v1 traffic
    }
  }

  revalidatePath('/admin/orders')
  revalidatePath('/admin/reports')
  return { success: true }
}
```

**Note on stock restore:** Check whether an `increment_stock` RPC exists in the migrations. If not, use read-then-write (same pattern as promo `current_uses` in Phase 4). For v1 single-operator load, this is safe.

### Pattern 4: Cash Session Server Actions

```typescript
// openCashSession — authenticated via EITHER Supabase session (owner) OR staff JWT
// D-06: both owner and staff can open sessions

// Auth resolution: check Supabase session first, fall back to staff_session cookie
// Same store_id extraction works for both paths

// closeCashSession — calculate expected_cash at close time:
// expected_cash = opening_float + sum of cash payment orders during session window
const { data: cashOrders } = await adminClient
  .from('orders')
  .select('total_cents')
  .eq('store_id', storeId)
  .eq('payment_method', 'cash')
  .in('status', ['completed'])
  .gte('created_at', session.opened_at)
  .lte('created_at', new Date().toISOString())

const expectedCash = session.opening_float_cents +
  (cashOrders ?? []).reduce((sum, o) => sum + o.total_cents, 0)
const variance = counted_cash_cents - expectedCash
```

### Pattern 5: CSV Export

CSV export is a client-side operation using PapaParse `unparse()`. No Route Handler needed.

```typescript
// ExportCSVButton.tsx — client component
import Papa from 'papaparse'

function downloadCSV(data: Record<string, unknown>[], filename: string) {
  const csv = Papa.unparse(data)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
```

### Pattern 6: Recharts in Client Components

Recharts requires `'use client'`. Wrap in a named export, never import in Server Components directly.

```typescript
// SalesBarChart.tsx
'use client'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

interface DaySales { date: string; total_cents: number }

export function SalesBarChart({ data }: { data: DaySales[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
        <XAxis dataKey="date" tick={{ fontSize: 12, fontFamily: 'DM Sans' }} />
        <YAxis
          tickFormatter={(v) => `$${(v / 100).toFixed(0)}`}
          tick={{ fontSize: 12, fontFamily: 'DM Sans' }}
        />
        <Tooltip formatter={(v: number) => formatNZD(v)} />
        <Bar dataKey="total_cents" fill="#1E293B" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
```

### Anti-Patterns to Avoid

- **Do NOT** use `useEffect` + `fetch` for data loading in admin pages. Use Server Component data fetching, pass data down as props.
- **Do NOT** store filter state in `useState` for shareable pages. Use URL search params with `useRouter` and `useSearchParams`.
- **Do NOT** compute GST in ad-hoc report queries. Use `order_items.gst_cents` which is already stored per-line at order time.
- **Do NOT** call Stripe API in Server Components (no async Server Component with stripe calls — only in Server Actions where error handling works properly).
- **Do NOT** use `lucide-react` icons for new components in this phase — UI-SPEC mandates inline SVG.
- **Do NOT** use `font-semibold` (600) in this phase — UI-SPEC mandates only `font-normal` (400) and `font-bold` (700).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CSV generation | Manual string concatenation | `papaparse` `unparse()` | Already installed, handles quoting/escaping/encoding |
| Money display | `(cents / 100).toFixed(2)` | `formatNZD()` from `src/lib/money.ts` | Locale-aware, handles negatives, already tested |
| GST calculation | Inline `* 0.15` | `gstFromInclusiveCents()` from `src/lib/gst.ts` | IRD-compliant formula, already tested |
| Date range math | Manual `Date` arithmetic | `date-fns` (`startOfMonth`, `endOfMonth`, `startOfWeek`, `subMonths`) | Already installed, handles NZ locale edge cases |
| Chart rendering | Custom SVG charts | Recharts | Bar and donut charts are non-trivial: tooltips, responsive containers, accessibility |
| Stripe refund | Custom Stripe API call | `stripe.refunds.create()` | Already have `src/lib/stripe.ts` with configured client |

**Key insight:** Every financial calculation (GST, totals, variance) must go through the established modules — not inline math. Reports are auditable documents; consistency is more important than convenience.

---

## Common Pitfalls

### Pitfall 1: Schema Mismatch — cash_sessions Column Names (CRITICAL)

**What goes wrong:** `database.ts` and `001_initial_schema.sql` define `cash_sessions` with different column names.

| `database.ts` says | Migration SQL says |
|---|---|
| `staff_id` | `opened_by` + `closed_by` (separate columns) |
| `actual_cash_cents` | `closing_cash_cents` |
| `closing_float_cents` | not present in migration |

**Why it happens:** `database.ts` is manually maintained (comment says it's a placeholder pending `supabase gen types`). The migration was written separately and diverged.

**How to avoid:** Wave 0 must include a migration `007_cash_sessions_fix.sql` that reconciles the actual DB schema, followed by regenerating or manually correcting `database.ts`. The migration is ground truth. Based on D-05 requirements, the correct schema should be:
- `opened_by UUID REFERENCES staff(id)` (who opened)
- `closed_by UUID REFERENCES staff(id)` (who closed, nullable)
- `opening_float_cents INTEGER NOT NULL`
- `closing_cash_cents INTEGER` (what was physically counted)
- `expected_cash_cents INTEGER` (computed at close: float + cash sales)
- `variance_cents INTEGER` (closing - expected)
- `opened_at TIMESTAMPTZ`
- `closed_at TIMESTAMPTZ`

**Warning signs:** TypeScript errors on `cash_sessions` insert/select calls.

### Pitfall 2: Auth Context in Admin Server Actions

**What goes wrong:** Admin pages use Supabase owner sessions (JWT from Supabase Auth). Cash-up is also accessible from POS which uses staff PIN sessions (jose JWT in `staff_session` cookie). A Server Action that only checks one auth path will fail for the other.

**Why it happens:** Two separate session systems exist by design (Phase 1 decision).

**How to avoid:** For Server Actions that D-06 says both owner AND staff can trigger (open/close cash session), implement dual auth resolution:
1. Try `createSupabaseServerClient().auth.getUser()` — succeeds for owner
2. If null, try `jwtVerify()` on `staff_session` cookie — succeeds for staff
3. Extract `store_id` from whichever succeeds

For refund actions (owner-only per D-13 context, since refund is admin page only), only check Supabase session.

**Warning signs:** "Not authenticated" errors when staff tries to open a session from POS top bar.

### Pitfall 3: GST Report Double-Counting

**What goes wrong:** Summing `orders.gst_cents` for a period and also summing `order_items.gst_cents` for the same period gives different (both wrong) values. The per-line GST is stored in `order_items.gst_cents`. The `orders.gst_cents` is the sum of all line GSTs. Using both inflates totals.

**Why it happens:** Report builder pulls from orders table for speed but switches to order_items for detail view without realizing both produce the same data at different granularity.

**How to avoid:**
- GST period summary (totals): sum `orders.gst_cents` — one record per order, no duplication
- GST per-line detail: join `order_items`, use `order_items.gst_cents` — one record per line
- Never mix the two in the same aggregation

### Pitfall 4: Recharts Server Component Bundling

**What goes wrong:** Importing Recharts in a Server Component (or a file that gets bundled server-side) crashes at build time with "You're importing a component that needs..." errors, because Recharts uses browser APIs.

**Why it happens:** Recharts is a client-only library. Any file importing it must have `'use client'` at the top.

**How to avoid:** All chart components must start with `'use client'`. The parent Server Component passes serializable data (plain objects/arrays) as props.

### Pitfall 5: Order Filter State vs URL Params

**What goes wrong:** Using `useState` for order filters means deep-linking and page refresh lose filter state. Also breaks the Server Component data fetching pattern — filtered data must be fetched server-side for performance at 50+ rows/page.

**Why it happens:** Natural instinct is to manage filter state locally in the Client shell.

**How to avoid:** Filters live in URL search params. `OrderFilterBar` uses `useRouter` and `useSearchParams` to push URL changes. The Server Component `orders/page.tsx` reads `searchParams` prop and fetches filtered data. Client shell receives pre-filtered data as props.

### Pitfall 6: Stripe Payment Intent ID May Be Null for Some Online Orders

**What goes wrong:** `orders.stripe_payment_intent_id` can be null for orders that went through Stripe Checkout but the webhook hasn't fired yet (status still `pending`), or for orders that were `expired`.

**Why it happens:** The field is nullable in the schema. Refund action tries to use it and gets a null reference error.

**How to avoid:** In `processRefund`:
1. Verify `order.status` is in a refundable state (completed, pending_pickup, ready, collected)
2. For `channel === 'online'`, verify `stripe_payment_intent_id` is non-null before calling Stripe
3. If null on an online order, return a descriptive error: "Cannot refund — Stripe payment ID not found. Check order in Stripe dashboard."

### Pitfall 7: Expected Cash Calculation Window

**What goes wrong:** Cash session "expected cash" calculation includes all cash orders from session open time to close time. But if a session is left open overnight (staff forgets to close), the window spans multiple trading days and inflates expected cash.

**Why it happens:** No automatic session close exists — it's manual.

**How to avoid:** In the close flow UI, display the session open time prominently. The `CashVarianceSummary` should show the session window dates. Document in the UI that sessions should be closed at end of shift. This is a UX concern, not a code concern — the calculation is correct, the window is just potentially long.

---

## Code Examples

Verified patterns from existing codebase:

### Owner Auth in Server Component (from promos/page.tsx pattern)
```typescript
// Source: src/app/admin/promos/page.tsx
const { data: { user } } = await supabase.auth.getUser()
const storeId = user?.app_metadata?.store_id as string | undefined
if (!storeId) redirect('/admin/login')
```

### Server Action with Owner Auth (for admin-only actions)
```typescript
// Source: pattern derived from updateOrderStatus.ts + promos/page.tsx
'use server'
import 'server-only'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function ownerOnlyAction(input: unknown) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  const storeId = user.app_metadata?.store_id as string | undefined
  if (!storeId) return { error: 'No store context' }
  // ... rest of action
}
```

### Server Action with Dual Auth (owner OR staff — for cash-up)
```typescript
// Source: pattern combining promos/page.tsx and updateOrderStatus.ts
'use server'
import 'server-only'
import { cookies } from 'next/headers'
import { jwtVerify } from 'jose'
import { createSupabaseServerClient } from '@/lib/supabase/server'

const secret = new TextEncoder().encode(process.env.STAFF_JWT_SECRET!)

async function resolveAuth(): Promise<{ store_id: string; staff_id: string } | null> {
  // Try owner Supabase session
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user?.app_metadata?.store_id) {
    // Owner — need to get their staff record ID
    // (could cache in JWT claims if needed)
    return { store_id: user.app_metadata.store_id, staff_id: user.id }
  }
  // Try staff PIN JWT
  const cookieStore = await cookies()
  const token = cookieStore.get('staff_session')?.value
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, secret)
    const p = payload as { store_id: string; staff_id: string }
    return { store_id: p.store_id, staff_id: p.staff_id }
  } catch {
    return null
  }
}
```

### Date Range Helpers with date-fns
```typescript
// Source: date-fns v4.x docs — installed package
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths } from 'date-fns'

function getDateRange(preset: string): { from: Date; to: Date } {
  const now = new Date()
  switch (preset) {
    case 'today': return { from: startOfDay(now), to: endOfDay(now) }
    case 'yesterday': {
      const y = subDays(now, 1)
      return { from: startOfDay(y), to: endOfDay(y) }
    }
    case 'this_week': return { from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfWeek(now, { weekStartsOn: 1 }) }
    case 'this_month': return { from: startOfMonth(now), to: endOfMonth(now) }
    case 'last_month': {
      const lm = subMonths(now, 1)
      return { from: startOfMonth(lm), to: endOfMonth(lm) }
    }
    case 'gst_1mo': return { from: startOfMonth(now), to: endOfMonth(now) }
    case 'gst_2mo': return { from: startOfMonth(subMonths(now, 1)), to: endOfMonth(now) }
    case 'gst_6mo': return { from: startOfMonth(subMonths(now, 5)), to: endOfMonth(now) }
    default: return { from: startOfDay(now), to: endOfDay(now) }
  }
}
```

### GST Report Query
```typescript
// Summary: sum order-level GST per period
const { data: gstSummary } = await supabase
  .from('orders')
  .select('total_cents, gst_cents, created_at')
  .eq('store_id', storeId)
  .in('status', ['completed', 'refunded', 'pending_pickup', 'ready', 'collected'])
  .gte('created_at', from.toISOString())
  .lte('created_at', to.toISOString())

// Detail: per-line from order_items
const { data: gstDetail } = await supabase
  .from('order_items')
  .select('*, orders!inner(created_at, status, store_id)')
  .eq('orders.store_id', storeId)
  .gte('orders.created_at', from.toISOString())
  .lte('orders.created_at', to.toISOString())
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|---|---|---|---|
| Recharts v2.x | Recharts v3.8.1 | 2024-2025 | API is backward compatible for basic charts; `recharts@3` improves TypeScript types and tree-shaking |
| Stripe `charges.refund` | `stripe.refunds.create({ payment_intent })` | Stripe API v2022+ | Use `payment_intent` key (not `charge`) for refunds on PaymentIntent-based checkouts |

**Stripe version note:** This project uses `stripe ^21.0.1`. The `stripe.refunds.create()` API is stable and unchanged in recent major versions. Use `payment_intent` parameter since online orders use `stripe_payment_intent_id`.

---

## Open Questions

1. **cash_sessions schema ground truth**
   - What we know: `001_initial_schema.sql` and `database.ts` disagree on column names
   - What's unclear: Whether any data exists in the table (likely empty since cash-up was never implemented)
   - Recommendation: Write `007_cash_sessions_fix.sql` migration that drops and recreates the table with the correct schema matching D-05 requirements. Since no data exists, this is safe.

2. **Owner staff_id for cash sessions**
   - What we know: `cash_sessions.opened_by` references `staff.id`. The owner has a row in the `staff` table (role='owner'). The Supabase JWT contains `user.id` (auth user ID), not the `staff.id`.
   - What's unclear: Whether `staff.auth_user_id` can be used to look up `staff.id` efficiently in the Server Action
   - Recommendation: In `openCashSession`, for owner auth path, do a quick lookup: `SELECT id FROM staff WHERE auth_user_id = user.id AND store_id = storeId`. This record always exists per Phase 1 design.

3. **`increment_stock` RPC for stock restore on refund**
   - What we know: The `complete_pos_sale` RPC decrements stock atomically. There is no `increment_stock` RPC in the migrations reviewed.
   - What's unclear: Whether one needs to be created or whether read-then-write is safe
   - Recommendation: For v1 single-store, read-then-write is safe (same conclusion as Phase 4 promo `current_uses`). Add a Wave 0 note that an `increment_stock` RPC could be added if concurrency becomes a concern.

---

## Environment Availability

Step 2.6: SKIPPED — all dependencies are npm packages already installed or being added via `npm install recharts`. No external services, CLIs, or runtimes beyond what is already required by the existing stack.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.2 |
| Config file | `vitest.config.mts` (jsdom environment, tsconfigPaths, react plugin) |
| Quick run command | `npm test` (vitest run) |
| Full suite command | `npm test` |
| E2E command | `npm run test:e2e` (Playwright) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ADMIN-01 | Dashboard aggregation: today's total, count, by channel | unit | `npm test -- src/lib/__tests__/dashboard.test.ts` | ❌ Wave 0 |
| ADMIN-02 | Cash session variance calculation: expected = float + cash sales | unit | `npm test -- src/lib/__tests__/cashSession.test.ts` | ❌ Wave 0 |
| ADMIN-03 | openCashSession / closeCashSession Server Actions | unit (mocked Supabase) | `npm test -- src/actions/cash-sessions/__tests__/` | ❌ Wave 0 |
| ADMIN-04 | Top products aggregation, daily totals | unit | `npm test -- src/lib/__tests__/reports.test.ts` | ❌ Wave 0 |
| ADMIN-05 | GST period summary totals match sum of order_items.gst_cents | unit | `npm test -- src/lib/__tests__/gstReport.test.ts` | ❌ Wave 0 |
| ADMIN-06 | Low stock filter: products where stock_quantity <= reorder_threshold | unit | included in dashboard.test.ts | ❌ Wave 0 |
| ADMIN-07 | Order list pagination, filter logic | unit | `npm test -- src/lib/__tests__/orderFilters.test.ts` | ❌ Wave 0 |
| REF-01 | processRefund: marks status refunded, calls Stripe for online orders | unit (mock Stripe) | `npm test -- src/actions/orders/__tests__/processRefund.test.ts` | ❌ Wave 0 |
| REF-02 | Refunded orders included in reporting queries with refunded status | unit | included in reports.test.ts | ❌ Wave 0 |

**Note:** Server Action tests follow the pattern established in `src/actions/orders/__tests__/completeSale.test.ts` — mock Supabase client and Stripe where needed.

### Sampling Rate
- **Per task commit:** `npm test` (full unit suite, < 30 seconds)
- **Per wave merge:** `npm test` + build check (`npm run build`)
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/lib/__tests__/dashboard.test.ts` — covers ADMIN-01, ADMIN-06
- [ ] `src/lib/__tests__/cashSession.test.ts` — covers ADMIN-02
- [ ] `src/actions/cash-sessions/__tests__/openCashSession.test.ts` — covers ADMIN-03
- [ ] `src/actions/cash-sessions/__tests__/closeCashSession.test.ts` — covers ADMIN-03
- [ ] `src/lib/__tests__/reports.test.ts` — covers ADMIN-04, REF-02
- [ ] `src/lib/__tests__/gstReport.test.ts` — covers ADMIN-05
- [ ] `src/lib/__tests__/orderFilters.test.ts` — covers ADMIN-07
- [ ] `src/actions/orders/__tests__/processRefund.test.ts` — covers REF-01

---

## Project Constraints (from CLAUDE.md)

These directives apply to all implementation in this phase:

| Constraint | Requirement |
|---|---|
| Design system | Read DESIGN.md before any visual/UI decisions. Do not deviate without explicit approval. |
| Typography | Satoshi (display), DM Sans (body/UI), Geist Mono (SKUs, order IDs, prices). |
| Colors | Navy #1E293B primary, Amber #E67E22 accent (reserved uses — see UI-SPEC). Semantic colors from DESIGN.md only. |
| Money | Integer cents throughout. `formatNZD()` is the only display formatter. Never store or pass floats. |
| GST | `src/lib/gst.ts` functions only. No inline GST math. |
| Auth | Supabase Auth for owner admin routes. Staff PIN JWT (jose) for POS-originated actions. Both verified server-side. |
| Validation | Every Server Action validates with `z.safeParse()` before touching database. |
| Supabase | Use `@supabase/ssr` (not deprecated auth-helpers). `createSupabaseServerClient()` for read, `createSupabaseAdminClient()` for writes that need RLS bypass. |
| Tailwind | v4 CSS-native config. `@theme` block in globals.css. No tailwind.config.js. |
| Stack | Next.js 16 App Router + Supabase + Stripe + Tailwind v4. No new major libraries except Recharts (already decided in UI-SPEC). |
| Testing | Vitest for unit tests. No Jest. |
| Icons | Inline SVG (Heroicons-style, strokeWidth 1.5-2, currentColor). Do not introduce lucide-react usage in this phase. |
| Font weights | `font-normal` (400) and `font-bold` (700) only in this phase. No `font-semibold` (600). |

---

## Sources

### Primary (HIGH confidence)
- Codebase direct inspection: `src/lib/gst.ts`, `src/lib/money.ts`, `src/schemas/order.ts`, `src/types/database.ts`, `src/actions/orders/updateOrderStatus.ts`, `src/actions/orders/completeSale.ts`, `src/app/admin/promos/page.tsx`, `src/components/admin/products/ProductDataTable.tsx`, `src/components/admin/products/ProductFormDrawer.tsx`, `src/components/pos/POSTopBar.tsx`, `supabase/migrations/001_initial_schema.sql`, `supabase/migrations/002_rls_policies.sql`
- `package.json` — confirmed installed versions
- `05-CONTEXT.md` — locked decisions and canonical refs
- `05-UI-SPEC.md` — component inventory, interaction contracts, copywriting
- `DESIGN.md` — design system
- `vitest.config.mts` — test framework config
- Recharts: `npm view recharts version` → 3.8.1 confirmed current

### Secondary (MEDIUM confidence)
- Recharts v3 API: backward compatible with v2 for `BarChart`, `PieChart`, `ResponsiveContainer` — confirmed from changelog pattern. Specific v3 type improvements are new.
- Stripe `refunds.create()` with `payment_intent` parameter: established API, no breaking changes in v17-v21 range per Stripe changelog patterns.

### Tertiary (LOW confidence)
- NZ IRD GST filing period frequencies (1-month, 2-month, 6-month): based on user decision D-10. Not independently verified against IRD.govt.nz — but IRD period choices are a user/business decision, not a technical one.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries verified in package.json, versions confirmed
- Architecture patterns: HIGH — derived directly from existing codebase patterns
- Pitfalls: HIGH (schema mismatch), HIGH (auth), MEDIUM (stock RPC), HIGH (Recharts client-only)
- Schema discrepancy: HIGH — verified by direct inspection of both files

**Research date:** 2026-04-01
**Valid until:** 2026-05-01 (stable stack — Recharts, Stripe, Supabase JS are not fast-moving for this use case)
