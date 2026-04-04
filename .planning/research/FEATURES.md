# Feature Landscape

**Domain:** Retail POS — inventory management add-on and service product types
**Researched:** 2026-04-04
**Confidence:** HIGH — domain is well-established in retail POS; patterns drawn from Square, Lightspeed/Vend, Shopify POS, and Oracle Retail documentation

---

## Scope Note

This document covers **v3.0 Inventory Management** — adding inventory management as a paid add-on (stock tracking, adjustments, stocktake) and introducing a service product type that skips all stock logic.

**Existing infrastructure to build on:**
- `stock_quantity` column already on products table
- Atomic stock decrement already implemented (no overselling)
- Low stock alerts already exist
- `requireFeature()` + Stripe billing + `store_plans` infrastructure already in place
- Per-add-on billing pattern already proven (Xero, email notifications)

The research question: what do merchants of small NZ retail stores expect from inventory management, and how should service products behave?

---

## Table Stakes

Features merchants expect from any inventory management add-on. Missing these makes the add-on feel half-built.

### Core Inventory Features

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Quantity on hand per product | Foundation of any inventory system. Without a visible count, merchants cannot trust or act on their stock. | LOW | Already in DB as `stock_quantity`. Needs UI surfacing when add-on is active. |
| Manual stock adjustment with reason code | Every POS in the market (Square, Lightspeed, Shopify) supports this. Merchants need to record why stock changed. | LOW | Reason codes: Stock Received, Damage, Theft/Loss, Store Use, Stocktake Recount, Return to Supplier. Each adjustment writes a row to an adjustment history table. |
| Adjustment history log | Merchants ask "who changed this and when?" when counts don't match. An audit trail is table stakes for any business handling physical goods. | MEDIUM | Log: timestamp, product, quantity before, quantity after, delta, reason code, actor (owner/staff name or "POS sale" or "online order"). |
| Low stock alert (threshold per product) | Already shipped in v1.0. When add-on is active, this is a core expectation. | LOW | Already implemented. Re-confirm it is gated behind add-on or always-on is acceptable. Threshold should be configurable per product. |
| Stock level visible in product admin | When managing inventory, merchants need to see current stock inline without navigating away. | LOW | Stock column in product list. Highlight red when at or below threshold. |
| Stock blocked at zero when add-on active | If a product hits zero stock, the POS should block sale (or warn). Without this the add-on has no protective value. | LOW | Already implemented as atomic decrement. When add-on is active, enforce the block on POS checkout. Zero-stock products should be clearly marked. |
| Service product type — no stock tracked | Merchants selling labour, repairs, or consultation need a product type that never triggers stock checks, never shows a count, and never blocks at zero. | LOW | Add `product_type: 'physical' \| 'service'` to products table. Services skip all stock logic at POS, storefront, and in admin. |

### Stocktake (Physical Count)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Create a named stocktake session | All major POS systems (Lightspeed, Shopify Stocky, Square) organise counts into named sessions with a status. Merchants expect a "start stocktake" action rather than ad-hoc adjustments. | LOW | Session has: name, created_at, status (in_progress / completed), created_by. |
| Enter counted quantities per product | The core stocktake interaction. Merchant sees product name + expected quantity, enters actual counted quantity. | MEDIUM | UI: list of products with current system quantity shown, input field for counted quantity. Can be done product-by-product or bulk. Barcode scan input is an accelerator (already have camera scanner). |
| Variance calculation (counted vs system) | Lightspeed, Square, and Shopify all surface variance as a primary column in their stocktake UI. Merchants need to see discrepancy, not calculate it. Variance = counted - system quantity at time of count snapshot. | LOW | Variance column: positive = surplus, negative = shrinkage. Shown as ±N with colour coding. Cost variance (variance × cost price) is a differentiator but not table stakes. |
| Commit stocktake to update live quantities | At the end of a count, the merchant submits and all stock quantities are updated to the counted values. This is the "reconcile" action. Cannot be undone — confirm modal required. | MEDIUM | Each line generates a stock adjustment with reason "Stocktake Recount". Old quantity and new quantity are recorded. Deltas flow to adjustment history. |
| Partial stocktake (subset of products) | Lightspeed and Shopify both support counting only a subset (by category, tag, or manual selection). Merchants with large catalogs need this — counting everything at once is impractical. | MEDIUM | Filter by category when starting the stocktake session. Products not in the count are not adjusted. |

---

## Differentiators

Features that set this inventory add-on apart from the baseline. Not expected by merchants, but valued when present.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Cost variance in stocktake (variance × cost price) | Makes shrinkage financially tangible. Merchant sees "missing 3 units of X = $45 loss" rather than just a count discrepancy. Lightspeed surfaces this prominently. | LOW | Requires cost_price field on products (may not exist). If no cost price, skip. Useful for a supplies store where cost of goods is known. |
| Stock history per product (timeline view) | Drill down to a single product and see its full movement history: sales, adjustments, stocktakes. Useful when investigating a discrepancy. Square gates this behind paid tier. | MEDIUM | Filter adjustment_history by product_id. Show source for each movement: "POS sale #123", "Online order #456", "Manual adjustment — Damage", "Stocktake 2026-04-01". |
| "Who adjusted this?" traceability | Log actor on every stock movement: owner, named staff member, or system (POS sale, online order). Reduces internal theft and error disputes. | LOW | Requires recording the actor on every mutation. Staff PIN sessions already have a staff identity. Extend adjustment log to capture this. |
| Barcode scanning in stocktake | Speed up physical count using the existing barcode scanner infrastructure. Scan a product barcode to select it, then enter count. No need to navigate a list. | LOW | The barcode scanner (camera overlay, EAN-13/UPC-A) is already shipped. In stocktake mode, scanning a barcode auto-focuses the count input for that product. Low implementation effort because the scanner infrastructure exists. |
| Free-tier simplification (no stock clutter) | Merchants on the free tier should not see empty stock columns, zero counts, or low stock warnings they cannot act on. Cleaning up the free experience is a quality differentiator. | MEDIUM | When inventory add-on is not active: hide stock quantity columns from product list, remove low stock indicators, remove stocktake menu, products sell freely with no stock checks. Requires conditional rendering throughout admin and POS. |
| Stock received workflow | When a supplier delivery arrives, merchants need a fast way to add stock in bulk. A "receive stock" workflow (select products, enter quantities received) is cleaner than individual manual adjustments. | MEDIUM | A bulk-adjustment screen pre-filtered to "Stock Received" reason code. Enter supplier name/reference as optional note. Each product gets an adjustment row with the reason "Stock Received". |

---

## Anti-Features

Commonly built but problematic for this scope and audience.

| Anti-Feature | Why Requested | Why Problematic | Alternative |
|--------------|---------------|-----------------|-------------|
| Purchase orders / supplier management | "Inventory management means tracking what we ordered" | Full PO workflow (create order, send to supplier, receive against PO, track backorders) is a separate product surface. Adds schema complexity, a new entity type, and a significant UI surface. Not needed for a supplies store doing manual restocking. | Simple "Stock Received" manual adjustment with optional supplier reference note. Good enough for v3.0. PO module is v4.0+ work. |
| Reorder point automation | "Alert me to reorder when stock hits X" | Low stock alerts already exist. Automated reorder emails or PO creation requires supplier data model. Merchants at this scale order manually. | Low stock threshold per product (already exists). Manual reorder decision by owner. |
| Inventory forecasting / demand prediction | "Tell me what I'll need next month" | Requires sufficient sales history and a forecasting model. Premature for a product that may have only weeks of data. | Basic top-products report (already in admin) surfaces what's selling. Merchant makes their own reorder decisions. |
| Multi-location stock | "I have a warehouse and a shopfront" | Multi-store is explicitly out of scope (one store per signup, multi-store deferred to v3). Multi-location inventory requires a locations table, transfers between locations, and location-scoped counts. | One inventory per store. Multi-location is a future milestone if demand signal appears. |
| FIFO / LIFO / weighted average costing | "I need to know my actual COGS per sale" | Accounting-grade cost tracking requires recording cost price at time of each stock receipt, maintaining a cost layer, and updating COGS on each sale. This is accounting software scope (Xero handles this). | Record cost_price on the product as a snapshot. Use Xero for COGS accounting. |
| Serialised / batch-tracked stock | "Each unit has its own serial number" | Serialised inventory requires a separate item-level table (each unit is a row), dramatically complicating the data model. Relevant for electronics, medical, or high-value goods — not a supplies store. | SKU-level quantity tracking is sufficient. |
| Minimum viable "freeze sales during stocktake" | "Stop selling while I count" | Freezing sales on a live POS is a significant UX disruption and a complex technical state (block all checkouts, unblock on commit). For a small store, the merchant can simply do their count after hours when there are no sales. | Documentation guidance: conduct stocktake when the store is closed. The system records a snapshot quantity at count start; live sales that occur during a count will be visible as adjustments. |

---

## Feature Dependencies

```
Service product type
    └──enables──> Free tier simplification (service products should always sell freely, regardless of add-on status)
    └──is prerequisite for──> POS and storefront rendering correctly (services never show stock badges)

Inventory add-on (requireFeature gate)
    └──unlocks──> Manual stock adjustments
    └──unlocks──> Adjustment history log
    └──unlocks──> Stocktake sessions
    └──unlocks──> Stock quantity visible in admin
    └──unlocks──> Stock blocking at zero
    └──unlocks──> Low stock threshold alerts (or confirm always-on is acceptable)

Manual stock adjustment
    └──requires──> Adjustment history table (adjustments write rows)
    └──is used by──> Stocktake commit (stocktake generates adjustment rows)
    └──is used by──> POS sale (sales generate negative adjustment rows)
    └──is used by──> Online order (online orders generate negative adjustment rows)

Stocktake session
    └──requires──> Manual stock adjustment (commit writes adjustments)
    └──enhanced by──> Barcode scanning (already shipped, low integration effort)
    └──enhanced by──> Category filter (partial stocktake)

Adjustment history log
    └──requires──> Actor tracking on all mutations (staff PIN sessions already have identity)
    └──enhanced by──> Stock history per product view (filtered history per product)

Free tier simplification
    └──requires──> Conditional rendering audit across admin, POS, storefront
    └──conflicts with──> Existing stock_quantity column being shown everywhere (must be hidden when add-on not active)
```

### Dependency Notes

- **Service product type must ship first.** It is a prerequisite for POS and storefront rendering changes (services never show stock badges regardless of add-on status), and it is independent of billing gating.
- **Inventory add-on gate must precede all inventory UI.** All stock visibility (columns, badges, alerts) should render only when `requireFeature('inventory')` returns true.
- **Adjustment history table is the shared backbone.** Manual adjustments, POS sales, online orders, and stocktake commits all write to this table. Define its schema early — all other inventory features depend on it.
- **Stocktake depends on adjustment.** The commit step of a stocktake is simply a batch of manual adjustments with reason "Stocktake Recount". No separate commit mechanism needed.
- **Free tier simplification depends on add-on gate being correct.** Do not attempt the conditional rendering pass until the gate is confirmed working.

---

## MVP Definition for v3.0

### Launch With (Phase 1 — Foundation)

Minimum viable inventory add-on. Unlocks the paid add-on and delivers the core value.

- [ ] `product_type` column (`physical` / `service`) with migration and admin UI toggle — services skip all stock logic
- [ ] `inventory_adjustments` table: product_id, store_id, delta, quantity_before, quantity_after, reason, notes, actor, source, created_at
- [ ] Manual stock adjustment UI in admin (select product, enter delta, select reason code, optional notes)
- [ ] Adjustment history view in admin (filterable by product, date range, reason)
- [ ] `requireFeature('inventory')` gate wired to Stripe billing (add-on slug, billing portal description)
- [ ] Free tier: hide stock columns and stock indicators when add-on not active; products sell freely

### Add After Foundation (Phase 2 — Stocktake)

- [ ] Stocktake session: create, list by product with system quantity, enter counted quantity, show variance
- [ ] Stocktake commit: write adjustment rows for all changed products, mark session complete, confirm modal
- [ ] Partial stocktake: filter by category when creating session
- [ ] Barcode scan integration in stocktake count entry (existing scanner, low effort)

### Phase 3 — POS + Storefront Integration

- [ ] POS: show stock badge on product tiles when add-on active (in-stock / low / out)
- [ ] POS: block checkout of zero-stock physical products when add-on active (with override if store setting allows)
- [ ] Storefront: hide out-of-stock products or show "sold out" badge when add-on active
- [ ] Services: always sellable in POS and storefront regardless of add-on status

### Future Consideration (v3.1+)

- [ ] Cost variance in stocktake — requires cost_price field, low complexity if field exists
- [ ] Stock received workflow (bulk "Stock Received" adjustment screen) — reduces friction for restocking
- [ ] Per-product stock history timeline — useful but not blocking
- [ ] Stock movement reporting (shrinkage totals, adjustment reasons breakdown) — reporting add-on work

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Service product type (`physical`/`service`) | HIGH | LOW | P1 |
| `inventory_adjustments` table schema | HIGH | LOW | P1 |
| Manual stock adjustment UI | HIGH | LOW | P1 |
| Adjustment history log | HIGH | MEDIUM | P1 |
| `requireFeature('inventory')` billing gate | HIGH | LOW | P1 |
| Free tier stock UI cleanup | HIGH | MEDIUM | P1 |
| Stocktake session create + count entry | HIGH | MEDIUM | P1 |
| Stocktake variance display | HIGH | LOW | P1 |
| Stocktake commit (reconcile) | HIGH | MEDIUM | P1 |
| Partial stocktake (by category) | MEDIUM | LOW | P2 |
| Barcode scan in stocktake | MEDIUM | LOW | P2 |
| POS stock badges (in-stock/low/out) | HIGH | LOW | P1 |
| POS zero-stock blocking | HIGH | LOW | P1 |
| Storefront sold-out handling | MEDIUM | LOW | P2 |
| Cost variance in stocktake | MEDIUM | LOW | P3 |
| Stock received bulk workflow | MEDIUM | MEDIUM | P3 |
| Per-product stock history view | MEDIUM | MEDIUM | P3 |
| Stock movement reporting | LOW | MEDIUM | P3 |

**Priority key:**
- P1: Must have — add-on is not shippable without this
- P2: Should have — add in same milestone when possible
- P3: Nice to have — future milestone or later phase

---

## Standard Reason Codes

Based on Square, Oracle Retail, and Lightspeed documentation, the standard reason codes for a small retail POS are:

| Reason Code | Direction | Description |
|-------------|-----------|-------------|
| Stock Received | + (increase) | Supplier delivery or restocking |
| Stocktake Recount | ± (both) | Quantity corrected during stocktake |
| Damage | - (decrease) | Items damaged and removed from sellable inventory |
| Theft / Loss | - (decrease) | Shoplifting, employee theft, or unexplained loss |
| Store Use | - (decrease) | Item consumed for internal store use |
| Return to Supplier | - (decrease) | Items sent back to supplier |
| Customer Return | + (increase) | Returned item put back to stock (partial refunds already restore stock; this is for manual scenarios) |
| Correction | ± (both) | Administrative correction for data entry error |

System-generated (not manually selectable):
| Source | Direction | Description |
|--------|-----------|-------------|
| POS Sale | - (decrease) | Sale completed at POS terminal |
| Online Order | - (decrease) | Order placed on storefront |
| Refund | + (increase) | Partial refund stock restore (already implemented) |

**Existing dependency:** Partial refunds already restore stock. The new adjustment history table should also capture these system-generated movements so the history is complete. Requires writing a row to `inventory_adjustments` on each refund stock restore (backfill or hook into existing refund logic).

---

## Competitor Feature Analysis

| Feature | Square Free | Square Retail Plus ($49/mo) | Lightspeed X (Vend) | Our Approach |
|---------|-------------|------------------------------|----------------------|--------------|
| Basic stock quantity | Yes | Yes | Yes | Yes — free when add-on active |
| Manual adjustment + reason | Limited | Full (6 reasons) | Full (custom reasons) | 8 standard reasons, no custom in v3.0 |
| Adjustment history | No | Yes (filterable) | Yes | Yes — filterable by product, date, reason |
| Stocktake / inventory count | No | Yes (full UI) | Yes (count sheets, barcode, spreadsheet import) | Yes — session-based with variance |
| Partial stocktake | No | Yes | Yes | Yes — by category |
| Barcode scanning in count | No | Yes | Yes | Yes — existing scanner, low cost |
| Service/non-inventory item type | Yes (toggle) | Yes | Yes | Yes — explicit product_type field |
| Stock badges on POS | Yes | Yes | Yes | Yes — when add-on active |
| Sold-out blocking | Yes | Yes | Yes | Yes — when add-on active |
| Cost variance in stocktake | No | No | Yes | Deferred to v3.1 |
| Purchase orders | No | No | Yes (paid add-on) | Out of scope |
| Inventory forecasting | No | No | Paid add-on | Out of scope |

**Confidence note:** Square and Lightspeed/Vend feature details drawn from official support documentation (verified via web fetch). Cost and tier information as of 2026-04-04; may drift.

---

## Sources

- Square stock adjustment documentation: https://squareup.com/help/us/en/article/8331-set-up-inventory-tracking — MEDIUM confidence (verified via WebFetch)
- Square stock adjustment history (paid feature): https://squareup.com/help/us/en/article/6061-view-stock-adjustment-history-with-square-for-retail — MEDIUM confidence (verified via WebFetch)
- Lightspeed Retail X-Series inventory counting workflow: https://retail-support.lightspeedhq.com/hc/en-us/articles/229129948-Counting-inventory — MEDIUM confidence (verified via WebFetch)
- Oracle Retail Store Inventory Management reason codes: https://docs.oracle.com/cd/E12454_01/sim/pdf/160/html/store_user_guide/inventory_adjustments.htm — HIGH confidence (verified via WebFetch; enterprise reference, not all codes apply to small retail)
- Fishbowl stocktake best practices: https://www.fishbowlinventory.com/blog/stocktake — MEDIUM confidence (WebSearch)
- MrPeasy stocktake guide: https://www.mrpeasy.com/blog/stocktake/ — MEDIUM confidence (verified via WebFetch)
- Shopify "Track quantity" per-product toggle: https://help.shopify.com/en/manual/products/inventory/setup/set-up-inventory-tracking — MEDIUM confidence (WebSearch summary, direct fetch blocked by 403)
- RetailOrbit stocktake workflow: https://support.retailorbit.com/hc/en-us/articles/28370586705819-How-to-Run-Stocktakes — LOW confidence (WebSearch summary only)
- Square retail inventory management overview: https://squareup.com/gb/en/the-bottom-line/operating-your-business/retail-inventory-management — MEDIUM confidence

---

*Feature research for: NZPOS v3.0 Inventory Management — inventory add-on and service product types*
*Researched: 2026-04-04*
