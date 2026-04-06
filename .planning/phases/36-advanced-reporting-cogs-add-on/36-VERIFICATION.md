---
phase: 36-advanced-reporting-cogs-add-on
verified: 2026-04-07T07:21:00Z
status: passed
score: 5/5 must-haves verified
gaps: []
---

# Phase 36: Advanced Reporting / COGS Add-On Verification Report

**Phase Goal:** Merchants can track product cost prices and generate profit/margin reports by date range and category
**Verified:** 2026-04-07T07:21:00Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Success Criteria Verification

Phase 36 has 5 success criteria from ROADMAP.md, all verified:

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | Merchant can subscribe to Advanced Reporting add-on at $9/mo via Stripe and the feature activates | VERIFIED | `advanced_reporting` registered in all 5 locations in `addons.ts`; `createSubscriptionCheckoutSession.ts` featureSchema includes `'advanced_reporting'`; `034_cogs.sql` adds `has_advanced_reporting BOOLEAN NOT NULL DEFAULT false` to `store_plans`; billing webhook tests pass (2/2 advanced_reporting cases) |
| 2 | Merchant can enter a cost price per product and see the margin percentage displayed in the product list | VERIFIED | `ProductFormDrawer.tsx` conditionally renders cost price `PriceInput` when `hasAdvancedReporting` (line 322); `ProductDataTable.tsx` conditionally renders "Margin %" column with color-coded values when `hasAdvancedReporting` (line 213); `createProduct.ts` and `updateProduct.ts` persist `cost_price_cents`; Wave 0 schema tests pass (7/7) |
| 3 | Merchant can generate a COGS report for a chosen date range showing revenue, cost, and margin per product | VERIFIED | `reports/page.tsx` fetches order_items + product cost data under `hasAdvancedReporting && tab === 'profit'` guard; `aggregateCOGS` called with real DB query results; `CogsReportTable.tsx` renders sortable per-product table with revenue/cost/margin columns |
| 4 | Merchant can view a profit breakdown grouped by product category | VERIFIED | `groupByCategory` called in `reports/page.tsx` (line 182); `CogsCategoryBreakdown.tsx` renders collapsible rows with `expandedCategories` Set state; category totals aggregated correctly per 17 passing unit tests |
| 5 | Merchant can export COGS report data as a CSV file | VERIFIED | `formatCogsCSV` called in `reports/page.tsx` (line 183); `ExportCSVButton` rendered in `ReportsPageClient.tsx` with dynamic filename `cogs-report-${fromDateStr}-to-${toDateStr}` (line 283); CSV includes all 8 required columns |

**Score:** 5/5 success criteria verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `supabase/migrations/034_cogs.sql` | has_advanced_reporting + cost_price_cents columns | VERIFIED | Contains `has_advanced_reporting BOOLEAN NOT NULL DEFAULT false`, `cost_price_cents INTEGER NULL`, CHECK constraint, and partial index `idx_products_cost_price` |
| `src/config/addons.ts` | advanced_reporting add-on registration | VERIFIED | `SubscriptionFeature` union, `FeatureFlags` interface, `PRICE_ID_MAP`, `PRICE_TO_FEATURE`, `FEATURE_TO_COLUMN`, `ADDONS` array — all 5 registration points updated |
| `src/schemas/product.ts` | cost_price_cents in product schemas | VERIFIED | `cost_price_cents: z.number().int().min(0).nullable().optional()` added to `CreateProductSchema`; `UpdateProductSchema` inherits via `.partial()` |
| `src/actions/products/createProduct.ts` | cost_price_cents persisted | VERIFIED | Extracts `rawCostPriceCents` from FormData and includes in Supabase insert via `parsed.data` spread |
| `src/actions/products/updateProduct.ts` | cost_price_cents persisted | VERIFIED | Extracts `rawCostPriceCents` from FormData and includes in Supabase update |
| `src/actions/billing/createSubscriptionCheckoutSession.ts` | advanced_reporting in featureSchema | VERIFIED | `z.enum(['xero', 'custom_domain', 'inventory', 'gift_cards', 'advanced_reporting'])` |
| `src/app/admin/layout.tsx` | has_advanced_reporting queried from DB | VERIFIED | Selects `has_gift_cards, has_advanced_reporting` from `store_plans`; passes `hasAdvancedReporting` to `AdminSidebar` |
| `src/components/admin/AdminSidebar.tsx` | Add-ons section condition updated | VERIFIED | `hasGiftCards === true \|\| hasAdvancedReporting === true` controls Add-ons section visibility |
| `src/app/admin/products/page.tsx` | hasAdvancedReporting read from app_metadata | VERIFIED | `const hasAdvancedReporting = (user?.app_metadata?.advanced_reporting as boolean \| undefined) === true` |
| `src/components/admin/products/ProductsPageClient.tsx` | hasAdvancedReporting forwarded | VERIFIED | Accepts and passes `hasAdvancedReporting` to both `ProductDataTable` and `ProductFormDrawer` |
| `src/components/admin/products/ProductFormDrawer.tsx` | Conditional cost price input | VERIFIED | `hasAdvancedReporting?: boolean` prop; `costPriceCents` state; conditional `PriceInput` with "(excl. GST)" annotation |
| `src/components/admin/products/ProductDataTable.tsx` | Conditional margin % column | VERIFIED | `cost_price_cents: number \| null` on `ProductWithCategory`; conditional "Margin %" header and color-coded cells; null shows "---" |
| `src/lib/cogs.ts` | 5 exported pure functions | VERIFIED | Exports `aggregateCOGS`, `calculateMarginPercent`, `productMarginPercent`, `groupByCategory`, `formatCogsCSV` plus 4 types |
| `src/lib/cogs.test.ts` | 17 passing tests | VERIFIED | All 17 tests pass across 4 describe blocks (confirmed by test runner) |
| `src/actions/products/__tests__/costPrice.test.ts` | Cost price schema tests | VERIFIED | 7 tests pass covering accept/reject cases for CreateProductSchema and UpdateProductSchema |
| `src/app/api/webhooks/stripe/billing/__tests__/billing.test.ts` | has_advanced_reporting billing tests | VERIFIED | 2 additional tests pass: activate (true) and cancel (false) |
| `src/app/admin/reports/page.tsx` | COGS queries + aggregation | VERIFIED | Imports `aggregateCOGS`, `groupByCategory`, `formatCogsCSV`; COGS query block gated on `hasAdvancedReporting && tab === 'profit'` |
| `src/components/admin/reports/ReportsPageClient.tsx` | Profit & Margin tab | VERIFIED | Conditional tab button; `calculateMarginPercent` used for summary totals; two empty states; ExportCSVButton with dynamic filename |
| `src/components/admin/reports/CogsReportSummaryCards.tsx` | 4 summary cards | VERIFIED | Contains "Revenue (excl. GST)", "Total Cost", "Gross Profit", "Margin %" in `grid grid-cols-2 md:grid-cols-4 gap-3` |
| `src/components/admin/reports/CogsReportTable.tsx` | Sortable COGS table | VERIFIED | `useState` sort state; `bg-navy text-white` thead; `tfoot` with `border-t-2`; margin % color coding |
| `src/components/admin/reports/CogsCategoryBreakdown.tsx` | Collapsible category breakdown | VERIFIED | `expandedCategories` as `Set<string>`; `rotate-90` chevron; `pl-10` product sub-row indent |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/config/addons.ts` | `createSubscriptionCheckoutSession.ts` | `'advanced_reporting'` in featureSchema z.enum | WIRED | Line 13 confirmed |
| `src/app/admin/products/page.tsx` | `ProductsPageClient.tsx` | `hasAdvancedReporting` prop | WIRED | Passed at line 28 |
| `src/app/admin/reports/page.tsx` | `src/lib/cogs.ts` | `import { aggregateCOGS }` | WIRED | Line 5 confirmed; used at line 180 |
| `ReportsPageClient.tsx` | `src/lib/cogs.ts` | `import { calculateMarginPercent }` | WIRED | Line 15; used at line 135 |
| `ReportsPageClient.tsx` | `CogsReportSummaryCards.tsx` | Component composition | WIRED | Imported line 12; rendered at line 270 |
| `ReportsPageClient.tsx` | `CogsCategoryBreakdown.tsx` | Component composition | WIRED | Imported line 14; rendered at line 293 |
| `CogsReportTable.tsx` | `src/lib/cogs.ts` | `import type { CogsLineItem }` | WIRED | Line 5 confirmed |
| `src/app/admin/layout.tsx` | `AdminSidebar.tsx` | `hasAdvancedReporting` prop | WIRED | Line 74 confirmed |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `CogsReportSummaryCards.tsx` | `totalRevenueExclGstCents`, `totalCostCents`, `totalMarginCents`, `overallMarginPercent` | Computed from `cogsData` in `ReportsPageClient.tsx` using `calculateMarginPercent` | Yes — derived from live DB query in `reports/page.tsx` | FLOWING |
| `CogsReportTable.tsx` | `data: CogsLineItem[]` | `cogsData` from `reports/page.tsx` via `aggregateCOGS(cogsItems, productCosts)` | Yes — `order_items` and `products` DB queries with real `productIds` | FLOWING |
| `CogsCategoryBreakdown.tsx` | `data: CogsCategoryGroup[]` | `cogsCategoryGroups` from `groupByCategory(cogsData)` | Yes — real aggregation of live DB data | FLOWING |
| `ProductDataTable.tsx` margin column | `product.cost_price_cents` | Products select with `select('*, categories(name)')` in `products/page.tsx` | Yes — `*` wildcard includes `cost_price_cents` post-migration | FLOWING |
| `ExportCSVButton` in reports | `cogsCSVData` | `formatCogsCSV(cogsData)` from live query | Yes — live data mapped to CSV row objects | FLOWING |

---

### Behavioral Spot-Checks

| Behavior | Result | Status |
|----------|--------|--------|
| `src/lib/cogs.test.ts` — 17 COGS calculation tests | All 17 pass | PASS |
| `src/actions/products/__tests__/costPrice.test.ts` — 7 schema tests | All 7 pass | PASS |
| `billing.test.ts` — has_advanced_reporting activation/cancellation tests | Both pass (14/14 total) | PASS |
| `cogs.ts` exports 5 functions | `aggregateCOGS`, `calculateMarginPercent`, `productMarginPercent`, `groupByCategory`, `formatCogsCSV` all exported | PASS |
| `ProductFormDrawer.tsx` includes `cost_price_cents` in FormData submission | Conditional append under `hasAdvancedReporting` guard at line 163-168 | PASS |
| `reports/page.tsx` COGS query runs only under feature flag | `if (hasAdvancedReporting && tab === 'profit' && orderIds.length > 0)` at line 149 | PASS |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| COGS-01 | 36-00, 36-01 | Merchant can enable the Advanced Reporting add-on ($9/mo) via Stripe subscription | SATISFIED | `addons.ts` registers `advanced_reporting`; featureSchema updated; migration adds `has_advanced_reporting`; billing webhook tests pass |
| COGS-02 | 36-00, 36-01 | Merchant can set cost price per product in the product admin form | SATISFIED | `cost_price_cents` in `CreateProductSchema` + `UpdateProductSchema`; `ProductFormDrawer.tsx` renders conditional `PriceInput`; persisted via `createProduct.ts` / `updateProduct.ts` |
| COGS-03 | 36-01 | Merchant can view profit margin percentage per product in the product list | SATISFIED | `ProductDataTable.tsx` conditionally renders "Margin %" column with `productMarginPercent()` color-coded values |
| COGS-04 | 36-02, 36-03 | Merchant can generate a COGS report by date range showing revenue, cost, and margin | SATISFIED | `reports/page.tsx` queries COGS data by date range; `CogsReportTable.tsx` shows per-product revenue/cost/margin; `CogsReportSummaryCards.tsx` shows summary totals |
| COGS-05 | 36-02, 36-03 | Merchant can view a profit breakdown grouped by product category | SATISFIED | `groupByCategory()` produces `CogsCategoryGroup[]`; `CogsCategoryBreakdown.tsx` renders collapsible category rows with aggregated totals |
| COGS-06 | 36-02, 36-03 | Merchant can export COGS reports as CSV | SATISFIED | `formatCogsCSV()` maps to flat CSV rows; `ExportCSVButton` renders with `cogs-report-{fromDateStr}-to-{toDateStr}` filename |

All 6 COGS requirements are satisfied. No orphaned requirements for Phase 36.

---

### Anti-Patterns Found

No blocking anti-patterns found.

| File | Pattern | Severity | Impact |
|------|---------|----------|--------|
| `src/app/admin/products/page.tsx` | `as unknown as ProductWithCategory[]` cast | Info | Pre-existing Supabase type-generation lag; documented inline; same pattern as gift cards |
| `src/app/admin/reports/page.tsx` | `as unknown as ProductCostRow[]` cast | Info | Same root cause — Supabase generated types predate migration 034; documented with inline comment |

Neither cast is a stub — both are documented workarounds for Supabase type generation lag with real data flowing through.

---

### Human Verification Required

The following items cannot be verified programmatically:

#### 1. Stripe Billing Integration End-to-End

**Test:** Navigate to Admin > Settings > Add-ons. Click "Upgrade" for Advanced Reporting. Complete Stripe Checkout. Return to admin.
**Expected:** `has_advanced_reporting` set to `true` in `store_plans`; cost price field appears in product form; "Margin %" column appears in product list; "Profit & Margin" tab appears on Reports page.
**Why human:** Requires a live Stripe test session and Supabase DB verification; cannot test webhook flow without a running server.

#### 2. Profit & Margin Tab Visual Layout

**Test:** With the Advanced Reporting add-on active and cost prices set on at least 2 products, navigate to Admin > Reports > Profit & Margin.
**Expected:** 4 summary cards in 2-column (mobile) / 4-column (desktop) grid; sortable product table with color-coded margin %; collapsible category rows that expand/collapse on click with chevron animation.
**Why human:** Visual layout, responsive breakpoints, and interactive collapse behavior cannot be verified by static analysis.

#### 3. Cost Price GST-Exclusivity UX

**Test:** Open product form for a product priced at $11.50 (incl. GST). Enter cost price of $5.00. Verify the margin shown in the product list.
**Expected:** Margin % = ((11.50/1.15 - 5.00) / (11.50/1.15)) * 100 = 50.0%.
**Why human:** Requires UI interaction to confirm the "(excl. GST)" annotation is clear to merchants and the calculated margin is correct end-to-end.

#### 4. CSV Export File

**Test:** On Profit & Margin tab with data, click "Export COGS CSV".
**Expected:** File downloads as `cogs-report-YYYY-MM-DD-to-YYYY-MM-DD.csv` with columns: product_name, sku, category, units_sold, revenue_excl_gst_cents, cost_cents, margin_cents, margin_percent.
**Why human:** File download behavior requires browser interaction.

---

### Gaps Summary

No gaps. All 5 success criteria verified. All 6 requirement IDs (COGS-01 through COGS-06) satisfied. All key artifacts exist, are substantive, are wired, and have real data flowing through them. All 24 automated tests pass (17 COGS unit tests + 7 cost price schema tests; billing webhook tests also pass).

---

_Verified: 2026-04-07T07:21:00Z_
_Verifier: Claude (gsd-verifier)_
