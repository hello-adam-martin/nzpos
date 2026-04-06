# Phase 36: Advanced Reporting / COGS Add-On - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-07
**Phase:** 36-advanced-reporting-cogs-add-on
**Areas discussed:** Cost price entry UX, Report presentation, Gating & visibility, CSV export scope

---

## Cost Price Entry UX

### Where to enter cost prices

| Option | Description | Selected |
|--------|-------------|----------|
| Product edit form | Add cost price field to existing product create/edit form, next to selling price | ✓ |
| Dedicated bulk editor | Separate page with editable table of all products | |
| Both | Form for individual + bulk editor for mass updates | |

**User's choice:** Product edit form
**Notes:** Simple, natural workflow — set cost when creating/editing products.

### Products without cost price

| Option | Description | Selected |
|--------|-------------|----------|
| Exclude from margin calc | Show "—" for margin, only include products with cost in reports | ✓ |
| Treat as zero cost | 100% margin assumption for products without cost | |
| Prompt to set cost | Banner/alert with link to fix, still exclude from calcs | |

**User's choice:** Exclude from margin calc
**Notes:** Clear and honest — no misleading margin numbers.

### Cost price GST treatment

| Option | Description | Selected |
|--------|-------------|----------|
| GST-exclusive | Supplier cost excl GST. Standard NZ accounting practice | ✓ |
| GST-inclusive | Cost includes GST. Simpler but less accurate for margin | |
| You decide | Claude picks based on NZ standards | |

**User's choice:** GST-exclusive
**Notes:** Standard accounting practice for NZ businesses.

### Margin column in product list

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, extra column | Margin % column visible when COGS add-on subscribed | ✓ |
| No, reports only | Margin only on COGS report page | |
| Subtle indicator | Color-coded dot/badge instead of column | |

**User's choice:** Yes, extra column
**Notes:** Quick at-a-glance profitability.

---

## Report Presentation

### Report location

| Option | Description | Selected |
|--------|-------------|----------|
| New tab on existing Reports page | "Profit & Margin" tab alongside Sales, Products, Stock, GST | ✓ |
| Separate COGS page | New page under Add-ons section in sidebar | |
| Both | Tab + standalone page | |

**User's choice:** New tab on existing Reports page
**Notes:** Consistent UX, reuses date range picker and export button.

### Report structure

| Option | Description | Selected |
|--------|-------------|----------|
| Summary cards + table | Top summary cards + sortable per-product table | ✓ |
| Chart-first | Bar chart prominent, data table below | |
| Table only | Dense data table, no cards or charts | |

**User's choice:** Summary cards + table
**Notes:** Matches existing SalesSummaryTable pattern.

### Category profit breakdown

| Option | Description | Selected |
|--------|-------------|----------|
| Collapsible category rows | Category rows with aggregated totals, click to expand products | ✓ |
| Separate category chart | Pie/bar chart with toggle between category and product view | |
| Flat table with category filter | All products in one table with dropdown filter | |

**User's choice:** Collapsible category rows
**Notes:** Clean and scannable.

---

## Gating & Visibility

### Pre-subscription experience on Reports

| Option | Description | Selected |
|--------|-------------|----------|
| Hidden tab until subscribed | Tab doesn't appear. Discover via Billing page | ✓ |
| Visible but locked tab | Tab visible, shows upgrade CTA | |
| Teaser with blurred data | Blurred dummy data with subscribe overlay | |

**User's choice:** Hidden tab until subscribed
**Notes:** Clean, no clutter. Matches Inventory tab pattern.

### Cost price field visibility

| Option | Description | Selected |
|--------|-------------|----------|
| Hidden until subscribed | Field only appears when add-on active | ✓ |
| Visible but disabled | Field shows with lock icon and tooltip | |

**User's choice:** Hidden until subscribed
**Notes:** Consistent with hidden-tab approach.

---

## CSV Export Scope

### CSV content

| Option | Description | Selected |
|--------|-------------|----------|
| Full product-level detail | Product name, SKU, category, units sold, revenue, cost, margin | ✓ |
| Category-level summary | One row per category with aggregated data | |
| Both via toggle | Two export buttons for detail and summary | |

**User's choice:** Full product-level detail
**Notes:** Reuses existing ExportCSVButton + PapaParse pattern.

### CSV filename

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, with dates | cogs-report-YYYY-MM-DD-to-YYYY-MM-DD.csv | ✓ |
| Simple name only | cogs-report.csv | |

**User's choice:** Yes, with dates
**Notes:** Matches how accountants archive files.

---

## Claude's Discretion

- DB migration design (cost_price_cents column, indexes)
- Summary card styling within existing design system
- Collapsible row interaction design
- COGS calculation approach (snapshot vs current cost)
- Error/empty states when no products have cost prices

## Deferred Ideas

None — discussion stayed within phase scope.
