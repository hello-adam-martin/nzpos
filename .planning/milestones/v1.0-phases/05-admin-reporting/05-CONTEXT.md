# Phase 5: Admin & Reporting - Context

**Gathered:** 2026-04-01
**Status:** Ready for planning

<domain>
## Phase Boundary

The owner has a single place to manage orders, handle end-of-day reconciliation, view sales performance, and process refunds. This includes: owner dashboard with today's sales summary, order list with filtering and detail drawer, full refund flow (with auto Stripe refund for online orders), cash session tracking (open/close with float and variance), sales reports with date ranges, GST period summary, low stock alerts, and CSV export.

</domain>

<decisions>
## Implementation Decisions

### Dashboard
- **D-01:** Sales-first layout. Hero cards at top: today's sales total, order count, POS vs online channel split. Low stock alerts and summary below.
- **D-02:** Today's numbers only — no trend charts or historical data on dashboard. Charts are out of scope per v1 constraints (advanced analytics deferred to v2), except for the reports section.
- **D-03:** Low stock alerts displayed as a list section below hero cards. Shows product name, current stock, and reorder threshold for all products at or below threshold.
- **D-04:** No recent orders feed on dashboard. Order details live on the dedicated Orders page only. Dashboard stays minimal.

### Cash-Up Workflow
- **D-05:** Full session tracking. Owner or staff opens a cash session with opening float amount. At close, enter counted cash. System calculates expected cash (from cash sales during session) and shows variance.
- **D-06:** Both owner and staff can open/close cash sessions. Not owner-only.
- **D-07:** Cash-up accessible from both POS top bar and admin dashboard. Same session data, two entry points.
- **D-08:** Primary input is a single total cash counted. Optional denomination breakdown (NZ notes: $100, $50, $20, $10, $5; coins: $2, $1, 50c, 20c, 10c) that sums into the total when used.

### Reporting
- **D-09:** Sales report: data tables + simple charts. Daily sales bar chart and channel breakdown visual alongside tabular data.
- **D-10:** Date range presets: Today, Yesterday, This Week, This Month, Last Month, Custom Range, plus GST-aligned periods matching NZ filing frequencies (1-month, 2-month, 6-month).
- **D-11:** GST period summary has both views: summary totals (total sales, total GST collected, GST-exclusive total) for quick filing, plus drill-down to per-line detail for accountant review.
- **D-12:** CSV export available on all reports. No PDF generation.

### Refund Process
- **D-13:** Refund triggered from order detail view. Owner opens order in the slide-out drawer, clicks Refund button, confirmation step before processing.
- **D-14:** Restock prompt per refund: "Restock items?" Owner chooses whether to restore stock based on item condition.
- **D-15:** Online Stripe orders: refund automatically calls Stripe Refund API. Customer gets money back without owner needing Stripe dashboard.
- **D-16:** Refund reason required — dropdown: Customer request, Damaged, Wrong item, Other. Required before confirming.
- **D-17:** Full refund only (per REQUIREMENTS.md — partial refunds out of scope for v1).

### Order Management
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

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Design System
- `DESIGN.md` — Full design system (navy #1E293B + amber #E67E22, Satoshi + DM Sans typography, spacing scale, motion rules)

### Schemas & Types
- `src/schemas/order.ts` — Order schemas: CreateOrderSchema (channel, status, payment_method enums), OrderItemSchema, CreatePromoCodeSchema
- `src/types/database.ts` — Database types for all tables

### GST Module
- `src/lib/gst.ts` — GST calculation: gstFromInclusiveCents, calcLineItem, calcOrderGST. Per-line on discounted amounts. Must be used for all GST calculations in reports.

### Money Formatting
- `src/lib/money.ts` — formatNZD function for displaying monetary values

### Existing Admin
- `src/app/admin/layout.tsx` — Admin layout with sidebar
- `src/components/admin/AdminSidebar.tsx` — Sidebar navigation (needs new items: Orders, Reports, Cash-up)
- `src/app/admin/dashboard/page.tsx` — Placeholder dashboard to be replaced
- `src/app/admin/products/` — Product list page pattern (data table, drawers) to follow for Orders
- `src/app/admin/promos/` — Promo code admin pattern

### Existing POS
- `src/components/pos/POSTopBar.tsx` — POS top bar where cash-up button will be added
- `src/components/pos/PickupsShell.tsx` — Existing pickup management (Phase 4)

### Server Actions
- `src/actions/orders/` — Existing order Server Actions (status transitions from Phase 4)
- `src/actions/products/` — Server Action patterns with Zod validation

### Project Context
- `.planning/REQUIREMENTS.md` — ADMIN-01 through ADMIN-07, REF-01, REF-02 requirements
- `.planning/phases/01-foundation/01-CONTEXT.md` — Foundation decisions (auth, GST, money-in-cents)
- `.planning/phases/03-pos-checkout/03-CONTEXT.md` — POS decisions (cart, payments, stock)
- `.planning/phases/04-online-store/04-CONTEXT.md` — Online store decisions (Stripe, webhooks, click-and-collect)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/gst.ts` — GST calculation module (gstFromInclusiveCents, calcLineItem, calcOrderGST) — use for all report GST calculations
- `src/lib/money.ts` — formatNZD for displaying monetary values in reports and dashboard
- `src/schemas/order.ts` — Order/promo Zod schemas already define status, channel, payment_method enums
- `src/components/admin/AdminSidebar.tsx` — Sidebar navigation to extend with new pages
- `src/actions/orders/` — Order status transition Server Actions from Phase 4 (updateOrderStatus)

### Established Patterns
- Admin pages follow: Server Component page -> Client Component shell with data table, search, filters
- Form/detail UI uses slide-out drawers (product form pattern from Phase 2)
- Server Actions with Zod validation at boundary
- Money stored as integer cents, formatted only in UI via formatNZD
- POS top bar supports tabs/navigation (POSTopBar with usePathname)

### Integration Points
- Admin sidebar: add Orders, Reports, Cash-up nav items
- Dashboard page: replace placeholder with real dashboard
- POS top bar: add cash session open/close button
- Order status transitions: reuse existing Server Actions, add refund action
- Stripe: add refund API call in new refund Server Action

</code_context>

<specifics>
## Specific Ideas

- Cash count supports both single total and optional NZ denomination breakdown ($100, $50, $20, $10, $5, $2, $1, 50c, 20c, 10c)
- GST report presets should match NZ IRD filing periods (1-month, 2-month, 6-month)
- Refund reason dropdown: Customer request, Damaged, Wrong item, Other

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 05-admin-reporting*
*Context gathered: 2026-04-01*
