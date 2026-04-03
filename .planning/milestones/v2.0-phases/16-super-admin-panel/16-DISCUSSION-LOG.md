# Phase 16: Super Admin Panel - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-03
**Phase:** 16-super-admin-panel
**Areas discussed:** Panel location & access, Tenant list & detail, Suspend/unsuspend flow, Manual plan overrides

---

## Panel Location & Access

### Where should the super admin panel live?

| Option | Description | Selected |
|--------|-------------|----------|
| Root domain /super-admin | Lives at nzpos.co.nz/super-admin/*. Separate from any tenant's admin. Clean separation. | ✓ |
| Dedicated subdomain | Lives at admin.nzpos.co.nz or super.nzpos.co.nz. Fully separate app feel. | |
| Inside existing /admin | Lives at /admin/super/*. Reuses existing admin layout/sidebar. | |

**User's choice:** Root domain /super-admin (Recommended)
**Notes:** None

### How should a super admin log in?

| Option | Description | Selected |
|--------|-------------|----------|
| Same Supabase login | Existing email/password login at /login. Middleware detects is_super_admin and redirects. | ✓ |
| Separate login page | Dedicated /super-admin/login page. Visually distinct from merchant login. | |

**User's choice:** Same Supabase login (Recommended)
**Notes:** None

### Should the super admin panel have its own sidebar/layout?

| Option | Description | Selected |
|--------|-------------|----------|
| Own layout, same style | New SuperAdminSidebar with platform-level nav using same design system. | ✓ |
| Minimal — no sidebar | Simple top nav or breadcrumbs only. | |
| You decide | Claude picks whatever fits. | |

**User's choice:** Own layout, same style (Recommended)
**Notes:** None

### Should a super admin be able to 'impersonate' a tenant?

| Option | Description | Selected |
|--------|-------------|----------|
| No impersonation | Super admin sees tenant data in the super admin panel only. Read-only inspection. | ✓ |
| View-only impersonation | Click 'View as tenant' to see their admin dashboard read-only. | |
| Defer to later | Skip impersonation entirely for now. | |

**User's choice:** No impersonation (Recommended)
**Notes:** None

---

## Tenant List & Detail

### What columns should show in the tenant list table?

| Option | Description | Selected |
|--------|-------------|----------|
| Essential only | Store name, slug, plan status, active/suspended badge, created date. | ✓ |
| Essential + activity | Above plus last active timestamp and order count. | |
| You decide | Claude picks columns that satisfy success criteria. | |

**User's choice:** Essential only (Recommended)
**Notes:** None

### How should tenant search work?

| Option | Description | Selected |
|--------|-------------|----------|
| Single search box | One text field searching store name and slug. Filter dropdown for status. | ✓ |
| Advanced filters | Separate fields for name, slug, plan type, date range. | |
| You decide | Claude picks search approach. | |

**User's choice:** Single search box (Recommended)
**Notes:** None

### What should the tenant detail page show?

| Option | Description | Selected |
|--------|-------------|----------|
| Info + actions card | Single page with store info, subscription status, and action buttons. | ✓ |
| Tabbed detail view | Tabs for Overview, Billing, Activity. | |
| You decide | Claude picks layout. | |

**User's choice:** Info + actions card (Recommended)
**Notes:** None

### How should pagination work for the tenant list?

| Option | Description | Selected |
|--------|-------------|----------|
| Server-side pagination | Standard page-based with Previous/Next and page numbers. | ✓ |
| Load more button | Append results as user clicks 'Load more'. | |
| You decide | Claude picks pagination approach. | |

**User's choice:** Server-side pagination (Recommended)
**Notes:** None

---

## Suspend/Unsuspend Flow

### What should a suspended tenant see?

| Option | Description | Selected |
|--------|-------------|----------|
| Branded suspension page | Styled page with suspension message and support contact. | ✓ |
| Generic 403 page | Standard 403 Forbidden. | |
| You decide | Claude picks suspension experience. | |

**User's choice:** Branded suspension page (Recommended)
**Notes:** None

### Should suspension require a reason?

| Option | Description | Selected |
|--------|-------------|----------|
| Required reason | Text field for reason stored in DB. Useful for audit trail. | ✓ |
| Optional reason | Reason field shown but not required. | |
| No reason field | Just a confirm dialog. | |

**User's choice:** Required reason (Recommended)
**Notes:** None

### How should the 30-day recovery window work?

| Option | Description | Selected |
|--------|-------------|----------|
| Soft delete with timestamp | Set is_active=false and suspended_at timestamp. Data stays intact. | ✓ |
| You decide | Claude handles recovery mechanism details. | |

**User's choice:** Soft delete with timestamp (Recommended)
**Notes:** None

### Should there be a confirmation dialog before suspending?

| Option | Description | Selected |
|--------|-------------|----------|
| Two-step confirm | Modal with store name, reason field, impact warning, confirm button. | ✓ |
| Inline confirm | Button turns red with 'Are you sure?' text. | |
| You decide | Claude picks confirmation pattern. | |

**User's choice:** Two-step confirm (Recommended)
**Notes:** None

---

## Manual Plan Overrides

### How should comp'd add-on activation work?

| Option | Description | Selected |
|--------|-------------|----------|
| Direct DB toggle | Server Action sets store_plans boolean directly — no Stripe. | ✓ |
| Stripe coupon/credit | 100% discount in Stripe so subscription is $0. | |
| You decide | Claude picks override mechanism. | |

**User's choice:** Direct DB toggle (Recommended)
**Notes:** None

### Should manual overrides be visually distinct from Stripe-managed?

| Option | Description | Selected |
|--------|-------------|----------|
| Badge distinction | 'Active (Stripe)' or 'Active (Manual)' badges on tenant detail. | ✓ |
| No distinction | Just show active/inactive. | |
| You decide | Claude picks display approach. | |

**User's choice:** Badge distinction (Recommended)
**Notes:** None

### Should there be an audit log for super admin actions?

| Option | Description | Selected |
|--------|-------------|----------|
| Simple audit table | super_admin_actions table with who, what, which tenant, reason, timestamp. | ✓ |
| No audit log | Actions aren't logged beyond DB state change. | |
| You decide | Claude decides on audit approach. | |

**User's choice:** Simple audit table (Recommended)
**Notes:** None

### Should the super admin be able to deactivate a manually comp'd add-on?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, same toggle | Click 'Deactivate' to flip back off. Symmetric with activation. | ✓ |
| You decide | Claude handles deactivation details. | |

**User's choice:** Yes, same toggle (Recommended)
**Notes:** None

---

## Claude's Discretion

- SuperAdminSidebar navigation items and layout details
- Tenant detail page layout and card arrangement
- Suspension page design and copy
- Confirmation modal design
- Audit log display format on tenant detail
- Pagination page size
- Search debounce timing
- Manual vs Stripe-managed tracking schema
- Super admin dashboard content

## Deferred Ideas

None — discussion stayed within phase scope.
