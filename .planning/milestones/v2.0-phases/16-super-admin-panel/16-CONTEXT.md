# Phase 16: Super Admin Panel - Context

**Gathered:** 2026-04-03
**Status:** Ready for planning

<domain>
## Phase Boundary

The platform operator (super admin) can view all tenants, inspect their status, and take corrective action (suspend/unsuspend, manually override add-on plans) — all without touching the database directly. This is an internal operations tool, not merchant-facing.

</domain>

<decisions>
## Implementation Decisions

### Panel Location & Access
- **D-01:** Super admin panel lives at root domain `/super-admin/*` (e.g. `nzpos.co.nz/super-admin/`). Fully separate from tenant admin routes. Clean separation — super admin never accidentally sees tenant-scoped UI.
- **D-02:** Same Supabase email/password login. Super admin logs in at `/login`. Middleware detects `is_super_admin` JWT claim and redirects to `/super-admin/dashboard`. No separate login page.
- **D-03:** Own layout with new `SuperAdminSidebar` component, using the same deep navy + amber design system. Feels like part of NZPOS but clearly a different context from tenant admin.
- **D-04:** No tenant impersonation. Super admin sees tenant data in the super admin panel only. Read-only inspection via existing RLS read-all policies. Matches Phase 12 D-13 (read-all, write-own).

### Tenant List & Detail
- **D-05:** Tenant list shows: store name, slug, plan status (free/active add-ons), active/suspended badge, created date. Essential columns matching success criteria #1.
- **D-06:** Single search box that searches store name and slug. Filter dropdown for status (all/active/suspended). Simple, covers 90% of use cases.
- **D-07:** Server-side pagination with Previous/Next and page numbers. Works with Supabase range queries. Handles growth to thousands of tenants.
- **D-08:** Tenant detail is a single page with store info (name, slug, created, last active), subscription status per add-on (with Stripe vs Manual badge), and action buttons (suspend/unsuspend, override plan). All on one screen — no tabs.

### Suspend/Unsuspend Flow
- **D-09:** Suspended tenants see a branded suspension page: "This store has been suspended. Contact support at [email]." Shows on both storefront and admin routes. Middleware intercepts based on `is_active=false` (already partially in place).
- **D-10:** Suspension requires a reason from the super admin. Text field for reason stored in DB. Useful for audit trail and context when unsuspending.
- **D-11:** Soft delete with `suspended_at` timestamp. `is_active=false` + `suspended_at` + `suspension_reason`. Unsuspending within 30 days flips `is_active` back to true. Data purge logic is a future concern — not this phase.
- **D-12:** Two-step confirmation modal: click "Suspend" → modal shows store name, requires reason field, displays impact warning ("Storefront and admin will be inaccessible"), "Confirm Suspension" button. Prevents accidental suspension.

### Manual Plan Overrides
- **D-13:** Direct DB toggle for comp'd add-ons. Super admin clicks "Activate" on an add-on → Server Action sets `store_plans` boolean to true directly — no Stripe involved. Add-on works immediately. Matches success criteria #5.
- **D-14:** Each add-on on tenant detail shows "Active (Stripe)" or "Active (Manual)" badge. Super admin sees at a glance what's paid vs comp'd. Prevents accidentally removing a paid subscription.
- **D-15:** Super admin can deactivate manually comp'd add-ons via the same toggle. Symmetric with activation.
- **D-16:** Need a way to distinguish manual overrides from Stripe-managed in the DB. Add `manual_override` boolean columns or a separate tracking mechanism on `store_plans`.

### Audit Trail
- **D-17:** `super_admin_actions` table logging: who (super admin user ID), what action (suspend/unsuspend/activate/deactivate), which tenant (store_id), reason/note, timestamp. Shown on tenant detail page as recent activity list.

### Claude's Discretion
- SuperAdminSidebar navigation items and layout details
- Tenant detail page layout and card arrangement
- Suspension page design and copy
- Confirmation modal design
- Audit log display format on tenant detail
- Pagination page size (10, 20, 25)
- Search debounce timing
- How to track manual vs Stripe-managed overrides in store_plans schema
- Super admin dashboard content (if any — could be just a redirect to tenant list)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Database & Auth
- `supabase/migrations/014_multi_tenant_schema.sql` — `stores` table with `is_active`, `slug`, branding columns; `store_plans` table with feature flag booleans; `super_admins` table
- `supabase/migrations/015_rls_policy_rewrite.sql` — RLS policies granting super admin SELECT across all tenant tables
- `supabase/migrations/016_super_admin.sql` — Auth hook injecting `is_super_admin` JWT claim from `super_admins` table
- `supabase/migrations/019_billing_claims.sql` — Billing feature flags in JWT claims

### Middleware & Auth
- `src/middleware.ts` — Tenant resolution middleware, already checks `is_active = true`. Must add super admin redirect logic and suspension page routing.
- `src/lib/resolveAuth.ts` — Server-side auth resolution
- `src/lib/supabase/server.ts` — Server-side Supabase client
- `src/lib/supabase/admin.ts` — Admin client (service_role, bypasses RLS) — needed for super admin write operations

### Existing Admin Patterns
- `src/components/admin/AdminSidebar.tsx` — Reference for SuperAdminSidebar design pattern
- `src/app/admin/layout.tsx` — Reference for super admin layout structure
- `src/app/admin/billing/page.tsx` — Add-on card pattern to reference for plan override UI
- `src/config/addons.ts` — Add-on definitions (Xero, Email, Custom Domain)

### Feature Gating
- `src/lib/requireFeature.ts` — Feature gating utility. Manual overrides must be compatible with this enforcement layer.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `AdminSidebar.tsx`: Deep navy sidebar pattern with active state highlighting — clone and adapt for SuperAdminSidebar
- `src/config/addons.ts`: Add-on definitions (names, Stripe price IDs) — reuse for plan override UI
- `src/app/admin/billing/page.tsx`: Add-on card rendering pattern — reference for tenant detail add-on display
- `src/lib/requireFeature.ts`: Feature gating — manual overrides write to same `store_plans` booleans this reads

### Established Patterns
- Server Actions for mutations (all admin actions use this pattern)
- Supabase admin client for service-role operations (bypasses RLS for writes)
- Middleware-based routing and auth checks
- Tailwind + deep navy/amber design system

### Integration Points
- `src/middleware.ts`: Add super admin detection and redirect to `/super-admin/*` routes
- `stores.is_active`: Already checked in middleware — suspension page routing plugs in here
- `store_plans` table: Manual overrides write directly to existing boolean columns
- `super_admins` table + auth hook: Already handles `is_super_admin` claim injection

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches within the decisions above.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 16-super-admin-panel*
*Context gathered: 2026-04-03*
