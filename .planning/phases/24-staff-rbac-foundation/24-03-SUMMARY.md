---
phase: 24-staff-rbac-foundation
plan: 03
subsystem: admin-ui
tags: [rbac, staff-ui, modals, sidebar, badges, table, pin-display]

# Dependency graph
requires:
  - phase: 24-01
    provides: POS_ROLES, generatePin, isPinBlacklisted
  - phase: 24-02
    provides: createStaff, updateStaff, deactivateStaff, resetStaffPin, getStaffList, AdminSidebar role/staffName props
provides:
  - Staff admin page (/admin/staff) with server-side data fetch
  - StaffTable with inline Edit/Reset PIN/Deactivate actions and row disabling
  - StaffStatusBadge (Active/Inactive pill) and RoleBadge (Owner/Manager/Staff pill)
  - AddStaffModal with auto-generate/manual PIN toggle
  - EditStaffModal with role change detection
  - ConfirmRoleChangeModal (neutral navy) and ConfirmDeactivateModal (destructive red)
  - PinDisplayModal one-time PIN reveal with clipboard copy
  - StaffPageClient orchestrator with toast notifications and useTransition
  - AdminSidebar role-aware filtering (manager sees only 4 links, removed from DOM)
  - AdminSidebar Staff link added to BASE_NAV_LINKS for owners
affects: [admin-navigation, staff-management, manager-access]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "StaffPageClient orchestrator pattern: Client Component managing activeModal state machine, wiring Server Action callbacks to modal openers"
    - "useTransition + startTransition for all Server Action calls — prevents UI blocking"
    - "Toast notifications via local state array with setTimeout cleanup — no external library"
    - "Modal z-index layering: EditStaffModal z-40, ConfirmRoleChangeModal z-50 for role-change two-layer flow"
    - "Manager nav links removed from DOM (not hidden with CSS) per D-09 security requirement"

key-files:
  created:
    - src/app/admin/staff/page.tsx
    - src/app/admin/staff/loading.tsx
    - src/components/admin/staff/StaffPageClient.tsx
    - src/components/admin/staff/StaffTable.tsx
    - src/components/admin/staff/StaffStatusBadge.tsx
    - src/components/admin/staff/RoleBadge.tsx
    - src/components/admin/staff/AddStaffModal.tsx
    - src/components/admin/staff/EditStaffModal.tsx
    - src/components/admin/staff/PinDisplayModal.tsx
    - src/components/admin/staff/ConfirmDeactivateModal.tsx
    - src/components/admin/staff/ConfirmRoleChangeModal.tsx
  modified:
    - src/components/admin/AdminSidebar.tsx

key-decisions:
  - "AddStaffModal generates PIN client-side using Math.random + blacklist loop — crypto.randomInt is Node-only, not available in browser; server receives and hashes the PIN"
  - "Manager nav links removed from DOM in AdminSidebar navLinks computation — no CSS visibility/display manipulation"
  - "EditStaffModal stays mounted at z-40 when ConfirmRoleChangeModal opens at z-50 — both rendered simultaneously for visual layering"
  - "Toast system uses local state array with setTimeout rather than external library — sufficient for this phase"

# Metrics
duration: ~20min
completed: 2026-04-05
---

# Phase 24 Plan 03: Staff Management UI + Role-Aware Sidebar Summary

**Complete staff management UI with table, 5 modals (add, edit, PIN display, confirm role change, confirm deactivate), role/status badges, and AdminSidebar role-aware nav filtering for manager sessions**

## Performance

- **Duration:** ~20 min
- **Completed:** 2026-04-05
- **Tasks:** 2 of 3 (Task 3 pending human verification)
- **Files modified:** 12

## Accomplishments

- Created `src/app/admin/staff/page.tsx` Server Component calling `getStaffList()` with error state handling
- Created `src/app/admin/staff/loading.tsx` skeleton with 5 animated rows (animate-pulse, bg-border fill)
- Created `StaffPageClient.tsx` orchestrator with activeModal state machine, useTransition, success/error toasts, and empty state
- Created `StaffTable.tsx` full-width table with Name/Role/Status/Actions columns, row hover, row disabling during in-flight actions, inactive row styling
- Created `StaffStatusBadge.tsx` Active (success tint) / Inactive (surface + muted) pill badges
- Created `RoleBadge.tsx` Owner (navy tint) / Manager (amber tint) / Staff (surface + muted) pill badges
- Created `AddStaffModal.tsx` with auto-generate/manual PIN toggle, role select (Manager/Staff only per D-07), client-side PIN generation with blacklist
- Created `EditStaffModal.tsx` with all roles (Owner/Manager/Staff), triggers ConfirmRoleChangeModal on role change
- Created `ConfirmRoleChangeModal.tsx` with inline RoleBadge components, navy primary button (neutral action)
- Created `ConfirmDeactivateModal.tsx` with red warning block, bg-error destructive button (the only red primary in this phase)
- Created `PinDisplayModal.tsx` one-time PIN reveal, amber Copy PIN button with "Copied!" feedback, clipboard fallback, navy ghost Done button (no dismiss-on-outside-click)
- Updated `AdminSidebar.tsx`: added Staff link, MANAGER_NAV_LINKS constant, role-aware navLinks computation, staffName in footer

## Task Commits

1. **Task 1: Create staff page, table, badges, and all modals** - `e92143a` (feat)
2. **Task 2: Update AdminSidebar for role-aware nav filtering** - `1eb508c` (feat)

**Task 3 (Pending):** Human verification checkpoint — not executed per orchestrator instructions.

## Files Created/Modified

- `src/app/admin/staff/page.tsx` — Server Component: getStaffList + error/success render
- `src/app/admin/staff/loading.tsx` — Loading skeleton: 5 animated rows, no action column
- `src/components/admin/staff/StaffPageClient.tsx` — Client orchestrator: modal state, toasts, all action callbacks
- `src/components/admin/staff/StaffTable.tsx` — Data table: columns, hover, disabled row, Deactivate hidden for inactive
- `src/components/admin/staff/StaffStatusBadge.tsx` — Active/Inactive pill badge
- `src/components/admin/staff/RoleBadge.tsx` — Owner/Manager/Staff color-coded pill badge
- `src/components/admin/staff/AddStaffModal.tsx` — Add modal: auto/manual PIN, Manager/Staff roles only
- `src/components/admin/staff/EditStaffModal.tsx` — Edit modal: all roles, triggers role change confirm flow
- `src/components/admin/staff/PinDisplayModal.tsx` — One-time PIN reveal: clipboard copy, Copied! state, fallback text
- `src/components/admin/staff/ConfirmRoleChangeModal.tsx` — Role change confirm: inline RoleBadge, navy primary
- `src/components/admin/staff/ConfirmDeactivateModal.tsx` — Deactivate confirm: red warning block, bg-error button
- `src/components/admin/AdminSidebar.tsx` — Staff link added, MANAGER_NAV_LINKS, role-aware nav, staffName footer

## Decisions Made

- AddStaffModal uses `Math.random()` for client-side PIN generation (not `crypto.randomInt` which is Node-only) — same blacklist check applies; server hashes whatever PIN it receives
- Manager nav links are removed from the DOM entirely in the `navLinks` computation — not hidden with CSS
- EditStaffModal renders at z-40, ConfirmRoleChangeModal at z-50 — both visible simultaneously for the role-change layered UX

## Deviations from Plan

**1. [Rule 1 - Bug] Client-side PIN generation approach adjusted**

- **Found during:** Task 1 (AddStaffModal)
- **Issue:** Plan notes correctly that `crypto.randomInt` is Node-only, and suggests `Math.random()` as the client-side approach
- **Fix:** Implemented the suggested `Math.random()` approach with the same PIN_BLACKLIST constant duplicated in the component — this is intentional as the server also validates blacklist via `isPinBlacklisted()`
- **Files modified:** `src/components/admin/staff/AddStaffModal.tsx`

**2. [Rule 2 - Missing handling] Added success toast for name-only edit**

- **Found during:** Task 1
- **Issue:** The plan specified success toasts for role change and deactivate but didn't mention name-only edit. The name-only update path in StaffPageClient.handleEditSave needed a toast too.
- **Fix:** Added `addToast` call after successful name-only updateStaff
- **Files modified:** `src/components/admin/staff/StaffPageClient.tsx`

## Known Stubs

None — all wired correctly. The StaffPageClient receives live `StaffMember[]` data from the server page and passes it to StaffTable. Server Actions are imported directly.

## Pending (Task 3)

**Task 3: Human verification checkpoint** — blocked per orchestrator instructions (Tasks 1 and 2 only).

Verification steps require:
1. Visit /admin/staff — staff table loads
2. Add Staff Member modal flow with PIN display
3. Edit/role change confirmation flow
4. Deactivate confirmation flow
5. Manager login via POS PIN → filtered sidebar verification
6. Manager route blocking (/admin/products → redirect to /admin/dashboard)

---
*Phase: 24-staff-rbac-foundation*
*Completed: 2026-04-05 (Tasks 1-2 only; Task 3 awaiting human verification)*

## Self-Check: PASSED

- src/app/admin/staff/page.tsx: FOUND
- src/app/admin/staff/loading.tsx: FOUND
- src/components/admin/staff/StaffPageClient.tsx: FOUND
- src/components/admin/staff/StaffTable.tsx: FOUND
- src/components/admin/staff/StaffStatusBadge.tsx: FOUND
- src/components/admin/staff/RoleBadge.tsx: FOUND
- src/components/admin/staff/AddStaffModal.tsx: FOUND
- src/components/admin/staff/EditStaffModal.tsx: FOUND
- src/components/admin/staff/PinDisplayModal.tsx: FOUND
- src/components/admin/staff/ConfirmDeactivateModal.tsx: FOUND
- src/components/admin/staff/ConfirmRoleChangeModal.tsx: FOUND
- src/components/admin/AdminSidebar.tsx: FOUND (modified)
- Commit e92143a (Task 1): FOUND
- Commit 1eb508c (Task 2): FOUND
- TypeScript: compiles without new errors (pre-existing database.ts artifact excluded)
