# Phase 5: Admin & Reporting - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-01
**Phase:** 05-admin-reporting
**Areas discussed:** Dashboard layout, Cash-up workflow, Reporting views, Refund process, Order management

---

## Dashboard Layout

| Option | Description | Selected |
|--------|-------------|----------|
| Sales-first | Hero cards: today's sales total, order count, POS vs online split. Low stock alerts and recent orders below. | ✓ |
| Alerts-first | Low stock alerts and pending pickups prominent at top. Sales summary cards below. | |
| Balanced grid | Equal-weight cards for sales, orders, low stock, and pickups — all visible without scrolling. | |

**User's choice:** Sales-first
**Notes:** None

| Option | Description | Selected |
|--------|-------------|----------|
| Today's numbers only | Keep it simple — just today's total, count, and channel split. No charts. | ✓ |
| 7-day mini chart | Small bar/sparkline showing daily sales for the past week. | |

**User's choice:** Today's numbers only
**Notes:** None

| Option | Description | Selected |
|--------|-------------|----------|
| Alert list | Section below hero cards listing products at or below reorder threshold. | ✓ |
| Count badge only | Just a number badge on the dashboard card. | |
| Inline in sidebar | Low stock count as badge on sidebar Products nav item. | |

**User's choice:** Alert list
**Notes:** None

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, recent orders list | Last 5-10 orders showing time, amount, channel, status. | |
| No, just the summary cards | Dashboard stays minimal — order details only on dedicated Orders page. | ✓ |

**User's choice:** No recent orders feed
**Notes:** None

---

## Cash-Up Workflow

| Option | Description | Selected |
|--------|-------------|----------|
| Full session tracking | Owner opens session with opening float, closes with counted cash. System calculates expected cash and variance. | ✓ |
| Close-only report | No explicit session open. Owner runs end-of-day report, enters counted cash. | |
| Simple totals only | Just totals by payment method. No cash counting or variance. | |

**User's choice:** Full session tracking
**Notes:** None

| Option | Description | Selected |
|--------|-------------|----------|
| Owner only | Only admin role can open/close sessions. | |
| Owner or staff | Staff can open/close sessions too. | ✓ |

**User's choice:** Owner or staff
**Notes:** None

| Option | Description | Selected |
|--------|-------------|----------|
| Admin dashboard | Cash-up in admin section only. | |
| POS screen | Open/close from POS top bar. | |
| Both | Accessible from both POS top bar and admin. | ✓ |

**User's choice:** Both
**Notes:** None

| Option | Description | Selected |
|--------|-------------|----------|
| Single total | Staff enters one number: total cash counted. | |
| Denomination breakdown | Staff counts each denomination. | |

**User's choice:** Other — Single total with optional denomination breakdown
**Notes:** Primary input is single total, but optional denomination fields (NZ notes + coins) are available and sum into the total.

---

## Reporting Views

| Option | Description | Selected |
|--------|-------------|----------|
| Data tables | Date range picker, tables for daily totals, top products, channel breakdown. No charts. | |
| Tables + simple charts | Same tables plus daily sales bar chart and channel pie chart. | ✓ |
| Minimal summary | Just summary card for date range. No per-day breakdown. | |

**User's choice:** Tables + simple charts
**Notes:** None

| Option | Description | Selected |
|--------|-------------|----------|
| Standard presets | Today, Yesterday, This Week, This Month, Last Month, Custom Range. | |
| Minimal presets | Today, This Month, Custom Range only. | |
| GST-aligned presets | Standard plus GST periods (1-month, 2-month, 6-month per NZ filing frequency). | ✓ |

**User's choice:** GST-aligned presets
**Notes:** None

| Option | Description | Selected |
|--------|-------------|----------|
| Period totals | Total sales, total GST collected, GST-exclusive total. Enough for standard filing. | |
| Per-line breakdown | Full line-item detail with GST amount. Exportable. | |
| Both views | Summary by default, drill-down to per-line detail. | ✓ |

**User's choice:** Both views
**Notes:** None

| Option | Description | Selected |
|--------|-------------|----------|
| CSV export | Export any report as CSV. | ✓ |
| CSV + PDF | Both CSV and print-friendly PDF. | |
| No export | View on screen only. | |

**User's choice:** CSV export
**Notes:** None

---

## Refund Process

| Option | Description | Selected |
|--------|-------------|----------|
| From order detail | Owner finds order, opens detail, clicks Refund with confirmation step. | ✓ |
| Quick refund from list | Refund button directly on each row. Faster but riskier. | |
| Dedicated refunds page | Separate /admin/refunds page with search. | |

**User's choice:** From order detail
**Notes:** None

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, auto-restore | Refunding automatically increments stock. | |
| Ask per refund | Prompt "Restock items?" on each refund. | ✓ |
| No auto-restore | Stock adjustment is manual. | |

**User's choice:** Ask per refund
**Notes:** Owner decides per refund based on item condition.

| Option | Description | Selected |
|--------|-------------|----------|
| Auto Stripe refund | Processing refund calls Stripe Refund API automatically. | ✓ |
| Manual Stripe refund | System marks refunded, owner processes in Stripe dashboard separately. | |

**User's choice:** Auto Stripe refund
**Notes:** None

| Option | Description | Selected |
|--------|-------------|----------|
| Required dropdown | Dropdown: Customer request, Damaged, Wrong item, Other. Required. | ✓ |
| Optional freetext | Optional notes field. | |
| No reason needed | Just confirm and process. | |

**User's choice:** Required dropdown
**Notes:** None

---

## Order Management

| Option | Description | Selected |
|--------|-------------|----------|
| Essential columns | Order ID, date/time, total, channel, payment method, status, staff name. Sortable. | ✓ |
| Compact summary | Just order ID, date, total, status. | |
| Rich list with items | First 2-3 items per order inline. | |

**User's choice:** Essential columns
**Notes:** None

| Option | Description | Selected |
|--------|-------------|----------|
| Full filter bar | Status, channel, payment method, date range. Search by order ID. | ✓ |
| Status + date only | Just status tabs and date picker. | |
| Tabs by channel | Top-level tabs: All / POS / Online. Status filter within each tab. | |

**User's choice:** Full filter bar
**Notes:** None

| Option | Description | Selected |
|--------|-------------|----------|
| Slide-out drawer | Side drawer with full order details. Stay on list page. | ✓ |
| Separate page | Navigate to /admin/orders/[id] full page. | |
| Expandable row | Click expands row inline. | |

**User's choice:** Slide-out drawer
**Notes:** Consistent with product form pattern from Phase 2.

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, in drawer | Status transition buttons in order detail drawer. | ✓ |
| POS only | Pickup transitions only on POS Pickups tab. Admin read-only. | |

**User's choice:** Yes, in drawer
**Notes:** None

---

## Claude's Discretion

- Chart library choice for simple bar/pie charts
- Cash session table schema design
- Cash-up UI placement on POS top bar
- Denomination breakdown UI component design
- Order detail drawer layout and section ordering
- Report page layout and tab/section structure
- Low stock alert threshold display styling
- Pagination strategy for order list

## Deferred Ideas

None — discussion stayed within phase scope
