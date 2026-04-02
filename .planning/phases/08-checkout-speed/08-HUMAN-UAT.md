---
status: partial
phase: 08-checkout-speed
source: [08-VERIFICATION.md]
started: 2026-04-02T07:45:08Z
updated: 2026-04-02T07:45:08Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Barcode scan adds product to cart with audible beep and batch mode
expected: Tapping Scan opens camera overlay; scanning an EAN-13/UPC-A barcode adds the matched product and plays a beep; scanner stays open for subsequent scans
result: [pending]

### 2. Unknown barcode shows error and focuses search bar on close
expected: Scanning an unrecognised barcode shows 'Barcode not found' red pill for 1500ms, then closes scanner and focuses the search input
result: [pending]

### 3. Receipt screen renders all required fields after POS sale
expected: After completing a sale, ReceiptScreen shows store name, Sale Complete label, order ID, line items, GST (15% incl.), total (large display), payment method badge; cash sales show Tendered and Change rows
result: [pending]

### 4. Admin View Receipt button appears for new orders, absent for old orders
expected: Orders created after Phase 8 show a View Receipt button in OrderDetailDrawer; orders without receipt_data do not show the button
result: [pending]

## Summary

total: 4
passed: 0
issues: 0
pending: 4
skipped: 0
blocked: 0

## Gaps
