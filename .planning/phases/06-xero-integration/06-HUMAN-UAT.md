---
status: partial
phase: 06-xero-integration
source: [06-VERIFICATION.md]
started: 2026-04-02T08:40:00Z
updated: 2026-04-02T08:40:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Integrations page visual render
expected: Page loads with Integrations heading, Connect to Xero amber button, empty sync log showing 'No syncs yet', no disconnect banner (fresh install)
result: passed (verified via preview during execution)

### 2. OAuth connect flow
expected: Browser navigates to accounts.xero.com with OAuth consent page for NZPOS
result: [pending — requires live Xero developer credentials]

### 3. Account codes form (connected state)
expected: XeroConnectButton shows green 'Connected' badge with tenant name; XeroAccountCodeForm with 3 input fields appears below
result: [pending — requires live Xero OAuth flow to complete]

### 4. Disconnect banner across admin pages
expected: Amber banner 'Xero is disconnected. Daily sales sync has stopped.' appears on every admin page after disconnect; banner does NOT appear before any connection has been made (fresh install)
result: [pending — requires connected state first]

### 5. Manual sync button states
expected: Sync Today's Sales button shows loading spinner, then success message with invoice number; sync log table shows new entry with green Success badge
result: [pending — requires live Xero connection with configured account codes]

## Summary

total: 5
passed: 1
issues: 0
pending: 4
skipped: 0
blocked: 0

## Gaps
