---
status: partial
phase: 10-customer-accounts
source: [10-VERIFICATION.md]
started: 2026-04-02T23:30:00.000Z
updated: 2026-04-02T23:30:00.000Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. End-to-End Signup Flow
expected: Visit `/account/signup`, enter valid email + password (8+ chars), submit. Supabase creates auth user, customers row inserted with correct store_id, verification email arrives, redirects to `/account/verify-email?email=...`
result: [pending]

### 2. Auth Hook JWT Injection
expected: After signup + signin, JWT contains `app_metadata.role === 'customer'` and `app_metadata.store_id` is correct store UUID
result: [pending]

### 3. Order History RLS Isolation
expected: Signed-in customer at `/account/orders` sees only their own orders, not other customers' orders
result: [pending]

### 4. Header Account Dropdown (Visual + Interaction)
expected: Account icon in header when signed in. Click opens dropdown (My Orders, My Profile, Sign out). Click outside closes. Escape closes.
result: [pending]

### 5. Verification Banner Resend Cooldown
expected: Unverified customer sees blue verification banner. "Resend email" click disables button for 30s with "Sent!" text.
result: [pending]

### 6. Post-Purchase Account Prompt Dismiss
expected: Guest checkout shows "Track this order" prompt on confirmation. "No thanks" dismisses it. Prompt stays dismissed after page reload (localStorage).
result: [pending]

## Summary

total: 6
passed: 0
issues: 0
pending: 6
skipped: 0
blocked: 0

## Gaps
