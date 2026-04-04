---
status: partial
phase: 23-feature-gating-pos-storefront-integration
source: [23-VERIFICATION.md]
started: 2026-04-04T11:20:00Z
updated: 2026-04-04T11:20:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Stripe inventory checkout flow
expected: After Stripe checkout completes, user is redirected to /admin/billing?subscribed=inventory, a green success banner appears reading 'Inventory add-on activated! Your store now has full stock management.', and the banner auto-dismisses after 4 seconds without re-appearing on page refresh
result: [pending]

### 2. Inventory upgrade wall for non-subscriber
expected: Navigate to /admin/inventory as store with has_inventory=false — upgrade wall appears with lock icon, headline, body text, and amber CTA button linking to /admin/billing?upgrade=inventory. Full inventory content is NOT shown.
result: [pending]

### 3. Inventory page for subscriber
expected: Navigate to /admin/inventory as store with has_inventory=true — full inventory page renders normally with stock table. No upgrade wall.
result: [pending]

### 4. JWT claim injection confirmation
expected: After login as store with has_inventory=true in store_plans, JWT app_metadata contains "inventory": true. Verifiable via browser DevTools cookie decode or Supabase dashboard.
result: [pending]

## Summary

total: 4
passed: 0
issues: 0
pending: 4
skipped: 0
blocked: 0

## Gaps
