# Phase 26: Super-Admin Billing + User Management - Context

**Gathered:** 2026-04-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Super-admin can monitor platform health via a dashboard (tenant metrics, signup trends, add-on adoption), drill into any tenant's Stripe billing (subscriptions, invoices, payment failures), and manage merchant accounts (view details, trigger password reset, disable accounts) — all from the super-admin panel.

</domain>

<decisions>
## Implementation Decisions

### Dashboard Metrics Layout
- **D-01:** Dashboard lives at `/super-admin` as the landing page. New route, new page component.
- **D-02:** Stat cards for: total active tenants, suspended tenants, new signups this month, and per-add-on adoption rates (percentage of tenants with each add-on). Uses stat card pattern consistent with admin DashboardHeroCard.
- **D-03:** 30-day signup trend displayed as a line chart with area fill using Recharts (already installed). Matches Phase 25 admin sales trend chart style.
- **D-04:** Add-on adoption rates shown as percentage badges in individual stat cards — one per add-on (Xero, Email Notifications, Custom Domain, Inventory). Compact and scannable.

### Billing Detail on Tenant Page
- **D-05:** Stripe billing data fetched via live Stripe API calls on tenant detail page load. No local mirroring or webhook sync — Phase 27 adds materialised data later.
- **D-06:** Subscriptions and Invoices displayed as new sections below existing addon/audit content on the tenant detail page. Single scrollable page stays consistent with existing pattern.
- **D-07:** Payment failure alert shown as a warning banner at the top of the tenant detail page when past-due invoices exist. Immediately visible on page load. Yellow/red styling.

### User Management Actions
- **D-08:** Password reset: "Send Password Reset" button on tenant detail page triggers Supabase Admin API `resetPasswordForEmail()`. Confirmation modal before sending ("Send password reset email to [email]?"). No temp password — standard email reset flow.
- **D-09:** Account disable: "Disable Account" button bans the user in Supabase Auth (prevents login) AND suspends the store (blocks storefront/POS) in one flow. Mirrors existing suspend pattern with confirmation modal. Re-enable reverses both.
- **D-10:** Both user management actions (password reset, disable) appear on the existing tenant detail page alongside Suspend/Unsuspend actions. No separate user management page.

### Super-Admin Nav Structure
- **D-11:** Sidebar updated from 1 link to 3: Dashboard, Tenants, Analytics. Analytics is a placeholder link for Phase 27 (MRR/churn) — can link to an empty page or show "Coming soon".

### Claude's Discretion
- Exact stat card sizing and grid layout on the dashboard
- Recharts configuration details (colors, grid lines, tooltip format) — follow DESIGN.md palette
- Invoice table columns and date formatting
- Subscription display format (card vs table row)
- Warning banner exact styling (yellow vs red, icon choice)
- Loading states for Stripe API calls (skeleton vs spinner)
- Analytics placeholder page content

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Super-Admin Existing Code
- `src/app/super-admin/layout.tsx` — Super-admin layout with sidebar
- `src/app/super-admin/tenants/page.tsx` — Tenant list page with search/filter/pagination
- `src/app/super-admin/tenants/[id]/page.tsx` — Tenant detail page (store info, addons, audit log, suspend actions)
- `src/app/super-admin/tenants/[id]/TenantDetailActions.tsx` — Client component with suspend/unsuspend modals
- `src/components/super-admin/SuperAdminSidebar.tsx` — Sidebar nav (currently only "Tenants" link)
- `src/components/super-admin/TenantTable.tsx` — Tenant list table component
- `src/components/super-admin/TenantStatusBadge.tsx` — Status badge component
- `src/components/super-admin/SuspendModal.tsx` — Suspend confirmation modal pattern

### Stripe Integration
- `src/lib/stripe.ts` — Server-side Stripe client singleton

### Server Actions Pattern
- `src/actions/super-admin/suspendTenant.ts` — Existing super-admin action pattern (suspend flow)
- `src/actions/super-admin/unsuspendTenant.ts` — Reverse action pattern

### Admin Dashboard Reference (Phase 25)
- Admin dashboard DashboardHeroCard pattern — stat cards with delta badges
- Admin sales trend Recharts line chart — visual reference for signup trend chart

### Design
- `DESIGN.md` — Color palette, typography, spacing for all UI decisions

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `SuperAdminSidebar` — needs nav links array expanded from 1 to 3 items
- `TenantDetailActions` — client component pattern for action buttons + modals on tenant detail; extend with password reset and disable actions
- `SuspendModal` — confirmation modal pattern reusable for password reset and disable modals
- `TenantStatusBadge` — badge component, may need extension for billing status
- `TenantTable` — tenant list with search/filter/pagination, no changes needed for Phase 26
- `src/lib/stripe.ts` — Stripe client ready to use for API calls
- Recharts already installed — used in Phase 25 admin dashboard

### Established Patterns
- Super-admin pages use `createSupabaseAdminClient()` for privileged DB access
- Server Actions in `src/actions/super-admin/` follow pattern: validate auth, perform action, revalidate path
- Tenant detail page fetches multiple queries in parallel with `Promise.all()`
- Client components handle interactive UI (modals, buttons) while server components do data fetching

### Integration Points
- New `/super-admin` dashboard page needs to be added as a route
- SuperAdminSidebar nav links array needs Dashboard and Analytics entries
- Tenant detail page needs new sections for Stripe data and user management actions
- TenantDetailActions component needs new buttons and modals for password reset and disable

</code_context>

<specifics>
## Specific Ideas

- Analytics nav link included proactively as placeholder for Phase 27 MRR/churn work
- Disable account combines Supabase Auth ban + store suspension in one action (not separate)
- Billing data is intentionally live-fetched from Stripe (not cached) — Phase 27 materialisation will address performance later

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 26-super-admin-billing-user-management*
*Context gathered: 2026-04-05*
