---
status: partial
phase: 35-gift-cards-add-on
source: [35-VERIFICATION.md]
started: 2026-04-07T00:35:00Z
updated: 2026-04-07T00:35:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Email delivery end-to-end
expected: Purchase a gift card on storefront, complete Stripe payment. Email arrives within ~10 seconds with XXXX-XXXX formatted code in monospace box, NZD balance, expiry date in bold red (#DC2626) formatted as 'd MMMM yyyy'
result: [pending]

### 2. Stripe billing subscription activation
expected: Click Gift Cards add-on card on billing page, subscribe at $14/mo via Stripe. After webhook, has_gift_cards = true in store_plans, Add-ons section appears in sidebar with Gift Cards nav link, /admin/gift-cards/ is accessible
result: [pending]

### 3. POS gift card payment flow
expected: Enter valid gift card code at POS, complete sale. Receipt shows gift card last 4 digits, amount applied, remaining balance. Gift card detail drawer shows redemption event in timeline. Gift card balance is reduced in admin dashboard.
result: [pending]

## Summary

total: 3
passed: 0
issues: 0
pending: 3
skipped: 0
blocked: 0

## Gaps
