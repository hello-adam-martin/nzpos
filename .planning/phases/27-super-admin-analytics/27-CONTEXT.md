# Phase 27: Super-Admin Analytics - Context

**Gathered:** 2026-04-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Super-admin can track platform revenue health through an analytics page that shows accurate MRR, churn, and per-add-on revenue drawn from a materialised Stripe snapshot — not live API calls. Includes a daily sync job to populate the snapshot and a rate-limited on-demand refresh button.

</domain>

<decisions>
## Implementation Decisions

### Analytics Page Layout
- **D-01:** Top of page: row of DashboardHeroCard-style stat cards — Current MRR, Monthly Churn Count, Active Subscriptions. Matches existing admin dashboard and super-admin dashboard card patterns.
- **D-02:** Below stat cards: full-width MRR trend line chart (6-month history) using Recharts AreaChart. Matches SignupTrendChart pattern already in the super-admin dashboard.
- **D-03:** Below MRR chart: horizontal bar chart showing revenue breakdown by add-on (Xero, Inventory, Email Notifications, Custom Domain). Easy to compare, scales with any number of add-ons.
- **D-04:** Analytics page replaces the existing placeholder at `/super-admin/analytics`. Sidebar link already exists (Phase 26 D-11).

### Stripe Sync Job Design
- **D-05:** Daily sync runs via Supabase pg_cron triggering a Supabase Edge Function that fetches subscription data from the Stripe API and writes to a local snapshot table. No external cron infra needed.
- **D-06:** Snapshot table stores subscription-level rows: tenant_id, stripe_subscription_id, status, plan_interval (month/year), amount, addon_type, current_period_start, current_period_end, cancelled_at, discount_amount, synced_at. Derived metrics (MRR, churn) computed at query time.
- **D-07:** Sync job scope is analytics-only. Tenant detail page continues using live Stripe API calls (Phase 26 pattern unchanged).

### MRR Calculation Rules
- **D-08:** Annual plan normalisation: divide annual amount by 12. A $120/year plan contributes $10/month MRR. Industry-standard SaaS approach.
- **D-09:** Churn count: subscriptions with `cancelled_at` in the current calendar month. Includes both immediate and end-of-period cancellations.
- **D-10:** Trials excluded from MRR ($0 contribution). Subscriptions with coupons/discounts use the actual charged amount, not list price.

### Refresh & Staleness UX
- **D-11:** Subtle "Last synced: X ago" timestamp near the top of the page, next to the refresh button. Always visible, unobtrusive.
- **D-12:** Refresh button triggers inline loading state — button shows spinner + "Syncing..." text, page data stays visible but dimmed. Success toast on completion. Data updates in place.
- **D-13:** Rate limiting: server-side via `last_synced_at` timestamp in a metadata table. Server action checks timestamp before running sync, returns error if <5 minutes. Button disabled client-side with countdown ("Available in X:XX") based on timestamp returned with page data.

### Claude's Discretion
- Exact stat card sizing, grid responsiveness, and breakpoints
- Recharts configuration details (colors, axes, tooltip format) — follow DESIGN.md palette and match SignupTrendChart style
- Horizontal bar chart library choice (Recharts BarChart or custom) — Recharts preferred for consistency
- Edge Function implementation details (Deno runtime, Stripe API pagination)
- Snapshot table name and exact column types
- pg_cron schedule time (e.g., 3am NZST)
- Success toast styling and duration
- Loading/dimming implementation approach
- MRR trend data point granularity (monthly buckets for 6-month chart)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Super-Admin Existing Code
- `src/app/super-admin/analytics/page.tsx` — Current placeholder page to be replaced
- `src/app/super-admin/page.tsx` — Super-admin dashboard with stat cards and chart pattern
- `src/components/super-admin/SignupTrendChart.tsx` — Recharts AreaChart pattern to reuse for MRR trend
- `src/components/super-admin/SuperAdminSidebar.tsx` — Sidebar with Analytics link already present
- `src/components/admin/dashboard/DashboardHeroCard.tsx` — Stat card component pattern

### Stripe Integration
- `src/lib/stripe.ts` — Server-side Stripe client singleton
- `src/app/super-admin/tenants/[id]/page.tsx` — Live Stripe API usage pattern (subscriptions, invoices)

### Server Actions Pattern
- `src/actions/super-admin/` — Existing super-admin action patterns

### Design
- `DESIGN.md` — Color palette, typography, spacing for all UI decisions

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **DashboardHeroCard** — Stat card component with delta badges, used on admin dashboard and super-admin dashboard. Reuse for MRR/churn/subscription stat cards.
- **SignupTrendChart** — Recharts AreaChart with custom tooltip, gradient fill, empty state. Clone and adapt for MRR trend chart.
- **Stripe client** (`src/lib/stripe.ts`) — Server-side singleton, ready for use in Edge Function or server action.
- **Recharts** — Already installed and configured. AreaChart, BarChart, ResponsiveContainer all available.

### Established Patterns
- Super-admin pages use `force-dynamic` export for fresh data
- Server components fetch data directly (no client-side fetching)
- Client components used only for interactive elements (charts, buttons with state)
- Supabase admin client for cross-tenant queries
- date-fns for date formatting

### Integration Points
- Replace `/super-admin/analytics/page.tsx` placeholder with full analytics page
- New snapshot table in Supabase (migration needed)
- New Supabase Edge Function for Stripe sync
- pg_cron job configuration (SQL migration)
- Server action for on-demand refresh trigger

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. User selected recommended options across all categories, indicating preference for established SaaS patterns and consistency with existing codebase.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 27-super-admin-analytics*
*Context gathered: 2026-04-06*
