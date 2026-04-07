# Phase 36: Advanced Reporting / COGS Add-On - Context

**Gathered:** 2026-04-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Merchants can track product cost prices and generate profit/margin reports by date range and category. Includes: add-on subscription gating ($9/mo), cost price field per product, margin % display in product list, COGS report with revenue/cost/margin breakdown, category profit grouping, and CSV export.

</domain>

<decisions>
## Implementation Decisions

### Cost Price Entry
- **D-01:** Cost price field added to the existing product create/edit form, next to the selling price. No bulk editor or separate page.
- **D-02:** Cost price is GST-exclusive (supplier cost excl GST). Margin calculated as: sell price excl GST minus cost price.
- **D-03:** Products with no cost price set show "—" for margin in the product list and are excluded from COGS report margin calculations. No zero-cost assumption.

### Report Presentation
- **D-04:** COGS report lives as a new "Profit & Margin" tab on the existing Reports page, alongside Sales, Products, Stock, GST. Reuses existing date range picker.
- **D-05:** Report layout: summary cards at top (total revenue, total cost, total margin, margin %) + sortable per-product table below. Follows existing SalesSummaryTable pattern.
- **D-06:** Category profit breakdown uses collapsible category rows with aggregated revenue/cost/margin. Click to expand and see individual products within each category.

### Gating & Visibility
- **D-07:** "Profit & Margin" tab is hidden (not rendered) when COGS add-on is not subscribed. No locked/teaser state. Merchant discovers the feature on the Billing page.
- **D-08:** Cost price field in the product form is hidden when COGS add-on is not subscribed. No disabled/locked state.
- **D-09:** Margin % column in the product list only appears when COGS add-on is active.

### CSV Export
- **D-10:** CSV export includes full product-level detail: product name, SKU, category, units sold, revenue (excl GST), cost, margin ($), margin (%). One row per product.
- **D-11:** CSV filename includes date range: `cogs-report-YYYY-MM-DD-to-YYYY-MM-DD.csv`.

### Prior Decisions (carried forward)
- **D-12:** requireFeature() JWT/DB dual-path is the gating mechanism (established pattern for all add-ons)
- **D-13:** Add-on billing uses `src/config/addons.ts` + Stripe Price ID env var + webhook handler pattern
- **D-14:** Add-on admin pages appear under "Add-ons" section in admin sidebar (Phase 35 D-16)

### Claude's Discretion
- DB migration design (cost_price_cents column on products table, indexes)
- Summary card styling and layout within the existing Reports page design system
- Collapsible row interaction design (expand/collapse animation, chevron icon)
- How to calculate COGS when the same product had different cost prices over time (snapshot vs current cost)
- Error/empty states for COGS report when no products have cost prices set

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Feature Gating & Billing
- `src/lib/requireFeature.ts` — JWT/DB dual-path feature gate; add `advanced_reporting` feature
- `src/config/addons.ts` — Add-on type definitions and Stripe Price ID mapping; add COGS add-on entry
- `src/actions/billing/createSubscriptionCheckoutSession.ts` — Subscription checkout pattern to replicate
- `src/app/api/webhooks/stripe/billing/route.ts` — Billing webhook; add `has_advanced_reporting` flag handling

### Product Admin
- `src/app/admin/products/page.tsx` — Product list server component; add margin column + cost price conditional
- `src/components/admin/products/ProductsPageClient.tsx` — Product list client component; add margin display

### Reports
- `src/app/admin/reports/page.tsx` — Reports server component with date range queries; add COGS data queries
- `src/components/admin/reports/ReportsPageClient.tsx` — Reports client with tab switching; add Profit & Margin tab
- `src/components/admin/reports/SalesSummaryTable.tsx` — Pattern for summary cards + table layout
- `src/components/admin/reports/ExportCSVButton.tsx` — Existing CSV export component using PapaParse; reuse for COGS export
- `src/components/admin/reports/ReportDateRangePicker.tsx` — Existing date range picker; reuse as-is

### Admin Navigation
- `src/app/admin/layout.tsx` — Admin sidebar; COGS page goes under existing Add-ons section

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `ExportCSVButton` component: PapaParse-based CSV export with automatic cents-to-dollars conversion. Reuse directly for COGS export.
- `ReportDateRangePicker`: Date preset picker (today, week, month, custom). Reuse for COGS date filtering.
- `SalesSummaryTable` + `SalesBarChart`: Existing report table/chart patterns to follow for COGS layout.
- `requireFeature()`: Established feature gate with JWT fast-path + DB fallback. Add `advanced_reporting` feature key.
- `addons.ts`: Centralized add-on config with feature → Price ID mapping. Add COGS add-on entry.

### Established Patterns
- Reports page uses server component for data fetching + client component for interactivity (tab switching, date picker).
- Feature gating: `user.app_metadata` JWT claims checked in server components (e.g., `hasInventory` check in reports/products pages).
- Products table currently has no cost_price column — needs DB migration to add `cost_price_cents INTEGER NULL`.
- CSV export uses client-side PapaParse with blob download pattern.

### Integration Points
- Reports page tab list: add "Profit & Margin" tab conditionally when `hasAdvancedReporting` is true.
- Product form: add cost price input field conditionally when add-on is active.
- Product list: add margin % column conditionally when add-on is active.
- Billing webhook: map new Stripe Price ID → `has_advanced_reporting` column in `store_plans`.

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 36-advanced-reporting-cogs-add-on*
*Context gathered: 2026-04-07*
