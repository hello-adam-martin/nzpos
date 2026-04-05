---
phase: 25-admin-operational-ui
plan: 01
subsystem: ui
tags: [settings, promos, supabase, react, server-actions, zod, tailwind]

# Dependency graph
requires:
  - phase: 24-staff-rbac-foundation
    provides: AdminSidebar with role-based nav, Supabase server client patterns
provides:
  - Migration 028 adding is_active to customers and 4 new columns to stores
  - updateBusinessDetails and updateReceiptSettings Server Actions
  - BusinessDetailsForm and ReceiptForm settings section components
  - updatePromoCode and deletePromoCode Server Actions (soft-delete)
  - EditPromoModal for pre-filled promo editing
  - Extended PromoList with Edit/Delete actions and Show deleted toggle
  - Customers nav link in AdminSidebar (owner-only)
affects: [25-02, 25-03, customer-management, receipt-printing]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "useTransition for async Server Action loading state in client forms"
    - "Soft-delete pattern with optimistic lock (.eq('is_active', true)) prevents double-delete"
    - "Per-section Save buttons in settings page cards — each section saves independently"

key-files:
  created:
    - supabase/migrations/028_customer_disable_settings.sql
    - src/actions/settings/updateBusinessDetails.ts
    - src/actions/settings/updateReceiptSettings.ts
    - src/app/admin/settings/BusinessDetailsForm.tsx
    - src/app/admin/settings/ReceiptForm.tsx
    - src/actions/promos/updatePromoCode.ts
    - src/actions/promos/deletePromoCode.ts
    - src/components/admin/EditPromoModal.tsx
  modified:
    - src/types/database.ts
    - src/app/admin/settings/page.tsx
    - src/components/admin/PromoList.tsx
    - src/components/admin/AdminSidebar.tsx

key-decisions:
  - "Soft-delete uses is_active=false with optimistic lock (.eq('is_active', true)) to prevent race conditions"
  - "PromoList converted to 'use client' component to support local state for modals and toggles"
  - "Phone column already existed on stores table — migration adds business_address, ird_gst_number, receipt_header, receipt_footer (4 columns, not 5)"
  - "Pre-existing 'Connecting to db 5432' header artifact in database.ts removed (Rule 1 auto-fix)"

patterns-established:
  - "Settings section card: max-w-md, white bg-card, border, shadow-sm, rounded-[var(--radius-lg)], p-[var(--space-xl)]"
  - "useTransition for Server Action calls in client components (not useState+async)"

requirements-completed: [SETTINGS-01, SETTINGS-02, SETTINGS-03, PROMO-01, PROMO-02]

# Metrics
duration: 25min
completed: 2026-04-05
---

# Phase 25 Plan 01: DB Migration, Settings Forms, and Promo Management Summary

**Expanded store settings with business details and receipt customization forms, added promo edit/soft-delete with modal UI, and wired Customers link into AdminSidebar**

## Performance

- **Duration:** 25 min
- **Started:** 2026-04-05T00:00:00Z
- **Completed:** 2026-04-05T00:25:00Z
- **Tasks:** 2
- **Files modified:** 12

## Accomplishments

- Migration 028 adds `is_active` to customers (for CUST-04 disable flow in Plan 02) and 4 new columns to stores for business details and receipt customization
- Settings page now renders 3 independent sections (Branding, Business Details, Receipt Customisation) each with its own save button and inline success/error feedback
- Promo codes can be edited via pre-filled EditPromoModal and soft-deleted via confirmation modal with order history preserved
- Deleted promos are hidden by default and revealed via "Show deleted" checkbox toggle with greyed-out styling and "Deleted" badge
- Customers link added to AdminSidebar BASE_NAV_LINKS between Orders and Reports (owner-only, not in MANAGER_NAV_LINKS)

## Task Commits

Each task was committed atomically:

1. **Task 1: DB migration, types regen, settings forms, and settings Server Actions** - `7e741c1` (feat)
2. **Task 2: Promo edit/delete Server Actions, EditPromoModal, extended PromoList, AdminSidebar Customers link** - `0e35c87` (feat)

## Files Created/Modified

- `supabase/migrations/028_customer_disable_settings.sql` - Migration adding is_active to customers + 4 columns to stores
- `src/types/database.ts` - Updated with new columns for customers and stores tables
- `src/actions/settings/updateBusinessDetails.ts` - Server Action: Zod validation, owner auth, stores table update
- `src/actions/settings/updateReceiptSettings.ts` - Server Action: Zod validation, owner auth, receipt fields update
- `src/app/admin/settings/BusinessDetailsForm.tsx` - Client form: business address, phone, IRD/GST number
- `src/app/admin/settings/ReceiptForm.tsx` - Client form: receipt header and footer textareas
- `src/app/admin/settings/page.tsx` - Extended to fetch all 9 store fields and render 3 form sections
- `src/actions/promos/updatePromoCode.ts` - Server Action: promo edit with owner auth and Zod validation
- `src/actions/promos/deletePromoCode.ts` - Server Action: soft-delete with optimistic lock
- `src/components/admin/EditPromoModal.tsx` - Modal component pre-filled with promo values
- `src/components/admin/PromoList.tsx` - Extended to 'use client' with edit/delete actions, deleted toggle, modal rendering
- `src/components/admin/AdminSidebar.tsx` - Added Customers link to BASE_NAV_LINKS

## Decisions Made

- Phone column already existed on stores table — migration adds only `business_address`, `ird_gst_number`, `receipt_header`, `receipt_footer` (4 columns). The `phone` field from the existing schema is reused.
- Soft-delete pattern uses optimistic lock `.eq('is_active', true)` to prevent double-delete race conditions
- PromoList converted from Server Component to `'use client'` to support modal state management

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed pre-existing 'Connecting to db 5432' artifact from database.ts**
- **Found during:** Task 1 (type regeneration)
- **Issue:** database.ts had `Connecting to db 5432` as line 1 — a db CLI connection message accidentally captured during type generation, causing `tsc --noEmit` to fail with TS1434 errors
- **Fix:** Removed the non-TypeScript header line from line 1 of database.ts
- **Files modified:** src/types/database.ts
- **Verification:** `npx tsc --noEmit` no longer emits TS1434 errors for database.ts
- **Committed in:** `7e741c1` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug fix)
**Impact on plan:** Essential fix — TypeScript type checking was broken for the entire project. No scope creep.

## Issues Encountered

- Pre-existing TypeScript errors in `src/actions/inventory/adjustStock.ts`, `src/actions/products/createProduct.ts`, `src/actions/products/importProducts.ts` — these are out of scope for Plan 01 and were not introduced by these changes. Logged to deferred items.

## Known Stubs

None — all forms wire to real Server Actions that update the database.

## User Setup Required

None — no external service configuration required. The migration file `028_customer_disable_settings.sql` must be applied to the database before the new form fields will persist. Run `npx supabase db push` or `npx supabase migration up` in the project root.

## Next Phase Readiness

- Migration 028 ready to run — provides `is_active` on customers for Plan 02 (customer management)
- Settings page has 3 independent sections, each saves independently
- Promo management has full edit and soft-delete capability
- AdminSidebar Customers link navigates to `/admin/customers` (page will be built in Plan 02)
- No blockers for Plan 02 or Plan 03 execution

---
*Phase: 25-admin-operational-ui*
*Completed: 2026-04-05*
