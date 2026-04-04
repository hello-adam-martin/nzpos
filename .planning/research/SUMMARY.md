# Project Research Summary

**Project:** NZPOS v3.0 — Inventory Management Add-on
**Domain:** Multi-tenant SaaS POS — inventory management, service product types, free-tier simplification
**Researched:** 2026-04-04
**Confidence:** HIGH

## Executive Summary

NZPOS v3.0 adds inventory management as a paid add-on to an existing multi-tenant SaaS POS that already tracks `stock_quantity` on every product and atomically decrements it at sale time. The core challenge is not building inventory from scratch — it is making the existing stock logic conditional, introducing a new product type that bypasses stock entirely, and ensuring the free tier feels clean without breaking the data model that already works. The existing `requireFeature()` + Stripe billing + `store_plans` infrastructure (proven with Xero and email notification add-ons) provides the exact pattern to follow.

The recommended approach is surgical: one migration file adds the `product_type` column, the `stock_adjustments` audit table, the stocktake tables, and modifies the existing SECURITY DEFINER RPCs — all as a single atomic unit. No new npm packages are needed. The `complete_pos_sale` and `complete_online_sale` RPCs must learn to skip stock logic for service products at the database layer (not the UI layer). The add-on feature gate controls the management UI and alerts, but stock decrements continue unconditionally for all stores — this keeps the data accurate for merchants who subscribe later.

The highest risks are: (1) modifying the two sale RPCs that are on the checkout critical path, (2) stale JWT claims allowing inventory mutations after subscription cancellation, and (3) stocktake variance being wrong when sales occur during counting. All three have clear prevention strategies documented in the research. The refund path is a frequently overlooked integration point — it must be audited in the same phase as the product type introduction.

## Key Findings

### Stack Impact

No new npm packages required for v3.0. All changes are database migrations, Server Actions, Zod schemas, and `config/addons.ts` wiring. See STACK.md for full details.

**Schema additions:**
- `products.product_type` TEXT column (`physical` | `service`, default `physical`) — forward-compatible enum, not a boolean
- `store_plans.has_inventory` + `has_inventory_manual_override` BOOLEAN columns — matches existing `has_xero` pattern exactly
- `stock_adjustments` table — append-only audit log for all stock mutations (sales, refunds, manual, stocktake)
- `stocktakes` + `stocktake_items` tables — session-based physical count with computed variance column

**New environment variable:** `STRIPE_PRICE_INVENTORY` (Stripe Price ID for the add-on)

### Architecture Decisions

Five critical design choices surfaced from the research:

1. **Service-product skip lives in the RPC, not the UI.** Both `complete_pos_sale` and `complete_online_sale` must branch on `product_type` inside the SECURITY DEFINER function. UI checks are defense-in-depth only. Putting the check only in the UI is the single most common anti-pattern in this domain.

2. **Free-tier stores keep decrementing stock silently.** The RPCs do not change behaviour based on subscription status. Stock data stays accurate. The add-on gates the management UI (adjustments, stocktake, badges, alerts), not the data itself. This is the cleanest approach and avoids a baseline stocktake requirement on subscription.

3. **All stock mutations go through SECURITY DEFINER RPCs.** Manual adjustments and stocktake commits use new RPCs (`adjust_stock`, `complete_stocktake`) that atomically update `products.stock_quantity` and insert `stock_adjustments` rows in a single transaction. Application-layer loops are forbidden.

4. **Feature gate uses DB path for mutations, JWT fast path for reads.** `requireFeature('inventory', { requireDbCheck: true })` on every inventory write action. JWT path acceptable for UI rendering decisions only.

5. **One migration file for all inventory changes.** Tables, columns, modified RPCs, new RPCs, RLS policies, indexes, and auth hook update — all in `024_inventory_addon.sql`. Partial application of tightly coupled changes is a documented failure mode.

### Expected Features

**Must have (P1 — add-on not shippable without):**
- Service product type (`physical` / `service`) with full RPC integration
- Manual stock adjustment with predefined reason code enum + free-text notes
- Adjustment history log (filterable by product, date, reason)
- Stocktake session: create, count, show variance, commit atomically
- `requireFeature('inventory')` billing gate wired to Stripe
- Free-tier cleanup: hide stock columns/badges/alerts when add-on inactive
- POS stock badges (in-stock / low / out) when add-on active
- POS zero-stock blocking for physical products when add-on active

**Should have (P2 — same milestone if possible):**
- Partial stocktake by category
- Barcode scan integration in stocktake (existing scanner, low effort)
- Storefront sold-out handling when add-on active

**Defer (v3.1+):**
- Cost variance in stocktake (requires `cost_price` field)
- Stock received bulk workflow
- Per-product stock history timeline view
- Stock movement reporting (shrinkage totals, reason breakdowns)
- Purchase orders / supplier management (explicitly out of scope)

### Risk Areas

Top 5 pitfalls ranked by severity:

1. **Service products break existing RPCs.** The `complete_pos_sale` RPC will try to decrement `stock_quantity` for service items, causing negative stock and false out-of-stock errors. Prevention: modify both sale RPCs in the same migration as the `product_type` column. Write a test that sells a service product 100 times and verifies `stock_quantity` is unchanged.

2. **Stale JWT claims after subscription cancellation.** A cancelled subscriber retains inventory write access for up to 60 minutes via cached JWT claims. Prevention: all inventory mutations use `requireDbCheck: true`. Stripe cancellation webhook should trigger token refresh.

3. **Stocktake variance wrong during live sales.** If variance is calculated against live `stock_quantity` instead of a snapshot, sales during counting appear as phantom shrinkage. Prevention: snapshot `system_quantity` at stocktake creation; use `stock_adjustments` rows to account for sales during count, or document that counts should happen when store is closed.

4. **Refund path not audited for new product types.** `processRefund` and `processPartialRefund` call `restore_stock` — this must skip service products entirely. Prevention: test matrix covering physical+refund, service+refund, both with and without add-on active.

5. **CSV import overwrites managed stock levels.** A price-update CSV import silently resets `stock_quantity` to stale values. Prevention: CSV import must never change `stock_quantity` without an explicit `update_stock` flag. Add `product_type` as a CSV column.

## Requirements Implications

### What research tells us about scoping

The work divides cleanly into three phases based on dependency order.

### Phase 1: Service Product Type + Free-Tier Simplification
**Rationale:** `product_type` is a prerequisite for everything else. Both sale RPCs, both refund actions, the CSV import, low-stock alerts, and the storefront must all handle services correctly before any inventory management features are built. Free-tier simplification is coupled because it requires the same conditional rendering audit.
**Delivers:** Service products that sell without stock checks everywhere. Clean free-tier experience with no stock clutter.
**Addresses:** P1 features: service product type, free-tier cleanup
**Avoids:** Pitfalls 1 (RPC decrement behaviour), 2 (service products break constraints), 6 (refund undefined behaviour), 7 (CSV import), 8 (API data leakage)
**Scope note:** This phase touches existing code heavily (RPCs, refund actions, CSV import, POS, storefront, admin). It is the riskiest phase despite being foundational.

### Phase 2: Inventory Add-on Core (Adjustments + Stocktake)
**Rationale:** With service products handled, the inventory features can be built as purely additive new code. The `stock_adjustments` table is the shared backbone — manual adjustments, stocktake commits, and sale-generated history all write to it.
**Delivers:** The paid add-on: manual stock adjustments with reason codes, adjustment history, stocktake sessions with variance, atomic commit. Admin UI pages for all inventory management.
**Addresses:** P1 features: manual adjustment, history log, stocktake create/count/variance/commit. P2 features: partial stocktake, barcode scan.
**Avoids:** Pitfalls 4 (history table growth — indexes in migration), 5 (stocktake stale data — snapshot design), 9 (reason code validation — enum from day one)

### Phase 3: Feature Gating + POS/Storefront Integration
**Rationale:** The billing gate and POS/storefront stock badges depend on the inventory infrastructure being complete. The `requireFeature('inventory')` wiring, Stripe product creation, and conditional UI rendering are the final layer.
**Delivers:** Stripe-billed add-on with purchase flow. POS stock badges and zero-stock blocking. Storefront sold-out handling. Super admin panel integration.
**Addresses:** P1 features: billing gate, POS badges, POS zero-stock blocking. P2 features: storefront sold-out.
**Avoids:** Pitfall 3 (JWT stale claims — DB path enforcement on all mutations)

### Phase Ordering Rationale

- Phase 1 must come first because it modifies the checkout critical path (sale RPCs). All subsequent work assumes services are handled correctly.
- Phase 2 is pure additive — new tables, new RPCs, new Server Actions, new UI pages. No existing code is modified except the sale RPCs (to write `stock_adjustments` rows).
- Phase 3 is the integration layer — it connects inventory to billing and surfaces it in POS/storefront. It depends on Phase 2 being complete so there is something to gate.
- The `addons.ts` config change and the auth hook JWT claim injection should happen in Phase 3, not Phase 1, because the inventory feature does not need to be gated until the management UI exists.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 1:** HIGH risk. Modifies two SECURITY DEFINER RPCs on the checkout hot path. Needs careful test planning and a rollback strategy. Research the exact RPC source before writing the migration.
- **Phase 2 (Stocktake):** MEDIUM risk. The snapshot-vs-live-quantity decision for concurrent-sale handling needs a firm product decision before implementation.

Phases with standard patterns (skip research-phase):
- **Phase 3:** LOW risk. The `requireFeature()` + `addons.ts` + Stripe billing pattern is proven across two existing add-ons. Follow the Xero add-on implementation as a template.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | No new packages. All changes verified against existing codebase patterns through 23 migration files and 48 Server Actions. |
| Features | HIGH | Feature landscape well-established in retail POS. Validated against Square, Lightspeed, Shopify POS documentation. |
| Architecture | HIGH | All claims verified via direct codebase inspection. Build order derived from actual dependency graph. |
| Pitfalls | HIGH | Critical pitfalls (RPC modification, JWT stale claims, stocktake snapshot) confirmed via PostgreSQL documentation and POS industry patterns. |

**Overall confidence:** HIGH

### Gaps to Address

- **Stocktake concurrent-sale strategy:** Research recommends snapshot-at-start with sales-during-count adjustment, but the simpler "count after close" approach may be sufficient for v3.0. Needs a product decision.
- **Low-stock alerts scope:** Currently always-on. Research did not conclusively determine whether alerts should be gated behind the inventory add-on or remain free. Needs a product decision.
- **`cost_price` field existence:** Cost variance in stocktake (deferred to v3.1) requires a `cost_price` column on products. Unclear if this field exists. Check before Phase 2.
- **Staff vs owner permissions for stock adjustments:** Pitfalls research flags that staff PIN sessions should not have adjustment access (theft risk). Needs a product decision on whether trusted staff can adjust stock.

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection: 23 migration files (`001_initial_schema.sql` through `023_performance_indexes.sql`)
- Direct codebase inspection: `src/lib/requireFeature.ts`, `src/config/addons.ts`, `src/actions/orders/completeSale.ts`
- PostgreSQL documentation: `GENERATED ALWAYS AS ... STORED`, `SELECT FOR UPDATE`, SECURITY DEFINER functions

### Secondary (MEDIUM confidence)
- Square stock adjustment documentation: https://squareup.com/help/us/en/article/8331-set-up-inventory-tracking
- Lightspeed Retail X-Series inventory counting: https://retail-support.lightspeedhq.com/hc/en-us/articles/229129948-Counting-inventory
- Oracle Retail Store Inventory Management reason codes
- WooCommerce NULL vs zero stock_quantity bug (GitHub issue #21392)

### Tertiary (LOW confidence)
- Supabase free tier limits (pricing page blocked, from training data) — verify before multi-tenant rollout

---
*Research completed: 2026-04-04*
*Ready for roadmap: yes*
