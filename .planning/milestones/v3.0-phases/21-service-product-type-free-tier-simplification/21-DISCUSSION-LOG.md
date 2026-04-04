# Phase 21: Service Product Type + Free-Tier Simplification - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-04
**Phase:** 21-service-product-type-free-tier-simplification
**Areas discussed:** Product type UX, Free-tier cleanup, CSV import behavior, Stock display states

---

## Product Type UX

### Type Selector Style

| Option | Description | Selected |
|--------|-------------|----------|
| Radio buttons | Two clear options side by side: Physical / Service. Always visible, hard to miss. | ✓ |
| Toggle switch | Single toggle: Physical ↔ Service. Compact but less discoverable. | |
| Dropdown | Select menu. Better if more types expected later. | |

**User's choice:** Radio buttons
**Notes:** Matches the binary nature of the choice.

### Default Product Type

| Option | Description | Selected |
|--------|-------------|----------|
| Physical | Matches current behavior — existing products are implicitly physical. | ✓ |
| No default | Force merchant to choose every time. | |

**User's choice:** Physical
**Notes:** No breaking change for existing workflow.

### Service Product Form Fields

| Option | Description | Selected |
|--------|-------------|----------|
| Hidden | Remove stock fields entirely when Service is selected. | ✓ |
| Shown but disabled | Grey out fields with a note. | |

**User's choice:** Hidden
**Notes:** Clean form, no confusion.

### Type Change After Sales

| Option | Description | Selected |
|--------|-------------|----------|
| Allow freely | Switch anytime. Stock stays in DB but ignored for services. | ✓ |
| Allow with warning | Confirmation dialog before switching. | |
| Lock after first sale | Type locked once product has order history. | |

**User's choice:** Allow freely
**Notes:** Simple, no guardrails needed.

---

## Free-Tier Cleanup

### Admin Product Form (No Inventory Add-on)

| Option | Description | Selected |
|--------|-------------|----------|
| Hide stock fields entirely | No stock_quantity or reorder_threshold inputs. Clean form. | ✓ |
| Show as read-only with upgrade prompt | Fields visible but disabled, with upgrade link. | |
| You decide | Claude picks. | |

**User's choice:** Hide stock fields entirely
**Notes:** Consistent with "products sell freely" messaging.

### Dashboard Widgets

| Option | Description | Selected |
|--------|-------------|----------|
| Hide completely | Remove low-stock alerts and stock reports entirely. | ✓ |
| Replace with upgrade CTA | Show upgrade card in place of widget. | |
| You decide | Claude picks. | |

**User's choice:** Hide completely
**Notes:** No confusion about stock numbers that don't matter.

### Product Table Stock Column

| Option | Description | Selected |
|--------|-------------|----------|
| Hide column | Remove stock column from product list table. | ✓ |
| Keep column, show dashes | Column stays but shows '—'. | |

**User's choice:** Hide column
**Notes:** Consistent with overall "no stock clutter" goal.

### Setup Wizard Stock Step

| Option | Description | Selected |
|--------|-------------|----------|
| Skip stock step | Don't ask about stock quantity during wizard. | ✓ |
| You decide | Claude determines best wizard flow. | |

**User's choice:** Skip stock step
**Notes:** Simpler onboarding for free-tier merchants.

---

## CSV Import Behavior

### Missing product_type Column

| Option | Description | Selected |
|--------|-------------|----------|
| Default to physical | Preserves backward compatibility with existing templates. | ✓ |
| Require the column | Reject CSVs without product_type. | |

**User's choice:** Default to physical
**Notes:** No breaking change for existing CSV templates.

### Service + Stock Conflict

| Option | Description | Selected |
|--------|-------------|----------|
| Ignore stock value silently | Set type to service, discard stock_quantity. | ✓ |
| Import both, ignore in logic | Store stock in DB but never use it. | |
| Show warning row | Flag row in preview with explanation. | |

**User's choice:** Ignore stock value silently
**Notes:** Least friction — services don't use stock.

### Invalid product_type Value

| Option | Description | Selected |
|--------|-------------|----------|
| Reject the row | Show error in import preview, row skipped unless fixed. | ✓ |
| Default to physical | Silently treat unrecognized types as physical. | |

**User's choice:** Reject the row
**Notes:** Prevents masking data issues.

---

## Stock Display States

### POS Cards (Free-Tier)

| Option | Description | Selected |
|--------|-------------|----------|
| Nothing — cleaner card | Remove stock badge. Card shows name, price, image only. | ✓ |
| Show product type badge | Replace stock badge with Physical/Service label. | |
| You decide | Claude picks. | |

**User's choice:** Nothing — cleaner card
**Notes:** Cleaner layout.

### Storefront Cards (Free-Tier)

| Option | Description | Selected |
|--------|-------------|----------|
| Nothing — cleaner card | Remove sold-out/low-stock badges. Clean card. | ✓ |
| You decide | Claude picks. | |

**User's choice:** Nothing — cleaner card
**Notes:** Customers never saw stock numbers anyway for in-stock items.

### Service Product Visual Indicator

| Option | Description | Selected |
|--------|-------------|----------|
| No indicator | Service products look like any other product. | ✓ |
| Subtle icon or label | Small service icon or text on card. | |
| You decide | Claude determines. | |

**User's choice:** No indicator
**Notes:** Merchant knows what they sell. No need to differentiate visually.

---

## Claude's Discretion

No areas deferred to Claude's discretion — all decisions made by user.

## Deferred Ideas

None — discussion stayed within phase scope.
