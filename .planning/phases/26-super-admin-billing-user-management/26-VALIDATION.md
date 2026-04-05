---
phase: 26
slug: super-admin-billing-user-management
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-05
---

# Phase 26 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Grep-based artifact checks + TypeScript compiler |
| **Config file** | `tsconfig.json` |
| **Quick run command** | `npx tsc --noEmit` |
| **Full suite command** | `npx tsc --noEmit && npx vitest run` |
| **Estimated runtime** | ~20 seconds |

---

## Verification Strategy

Phase 26 uses **artifact verification** (grep + tsc) rather than unit test stubs. This is appropriate because:

1. **Dashboard page (26-01):** Server component with Supabase queries and Recharts rendering. Verification confirms correct imports, component usage, and TypeScript compilation.
2. **Billing detail (26-02):** Server component extending an existing page with Stripe API calls. Verification confirms correct API method calls, guard clauses, and UI sections exist.
3. **Server actions (26-03):** Follow established `suspendTenant` pattern. Verification confirms correct Supabase Auth API calls, audit logging, cache invalidation, and Zod validation.

Unit tests for server actions can be added in a future testing phase when Supabase Admin + Stripe mocking infrastructure is established.

---

## Sampling Rate

- **After every task commit:** Run the task's `<automated>` verify command from the plan
- **After every plan wave:** Run `npx tsc --noEmit` for full type safety check
- **Before `/gsd:verify-work`:** Full suite must pass (`npx tsc --noEmit && npx vitest run`)
- **Max feedback latency:** 20 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Verify Type | Automated Command | Status |
|---------|------|------|-------------|-------------|-------------------|--------|
| 26-01-01 | 01 | 1 | SA-DASH-01, SA-DASH-02, SA-DASH-03 | artifact + grep | `grep -c "password_reset" supabase/migrations/029_super_admin_actions_extend.sql && grep -c "Dashboard" src/components/super-admin/SuperAdminSidebar.tsx && grep -c "Phase 27" src/app/super-admin/analytics/page.tsx` | ⬜ pending |
| 26-01-02 | 01 | 1 | SA-DASH-01, SA-DASH-02, SA-DASH-03 | artifact + tsc | `npx tsc --noEmit src/app/super-admin/page.tsx src/components/super-admin/SignupTrendChart.tsx 2>&1 \| head -20; grep -c "DashboardHeroCard" src/app/super-admin/page.tsx; grep -c "AreaChart" src/components/super-admin/SignupTrendChart.tsx` | ⬜ pending |
| 26-02-01 | 02 | 1 | SA-BILL-01, SA-BILL-02, SA-BILL-03, SA-USER-01 | artifact + grep | `grep -c "stripe.subscriptions.list" src/app/super-admin/tenants/[id]/page.tsx && grep -c "stripe.invoices.list" src/app/super-admin/tenants/[id]/page.tsx && grep -c "getUserById" src/app/super-admin/tenants/[id]/page.tsx && grep -c "Payment overdue" src/app/super-admin/tenants/[id]/page.tsx` | ⬜ pending |
| 26-03-01 | 03 | 2 | SA-USER-02, SA-USER-03 | artifact + grep | `grep -c "resetPasswordForEmail" src/actions/super-admin/resetMerchantPassword.ts && grep -c "ban_duration.*876600h" src/actions/super-admin/disableMerchantAccount.ts && grep -c "ban_duration.*none" src/actions/super-admin/enableMerchantAccount.ts && grep -c "invalidateCachedStoreId" src/actions/super-admin/disableMerchantAccount.ts` | ⬜ pending |
| 26-03-02 | 03 | 2 | SA-USER-02, SA-USER-03 | artifact + grep | `grep -c "Send Password Reset" src/app/super-admin/tenants/[id]/TenantDetailActions.tsx && grep -c "Disable Account" src/app/super-admin/tenants/[id]/TenantDetailActions.tsx && grep -c "resetMerchantPassword" src/components/super-admin/PasswordResetModal.tsx && grep -c "disableMerchantAccount" src/components/super-admin/DisableAccountModal.tsx` | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Stripe subscriptions render on tenant detail | SA-BILL-01 | Requires live Stripe API / complex mock setup | Open tenant detail page for a store with stripe_customer_id, verify subscriptions section shows |
| Stripe invoices render on tenant detail | SA-BILL-02 | Requires live Stripe API / complex mock setup | Open tenant detail page, verify invoices table with status badges |
| Owner email displayed on tenant detail | SA-USER-01 | Requires Supabase Auth Admin call / complex mock | Open tenant detail page, verify owner email and signup date visible |
| Dashboard stat cards render correctly | SA-DASH-01 | Server component with live DB queries | Visit /super-admin, verify stat cards show tenant counts and add-on adoption |
| Signup trend chart renders | SA-DASH-03 | Recharts rendering requires browser | Visit /super-admin, verify 30-day area chart appears |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify commands
- [x] Sampling continuity: no 3 consecutive tasks without automated verify (all tasks have automated verify)
- [x] No Wave 0 dependencies (artifact verification, not test stubs)
- [x] No watch-mode flags
- [x] Feedback latency < 20s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** ready
