# Phase 8: Checkout Speed - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-02
**Phase:** 08-checkout-speed
**Areas discussed:** Scanner trigger & placement, Scan error & fallback UX, Receipt content & layout, Receipt delivery & data model

---

## Scanner Trigger & Placement

| Option | Description | Selected |
|--------|-------------|----------|
| Top bar button | Add scan icon to POSTopBar. Tap opens camera overlay. | ✓ |
| Floating action button | Persistent FAB in bottom-right corner. Always visible. | |
| Always-on camera strip | Persistent camera viewfinder at top of POS screen. | |

**User's choice:** Top bar button (Recommended)

| Option | Description | Selected |
|--------|-------------|----------|
| Stay open (batch mode) | Scanner stays open between scans. Staff closes manually. | ✓ |
| Close after each scan | Scanner closes after each scan. Must reopen for next item. | |

**User's choice:** Stay open (Recommended)

| Option | Description | Selected |
|--------|-------------|----------|
| Sound + brief vibration | Audible beep and haptic feedback on successful scan. | ✓ |
| Visual only | Brief green flash/checkmark animation. No sound. | |

**User's choice:** Sound + brief vibration

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, with keyboard icon | Small keyboard icon in scanner overlay for manual barcode entry. | ✓ |
| No, use product search | Staff uses existing product search bar if scanning fails. | |

**User's choice:** Yes, with keyboard icon

---

## Scan Error & Fallback UX

| Option | Description | Selected |
|--------|-------------|----------|
| Inline in scanner overlay | Red status pill below viewfinder: "Barcode not found". Scanner stays open. | ✓ |
| Close scanner + toast | Scanner closes, toast notification, search bar auto-focuses. | |

**User's choice:** Inline in scanner overlay (Recommended)

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, show the number | Display scanned barcode digits for verification. | |
| No, just show error | Just "not found" message. Barcode digits not useful to staff. | ✓ |

**User's choice:** No, just show error

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, when scanner closes | Search bar auto-focuses when staff closes scanner after failed scan. | ✓ |
| Yes, immediately | Scanner closes automatically on failure, search focuses. | |

**User's choice:** Yes, when scanner closes (Recommended)

---

## Receipt Content & Layout

| Option | Description | Selected |
|--------|-------------|----------|
| Store name & address | Business name, street address, phone at top. | ✓ |
| Date & time of sale | Timestamp of sale completion. | ✓ |
| Staff member name | Who processed the sale. | ✓ |
| GST registration number | IRD GST number. Required for tax invoices over $50 NZ. | ✓ |

**User's choice:** All four items selected

| Option | Description | Selected |
|--------|-------------|----------|
| Enhance existing | Upgrade SaleSummaryScreen to include receipt-quality info. | ✓ |
| Separate receipt screen | Keep SaleSummaryScreen, add "View Receipt" button. | |

**User's choice:** Enhance existing (Recommended)

| Option | Description | Selected |
|--------|-------------|----------|
| Capture now, send in Phase 9 | Email input on receipt screen. Store email on order. Sending in Phase 9. | ✓ |
| Full email sending now | Build complete email pipeline in this phase. | |
| Skip email entirely | No email field. Phase 9 handles everything. | |

**User's choice:** Capture now, send in Phase 9 (Recommended)
**Notes:** User initially selected "Add email option now" but agreed to scope the actual sending to Phase 9.

---

## Receipt Delivery & Data Model

| Option | Description | Selected |
|--------|-------------|----------|
| Stored on order record | Add receipt_data JSONB column to orders. Structured receipt data. | ✓ |
| Computed at render time | Assemble from order + store + staff tables each time. | |

**User's choice:** Stored on order record (Recommended)

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — view from admin orders | Admin order detail gets "View Receipt" button. | ✓ |
| Not now | Receipt only at point of sale. | |

**User's choice:** Yes — view receipt from admin orders

| Option | Description | Selected |
|--------|-------------|----------|
| Stores table columns | Add address, phone, gst_number to stores table. | ✓ |
| Environment variables | Store info in env vars. Not owner-editable. | |

**User's choice:** Stores table columns (Recommended)

---

## Claude's Discretion

- Barcode scanning library choice
- Camera permission handling UX
- Receipt JSONB schema structure
- Migration strategy for new columns
- Scanner overlay animation/transitions
- Receipt component architecture
- Sound file format for scan beep

## Deferred Ideas

None — discussion stayed within phase scope
