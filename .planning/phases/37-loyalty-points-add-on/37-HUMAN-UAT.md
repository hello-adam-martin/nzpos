---
status: partial
phase: 37-loyalty-points-add-on
source: [37-VERIFICATION.md]
started: 2026-04-07T13:52:00Z
updated: 2026-04-07T13:52:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. POS loyalty flow end-to-end
expected: Subscribe merchant to Loyalty Points add-on, configure rates, ring up a POS sale with customer attached — points earned appear on customer loyalty account after sale completes
result: [pending]

### 2. Online checkout loyalty redemption
expected: Online checkout with logged-in customer who has loyalty points — toggle Use Points control, Stripe checkout shows negative 'Loyalty Points Applied' line item, points deducted after payment
result: [pending]

### 3. Privacy banner dismiss persistence
expected: First-visit privacy banner on account profile page after loyalty activates — blue info banner appears, can be dismissed with OK, does not reappear on next visit
result: [pending]

## Summary

total: 3
passed: 0
issues: 0
pending: 3
skipped: 0
blocked: 0

## Gaps
