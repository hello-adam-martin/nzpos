---
status: partial
phase: 16-super-admin-panel
source: [16-04-PLAN.md]
started: 2026-04-03T00:00:00Z
updated: 2026-04-03T00:00:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Login + Redirect
expected: Super admin login redirects to /super-admin/tenants, not /admin/dashboard
result: [pending]

### 2. Sidebar Layout
expected: 240px deep navy sidebar, NZPOS logo + SUPER ADMIN subtitle, amber active border on Tenants link, super admin email + sign out in footer
result: [pending]

### 3. Tenant List (search, filter, pagination)
expected: Table with store name, slug (monospace), status badge, add-ons, created date, View link. Search filters after 300ms debounce. Status filter works. Pagination shows Previous/Next with page numbers.
result: [pending]

### 4. Tenant Detail Layout
expected: Two-column layout. Left: Store Info, Add-ons, Recent Actions. Right: Actions card. Each add-on shows correct badge type (Inactive/Active Stripe/Active Manual).
result: [pending]

### 5. Suspend Flow
expected: Modal with store name, amber warning, required reason textarea, disabled button until reason entered. After confirm: status badge changes, audit log entry appears. Suspended tenant's subdomain shows branded suspension page.
result: [pending]

### 6. Unsuspend Flow
expected: Click Unsuspend, status changes to Active, audit log entry, subdomain storefront restored.
result: [pending]

### 7. Add-on Override (activate/deactivate)
expected: Activate changes badge to Active (Manual) with audit entry. Deactivate shows inline confirm, then badge changes to Inactive with audit entry.
result: [pending]

### 8. Stripe Badge Protection
expected: Stripe-active add-ons show read-only "Active (Stripe)" badge with no deactivate button.
result: [pending]

## Summary

total: 8
passed: 0
issues: 0
pending: 8
skipped: 0
blocked: 0

## Gaps
