# Phase 36: Advanced Reporting / COGS Add-On - Research

**Researched:** 2026-04-07
**Domain:** COGS reporting, cost price tracking, Stripe subscription gating, CSV export
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Cost price field added to the existing product create/edit form, next to the selling price. No bulk editor or separate page.
- **D-02:** Cost price is GST-exclusive (supplier cost excl GST). Margin calculated as: sell price excl GST minus cost price.
- **D-03:** Products with no cost price set show "—" for margin in the product list and are excluded from COGS report margin calculations. No zero-cost assumption.
- **D-04:** COGS report lives as a new "Profit & Margin" tab on the existing Reports page, alongside Sales, Products, Stock, GST. Reuses existing date range picker.
- **D-05:** Report layout: summary cards at top (total revenue, total cost, total margin, margin %) + sortable per-product table below. Follows existing SalesSummaryTable pattern.
- **D-06:** Category profit breakdown uses collapsible category rows with aggregated revenue/cost/margin. Click to expand and see individual products within each category.
- **D-07:** "Profit & Margin" tab is hidden (not rendered) when COGS add-on is not subscribed. No locked/teaser state. Merchant discovers the feature on the Billing page.
- **D-08:** Cost price field in the product form is hidden when COGS add-on is not subscribed. No disabled/locked state.
- **D-09:** Margin % column in the product list only appears when COGS add-on is active.
- **D-10:** CSV export includes full product-level detail: product name, SKU, category, units sold, revenue (excl GST), cost, margin ($), margin (%). One row per product.
- **D-11:** CSV filename includes date range: `cogs-report-YYYY-MM-DD-to-YYYY-MM-DD.csv`.
- **D-12:** requireFeature() JWT/DB dual-path is the gating mechanism (established pattern for all add-ons).
- **D-13:** Add-on billing uses `src/config/addons.ts` + Stripe Price ID env var + webhook handler pattern.
- **D-14:** Add-on admin pages appear under "Add-ons" section in admin sidebar (Phase 35 D-16).

### Claude's Discretion

- DB migration design (cost_price_cents column on products table, indexes)
- Summary card styling and layout within the existing Reports page design system
- Collapsible row interaction design (expand/collapse animation, chevron icon)
- How to calculate COGS when the same product had different cost prices over time (snapshot vs current cost)
- Error/empty states for COGS report when no products have cost prices set

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| COGS-01 | Merchant can enable the Advanced Reporting add-on ($9/mo) via Stripe subscription | `addons.ts` extension pattern documented; `STRIPE_PRICE_ADVANCED_REPORTING` env var; webhook `has_advanced_reporting` column |
| COGS-02 | Merchant can set cost price per product in the product admin form | `cost_price_cents INTEGER NULL` migration; `ProductFormDrawer` conditional field; `updateProduct`/`createProduct` server actions updated |
| COGS-03 | Merchant can view profit margin percentage per product in the product list | `ProductDataTable` margin column; `ProductWithCategory` type extended; margin formula defined |
| COGS-04 | Merchant can generate a COGS report by date range showing revenue, cost, and margin | New `tab=profit` query in `reports/page.tsx`; `CogsReportTable` component; summary cards |
| COGS-05 | Merchant can view a profit-by-category breakdown report | Collapsible category rows in COGS tab; aggregation by `categories.name` |
| COGS-06 | Merchant can export COGS reports as CSV | Reuse `ExportCSVButton` with COGS-specific data; dynamic filename with date range |
</phase_requirements>

---

## Summary

Phase 36 adds a COGS (Cost of Goods Sold) / Advanced Reporting add-on following the exact same billing + gating + UI pattern established in Phase 35 (Gift Cards). The implementation is primarily integration work across six well-understood extension points: `addons.ts`, the billing webhook, the products table migration, the product form drawer, the product data table, and the reports page. No new architectural concepts are required.

The most nuanced decision — how to calculate COGS for a product whose cost price changed mid-period — is left to Claude's discretion. The recommended approach (detailed below) is **current-cost snapshot**: use whatever `cost_price_cents` is stored on the product at query time, applied retroactively to all units sold in the period. This is the simplest correct implementation for a single-store POS where the merchant is the sole operator entering cost prices. It is consistent with how most small-business POS/reporting tools work and avoids complexity of a cost-price audit log.

The COGS query pattern requires a multi-step approach matching the existing two-query design in `reports/page.tsx`: fetch order IDs in range, then fetch order_items for those IDs with a JOIN back to products for the current cost price. Because Supabase JS v2 cross-table filters are known to be unreliable (documented in the codebase), the same two-query pattern must be followed.

**Primary recommendation:** Follow Phase 35 patterns exactly. Add `advanced_reporting` to `addons.ts`, add `has_advanced_reporting` to `store_plans` via migration, wire webhook, add `cost_price_cents NULL` to products, extend form/table conditionally, add Profit & Margin tab to reports.

---

## Standard Stack

### Core (existing — no new dependencies required)

| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| @supabase/supabase-js | ^2.x | DB queries for COGS data | Already the data layer |
| Zod | ^3.x | Server action input validation for cost_price | Already used for all product actions |
| PapaParse | existing | CSV generation | Already used in `ExportCSVButton` |
| React useState | built-in | Collapsible category row state | Existing client component pattern |

No new npm packages needed. All capabilities are available in the existing stack.

### Installation

No new packages to install.

---

## Architecture Patterns

### Pattern 1: Add-On Registration (addons.ts)

The `addons.ts` file is the single source of truth for add-on metadata. Three parallel additions are required:

1. Add `'advanced_reporting'` to the `SubscriptionFeature` union type
2. Add `has_advanced_reporting: boolean` to the `FeatureFlags` interface
3. Add entry to `PRICE_ID_MAP`, `PRICE_TO_FEATURE`, `FEATURE_TO_COLUMN`, and `ADDONS` array

**Example pattern (mirrors gift_cards entry):**
```typescript
// In SubscriptionFeature union:
export type SubscriptionFeature = 'xero' | 'custom_domain' | 'inventory' | 'gift_cards' | 'advanced_reporting'

// In FeatureFlags:
has_advanced_reporting: boolean

// In PRICE_ID_MAP:
advanced_reporting: process.env.STRIPE_PRICE_ADVANCED_REPORTING ?? '',

// In PRICE_TO_FEATURE:
...(process.env.STRIPE_PRICE_ADVANCED_REPORTING
  ? { [process.env.STRIPE_PRICE_ADVANCED_REPORTING]: 'has_advanced_reporting' as const }
  : {}),

// In FEATURE_TO_COLUMN:
advanced_reporting: 'has_advanced_reporting',

// In ADDONS array:
{
  feature: 'advanced_reporting' as SubscriptionFeature,
  name: 'Advanced Reporting',
  benefitLine: 'Track product costs and generate profit & margin reports.',
  gatedHeadline: 'Advanced Reporting requires an upgrade',
  gatedBody: 'Enter cost prices per product and generate COGS reports by date range.',
},
```

The `createSubscriptionCheckoutSession` server action uses a `z.enum(...)` schema that must also be updated to include `'advanced_reporting'`.

### Pattern 2: Feature Check in Server Components

The existing pattern reads the feature from JWT app_metadata. For `advanced_reporting`, replicate the `hasInventory` and `hasGiftCards` patterns:

```typescript
// In reports/page.tsx server component:
const hasAdvancedReporting = (user?.app_metadata?.advanced_reporting as boolean | undefined) === true

// In admin/layout.tsx — read from store_plans (same as hasGiftCards):
const { data: storePlan } = await adminClient
  .from('store_plans')
  .select('has_gift_cards, has_advanced_reporting')
  .eq('store_id', storeId)
  .maybeSingle()
hasAdvancedReporting = storePlan?.has_advanced_reporting === true
```

Note: `AdminSidebar` does not need a COGS link (no dedicated admin page for COGS — it lives on the Reports page). The sidebar only needs `hasAdvancedReporting` passed if there is a dedicated add-on admin page. Per the decisions, there is no dedicated page — only the Reports tab.

### Pattern 3: COGS Database Migration (034_cogs.sql)

```sql
-- Add has_advanced_reporting to store_plans
ALTER TABLE public.store_plans
  ADD COLUMN has_advanced_reporting BOOLEAN NOT NULL DEFAULT false;

-- Add cost_price_cents to products (nullable — NULL means "not set")
ALTER TABLE public.products
  ADD COLUMN cost_price_cents INTEGER NULL
  CHECK (cost_price_cents IS NULL OR cost_price_cents >= 0);

-- Index for COGS report queries (products with cost prices)
CREATE INDEX idx_products_cost_price ON public.products(store_id)
  WHERE cost_price_cents IS NOT NULL;
```

No RLS changes needed: `products` table already has tenant-scoped RLS policies. The new column inherits existing policies.

### Pattern 4: COGS Query in reports/page.tsx

The COGS report requires product-level revenue aggregation joined with current cost price. Because Supabase JS v2 cross-table filters are unreliable (documented comment in existing code), use the established two-query pattern:

```typescript
// Step 1: Get completed order IDs in range (already done by existing query)
// orderIds is already computed — reuse it

// Step 2: Fetch order_items with product_id and line amounts
// Step 3: Fetch products with cost_price_cents for those product_ids
// Step 4: Join in-memory

// Only run when hasAdvancedReporting === true AND tab === 'profit'
let cogsData: CogsLineItem[] = []
if (hasAdvancedReporting && tab === 'profit' && orderIds.length > 0) {
  const { data: items } = await supabase
    .from('order_items')
    .select('product_id, product_name, quantity, line_total_cents, gst_cents')
    .in('order_id', orderIds)

  // Collect unique product_ids that have a product_id (not null for old records)
  const productIds = [...new Set((items ?? []).map(i => i.product_id).filter(Boolean))]

  let productCosts: Array<{ id: string; cost_price_cents: number | null; category_id: string | null; categories: { name: string } | null }> = []
  if (productIds.length > 0) {
    const { data } = await supabase
      .from('products')
      .select('id, cost_price_cents, category_id, categories(name)')
      .in('id', productIds)
    productCosts = data ?? []
  }

  // Join items with cost data
  cogsData = aggregateCOGS(items ?? [], productCosts)
}
```

**Critical note on `product_id` in `order_items`:** The existing `order_items` SELECT in `reports/page.tsx` does not include `product_id`. The COGS query needs it. Must add `product_id` to the order_items select for the COGS path. Verify `order_items` has a `product_id` column by checking the migration files (it is expected to exist from the original schema).

### Pattern 5: Margin Calculation

Per D-02, cost price is GST-exclusive. The sell price in the database (`price_cents`) is GST-inclusive (NZ standard). Revenue in `line_total_cents` in order_items is also GST-inclusive.

```typescript
// Revenue excl GST per line = line_total_cents - gst_cents
// Margin per unit = (revenue_excl_gst / quantity) - cost_price_cents
// Margin % = margin_dollars / revenue_excl_gst * 100

function calculateMarginPercent(
  revenueExclGstCents: number,
  totalCostCents: number
): number | null {
  if (revenueExclGstCents === 0) return null
  return ((revenueExclGstCents - totalCostCents) / revenueExclGstCents) * 100
}

// Product margin display in product list
// sell price excl GST = price_cents / 1.15 (NZ GST 15%)
// margin % = (sell_excl_gst - cost_price_cents) / sell_excl_gst * 100
function productMarginPercent(priceCents: number, costPriceCents: number): number {
  const sellExclGst = priceCents / 1.15
  return ((sellExclGst - costPriceCents) / sellExclGst) * 100
}
```

### Pattern 6: Collapsible Category Rows

Client component state for expand/collapse. No external library needed.

```typescript
const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())

function toggleCategory(categoryName: string) {
  setExpandedCategories(prev => {
    const next = new Set(prev)
    if (next.has(categoryName)) next.delete(categoryName)
    else next.add(categoryName)
    return next
  })
}
```

Render: category row with chevron icon → `rotate-90` when expanded. Products sub-rows conditionally rendered.

### Pattern 7: Conditional Cost Price Field in ProductFormDrawer

Following the `hasInventory` pattern precisely:

```tsx
{/* Cost Price — only shown when COGS add-on is active */}
{hasAdvancedReporting && (
  <div className="flex flex-col gap-1">
    <label htmlFor="drawer-cost-price" className="text-sm font-semibold font-sans text-text">
      Cost Price <span className="text-text-muted text-xs">(excl. GST)</span>
    </label>
    <PriceInput
      initialCents={product?.cost_price_cents ?? undefined}
      onPriceChange={setCostPriceCents}
    />
    <p className="text-sm font-sans text-text-muted">
      Supplier cost excluding GST. Used to calculate profit margin.
    </p>
  </div>
)}
```

The `hasAdvancedReporting` prop flows: `ProductsPage` (server) → `ProductsPageClient` → `ProductFormDrawer` and `ProductDataTable`.

### Pattern 8: CSV Export with Dynamic Filename

The existing `ExportCSVButton` takes a `filename` prop (no extension). For COGS:

```tsx
const cogsFilename = `cogs-report-${customFrom ?? fromDate}-to-${customTo ?? toDate}`
<ExportCSVButton
  data={cogsCSVData}
  filename={cogsFilename}
  label="Export COGS CSV"
/>
```

The `ExportCSVButton` automatically appends `.csv` to `anchor.download`. COGS CSV data shape (one row per product):

```typescript
const cogsCSVData = cogsProducts.map(p => ({
  product_name: p.productName,
  sku: p.sku ?? '',
  category: p.categoryName ?? '',
  units_sold: p.unitsSold,
  revenue_excl_gst_cents: p.revenueExclGstCents,  // auto-converted by ExportCSVButton
  cost_cents: p.costCents,                          // auto-converted by ExportCSVButton
  margin_cents: p.marginCents,                      // auto-converted by ExportCSVButton
  margin_percent: p.marginPercent !== null ? p.marginPercent.toFixed(1) + '%' : '—',
}))
```

### Recommended Project Structure (new files only)

```
src/
├── components/admin/reports/
│   ├── CogsReportTable.tsx          # Per-product sortable table
│   ├── CogsReportSummaryCards.tsx   # 4 summary cards (revenue, cost, margin $, margin %)
│   └── CogsCategoryBreakdown.tsx    # Collapsible category rows
├── lib/
│   └── cogs.ts                      # aggregateCOGS(), calculateMarginPercent(), productMarginPercent()
supabase/migrations/
└── 034_cogs.sql                     # has_advanced_reporting + cost_price_cents
```

### Anti-Patterns to Avoid

- **Storing cost price history:** The decisions use current-cost snapshot — do not add a `product_cost_history` table. That is a future PO/supplier management feature (PO-01..03).
- **Zero-cost assumption:** D-03 explicitly prohibits defaulting `NULL` cost to zero. Always exclude NULL-cost products from margin totals.
- **Full-page re-fetch on category expand:** Collapsible rows are pure client-side state. Do not trigger server re-fetch on expand/collapse.
- **Passing `cost_price_cents` to client components unnecessarily:** Only include it in COGS report data shape when `hasAdvancedReporting` is true.
- **Updating `createSubscriptionCheckoutSession` without updating the Zod enum:** The schema `z.enum(['xero', 'custom_domain', 'inventory', 'gift_cards'])` must include `'advanced_reporting'` or the action will return `invalid_feature`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CSV generation | Custom CSV string builder | `PapaParse` (already installed) | Handles escaping, special chars, encoding |
| Feature gating | New middleware/auth check | `requireFeature('advanced_reporting')` | Established dual-path JWT/DB pattern |
| Subscription checkout | Custom Stripe session builder | `createSubscriptionCheckoutSession('advanced_reporting')` | Handles customer reuse, metadata, trial |
| Webhook feature flag update | Custom webhook handler | Extend `PRICE_TO_FEATURE` in `addons.ts` | Existing handler handles all price→feature mappings |
| GST extraction | Custom tax math | `line_total_cents - gst_cents` from `order_items` | Already stored per-line in DB |

---

## Common Pitfalls

### Pitfall 1: order_items Missing product_id in Existing Queries

**What goes wrong:** The existing COGS query path in `reports/page.tsx` only selects `product_name, line_total_cents, quantity` from `order_items`. COGS needs `product_id` to join back to the products table for cost price.

**Why it happens:** The current queries were built only for revenue reporting, not cost joins.

**How to avoid:** In the new COGS query branch, select `product_id, product_name, quantity, line_total_cents, gst_cents` from `order_items`. Confirm `order_items.product_id` column exists (check migration `014_multi_tenant_schema.sql` or the DB schema).

**Warning signs:** TypeScript error on `items.product_id` access, or COGS data showing all zeros for cost.

### Pitfall 2: Stale JWT After Subscription Activation

**What goes wrong:** After the Stripe billing webhook fires and sets `has_advanced_reporting = true` in `store_plans`, the merchant's JWT still has `advanced_reporting: false` (or missing). The feature gate fast-path returns denied. The tab/fields don't appear until next sign-in.

**Why it happens:** Supabase JWT claims are baked at sign-in time. The billing webhook updates the DB but not the live JWT.

**How to avoid:** This is an existing known limitation of the JWT fast-path. The billing page should instruct the merchant to sign out and back in after subscribing. The DB fallback path (`requireFeature('advanced_reporting', { requireDbCheck: true })`) can be used for critical mutations.

**Warning signs:** Merchant subscribes, gets redirected back to billing page, but Profit & Margin tab still absent until page refresh after re-login.

### Pitfall 3: Margin % Denominator Is Zero

**What goes wrong:** Dividing by zero when revenue excl GST is zero (e.g., a free item, gift card redemption, full discount).

**How to avoid:** Guard all margin percentage calculations: `return revenueExclGstCents > 0 ? ... : null`. Display `null` as "—".

### Pitfall 4: cost_price_cents Propagation Through Product Form

**What goes wrong:** `createProduct` and `updateProduct` server actions don't include `cost_price_cents` in their Zod schema or DB write. Cost price is accepted by the form but silently dropped.

**How to avoid:** Add `cost_price_cents: z.number().int().min(0).nullable().optional()` to `CreateProductSchema` and `UpdateProductSchema` in `src/schemas/product.ts`. Include in server action form parsing and DB write.

**Warning signs:** Product saves without error but cost_price_cents remains NULL in DB.

### Pitfall 5: Admin Sidebar hasGiftCards vs hasAdvancedReporting

**What goes wrong:** The admin sidebar Add-ons section currently uses `hasGiftCards` to decide whether to render. If `hasGiftCards` is false but `hasAdvancedReporting` is true, the Add-ons label would not appear. But COGS has no dedicated sidebar link (it lives on Reports) so this may not apply — however, the layout query must be extended.

**How to avoid:** Extend `admin/layout.tsx` to query `has_advanced_reporting` from `store_plans` and pass it through. Pass `hasAdvancedReporting` to `AdminSidebar` for future-proofing even if no sidebar link is added in this phase.

### Pitfall 6: CSV Export Filename Escaping

**What goes wrong:** The `customFrom` / `customTo` date strings from URL params may be undefined, causing `undefined` in the filename string.

**How to avoid:** Compute the display-ready dates from the resolved `fromDate`/`toDate` variables (already computed in the server component), format as `YYYY-MM-DD`, and pass as static strings to the client props.

---

## Code Examples

### COGS Aggregation Logic

```typescript
// src/lib/cogs.ts
// Source: derived from existing aggregateTopProducts pattern in reports/page.tsx

interface OrderItem {
  product_id: string | null
  product_name: string
  quantity: number
  line_total_cents: number
  gst_cents: number
}

interface ProductCostData {
  id: string
  cost_price_cents: number | null
  category_id: string | null
  categories: { name: string } | null
}

export interface CogsLineItem {
  productId: string | null
  productName: string
  sku: string | null
  categoryName: string | null
  unitsSold: number
  revenueExclGstCents: number    // revenue minus GST
  costCents: number              // cost_price_cents * unitsSold (0 if no cost set)
  hasCostPrice: boolean          // false = exclude from margin totals
  marginCents: number | null     // null if no cost price
  marginPercent: number | null   // null if no cost price or zero revenue
}

export function aggregateCOGS(
  items: OrderItem[],
  productCosts: ProductCostData[]
): CogsLineItem[] {
  const costMap = new Map(productCosts.map(p => [p.id, p]))
  const map = new Map<string, CogsLineItem>()

  for (const item of items) {
    const key = item.product_id ?? item.product_name
    const costData = item.product_id ? costMap.get(item.product_id) : null
    const lineRevenueExclGst = item.line_total_cents - item.gst_cents

    const existing = map.get(key)
    if (existing) {
      existing.unitsSold += item.quantity
      existing.revenueExclGstCents += lineRevenueExclGst
      if (costData?.cost_price_cents != null) {
        existing.costCents += costData.cost_price_cents * item.quantity
      }
    } else {
      const hasCostPrice = costData?.cost_price_cents != null
      map.set(key, {
        productId: item.product_id,
        productName: item.product_name,
        sku: null, // not available from order_items
        categoryName: costData?.categories?.name ?? null,
        unitsSold: item.quantity,
        revenueExclGstCents: lineRevenueExclGst,
        costCents: hasCostPrice ? (costData!.cost_price_cents! * item.quantity) : 0,
        hasCostPrice,
        marginCents: null, // computed after aggregation
        marginPercent: null,
      })
    }
  }

  // Compute margins after aggregation
  return Array.from(map.values()).map(line => {
    if (!line.hasCostPrice) return line
    const marginCents = line.revenueExclGstCents - line.costCents
    const marginPercent = line.revenueExclGstCents > 0
      ? (marginCents / line.revenueExclGstCents) * 100
      : null
    return { ...line, marginCents, marginPercent }
  }).sort((a, b) => b.revenueExclGstCents - a.revenueExclGstCents)
}
```

### Summary Card Layout Pattern (from SalesSummaryTable/GSTSummaryBlock style)

```tsx
// CogsReportSummaryCards.tsx
// 4 cards: Total Revenue (excl GST), Total Cost, Gross Profit, Margin %
<div className="grid grid-cols-2 md:grid-cols-4 gap-[var(--space-md)]">
  <SummaryCard label="Revenue (excl. GST)" valueCents={totalRevenueExclGstCents} />
  <SummaryCard label="Total Cost" valueCents={totalCostCents} />
  <SummaryCard label="Gross Profit" valueCents={totalMarginCents} highlight />
  <SummaryCard label="Margin %" value={`${overallMarginPercent?.toFixed(1) ?? '—'}%`} />
</div>
```

### Collapsible Category Row Pattern

```tsx
// CogsCategoryBreakdown.tsx — key interaction
<tr
  onClick={() => toggleCategory(cat.name)}
  className="cursor-pointer hover:bg-surface bg-card border-t border-border"
>
  <td className="px-4 py-3 font-bold text-primary flex items-center gap-2">
    <svg
      className={`w-4 h-4 transition-transform ${expanded ? 'rotate-90' : ''}`}
      ...chevron icon...
    />
    {cat.name}
  </td>
  ...aggregate columns...
</tr>
{expanded && cat.products.map(p => (
  <tr key={p.productId} className="bg-surface border-t border-border/50 text-sm">
    <td className="pl-10 pr-4 py-2 text-text-muted">{p.productName}</td>
    ...
  </tr>
))}
```

---

## State of the Art

| Old Approach | Current Approach | Notes |
|--------------|------------------|-------|
| Manual CSV string building | PapaParse `unparse()` | Already used in ExportCSVButton |
| Separate cost tracking table | `cost_price_cents` column on products | Simpler for single-store, no audit log needed |

**COGS snapshot vs historical cost:** The decision to use current-cost snapshot (not a cost price history table) is appropriate for this phase. Small NZ retailers rarely change supplier costs, and when they do, the merchant understands reports reflect current pricing. Historical cost tracking (FIFO/WAC) is a Phase 2+ concern if demanded.

---

## Open Questions

1. **Does `order_items` have a `product_id` column?**
   - What we know: The existing `aggregateTopProducts` function uses `product_name` only. The migration `014_multi_tenant_schema.sql` created `order_items` — need to verify `product_id` is present.
   - What's unclear: If `product_id` is NOT present, COGS can only join by `product_name` (fragile — name changes break history).
   - Recommendation: Check `014_multi_tenant_schema.sql` before coding the COGS query. If `product_id` is absent, add it to `order_items` in the `034_cogs.sql` migration (or accept name-based join with documented limitation).

2. **`AdminSidebar` Add-ons section trigger condition**
   - What we know: Currently renders the Add-ons label only when `hasGiftCards === true`. If merchant has COGS but not gift cards, the section header won't render.
   - What's unclear: Whether a dedicated sidebar link for COGS will ever be needed (per decisions: no dedicated page).
   - Recommendation: Update sidebar to show Add-ons section when `hasGiftCards || hasAdvancedReporting`. Pass `hasAdvancedReporting` from layout.

---

## Environment Availability

Step 2.6: SKIPPED — this phase is code/config-only changes. No external tools, CLI utilities, or services beyond the existing Stripe + Supabase stack. Both are already available and operational.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest ^2.x |
| Config file | `vitest.config.mts` |
| Quick run command | `vitest run src/lib/cogs.test.ts` |
| Full suite command | `vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| COGS-01 | Billing webhook sets `has_advanced_reporting=true/false` | unit | `vitest run src/app/api/webhooks/stripe/billing/__tests__/billing.test.ts` | ✅ (extend existing) |
| COGS-02 | `createProduct` / `updateProduct` accept and persist `cost_price_cents` | unit | `vitest run src/actions/products/__tests__/costPrice.test.ts` | ❌ Wave 0 |
| COGS-03 | `productMarginPercent()` returns correct margin for known inputs | unit | `vitest run src/lib/cogs.test.ts` | ❌ Wave 0 |
| COGS-04 | `aggregateCOGS()` correctly aggregates revenue, cost, margin across items | unit | `vitest run src/lib/cogs.test.ts` | ❌ Wave 0 |
| COGS-05 | Category grouping produces correct aggregated totals | unit | `vitest run src/lib/cogs.test.ts` | ❌ Wave 0 |
| COGS-06 | CSV data shape has correct columns; filename contains date range | unit | `vitest run src/lib/cogs.test.ts` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `vitest run src/lib/cogs.test.ts`
- **Per wave merge:** `vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/lib/cogs.test.ts` — covers COGS-03, COGS-04, COGS-05, COGS-06 (pure function tests)
- [ ] `src/actions/products/__tests__/costPrice.test.ts` — covers COGS-02 (server action cost_price persistence)
- [ ] Extend `src/app/api/webhooks/stripe/billing/__tests__/billing.test.ts` — add test for `has_advanced_reporting` flag (COGS-01)

---

## Project Constraints (from CLAUDE.md)

All directives apply. Key constraints for this phase:

- **No Prisma, no raw pg, no Drizzle:** Use Supabase JS client for all DB access.
- **No Redux/Zustand:** Client state for collapsible rows uses `useState` only.
- **Tailwind v4 only:** No inline style blocks or CSS modules for layout.
- **Zod validation on all Server Actions:** `cost_price_cents` input must be validated with `z.number().int().min(0).nullable().optional()` before DB write.
- **`server-only` guard:** Any file touching Supabase credentials or Server Actions imports `server-only`.
- **Vitest for unit tests, Playwright for E2E:** Do not introduce Jest.
- **EFTPOS is standalone:** No software EFTPOS changes in this phase.
- **No offline mode:** No special handling for offline cost-price calculation.
- **GST 15% tax-inclusive:** Revenue excl GST = `line_total_cents - gst_cents`. Do NOT divide by 1.15 on `order_items.line_total_cents` (GST already stored separately per line). Use the stored `gst_cents` value directly.

---

## Sources

### Primary (HIGH confidence)

- Codebase: `src/config/addons.ts` — add-on registration pattern (read directly)
- Codebase: `src/lib/requireFeature.ts` — JWT/DB dual-path gating (read directly)
- Codebase: `src/app/api/webhooks/stripe/billing/route.ts` — webhook handler (read directly)
- Codebase: `src/app/admin/reports/page.tsx` — existing two-query pattern, tab structure (read directly)
- Codebase: `src/components/admin/reports/ExportCSVButton.tsx` — CSV export with cents conversion (read directly)
- Codebase: `src/components/admin/products/ProductFormDrawer.tsx` — conditional field pattern (read directly)
- Codebase: `src/components/admin/products/ProductDataTable.tsx` — conditional column pattern (read directly)
- Codebase: `supabase/migrations/033_gift_cards.sql` — migration pattern for add-on columns (read directly)

### Secondary (MEDIUM confidence)

- COGS snapshot approach: standard practice for single-store POS — current cost applied retroactively. Verified against stated decisions.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new libraries, all patterns from existing codebase
- Architecture: HIGH — direct read of all canonical reference files
- Pitfalls: HIGH — derived from codebase evidence and existing inline comments
- COGS math: HIGH — NZ GST is stored per-line in order_items, making calculation deterministic

**Research date:** 2026-04-07
**Valid until:** 2026-05-07 (stable codebase, no external dependencies)
