# Phase 22: Inventory Add-on Core - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-04
**Phase:** 22-inventory-add-on-core
**Areas discussed:** Adjustment UX, Stocktake flow, History & filtering, Reason codes

---

## Adjustment UX

### How should the stock adjustment be triggered?

| Option | Description | Selected |
|--------|-------------|----------|
| Inline on product page | An "Adjust stock" button on the product detail/edit view opens a drawer or inline form. Quick for single-product adjustments. | ✓ |
| Dedicated inventory page | A new /admin/inventory page with a product list where you can adjust stock for any product. Better for bulk work. | |
| Both | Adjust from product edit page AND from a dedicated inventory page. More entry points, more code. | |

**User's choice:** Inline on product page
**Notes:** Recommended option selected

### What UI pattern for the adjustment form itself?

| Option | Description | Selected |
|--------|-------------|----------|
| Drawer | Slide-out drawer (matches existing ProductFormDrawer pattern). Shows current stock, adjustment input, reason picker, notes field. | ✓ |
| Modal dialog | Centered modal popup. Simpler but less room for details. | |
| Inline expand | Expands within the page row/card. Minimal navigation but can feel cramped. | |

**User's choice:** Drawer
**Notes:** Matches existing ProductFormDrawer pattern in codebase

### Should merchants be able to adjust multiple products at once?

| Option | Description | Selected |
|--------|-------------|----------|
| Single product only | One adjustment at a time. Simpler to build, stocktake covers the bulk use case. | ✓ |
| Bulk adjustment mode | Select multiple products and apply adjustments in a batch. More complex UI and server logic. | |

**User's choice:** Single product only
**Notes:** Stocktake feature covers bulk adjustment needs

### Adjustment input: absolute or relative?

| Option | Description | Selected |
|--------|-------------|----------|
| Relative (± delta) | Enter +5 or -3 to adjust. Clearer audit trail — the adjustment amount is explicit. | |
| Absolute (set to X) | Enter the new total quantity. System calculates the delta. Risk of confusion if stock changed between page load and submit. | |
| Both options | Toggle between 'adjust by' and 'set to'. More flexible but more UI complexity. | ✓ |

**User's choice:** Both options
**Notes:** User wants flexibility of both modes with a toggle

---

## Stocktake Flow

### How should the stocktake session work?

| Option | Description | Selected |
|--------|-------------|----------|
| Single page with tabs | One page: tab for counting (enter quantities), tab for variance review. Commit button at the top. Simple, no navigation. | ✓ |
| Multi-step wizard | Step 1: Create session (pick scope). Step 2: Count entry. Step 3: Review variance. Step 4: Commit. More structured but more clicks. | |
| Two separate pages | A stocktake list page (all sessions) and a stocktake detail page (count + review). Familiar CRUD pattern. | |

**User's choice:** Single page with tabs
**Notes:** Recommended option selected

### How should products appear in the count entry view?

| Option | Description | Selected |
|--------|-------------|----------|
| Scrollable table | Table with product name, SKU/barcode, system qty, and an input field for counted qty. Filter/search at the top. Barcode scan auto-focuses the matching row. | ✓ |
| Card grid | Product cards with image, name, and count input. More visual but takes more space per product. | |
| Scan-first flow | Blank screen with barcode scanner prominent. Each scan adds a line item. Best for scan-heavy workflows. | |

**User's choice:** Scrollable table
**Notes:** Recommended option selected

### Should the system quantity be visible during counting?

| Option | Description | Selected |
|--------|-------------|----------|
| Hidden during count | System qty hidden until review step. Prevents anchoring bias — counter enters what they actually count, not what they expect. | ✓ |
| Always visible | System qty shown next to count input. Faster for small adjustments but risks the counter just confirming the system number. | |
| User's choice per session | Toggle to show/hide system qty. Flexible but adds UI complexity. | |

**User's choice:** Hidden during count
**Notes:** Prevents anchoring bias — best practice for stocktake accuracy

### Can a stocktake session be saved and resumed later?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, auto-save | Counts save as you type. Session stays open until explicitly committed or discarded. Can close browser and come back. | ✓ |
| Manual save button | User clicks Save to persist progress. Risk of losing work if browser closes. | |
| No saving, must complete in one go | Simplest to build but impractical for large inventories. | |

**User's choice:** Yes, auto-save
**Notes:** Recommended option selected

---

## History & Filtering

### Where should adjustment history live in the admin UI?

| Option | Description | Selected |
|--------|-------------|----------|
| Tab on inventory page | The dedicated inventory page has tabs: Stock Levels, Stocktakes, History. History is one tab with a filterable table. | ✓ |
| Separate /admin/inventory/history page | Own page in the sidebar under Inventory. More prominent but another nav item. | |
| Per-product only | History shown on each product's detail view. No global history view. Simpler but harder to spot patterns across products. | |

**User's choice:** Tab on inventory page
**Notes:** Recommended option selected

### What columns should the history table show?

| Option | Description | Selected |
|--------|-------------|----------|
| Standard set | Date, Product, Reason, Quantity change (±), New total, Notes, User. Covers audit needs without clutter. | ✓ |
| Minimal | Date, Product, Reason, Quantity change. Fewer columns, less scrolling. | |
| Detailed | All of standard plus SKU, barcode, old quantity, session ID (for stocktakes). More data for power users. | |

**User's choice:** Standard set
**Notes:** Recommended option selected

### What filter controls for history?

| Option | Description | Selected |
|--------|-------------|----------|
| Product + date range + reason | Three filter dropdowns/inputs matching the success criteria. Covers the required filtering without overbuilding. | ✓ |
| Add text search too | Same as above plus a free-text search across notes. Useful if merchants write detailed notes. | |
| You decide | Claude's discretion on filter controls based on what makes sense for the data. | |

**User's choice:** Product + date range + reason
**Notes:** Matches success criteria requirements exactly

---

## Reason Codes

### How should reason codes be stored?

| Option | Description | Selected |
|--------|-------------|----------|
| Fixed enum in code | Hardcoded set of reason codes (received, damaged, theft, correction, stocktake, sale, refund). Simple, consistent, good for filtering. Can extend later. | ✓ |
| Database table with defaults | A reason_codes table seeded with defaults. Merchants could add custom codes in a future phase. | |
| Free text only | No predefined codes — just a text field. Maximum flexibility but terrible for filtering and reporting. | |

**User's choice:** Fixed enum in code
**Notes:** Recommended option selected

### Which reason codes should be available for manual adjustments?

| Option | Description | Selected |
|--------|-------------|----------|
| Standard retail set | received, damaged, theft/shrinkage, correction, return_to_supplier, other. Covers common NZ retail scenarios. | ✓ |
| Minimal set | received, damaged, correction, other. Fewer choices, faster selection. | |
| You decide | Claude's discretion to pick the right set based on retail best practices. | |

**User's choice:** Standard retail set
**Notes:** Recommended option selected

### System-generated reason codes (sale, refund, stocktake) — how should these work?

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-set, not user-selectable | sale/refund/stocktake reasons are set automatically by the system when those events occur. Users can't pick them manually. Clean separation. | ✓ |
| All codes available everywhere | Users can select any reason code including sale/refund/stocktake. Simpler code but allows nonsensical entries. | |

**User's choice:** Auto-set, not user-selectable
**Notes:** Recommended option selected

---

## Claude's Discretion

- Tab component implementation details
- Pagination strategy for history and stock levels
- Stocktake session creation UX (scope selection)
- Auto-save debounce timing and optimistic UI

## Deferred Ideas

None — discussion stayed within phase scope
