---
status: partial
phase: 03-pos-checkout
source: [03-VERIFICATION.md]
started: 2026-04-01T18:00:00Z
updated: 2026-04-01T18:00:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Staff PIN login flow
expected: Staff session cookie is set, redirect to /pos, product grid loads with staff name in top bar
result: [pending]

### 2. PIN lockout UI feedback
expected: Account lockout message displayed after 10 failed attempts; further attempts blocked until window expires
result: [pending]

### 3. Complete end-to-end sale
expected: SaleSummaryScreen shows correct total, GST breakdown, sale ID; product grid stock counts decrement
result: [pending]

### 4. Out-of-stock owner PIN override
expected: Product is added to cart after successful PIN verification
result: [pending]

## Summary

total: 4
passed: 0
issues: 0
pending: 4
skipped: 0
blocked: 0

## Gaps
