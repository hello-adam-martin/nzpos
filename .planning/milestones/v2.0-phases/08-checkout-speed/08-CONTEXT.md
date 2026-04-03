# Phase 8: Checkout Speed - Context

**Gathered:** 2026-04-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Add barcode scanning for fast product lookup at the POS and upgrade the post-sale screen into a proper on-screen receipt. Two features: (1) iPad camera barcode scanning with batch mode, (2) receipt with store info, GST number, and structured data model for future printer support.

</domain>

<decisions>
## Implementation Decisions

### Scanner Trigger & Placement
- **D-01:** Scan button in POSTopBar (icon button next to nav links). Tap opens a camera overlay sheet using the existing `fixed inset-0 z-50` overlay pattern.
- **D-02:** Scanner stays open between scans (batch mode). Staff closes manually when done adding items. Faster for multi-item checkout.
- **D-03:** Successful scan plays an audible beep and triggers brief haptic vibration. Standard retail POS feedback.
- **D-04:** Manual barcode entry available via a keyboard icon inside the scanner overlay. Staff can type barcode digits when camera scan fails (damaged label, glare).

### Scan Error & Fallback UX
- **D-05:** Unknown barcode shows inline error in the scanner overlay — red status pill below the viewfinder: "Barcode not found". Scanner stays open so staff can retry.
- **D-06:** Failed barcode number is NOT shown to staff — just the "not found" message. Barcode digits aren't useful to retail staff.
- **D-07:** When staff closes the scanner after a failed scan, the product search bar auto-focuses for manual lookup (SCAN-02 requirement).

### Receipt Content & Layout
- **D-08:** Enhance the existing SaleSummaryScreen into a proper receipt. One screen serves both as sale confirmation and receipt — no separate receipt view.
- **D-09:** Receipt includes: store name, store address, phone number, date/time of sale, staff member name, GST registration number, line items with quantities/prices, discounts, subtotal, GST amount, total, payment method, and order ID.
- **D-10:** Email capture field on receipt screen — staff can optionally enter customer email. Email is stored on the order record. Actual email sending deferred to Phase 9 (Notifications).

### Receipt Data Model & Delivery
- **D-11:** Receipt data stored as JSONB column (`receipt_data`) on the orders table. Contains structured receipt (store info, items, totals, GST number, staff name, timestamp). Both screen display and future physical printer read from this single source.
- **D-12:** Old receipts viewable from admin order detail page via a "View Receipt" button. Same receipt layout component renders for both POS and admin views.
- **D-13:** Store details (name, address, phone, GST number) stored as columns on the `stores` table. Single source of truth, editable from admin settings. Receipt generation reads from stores table at sale time and snapshots into `receipt_data`.

### Claude's Discretion
- Barcode scanning library choice (e.g., quagga2, zxing, html5-qrcode, or Web API)
- Camera permission handling UX (prompt, denied state)
- Receipt JSONB schema structure
- Migration strategy for new stores/orders columns
- Scanner overlay animation and transitions
- Receipt component architecture (shared between POS and admin)
- Sound file format and implementation for scan beep

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Database Schema
- `supabase/migrations/001_initial_schema.sql` — Products table with `barcode TEXT` column (line 47), orders table structure, stores table
- `supabase/migrations/005_pos_rpc.sql` — POS sale completion RPC (where receipt_data would be populated)

### POS UI Components
- `src/components/pos/POSClientShell.tsx` — Cart state management, overlay orchestration (z-50 pattern), product grid integration
- `src/components/pos/POSTopBar.tsx` — Nav bar where scan button will be placed
- `src/components/pos/SaleSummaryScreen.tsx` — Current post-sale screen to be enhanced into receipt
- `src/components/pos/EftposConfirmScreen.tsx` — Reference for overlay pattern (fixed inset-0 z-50, backdrop, animation)

### State & Cart
- `src/lib/cart.ts` — Cart reducer, CartItem type, calcCartTotals
- `src/lib/money.ts` — formatNZD utility

### Types
- `src/types/database.ts` — Generated Supabase types (products.barcode field, orders table)

### Design Contract
- `.planning/phases/08-checkout-speed/08-UI-SPEC.md` — UI design contract with spacing, typography, color, and interaction specs for this phase

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `SaleSummaryScreen` — Already renders post-sale overlay with items, GST, total. Enhance rather than replace.
- `EftposConfirmScreen` / `CashEntryScreen` — Overlay pattern templates (fixed inset-0 z-50, bg-navy-dark/80 backdrop, fadeIn_150ms animation)
- `POSTopBar` — Has established layout with nav links and cash session controls. Space available for scan button.
- `cartReducer` in `lib/cart.ts` — Cart dispatch for ADD_ITEM action already exists. Scanner just needs to resolve barcode → product, then dispatch.
- `formatNZD` / `calcCartTotals` — Money formatting and cart math already built.
- `lucide-react` — Icon library already in use (CheckCircle, etc.). Has `ScanBarcode` icon.

### Established Patterns
- Overlay pattern: `fixed inset-0 z-50 bg-navy-dark/80` with centered card, `animate-[fadeIn_150ms_ease-out]`
- Cart state: `useReducer` with `cartReducer` in POSClientShell, actions dispatched from child components
- Server Actions: `completeSale` action for order creation — receipt_data generation hooks into this flow
- Component colocation: POS components in `src/components/pos/`, each is a focused single-responsibility component

### Integration Points
- `POSClientShell` — Scanner state (open/closed) managed here alongside other overlay states
- `completeSale` action — Receipt data generation happens here after order creation
- `products` table — Barcode lookup query needed (new server action or Supabase client query)
- `stores` table — New columns for address, phone, GST number
- `orders` table — New `receipt_data` JSONB column

</code_context>

<specifics>
## Specific Ideas

- Receipt must include GST registration number — NZ tax compliance for invoices over $50
- Staff name on receipt for accountability
- Email capture is a forward-looking field — stores email on order, Phase 9 sends it
- Batch scanning is the priority UX — staff scanning multiple items quickly is the core workflow
- Manual barcode entry is a fallback for damaged labels, not a primary input method

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 08-checkout-speed*
*Context gathered: 2026-04-02*
