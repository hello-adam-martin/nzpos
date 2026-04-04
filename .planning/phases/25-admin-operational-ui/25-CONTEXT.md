# Phase 25: Admin Operational UI - Context

**Gathered:** 2026-04-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Enrich the admin panel with four capabilities: (1) customer management — list, search, detail page with order history, disable accounts; (2) promo management — edit existing promos and soft-delete them; (3) store settings expansion — business address, phone, IRD/GST number, receipt header/footer; (4) dashboard enhancement — sales trend chart, period comparison metrics, recent orders widget.

</domain>

<decisions>
## Implementation Decisions

### Customer Management
- **D-01:** Customer list uses a paginated table with a search bar at top (filters by name or email). Columns: name, email, order count, status. Click row opens detail page. Consistent with staff/products table patterns.
- **D-02:** Customer detail page has a profile header (name, email, status, created date, Disable button) above a paginated order history table (order#, date, total, status). Single scrollable page, no tabs.
- **D-03:** Disable flow uses a confirmation modal: "Disable [Name]? They won't be able to log in to the storefront." Confirm/Cancel. No reason field. Re-enable via the same page with an "Enable" button when disabled.

### Dashboard Charts & Metrics
- **D-04:** Sales trend uses a line chart with area fill (via Recharts, already installed). Distinct from the bar chart used in reports. Default period: 7 days.
- **D-05:** Period selector is a simple two-button toggle (7 days / 30 days) positioned above the chart.
- **D-06:** Comparison metrics row uses stat cards with delta badges — green up-arrow / red down-arrow with percentage change. Comparisons: today vs yesterday, this week vs last week. Extends existing DashboardHeroCard pattern.
- **D-07:** Recent orders widget shows the last 5 orders with order#, date, total, status. Compact table or card list format — Claude's discretion on exact layout.

### Promo Edit & Soft-Delete
- **D-08:** Editing uses a modal pre-filled with current values (discount, min order, max uses, expiry). Same form layout as existing PromoForm. Click "Edit" action on the promo row to open.
- **D-09:** Soft-delete sets `is_active = false` (or a dedicated `deleted_at` timestamp). Deleted promos are hidden from the default list view. A "Show deleted" toggle at the top reveals them greyed out with a "Deleted" badge.
- **D-10:** Soft-delete requires a confirmation modal: "Delete [Code]? It will stop working immediately but order history is preserved." Confirm/Cancel.

### Store Settings Expansion
- **D-11:** Settings page uses a single scrollable page with sections: Branding (existing BrandingForm), Business Details (address, phone, IRD/GST number), Receipt Customization (header text, footer text). Each section has its own Save button.
- **D-12:** No receipt preview — simple text inputs for header and footer. Receipt formatting is already handled by the receipt generator.
- **D-13:** New DB columns needed on `stores` table: `business_address`, `phone`, `ird_gst_number`, `receipt_header`, `receipt_footer`. All nullable TEXT fields.

### Claude's Discretion
- Exact table column widths and responsive breakpoints for customer table
- Recent orders widget layout (compact table vs card list)
- Search debounce timing and empty state messaging
- Exact Recharts configuration (colors, grid lines, tooltip format) — follow DESIGN.md palette
- Whether promo soft-delete uses `is_active = false` or a dedicated `deleted_at` timestamp
- Loading skeleton patterns for all new components

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Admin UI Patterns
- `src/app/admin/dashboard/page.tsx` — Current dashboard with DashboardHeroCard, low stock alerts, setup checklist. Integration point for new chart and metrics.
- `src/components/admin/dashboard/DashboardHeroCard.tsx` — Hero card pattern to extend for comparison stat cards.
- `src/app/admin/promos/page.tsx` — Current promos page with PromoForm (create) and PromoList (read-only). Extend for edit/delete.
- `src/components/admin/PromoForm.tsx` — Promo creation form. Reuse for edit modal.
- `src/components/admin/PromoList.tsx` — Promo display list. Extend with edit/delete actions and show-deleted toggle.
- `src/app/admin/settings/page.tsx` — Current settings with BrandingForm only. Extend with business details and receipt sections.
- `src/app/admin/settings/BrandingForm.tsx` — Existing branding form pattern to follow for new settings sections.
- `src/app/admin/staff/page.tsx` — Staff table pattern (search, pagination, row actions, modals). Reference for customer list.

### Charts
- `src/components/admin/reports/SalesBarChart.tsx` — Existing Recharts bar chart. Reference for chart styling (Recharts ^3.8.1 installed).
- `src/components/admin/reports/ChannelBreakdownChart.tsx` — Additional chart reference.

### Database
- `supabase/migrations/001_initial_schema.sql` — Stores table base schema. New columns needed.
- `supabase/migrations/012_customer_accounts.sql` — Customer accounts table. Source for customer queries.

### Design System
- `DESIGN.md` — All visual decisions (colors, typography, spacing). All new UI must follow this.

### Requirements
- `.planning/REQUIREMENTS.md` — CUST-01 through CUST-04, PROMO-01/02, SETTINGS-01/02/03, DASH-01/02/03.

### Actions
- `src/actions/promos/` — Existing promo Server Actions. Extend for update and soft-delete.
- `src/actions/auth/customerSignup.ts` — Customer auth patterns. Reference for customer disable logic.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Recharts (^3.8.1):** Already installed and used in reports. SalesBarChart provides chart styling reference.
- **DashboardHeroCard:** Stat card component on dashboard. Extend pattern for comparison delta cards.
- **PromoForm:** Create form. Reusable for edit modal with pre-filled values.
- **PromoList:** Read-only list. Extend with action buttons and toggle.
- **BrandingForm:** Settings form pattern with Supabase server client + Server Action submit. Follow for new settings sections.
- **Staff table pattern:** Established in Phase 24 with search, pagination, row actions, modals.

### Established Patterns
- **Server Actions with Zod validation:** All mutations use `z.safeParse()` + `server-only` guard.
- **Table + inline actions:** Products, orders, staff pages all use this pattern.
- **Modal confirmations:** Destructive actions (deactivate staff, refund) use confirmation modals.
- **`createSupabaseServerClient`:** All admin pages use this for authenticated server-side queries.

### Integration Points
- **Dashboard page:** Add chart section and comparison cards below existing hero cards.
- **Promos page:** Add edit/delete actions to PromoList, add edit modal component.
- **Settings page:** Add BusinessDetailsForm and ReceiptForm sections below BrandingForm.
- **Admin routes:** Add `/admin/customers` route and `/admin/customers/[id]` detail page.
- **AdminSidebar:** Already has "Customers" link — verify or add it.
- **Stores table:** Migration to add 5 new columns (address, phone, IRD, receipt header/footer).

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. Follow existing admin patterns throughout.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 25-admin-operational-ui*
*Context gathered: 2026-04-05*
