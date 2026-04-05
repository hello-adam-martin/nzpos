---
phase: 26-super-admin-billing-user-management
plan: 03
subsystem: ui
tags: [supabase-auth, react, super-admin, user-management, ban, password-reset]

# Dependency graph
requires:
  - phase: 26-super-admin-billing-user-management
    provides: TenantDetailActions with ownerEmail and ownerAuthId props ready for Plan 03

provides:
  - resetMerchantPassword server action (Supabase Auth resetPasswordForEmail + audit log)
  - disableMerchantAccount server action (ban 876600h + suspend store + cache invalidation + audit log)
  - enableMerchantAccount server action (unban + unsuspend store + cache invalidation + audit log)
  - PasswordResetModal component with blue info box and Send Reset Email confirm button
  - DisableAccountModal component with mode prop (disable/enable), amber warning for disable
  - TenantDetailActions extended with Send Password Reset and Disable/Re-enable Account buttons

affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - admin.auth.resetPasswordForEmail (not admin.auth.admin.resetPasswordForEmail) for password reset emails
    - ban_duration '876600h' for effective permanent ban via Supabase Auth admin API
    - ban_duration 'none' to unban via Supabase Auth admin API
    - Mode prop pattern on modals for dual-purpose components (disable/enable in single component)

key-files:
  created:
    - src/actions/super-admin/resetMerchantPassword.ts
    - src/actions/super-admin/disableMerchantAccount.ts
    - src/actions/super-admin/enableMerchantAccount.ts
    - src/components/super-admin/PasswordResetModal.tsx
    - src/components/super-admin/DisableAccountModal.tsx
  modified:
    - src/app/super-admin/tenants/[id]/TenantDetailActions.tsx

key-decisions:
  - "Use admin.auth.resetPasswordForEmail (not admin.auth.admin variant) — per RESEARCH.md Pitfall 4"
  - "DisableAccountModal accepts mode prop — single component handles both disable and re-enable flows"
  - "PasswordResetModal info box is blue (not amber) — non-destructive action"
  - "DisableAccountModal warning box is amber for disable mode, blue for enable mode"

patterns-established:
  - "Server action pattern: 'use server' + 'server-only' + Zod validate + super-admin auth check + action + cache invalidation + audit log + revalidatePath"
  - "Modal pattern: 'use client' + useFormStatus for ConfirmButton pending state + handleSubmit calls server action + error state display"

requirements-completed: [SA-USER-02, SA-USER-03]

# Metrics
duration: 10min
completed: 2026-04-05
---

# Phase 26 Plan 03: User Management Actions Summary

**Password reset email + account disable/enable via Supabase Auth admin API, with confirmation modals and audit logging on super-admin tenant detail page**

## Performance

- **Duration:** 10 min
- **Started:** 2026-04-05T11:10:00Z
- **Completed:** 2026-04-05T11:20:00Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Created `resetMerchantPassword` server action using `admin.auth.resetPasswordForEmail` per RESEARCH.md pitfall note (NOT the admin variant)
- Created `disableMerchantAccount` server action: bans owner with `ban_duration: '876600h'`, suspends store, invalidates tenant cache, logs audit event
- Created `enableMerchantAccount` server action: unbans owner with `ban_duration: 'none'`, unsuspends store, invalidates tenant cache, logs audit event
- Created `PasswordResetModal` component with blue info box (non-destructive), Send Reset Email confirm button, Don't Send cancel
- Created `DisableAccountModal` component with `mode: 'disable' | 'enable'` prop — amber warning for disable, blue info for enable
- Extended `TenantDetailActions` with ownerEmail/ownerAuthId props, Account section heading, Send Password Reset and Disable/Re-enable Account buttons

## Task Commits

1. **Task 1: Server actions for password reset, disable, and enable account** - `635436b` (feat)
2. **Task 2: Modals and extended TenantDetailActions UI** - `7bbe59f` (feat)

**Plan metadata:** (pending final commit)

## Files Created/Modified
- `src/actions/super-admin/resetMerchantPassword.ts` - Password reset server action via Supabase Auth
- `src/actions/super-admin/disableMerchantAccount.ts` - Ban user + suspend store server action
- `src/actions/super-admin/enableMerchantAccount.ts` - Unban user + unsuspend store server action
- `src/components/super-admin/PasswordResetModal.tsx` - Confirmation modal for password reset
- `src/components/super-admin/DisableAccountModal.tsx` - Dual-mode modal for disable/re-enable
- `src/app/super-admin/tenants/[id]/TenantDetailActions.tsx` - Extended with Account section buttons

## Decisions Made
- Used `admin.auth.resetPasswordForEmail` (not `admin.auth.admin.resetPasswordForEmail`) — per RESEARCH.md Pitfall 4
- `DisableAccountModal` uses a `mode` prop to handle both disable and re-enable flows in one component — avoids code duplication
- PasswordResetModal info box is blue (not amber) to signal non-destructive action; DisableAccountModal uses amber for disable mode
- All three server actions follow the exact `suspendTenant.ts` pattern for consistency

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- SA-USER-02 and SA-USER-03 requirements complete
- Phase 26 fully complete — super-admin billing visibility and user management all shipped
- Super-admin can now: view tenant Stripe subscriptions/invoices, see overdue payment warnings, send password resets, disable/re-enable merchant accounts

## Self-Check: PASSED

All files exist and commits verified:
- FOUND: src/actions/super-admin/resetMerchantPassword.ts
- FOUND: src/actions/super-admin/disableMerchantAccount.ts
- FOUND: src/actions/super-admin/enableMerchantAccount.ts
- FOUND: src/components/super-admin/PasswordResetModal.tsx
- FOUND: src/components/super-admin/DisableAccountModal.tsx
- FOUND commit: 635436b (Task 1)
- FOUND commit: 7bbe59f (Task 2)

---
*Phase: 26-super-admin-billing-user-management*
*Completed: 2026-04-05*
