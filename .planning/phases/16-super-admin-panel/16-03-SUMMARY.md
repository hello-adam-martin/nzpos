---
phase: 16
plan: "03"
subsystem: super-admin-panel
tags: [super-admin, ui, tenant-management, suspension, add-ons, audit-log]
dependency_graph:
  requires: ["16-01"]
  provides: [super-admin-layout, tenant-list-page, tenant-detail-page, suspend-modal, addon-management-ui]
  affects: [src/app/super-admin, src/components/super-admin]
tech_stack:
  added: []
  patterns: [server-component-layout, client-component-table, form-action-pattern, useFormStatus-loading, inline-confirm-ux]
key_files:
  created:
    - src/app/super-admin/layout.tsx
    - src/app/super-admin/tenants/page.tsx
    - src/app/super-admin/tenants/[id]/page.tsx
    - src/app/super-admin/tenants/[id]/TenantDetailActions.tsx
    - src/components/super-admin/SuperAdminSidebar.tsx
    - src/components/super-admin/TenantTable.tsx
    - src/components/super-admin/TenantStatusBadge.tsx
    - src/components/super-admin/AddonStatusBadge.tsx
    - src/components/super-admin/PlanOverrideRow.tsx
    - src/components/super-admin/SuspendModal.tsx
    - src/components/super-admin/AuditLogList.tsx
  modified: []
decisions:
  - "TenantDetailActions extracted as client wrapper for suspend modal state — keeps detail page a Server Component"
  - "unsuspendTenant wrapped in async void arrow in form action to satisfy React's form action type constraint"
  - "Pagination ellipsis logic handles 5 visible pages with gaps for edge cases"
  - "AuditLogList is a Server Component (no interactivity needed — pure display)"
metrics:
  duration_minutes: 5
  completed: "2026-04-03"
  tasks_completed: 2
  files_created: 11
requirements: [SADMIN-01, SADMIN-02, SADMIN-04]
---

# Phase 16 Plan 03: Super Admin UI — Layout, Tenant List, and Tenant Detail Summary

Complete super admin panel UI with layout, sidebar, tenant list with search/filter/pagination, and tenant detail with add-on management, suspension flow, and audit log.

## What Was Built

Super admin panel UI — layout with sidebar, paginated tenant list with search and filter, and tenant detail page with store info, add-on management, suspend/unsuspend actions, and audit log. All components follow the UI-SPEC design contract and existing AdminSidebar/layout patterns.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Super admin layout, sidebar, and tenant list page | 3bddfc3 | layout.tsx, SuperAdminSidebar.tsx, tenants/page.tsx, TenantTable.tsx, TenantStatusBadge.tsx |
| 2 | Tenant detail page with add-on management, suspension actions, and audit log | 2ccebab | tenants/[id]/page.tsx, TenantDetailActions.tsx, AddonStatusBadge.tsx, PlanOverrideRow.tsx, SuspendModal.tsx, AuditLogList.tsx |

## Key Implementation Details

### Task 1 — Layout, Sidebar, Tenant List

- `SuperAdminSidebar` — Client Component cloned from AdminSidebar. Renders "NZPOS" (Satoshi 20px semibold) + "SUPER ADMIN" (DM Sans 14px uppercase tracking-wider white/40). Single "Tenants" nav link with amber active border-l-4. Footer shows email + sign out.
- `SuperAdminLayout` — Server Component. Checks `user.app_metadata?.is_super_admin !== true` and redirects to `/login`. No StripeTestModeBanner or XeroDisconnectBanner.
- `TenantStatusBadge` — Active (success green pill) / Suspended (error red pill).
- `TenantTable` — Client Component. 300ms debounce on search using `useRef`/`setTimeout`/`clearTimeout`. URL-based search param updates via `useRouter().push()`. Clear button with `aria-label="Clear search"`. Status select filter. Pagination with up to 5 page numbers + ellipsis. Row clickable, "View" action link.
- `TenantsPage` — Server Component with `force-dynamic`. Uses admin client with range query, `.or()` for search, `.eq()` for status filter. Maps `store_plans` to comma-separated add-on summary string.

### Task 2 — Tenant Detail

- `AddonStatusBadge` — Three states: Active (Stripe) navy pill, Active (Manual) amber tint pill, Inactive surface/muted pill.
- `PlanOverrideRow` — Client Component. Activate Add-on button using `useFormStatus` for loading spinner. Deactivate shows inline confirm row (not modal) with cancel. Error states inline below row.
- `SuspendModal` — Client Component. Fixed inset overlay with click-to-close. Amber warning box. Required reason textarea. "Confirm Suspension" button disabled until reason filled. Uses `useFormStatus` for loading state. Calls `onClose()` on success.
- `AuditLogList` — Server Component. Relative timestamps via `formatDistanceToNow`. Color-coded 32px icon circles by action type. Formats action descriptions from action string + note.
- `TenantDetailPage` — Server Component. `Promise.all` for parallel store/plans/latest-order/audit queries. `notFound()` on missing store. 3-column grid (2:1 left:right). `await params` per Next.js 16 pattern.
- `TenantDetailActions` — Client wrapper component for suspend modal state. Unsuspend uses form with async void wrapper to satisfy React form action type.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed React form action type mismatch on unsuspendTenant**
- **Found during:** Task 2 — TypeScript build check
- **Issue:** `unsuspendTenant` returns `Promise<{ success: true } | { error: string }>` which is not assignable to React's form action type `(formData: FormData) => void | Promise<void>`
- **Fix:** Wrapped in `async (fd) => { await unsuspendTenant(fd) }` arrow function in TenantDetailActions
- **Files modified:** `src/app/super-admin/tenants/[id]/TenantDetailActions.tsx`
- **Commit:** 2ccebab (included in task commit)

## Pre-existing Test Failures (Out of Scope)

The following test failures existed before this plan and are unrelated to files created here:
- `tests/e2e/tenant-isolation.spec.ts` — E2E test, pre-existing
- `tests/e2e/tenant-routing.spec.ts` — E2E test, pre-existing
- `src/lib/__tests__/schema.test.ts` — Schema type issues from DB types mismatch
- `src/actions/auth/__tests__/ownerSignup.test.ts` — Auth mock issues
- `src/actions/orders/__tests__/completeSale.test.ts` — Order action mock issues
- `src/actions/orders/__tests__/sendPosReceipt.test.ts` — Receipt action mock issues
- `src/actions/orders/__tests__/updateOrderStatus.test.ts` — Status action mock issues

These are deferred to the existing backlog.

## Known Stubs

None — all components render real data from the database via Server Actions and the admin Supabase client.

## Self-Check: PASSED

Files exist:
- src/app/super-admin/layout.tsx: FOUND
- src/components/super-admin/SuperAdminSidebar.tsx: FOUND
- src/app/super-admin/tenants/page.tsx: FOUND
- src/components/super-admin/TenantTable.tsx: FOUND
- src/components/super-admin/TenantStatusBadge.tsx: FOUND
- src/app/super-admin/tenants/[id]/page.tsx: FOUND
- src/components/super-admin/AddonStatusBadge.tsx: FOUND
- src/components/super-admin/PlanOverrideRow.tsx: FOUND
- src/components/super-admin/SuspendModal.tsx: FOUND
- src/components/super-admin/AuditLogList.tsx: FOUND

Commits exist:
- 3bddfc3: FOUND (Task 1)
- 2ccebab: FOUND (Task 2)
