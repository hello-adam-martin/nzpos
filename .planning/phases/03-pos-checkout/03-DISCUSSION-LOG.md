# Phase 3: POS Checkout - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-01
**Phase:** 03-pos-checkout
**Areas discussed:** Cart state & interactions, Discount workflow, Sale completion flow, Stock & edge cases

---

## Cart State & Interactions

### Product Search

| Option | Description | Selected |
|--------|-------------|----------|
| Search bar above grid | Persistent search input at top of product grid. Filters products as you type. Staff can search by name or SKU. | ✓ |
| Search icon that expands | Compact icon that expands into a search field on tap. Saves space, categories stay prominent. | |
| You decide | Claude picks the approach that works best for iPad POS. | |

**User's choice:** Search bar above grid
**Notes:** None

### Re-tap Behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Increment quantity by 1 | Each tap adds +1. Fast for scanning multiple items. Most POS systems work this way. | ✓ |
| Highlight in cart + scroll | Jump to the existing cart row so staff can adjust quantity there. Prevents accidental double-adds. | |
| You decide | Claude picks based on typical POS conventions. | |

**User's choice:** Increment quantity by 1
**Notes:** None

### SKU Quick-Entry

| Option | Description | Selected |
|--------|-------------|----------|
| No, grid-only for v1 | Staff browses visually and taps. Barcode scanning is a v2 feature (MOB-01). | |
| SKU text field | Small input field where staff can type a SKU to add product. Useful if they know the code. | ✓ |
| You decide | Claude picks based on scope. | |

**User's choice:** SKU text field
**Notes:** None

### Cart State Management

| Option | Description | Selected |
|--------|-------------|----------|
| React state only (reset on refresh) | Cart lives in component state. Fast, simple. Cart clears if page refreshes. | |
| Persist to localStorage | Cart survives page refresh and accidental closes. | |
| You decide | Claude picks based on POS UX conventions. | ✓ |

**User's choice:** You decide
**Notes:** None

---

## Discount Workflow

### Discount Cap

| Option | Description | Selected |
|--------|-------------|----------|
| No cap, trust staff | Staff can apply any discount amount. Owner reviews via reports. Fast checkout, no friction. | ✓ |
| Percentage cap (e.g., 20%) | Discounts above a threshold require owner PIN override. Prevents unauthorized large discounts. | |
| You decide | Claude picks based on small business POS conventions. | |

**User's choice:** No cap, trust staff
**Notes:** None

### Whole-Cart Discounts

| Option | Description | Selected |
|--------|-------------|----------|
| Per-line only | Discounts applied to individual items. GST recalculation is straightforward. | |
| Both per-line and whole-cart | Staff can also apply a cart-wide discount. More flexible but GST distribution is more complex. | ✓ |
| You decide | Claude picks based on requirements scope. | |

**User's choice:** Both per-line and whole-cart
**Notes:** None

### Discount Reason

| Option | Description | Selected |
|--------|-------------|----------|
| Required (pick from list) | Staff must select a reason: Staff / Damaged / Loyalty / Other. | |
| Optional | Staff can skip reason. Faster checkout but less visibility for owner. | ✓ |
| You decide | Claude picks. | |

**User's choice:** Optional
**Notes:** None

### GST Distribution for Whole-Cart Discounts

| Option | Description | Selected |
|--------|-------------|----------|
| Pro-rata by line total | Distribute whole-cart discount proportionally across lines, then recalculate GST per-line. IRD-compliant. | |
| You decide | Claude picks the IRD-compliant approach. | ✓ |
| Show as single line | Whole-cart discount appears as its own negative line. | |

**User's choice:** You decide
**Notes:** None

---

## Sale Completion Flow

### Post-Sale Behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Brief success toast, auto-reset | Green checkmark toast for ~2 seconds, cart resets automatically. | |
| Sale summary screen | Full-screen summary showing items, total, payment method, and sale ID. Staff taps 'New Sale' to reset. | ✓ |
| You decide | Claude picks the best flow for fast checkout. | |

**User's choice:** Sale summary screen
**Notes:** None

### Cash Payment

| Option | Description | Selected |
|--------|-------------|----------|
| Simple confirmation | Staff taps 'Cash' → sale completes immediately. No change calculation. | |
| Cash tendered + change | Staff enters amount received, POS calculates and displays change due. | ✓ |
| You decide | Claude picks. | |

**User's choice:** Cash tendered + change
**Notes:** None

### Split Payments

| Option | Description | Selected |
|--------|-------------|----------|
| No, single method only | One payment method per sale. Simpler. | |
| Yes, split payments | Staff can split across cash and EFTPOS. More flexible but more complex. | ✓ |

**User's choice:** Yes, split payments
**Notes:** None

### Split Payment UX

| Option | Description | Selected |
|--------|-------------|----------|
| Sequential method entry | Staff enters amount for first method, remainder auto-assigned to second. | |
| Side-by-side amounts | Two input fields showing how total is split. | |
| You decide | Claude picks the approach that fits iPad POS UX. | ✓ |

**User's choice:** You decide
**Notes:** None

---

## Stock & Edge Cases

### Out-of-Stock Override

| Option | Description | Selected |
|--------|-------------|----------|
| Owner only (PIN required) | Only the owner account can override. Staff must call owner. | ✓ |
| Any staff member | Any logged-in staff can override with a tap. | |
| You decide | Claude picks. | |

**User's choice:** Owner only (PIN required)
**Notes:** None

### Stock Display

| Option | Description | Selected |
|--------|-------------|----------|
| Color badge only | Green/amber/red badge. No exact count shown. | |
| Exact count on card | Show actual stock number (e.g., '3 left') plus color coding. | ✓ |
| You decide | Claude picks. | |

**User's choice:** Exact count on card
**Notes:** None

### Stock Refresh

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-refresh after each sale | revalidatePath triggers server refetch after sale completes. | |
| Auto-refresh + on page focus | Same as above, plus refetch when POS tab regains focus. | ✓ |
| You decide | Claude picks based on refresh-on-transaction decision. | |

**User's choice:** Auto-refresh + on page focus
**Notes:** None

### Concurrent Stock Conflicts

| Option | Description | Selected |
|--------|-------------|----------|
| Fail second sale | Atomic stock decrement with check. Second sale gets error. | ✓ |
| Allow negative stock | Let stock go negative, owner reconciles later. | |
| You decide | Claude picks the safest approach. | |

**User's choice:** Fail second sale
**Notes:** None

---

## Claude's Discretion

- Cart state management (React state vs localStorage)
- Whole-cart discount GST distribution method
- Split payment UI approach
- Product grid empty state
- Cart empty state design
- Keyboard/numpad behavior for inputs on iPad

## Deferred Ideas

None — discussion stayed within phase scope
