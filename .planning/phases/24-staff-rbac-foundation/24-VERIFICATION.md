---
phase: 24-staff-rbac-foundation
verified: 2026-04-04T19:48:32Z
status: gaps_found
score: 18/20 must-haves verified
re_verification: false
gaps:
  - truth: "resetStaffPin generates new PIN hash and returns plaintext once"
    status: partial
    reason: "Implementation is correct. Unit test for resetStaffPin success path fails because the test mock chain does not include .select() but the implementation calls .select('id') after the update for confirmation. Test needs mock chain update."
    artifacts:
      - path: "src/actions/staff/__tests__/staff-actions.test.ts"
        issue: "Mock chain for resetStaffPin success test is missing .select() in the chain: mockReturnValue({ eq: eqStoreId }) needs to become { eq: vi.fn().mockReturnValue({ select: vi.fn().mockResolvedValue({...}) }) }"
    missing:
      - "Fix test mock at line 293-296 to extend chain with .select() after the second .eq()"
  - truth: "Middleware allows manager JWT to reach /admin/dashboard but redirects from /admin/products"
    status: partial
    reason: "Middleware implementation is correct. One middleware test ('redirects non-owner non-customer role to /unauthorized') documents pre-Phase-24 behavior that was intentionally changed: non-owner Supabase users now fall through to staff JWT check instead of redirecting to /unauthorized. The test expectation contradicts the implemented behavior."
    artifacts:
      - path: "src/middleware.test.ts"
        issue: "Test at line 326 'redirects non-owner non-customer role to /unauthorized' expects redirect to /unauthorized but Phase 24 deliberately changed this path to fall through to staff JWT check then login redirect. Test must be updated to expect /login redirect."
    missing:
      - "Update test at line 326 to expect login redirect (e.g. expect(location).toContain('/login')) instead of /unauthorized"
human_verification:
  - test: "Staff management end-to-end flow"
    expected: "Owner sees staff table, can add/edit/deactivate staff via modals, PinDisplayModal shows PIN once with copy button"
    why_human: "Full interactive flow with modal state transitions, clipboard API, and Server Action mutations cannot be verified programmatically"
  - test: "Manager sidebar filtering"
    expected: "Manager logged in via PIN sees only Dashboard, Orders, Reports, Cash-Up — no Products, Staff, Settings links in DOM"
    why_human: "Requires authenticated manager session in browser to verify DOM-level link removal"
  - test: "Manager admin route enforcement"
    expected: "Navigating to /admin/products as manager silently redirects to /admin/dashboard with no error message"
    why_human: "Requires active manager session and browser navigation to verify redirect behavior"
  - test: "Manager refund access"
    expected: "Manager can complete a full or partial refund on an existing order from /admin/orders"
    why_human: "Requires active manager session and existing order data to execute refund flow end-to-end"
---

# Phase 24: Staff RBAC Foundation Verification Report

**Phase Goal:** Staff RBAC Foundation — database migration for manager role, centralized role constants, staff CRUD Server Actions, middleware manager routing, admin layout dual-auth, staff management UI with modals, role-aware sidebar filtering.
**Verified:** 2026-04-04T19:48:32Z
**Status:** gaps_found (2 test fixes required, implementation is correct)
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Database accepts 'manager' as a valid staff role value | VERIFIED | `027_staff_manager_role.sql` contains `CHECK (role IN ('owner', 'manager', 'staff'))` |
| 2 | POS_ROLES constant is the single source of truth for role strings | VERIFIED | `src/config/roles.ts` exports `POS_ROLES`, `PosRole`, `MANAGER_ADMIN_ROUTES`, `OWNER_ONLY_ADMIN_ROUTES` |
| 3 | PIN generation never returns blacklisted values like 0000 or 1234 | VERIFIED | `pin.ts` uses `crypto.randomInt` + retry loop against `PIN_BLACKLIST`. 8 tests all pass. |
| 4 | resolveStaffAuthVerified() returns null for inactive staff | VERIFIED | Implementation queries DB for `is_active` field, returns null if `is_active === false`. 14 tests pass. |
| 5 | Zod schemas validate 'manager' as a valid role | VERIFIED | `CreateStaffSchema` uses `z.enum([POS_ROLES.MANAGER, POS_ROLES.STAFF])`, `UpdateStaffSchema` uses all three roles |
| 6 | createStaff action rejects non-owner callers with INSUFFICIENT_ROLE | VERIFIED | Checks `user.app_metadata?.role !== POS_ROLES.OWNER`, returns `{ error: 'INSUFFICIENT_ROLE' }` |
| 7 | updateStaff action sets pin_locked_until on role change | VERIFIED | Sets `pin_locked_until: new Date().toISOString()` when role is in the update payload |
| 8 | deactivateStaff sets is_active=false and pin_locked_until=now() | VERIFIED | Updates both fields atomically with optimistic lock on `is_active === true` |
| 9 | resetStaffPin generates new PIN hash and returns plaintext once | PARTIAL | Implementation is correct; 1 test mock chain missing `.select()` — test failure only, not a code bug |
| 10 | Middleware allows manager JWT to reach /admin/dashboard but redirects from /admin/products | PARTIAL | Implementation verified correct; 1 test documents old pre-Phase-24 behavior that was intentionally changed |
| 11 | processPartialRefund allows manager role to process refunds | VERIFIED | Imports `resolveStaffAuthVerified`, checks `staffAuth.role === POS_ROLES.MANAGER` |
| 12 | processRefund allows manager role to process full refunds | VERIFIED | Same dual-auth pattern applied |
| 13 | Admin layout handles manager sessions (no Supabase Auth user) | VERIFIED | Reads `staff_session` cookie via `jwtVerify`, sets `role = 'manager'` and `staffName` |
| 14 | Admin can see a table of staff with name, role badge, status badge, and action buttons | VERIFIED | `StaffTable.tsx` (92 lines) renders all four columns with `RoleBadge` and `StaffStatusBadge` components |
| 15 | Admin can add a new staff member via modal and see the generated PIN once | VERIFIED | `AddStaffModal.tsx` (224 lines) calls `createStaff`; on success opens `PinDisplayModal` |
| 16 | Admin can edit a staff member's name and role with confirmation on role change | VERIFIED | `EditStaffModal` opens `ConfirmRoleChangeModal` on role change; name-only calls `updateStaff` directly |
| 17 | Admin can deactivate a staff member with warning confirmation | VERIFIED | `ConfirmDeactivateModal` with `bg-error` button and warning block |
| 18 | Admin can reset a staff member's PIN and see the new PIN once | VERIFIED | `resetStaffPin` called inline; success opens `PinDisplayModal` with returned PIN |
| 19 | Manager sidebar shows only Dashboard, Orders, Reports, Cash-Up | VERIFIED | `MANAGER_NAV_LINKS` array with 4 entries; `role === 'manager'` ? MANAGER_NAV_LINKS : BASE_NAV_LINKS |
| 20 | Owner sidebar shows all links including Staff | VERIFIED | `BASE_NAV_LINKS` includes `{ href: '/admin/staff', label: 'Staff' }` |

**Score:** 18/20 truths verified (2 test fixes needed, both are test-only issues)

---

## Required Artifacts

### Plan 01 Artifacts

| Artifact | Status | Details |
|----------|--------|---------|
| `supabase/migrations/027_staff_manager_role.sql` | VERIFIED | Contains `staff_role_check`, `'manager'` in CHECK constraint |
| `src/config/roles.ts` | VERIFIED | Exports `POS_ROLES`, `PosRole`, `MANAGER_ADMIN_ROUTES`, `OWNER_ONLY_ADMIN_ROUTES` (37 lines) |
| `src/lib/pin.ts` | VERIFIED | Exports `generatePin`, `isPinBlacklisted` with crypto.randomInt + blacklist |
| `src/schemas/staff.ts` | VERIFIED | Exports all 4 schemas + `StaffPinLoginSchema` + 5 type exports, imports `POS_ROLES` |
| `src/lib/resolveAuth.ts` | VERIFIED | Exports `resolveStaffAuthVerified` with DB `is_active` check, imports `PosRole` |

### Plan 02 Artifacts

| Artifact | Status | Details |
|----------|--------|---------|
| `src/actions/staff/createStaff.ts` | VERIFIED | `'use server'` + `server-only` + `CreateStaffSchema.safeParse` + `INSUFFICIENT_ROLE` + `isPinBlacklisted` + `bcryptjs.hash` + `revalidatePath('/admin/staff')` |
| `src/actions/staff/updateStaff.ts` | VERIFIED | `pin_locked_until` set on role change |
| `src/actions/staff/deactivateStaff.ts` | VERIFIED | `is_active: false` + `pin_locked_until` + optimistic lock |
| `src/actions/staff/resetStaffPin.ts` | VERIFIED | `generatePin()` + returns plaintext `pin` once (correct implementation) |
| `src/actions/staff/getStaffList.ts` | VERIFIED | Exports `getStaffList` and `StaffMember` type |
| `src/actions/staff/__tests__/staff-actions.test.ts` | STUB (1 test) | Contains `INSUFFICIENT_ROLE`, `pin_locked_until`, `is_active`. resetStaffPin success test mock chain incomplete — needs `.select()` added |
| `src/middleware.ts` | VERIFIED | Imports `MANAGER_ADMIN_ROUTES` + `POS_ROLES`, has `isManagerRoute` check, manager redirect to `/admin/dashboard`, POS block allows `'manager'` |
| `src/middleware.test.ts` | STUB (1 test) | 28/29 tests correct; test at line 326 documents obsolete pre-Phase-24 `/unauthorized` behavior |
| `src/app/admin/layout.tsx` | VERIFIED | `staff_session` cookie check, `jwtVerify`, `role` variable, `staffName`, passes `role={role}` to `AdminSidebar` |
| `src/actions/orders/processPartialRefund.ts` | VERIFIED | Imports `resolveStaffAuthVerified`, checks `POS_ROLES.MANAGER` |
| `src/actions/orders/processRefund.ts` | VERIFIED | Same dual-auth pattern |

### Plan 03 Artifacts

| Artifact | Min Lines | Actual | Status | Details |
|----------|-----------|--------|--------|---------|
| `src/app/admin/staff/page.tsx` | 15 | 26 | VERIFIED | Imports `getStaffList`, handles error state |
| `src/app/admin/staff/loading.tsx` | — | ~32 | VERIFIED | `animate-pulse` skeleton rows |
| `src/components/admin/staff/StaffPageClient.tsx` | — | 264 | VERIFIED | `'use client'`, imports all 5 actions, all modal state |
| `src/components/admin/staff/StaffTable.tsx` | 50 | 92 | VERIFIED | All 4 columns, `onEdit`/`onDeactivate`/`onResetPin` props |
| `src/components/admin/staff/StaffStatusBadge.tsx` | — | ~18 | VERIFIED | `bg-success/10 text-success` for active |
| `src/components/admin/staff/RoleBadge.tsx` | — | ~22 | VERIFIED | `bg-navy/10` for owner, `bg-amber/10` for manager |
| `src/components/admin/staff/AddStaffModal.tsx` | 80 | 224 | VERIFIED | "Add Staff Member", "Auto-generate PIN" toggle, blacklist validation |
| `src/components/admin/staff/EditStaffModal.tsx` | — | 112 | VERIFIED | "Save Changes", pre-populated fields, triggers ConfirmRoleChangeModal |
| `src/components/admin/staff/PinDisplayModal.tsx` | 50 | 104 | VERIFIED | "Save this PIN", `navigator.clipboard`, "Copied!" state |
| `src/components/admin/staff/ConfirmDeactivateModal.tsx` | — | 83 | VERIFIED | `bg-error`, "Keep Active" button, warning block |
| `src/components/admin/staff/ConfirmRoleChangeModal.tsx` | — | 65 | VERIFIED | "Change role?", "Keep Current Role", navy primary (not red) |
| `src/components/admin/AdminSidebar.tsx` | — | 148 | VERIFIED | `MANAGER_NAV_LINKS`, `role === 'manager'`, `staffName`, `/admin/staff` in BASE_NAV_LINKS |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/config/roles.ts` | `src/schemas/staff.ts` | POS_ROLES import | WIRED | `import { POS_ROLES } from '@/config/roles'` found at line 2 |
| `src/lib/resolveAuth.ts` | `src/config/roles.ts` | PosRole type | WIRED | `import type { PosRole } from '@/config/roles'` at line 6 |
| `src/actions/staff/createStaff.ts` | `src/schemas/staff.ts` | CreateStaffSchema import | WIRED | Line 5 |
| `src/actions/staff/createStaff.ts` | `src/lib/pin.ts` | isPinBlacklisted | WIRED | Line 9 |
| `src/middleware.ts` | `src/config/roles.ts` | MANAGER_ADMIN_ROUTES + POS_ROLES | WIRED | Line 6 |
| `src/actions/orders/processPartialRefund.ts` | `src/lib/resolveAuth.ts` | resolveStaffAuthVerified | WIRED | Line 10 |
| `src/actions/orders/processRefund.ts` | `src/lib/resolveAuth.ts` | resolveStaffAuthVerified | WIRED | Line 9 |
| `src/components/admin/staff/StaffPageClient.tsx` | `src/actions/staff/createStaff.ts` | createStaff import | WIRED | Line 7 |
| `src/components/admin/AdminSidebar.tsx` | role prop | Props-based filtering | WIRED | `role === 'manager'` at line 41 |
| `src/app/admin/staff/page.tsx` | `src/actions/staff/getStaffList.ts` | getStaffList import | WIRED | Line 1 |

---

## Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `src/app/admin/staff/page.tsx` | `result.data` (StaffMember[]) | `getStaffList()` → adminClient `.from('staff').select(...)` | Yes — DB query with `.order('name')` | FLOWING |
| `src/components/admin/staff/StaffPageClient.tsx` | `staff` prop | Passed from Server Component page | Yes — sourced from DB via page | FLOWING |
| `src/app/admin/layout.tsx` | `userEmail`, `role`, `staffName` | Owner: Supabase Auth `getUser()`; Manager: JWT cookie | Yes — real auth data | FLOWING |
| `src/components/admin/AdminSidebar.tsx` | `navLinks` | `role` prop from layout | Yes — determined by real session role | FLOWING |

---

## Behavioral Spot-Checks

Step 7b: Tests were run programmatically via vitest.

| Behavior | Result | Status |
|----------|--------|--------|
| PIN tests (8): generatePin never returns blacklist, returns 4-digit string | 8 pass | PASS |
| resolveAuth tests (14): resolveStaffAuthVerified null for inactive, returns role | 14 pass | PASS |
| Staff action tests (14): INSUFFICIENT_ROLE guard, PIN blacklist, pin_locked_until | 13 pass, 1 fail | PARTIAL — test mock chain missing `.select()` |
| Middleware tests (29): manager allowed/redirected, owner regression, setup wizard | 28 pass, 1 fail | PARTIAL — 1 test documents obsolete pre-Phase-24 behavior |

---

## Requirements Coverage

| Requirement | Plans | Description | Status | Evidence |
|-------------|-------|-------------|--------|---------|
| STAFF-01 | 01, 02, 03 | Admin can view a list of all staff members with name, role, and active status | SATISFIED | `getStaffList` + `StaffTable` with RoleBadge and StaffStatusBadge |
| STAFF-02 | 01, 02, 03 | Admin can add a new staff member with name and auto-generated or manual PIN | SATISFIED | `createStaff` + `AddStaffModal` with PIN toggle + `PinDisplayModal` |
| STAFF-03 | 01, 02, 03 | Admin can edit a staff member's name and role (Owner/Manager/Staff) | SATISFIED | `updateStaff` with `pin_locked_until` + `EditStaffModal` + `ConfirmRoleChangeModal` |
| STAFF-04 | 02, 03 | Admin can deactivate a staff member, preventing them from logging into POS | SATISFIED | `deactivateStaff` sets `is_active=false` + `pin_locked_until` + `ConfirmDeactivateModal` |
| STAFF-05 | 02, 03 | Admin can reset a staff member's PIN, generating a new one shown once | SATISFIED | `resetStaffPin` returns plaintext once + `PinDisplayModal` |
| STAFF-06 | 01, 02, 03 | Manager role can process refunds and view reports but cannot manage products, staff, or settings | SATISFIED | `processRefund` + `processPartialRefund` dual-auth; middleware MANAGER_ADMIN_ROUTES blocks /products, /staff, /settings; sidebar filters |

All 6 requirements satisfied. No orphaned requirements found.

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/actions/staff/__tests__/staff-actions.test.ts` | 293-296 | Mock chain missing `.select()` — test fails at runtime | BLOCKER | resetStaffPin success test fails; implementation is correct but test cannot verify it |
| `src/middleware.test.ts` | 326-351 | Test expects `/unauthorized` redirect for non-owner Supabase user — this behavior was intentionally changed in Phase 24 | BLOCKER | One middleware test fails; the actual middleware behavior is correct per Phase 24 design |

No placeholder components, empty renders, TODO comments, or data disconnects found across the 24 new/modified files.

---

## Human Verification Required

### 1. Staff Management End-to-End Flow

**Test:** Log in as owner, navigate to /admin/staff. Add a staff member with auto-generate PIN. Verify PinDisplayModal shows 4-digit PIN. Click "Copy PIN", verify clipboard. Click "Done", verify staff appears in table. Edit a staff member, change role — verify ConfirmRoleChangeModal appears with role badges. Confirm change, verify success toast.
**Expected:** All modal transitions work, PIN shown exactly once, toasts appear and auto-dismiss, table updates after each action.
**Why human:** Interactive modal state transitions, clipboard API behavior, and Server Action data refresh require browser execution.

### 2. Manager Sidebar Filtering

**Test:** Log a manager in via POS PIN login, then navigate to /admin/dashboard directly. Inspect the sidebar links.
**Expected:** Sidebar shows exactly: Dashboard, Orders, Reports, Cash-Up. Products, Promos, Staff, Integrations, Settings, Billing links are absent from the DOM entirely.
**Why human:** Requires an authenticated manager browser session to verify DOM-level link removal.

### 3. Manager Route Enforcement (Middleware Redirect)

**Test:** As a logged-in manager, navigate directly to /admin/products (or /admin/staff, /admin/settings).
**Expected:** Silent redirect to /admin/dashboard — no error message, no toast, no 403 page.
**Why human:** Requires active manager session and direct URL navigation to verify silent redirect behavior.

### 4. Manager Refund Access (STAFF-06)

**Test:** As a logged-in manager, open an existing order in /admin/orders and attempt a full or partial refund.
**Expected:** Refund completes successfully — manager has the same refund permissions as an owner.
**Why human:** Requires active manager session, existing order with payment, and live Stripe/Supabase environment to execute.

---

## Gaps Summary

Two test-only issues require fixing before the test suite passes cleanly:

**Gap 1 — resetStaffPin test mock chain (staff-actions.test.ts line 293):** The implementation correctly calls `.select('id')` after the second `.eq()` for result confirmation, but the test mock for the success path only chains two `.eq()` calls and does not include `.select()`. The mock needs one additional step in the chain. The production implementation is correct — this is purely a test maintenance issue.

**Gap 2 — Middleware test obsolete expectation (middleware.test.ts line 326):** Phase 24 deliberately changed the behavior for non-owner Supabase users reaching admin routes: they now fall through to the staff JWT check rather than being redirected to `/unauthorized`. The test at line 326 (`redirects non-owner non-customer role to /unauthorized`) documents the old pre-Phase-24 behavior. The test expectation should be updated to expect a login redirect instead.

Neither gap represents a functional defect in the delivered system. All 20 code artifacts are substantive and correctly wired. The 4 human verification items cover interactive flows that require a running browser session.

---

_Verified: 2026-04-04T19:48:32Z_
_Verifier: Claude (gsd-verifier)_
