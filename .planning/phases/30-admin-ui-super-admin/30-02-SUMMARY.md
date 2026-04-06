---
phase: 30-admin-ui-super-admin
plan: 02
subsystem: ui
tags: [super-admin, email_notifications, cleanup, tailwind]

# Dependency graph
requires:
  - phase: 29-backend-billing-cleanup
    provides: SubscriptionFeature type reduced to xero|custom_domain|inventory, has_email_notifications column kept always-true for backwards compat
provides:
  - Super admin dashboard with 3 adoption cards (Xero, Domain, Inventory) — no Email card
  - Super admin analytics ADDON_DISPLAY_NAMES with 3 entries only
  - Tenant list select query with has_xero, has_custom_domain, has_inventory (no email column)
  - Tenant detail select query without has_email_notifications or has_email_notifications_manual_override
affects: [super-admin, admin-ui, billing]

# Tech tracking
tech-stack:
  added: []
  patterns: []

key-files:
  created: []
  modified:
    - src/app/super-admin/page.tsx
    - src/app/super-admin/analytics/page.tsx
    - src/app/super-admin/tenants/page.tsx
    - src/app/super-admin/tenants/[id]/page.tsx

key-decisions:
  - "No SUMMARY.md deviations — all changes were direct removal of dead code references"

patterns-established: []

requirements-completed: [ADMIN-03, TEST-01]

# Metrics
duration: 3min
completed: 2026-04-06
---

# Phase 30 Plan 02: Super Admin Email Notifications Cleanup Summary

**Removed all email_notifications dead code from 4 super admin pages — dashboard now shows 3 adoption cards, analytics has 3 display names, tenant queries select only the 3 active add-on columns**

## Performance

- **Duration:** 3 min
- **Started:** 2026-04-06T07:10:12Z
- **Completed:** 2026-04-06T07:13:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Super admin dashboard select query cleaned (has_email_notifications removed), adoptionRates object cleaned, Email Adoption card removed, grid updated from md:grid-cols-4 to md:grid-cols-3
- Analytics page ADDON_DISPLAY_NAMES reduced from 4 to 3 entries (email_notifications removed)
- Tenants list select updated: has_email_notifications removed, has_inventory added (was missing)
- Tenant detail select updated: both has_email_notifications and has_email_notifications_manual_override removed

## Task Commits

Each task was committed atomically:

1. **Task 1: Remove email_notifications from super admin dashboard and analytics** - `16dbe07` (feat)
2. **Task 2: Remove email_notifications from super admin tenant pages** - `d120104` (feat)

**Plan metadata:** (docs commit — pending)

## Files Created/Modified
- `src/app/super-admin/page.tsx` - Removed email_notifications from select, adoptionRates, and JSX card; updated grid to 3 cols
- `src/app/super-admin/analytics/page.tsx` - Removed email_notifications from ADDON_DISPLAY_NAMES
- `src/app/super-admin/tenants/page.tsx` - Removed has_email_notifications, added has_inventory to store_plans select
- `src/app/super-admin/tenants/[id]/page.tsx` - Removed has_email_notifications and has_email_notifications_manual_override from select

## Decisions Made
None - followed plan as specified. All changes were straightforward removal of dead code.

## Deviations from Plan

None - plan executed exactly as written.

The only minor discovery: `tenants/page.tsx` was also missing `has_inventory` from its select. The plan explicitly called this out and instructed adding it, so this was planned work, not a deviation.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All super admin pages are now clean of email_notifications references
- `grep -r "email_notifications" src/app/super-admin/` returns zero matches
- Ready for phase completion / milestone wrap-up

## Self-Check: PASSED

- FOUND: src/app/super-admin/page.tsx
- FOUND: src/app/super-admin/analytics/page.tsx
- FOUND: src/app/super-admin/tenants/page.tsx
- FOUND: src/app/super-admin/tenants/[id]/page.tsx
- FOUND: .planning/phases/30-admin-ui-super-admin/30-02-SUMMARY.md
- FOUND commit: 16dbe07
- FOUND commit: d120104

---
*Phase: 30-admin-ui-super-admin*
*Completed: 2026-04-06*
