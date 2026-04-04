# Requirements: NZPOS v3.0

**Defined:** 2026-04-04
**Core Value:** A store owner can ring up a sale in-store and take an order online, from a single inventory that stays in sync, with GST handled correctly.

## v3.0 Requirements

Requirements for Inventory Management milestone. Each maps to roadmap phases.

### Product Types

- [x] **PROD-01**: Admin can set a product as "physical" or "service" type when creating or editing
- [x] **PROD-02**: Service products skip all stock decrement logic in POS and online sale RPCs
- [x] **PROD-03**: Service products skip stock restore logic in refund and partial refund actions
- [x] **PROD-04**: CSV import supports `product_type` column and never overwrites `stock_quantity` without explicit flag

### Free-Tier Experience

- [x] **FREE-01**: Stores without inventory add-on see no stock quantities, badges, or alerts in admin/POS/storefront
- [x] **FREE-02**: Products sell freely (no out-of-stock blocking) when inventory add-on is inactive
- [x] **FREE-03**: Stock decrements continue silently in RPCs regardless of add-on status (data stays accurate)

### Stock Management (Paid Add-on)

- [x] **STOCK-01**: Admin can manually adjust stock quantity for a physical product with a reason code and optional notes
- [x] **STOCK-02**: System records all stock mutations (sales, refunds, manual adjustments, stocktake) in an append-only history table
- [x] **STOCK-03**: Admin can view adjustment history filtered by product, date range, and reason code
- [x] **STOCK-04**: Low-stock alerts are visible only when inventory add-on is active
- [x] **STOCK-05**: Admin can view current stock levels for all physical products in a dedicated inventory page

### Stocktake (Paid Add-on)

- [x] **TAKE-01**: Admin can create a stocktake session (full inventory or filtered by category)
- [x] **TAKE-02**: Admin can enter counted quantities for each product in the stocktake
- [x] **TAKE-03**: System calculates and displays variance (counted vs system quantity) for each product
- [x] **TAKE-04**: Admin can commit stocktake, atomically adjusting stock and recording adjustments with "stocktake" reason
- [x] **TAKE-05**: Barcode scanner can be used to look up products during stocktake count entry

### Feature Gating & Billing

- [ ] **GATE-01**: `requireFeature('inventory')` gates all inventory management Server Actions using DB path for mutations
- [x] **GATE-02**: `store_plans` table has `has_inventory` and `has_inventory_manual_override` columns following existing add-on pattern
- [x] **GATE-03**: Stripe checkout flow for inventory add-on subscription (using `STRIPE_PRICE_INVENTORY`)
- [ ] **GATE-04**: Auth hook injects `inventory` claim into JWT for fast-path UI rendering
- [x] **GATE-05**: Super admin can manually override inventory add-on status per store

### POS & Storefront Integration

- [x] **POS-01**: POS product grid shows stock badges (in-stock / low / out-of-stock) when inventory add-on is active
- [x] **POS-02**: POS blocks adding out-of-stock physical products to cart when inventory add-on is active
- [x] **POS-03**: Storefront shows "sold out" and disables add-to-cart for out-of-stock physical products when add-on is active
- [x] **POS-04**: Service products are always sellable in POS and storefront regardless of add-on status

## Future Requirements (v3.1+)

### Cost & Reporting

- **COST-01**: Cost variance in stocktake (requires `cost_price` field)
- **BULK-01**: Stock received bulk workflow
- **HIST-01**: Per-product stock history timeline view
- **RPT-01**: Stock movement reporting (shrinkage totals, reason breakdowns)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Purchase orders / supplier management | Too complex for v3.0, separate domain |
| Cost-of-goods tracking | Requires `cost_price` field not in current schema — defer to v3.1 |
| Multi-location inventory | Single-store per tenant model — multi-location is future architecture |
| Automatic reorder points | Requires supplier integration |
| Stock transfer between stores | Multi-store not yet supported |
| Real-time stock sync (WebSockets) | Refresh-on-transaction pattern sufficient for single terminal |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| PROD-01 | Phase 21 | Complete |
| PROD-02 | Phase 21 | Complete |
| PROD-03 | Phase 21 | Complete |
| PROD-04 | Phase 21 | Complete |
| FREE-01 | Phase 21 | Complete |
| FREE-02 | Phase 21 | Complete |
| FREE-03 | Phase 21 | Complete |
| STOCK-01 | Phase 22 | Complete |
| STOCK-02 | Phase 22 | Complete |
| STOCK-03 | Phase 22 | Complete |
| STOCK-04 | Phase 22 | Complete |
| STOCK-05 | Phase 22 | Complete |
| TAKE-01 | Phase 22 | Complete |
| TAKE-02 | Phase 22 | Complete |
| TAKE-03 | Phase 22 | Complete |
| TAKE-04 | Phase 22 | Complete |
| TAKE-05 | Phase 22 | Complete |
| GATE-01 | Phase 23 | Pending |
| GATE-02 | Phase 23 | Complete |
| GATE-03 | Phase 23 | Complete |
| GATE-04 | Phase 23 | Pending |
| GATE-05 | Phase 23 | Complete |
| POS-01 | Phase 23 | Complete |
| POS-02 | Phase 23 | Complete |
| POS-03 | Phase 23 | Complete |
| POS-04 | Phase 21 | Complete |

**Coverage:**
- v3.0 requirements: 26 total
- Mapped to phases: 26
- Unmapped: 0

---
*Requirements defined: 2026-04-04*
*Last updated: 2026-04-04 after roadmap creation*
