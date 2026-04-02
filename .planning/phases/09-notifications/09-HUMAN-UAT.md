---
status: partial
phase: 09-notifications
source: [09-VERIFICATION.md]
started: 2026-04-02T22:20:00.000Z
updated: 2026-04-02T22:20:00.000Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Real email delivery via Resend
expected: All three transactional emails (online receipt, POS receipt, pickup-ready) are delivered to a real inbox within 60 seconds when triggered with live Resend credentials
result: [pending]

### 2. POS receipt flow end-to-end
expected: After completing a POS sale, entering a customer email triggers the sendPosReceipt action and an email arrives in the customer's inbox
result: [pending]

### 3. Daily summary email content quality
expected: Manually triggering /api/cron/daily-summary produces a well-formatted email with accurate sales count, revenue, top products, and low-stock warnings
result: [pending]

### 4. Chime audibility on iPad
expected: New online order triggers an audible chime sound on Safari/iOS WebKit within 30 seconds of order placement
result: [pending]

### 5. Mute toggle localStorage persistence
expected: Muting the notification chime persists across page refreshes — mute state is retained after reload
result: [pending]

## Summary

total: 5
passed: 0
issues: 0
pending: 5
skipped: 0
blocked: 0

## Gaps
