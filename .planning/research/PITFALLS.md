# Pitfalls Research: v3.0 Inventory Management Add-on

**Domain:** Adding inventory management as a paid add-on to an existing multi-tenant SaaS POS that already has stock tracking built in. Introducing service product types. Making existing stock logic conditional on subscription status. Supabase + Next.js App Router + Stripe billing.
**Researched:** 2026-04-04
**Confidence:** HIGH for data integrity and race condition patterns (PostgreSQL ACID + existing project context). HIGH for JWT stale claims (official docs + confirmed architecture pattern). MEDIUM for stocktake concurrent-sale divergence (practitioner consensus + POS industry patterns). MEDIUM for feature gate migration risks (SaaS industry analysis).

---

## Critical Pitfalls

### Pitfall 1: The Existing RPC Still Decrements Stock Even When the Add-on Is Disabled

**What goes wrong:**
`complete_pos_sale` and `complete_online_sale` are SECURITY DEFINER RPCs that atomically decrement `stock_quantity`. When the inventory add-on is disabled for a free-tier store, those RPCs still decrement stock. The product's `stock_quantity` column keeps changing with every sale — even though the merchant has no UI to see it, no low-stock alerts fire, and the feature is "off." When the merchant later subscribes to the inventory add-on, their `stock_quantity` data is accurate (every sale was counted) — but if the plan is to hide this column or set it to NULL for free tier, those silently-accumulated decrements are now a data integrity problem.

**Why it happens:**
The RPCs were written before the conditional model existed. The natural first approach is to add a feature gate at the *UI* layer (don't show stock badges, don't send low-stock alerts) while leaving the RPC logic unchanged "for safety." The developer reasons: "I'll keep decrementing so the data is ready when they subscribe." The mistake is that this reasoning was never made explicit, tested, or communicated — and it conflicts with the free-tier value proposition that stock is *not tracked*.

**How to avoid:**
Make a single deliberate decision and implement it consistently at every layer:

- **Option A (recommended): Keep decrementing for all stores, always.** Free tier just doesn't surface the data. When a merchant subscribes, the stock figures are already accurate. The RPCs do not change. The feature gate only controls UI display and alert generation. This is the cleanest approach for this project.
- **Option B: Stop decrementing for free tier.** Requires modifying the RPCs to check the store's plan before decrementing. This is complex, adds latency to the checkout hot path, and means a merchant's stock is immediately wrong when they subscribe (they need to do a stocktake to establish baseline). Avoid unless the product requirement explicitly demands it.

Document which option was chosen in the RPC code as a comment. The gate check in UI and alert code must match the documented intent.

**Warning signs:**
- The RPCs have no comment explaining whether free-tier stores still decrement
- `complete_pos_sale` has a feature gate check added that calls `requireFeature()` — this adds a DB round-trip to the checkout hot path
- Low-stock alert emails fire for stores that have not subscribed to the inventory add-on

**Phase to address:** Phase 1 (Service Product Type + Free-tier Simplification). Must be the first decision made — it constrains everything downstream.

---

### Pitfall 2: Service Products Break the NOT NULL Constraint on `stock_quantity`

**What goes wrong:**
`products.stock_quantity` currently has a NOT NULL constraint (likely with a default of 0). Service products have no meaningful stock quantity — they are unlimited by definition. The naive approach is to insert service products with `stock_quantity = 0`. But this means: (1) the existing `complete_pos_sale` RPC will attempt to decrement the service product's stock quantity by 1, producing -1 after the first sale; (2) low-stock alerts fire immediately because `stock_quantity = 0` is at or below the low-stock threshold; (3) reports show service products with "-47 units in stock" after 47 sales.

**Why it happens:**
The physical/service product type distinction is new. The existing schema has no concept of "this product has no stock." Developers often add the `product_type` column without auditing every downstream code path that touches `stock_quantity`. The RPC, the low-stock alert query, the stock report, and the CSV import all need to know about `product_type` — but they were written when every product was physical.

**How to avoid:**
1. Add a `product_type` column (`physical` | `service`, default `physical`) with a database migration.
2. Modify the `complete_pos_sale` and `complete_online_sale` RPCs to skip the stock decrement step when `product_type = 'service'`. This is the only safe place to enforce it — any application-layer skip can be bypassed.
3. Modify the low-stock alert query to add `WHERE product_type = 'physical'`.
4. Modify all stock-level reports to filter or annotate by product type.
5. Modify the online storefront out-of-stock check to allow service products to always be purchasable regardless of `stock_quantity`.
6. Modify the POS to never show "out of stock" for service products.

The RPC change is the most critical. Write a test that purchases a service product 100 times and verifies `stock_quantity` remains unchanged.

**Warning signs:**
- `complete_pos_sale` does not branch on `product_type` before decrementing
- Service products exist in the database with `stock_quantity = 0` and are triggering low-stock alerts
- The storefront shows a service product as "Out of Stock" after any purchase
- `stock_quantity` on a service product is negative

**Phase to address:** Phase 1 (Service Product Type). The RPC modification must ship in the same migration as the `product_type` column — never in a separate phase.

---

### Pitfall 3: JWT Claims Carry Stale Subscription State After Cancellation

**What goes wrong:**
The inventory add-on is gated via `requireFeature('inventory')`, which uses a JWT-fast-path: the `features` array in the Supabase custom JWT claims is checked first, with a DB fallback only for mutations. A merchant subscribes, their JWT claims are updated, and inventory features activate. They then cancel. The Stripe webhook fires, the DB is updated, but the merchant's existing JWT is still valid for up to 60 minutes (Supabase's default access token TTL). During this window, the merchant can still access inventory features — including running stock adjustments — even though their subscription is cancelled.

This is not hypothetical: at the checkout hot path, a stock adjustment committed during the stale JWT window creates real inventory records that reference a subscription state that no longer exists.

**Why it happens:**
JWTs are stateless by design — they cannot be invalidated before expiry without a blocklist. The `requireFeature()` dual-path (JWT fast + DB fallback) was designed for reads where stale data is acceptable. The same logic applied to mutations is incorrect for subscription cancellations where the consequence is financial.

**How to avoid:**
The `requireFeature()` implementation must use the DB path (not the JWT fast path) for all inventory *mutations*: stock adjustments, stocktake commits, manual quantity overrides. The JWT fast path is acceptable for reads (show/hide UI elements) but not for writes.

Concretely:
```typescript
// UI rendering — JWT fast path is fine (just affects display)
const hasInventory = features.includes('inventory'); // from JWT

// Mutations — always verify against DB
await requireFeature('inventory', storeId); // DB lookup, not JWT
```

Additionally, the Stripe webhook handler for `customer.subscription.deleted` should also clear the JWT claims by triggering a Supabase Auth token refresh for the affected user. This reduces the stale window from 60 minutes to near-zero.

**Warning signs:**
- `requireFeature()` uses the JWT fast path for stock adjustment Server Actions
- No test verifying that a store with a cancelled subscription cannot commit a stock adjustment
- Stripe cancellation webhook does not trigger a token refresh or plan claim update
- The DB fallback in `requireFeature()` is only triggered for Xero mutations, not inventory mutations

**Phase to address:** Phase 3 (Feature Gating). Must be addressed before any inventory mutation Server Actions ship.

---

### Pitfall 4: Stock Adjustment History Table Grows Without a Pruning Strategy

**What goes wrong:**
A `stock_adjustment_history` (or similar audit log) table is created to record every stock change: POS sales, online orders, manual adjustments, stocktake corrections, refund restores, and CSV imports. In a busy retail store, this table gets one row per product per sale line item. At 100 transactions/day with 3 line items each, that is 300 rows/day, 110,000 rows/year, per store. In a multi-tenant SaaS, this multiplies by tenant count. Within 18 months the table has millions of rows, full-table report queries start timing out, and the Supabase free tier storage limit is approached.

**Why it happens:**
Audit log tables feel lightweight to create. The first query — "show me recent adjustments for this product" — is fast with a simple index. The problem only surfaces when someone builds the "stock history report" that aggregates across a date range with no partition strategy. No one models the growth rate at design time.

**How to avoid:**
1. At schema design time, estimate the row growth rate for the first merchant and plan for 10x multi-tenant scale.
2. Add composite indexes from day one: `(store_id, product_id, created_at DESC)` — not just `(store_id)`.
3. Add `(store_id, created_at DESC)` for store-level history views.
4. Scope all stock history queries with a mandatory date range (e.g., last 90 days by default). Never allow a query that fetches all history for a store without a date filter.
5. For Supabase free tier: the table will be fine at single-tenant scale for years. If the SaaS grows to 20+ active merchants, evaluate table partitioning by `store_id` or time-based range partitioning.

**Warning signs:**
- The stock history query has no date range filter in the WHERE clause
- Reports page loads slowly after 3 months of use
- `EXPLAIN ANALYZE` on the history query shows a full sequential scan
- No composite index on `(store_id, created_at)`

**Phase to address:** Phase 2 (Inventory Add-on Data Model). Index design must be part of the migration, not retrofitted.

---

### Pitfall 5: Stocktake Commits Against Stale Data Because Sales Continued During the Count

**What goes wrong:**
A merchant starts a stocktake: they freeze the system's current `stock_quantity` as the "expected" quantity, then physically count items. This process takes 30–90 minutes in a real store. During that time, sales continue on the POS. When the stocktake is committed, the variance is calculated as `counted_quantity - expected_quantity`. But the "expected" quantity was captured at stocktake start, while actual `stock_quantity` has been decremented by the sales that occurred during counting. The variance calculation is wrong — it incorrectly attributes sales that happened during the count as shrinkage.

**Why it happens:**
The naive stocktake implementation captures the current `stock_quantity` at creation time and compares the final count against it. This is correct only if no transactions occurred during the count — which is never true in a live store. Professional inventory systems handle this by recording a "frozen" quantity at start AND tracking all transactions that occurred between start and commit, then adjusting the variance accordingly: `true_variance = counted_quantity - (frozen_quantity - sales_during_count)`.

**How to avoid:**
Design the stocktake schema with a "snapshot at start" approach:

1. When a stocktake session is created, record `snapshot_quantity = current stock_quantity` for each product.
2. Sales that occur during the stocktake continue to decrement `stock_quantity` normally (do not freeze POS operations).
3. When the stocktake is committed, calculate variance as: `variance = counted_quantity - (snapshot_quantity - units_sold_since_snapshot)`.
4. The "units sold since snapshot" can be derived from the stock adjustment history table (rows with `reason = 'sale'` after the stocktake's `created_at`).

Alternatively, for a simpler v1 implementation: document clearly that stocktake should be run before opening or after closing — when no sales are in progress. Show a warning banner in the stocktake UI if any sales have been recorded since the session started.

**Warning signs:**
- Stocktake variance is calculated as `counted - current_quantity` (uses live quantity, not snapshot)
- No `snapshot_quantity` column on the stocktake line items table
- No UI warning that sales occurred during counting
- Post-stocktake variance report consistently shows phantom shrinkage equal to the day's sales

**Phase to address:** Phase 2 (Inventory Add-on — Stocktake). The snapshot design decision must be made before the stocktake schema is finalized.

---

### Pitfall 6: Refund Stock Restore Has Undefined Behaviour When the Add-on Is Inactive

**What goes wrong:**
The existing partial refund flow restores stock atomically via an RPC. When the inventory add-on is introduced and some stores don't subscribe, the refund flow encounters an ambiguous situation: should it restore stock for a free-tier store (stock was decremented at sale time per Option A in Pitfall 1) or skip restoration? If the refund RPC unconditionally restores stock, it is internally consistent. If it skips restoration for free-tier stores, the product's `stock_quantity` drifts from reality — every refund leaves the count one unit low.

The risk compounds with service products: a refunded service product should never have its `stock_quantity` changed (it has no stock), but if the refund RPC doesn't branch on `product_type`, it may decrement or restore a quantity that has no meaning.

**Why it happens:**
Refund logic is written once and rarely revisited. The introduction of conditional inventory tracking and a new product type creates a matrix of cases that was not present when the refund RPC was written. Developers fix the sale path but forget the refund path is equally affected.

**How to avoid:**
After implementing `product_type` and the inventory add-on gate, explicitly audit the refund RPC for these cases:
1. `physical` product, inventory add-on enabled → restore stock (existing behaviour)
2. `physical` product, inventory add-on disabled → still restore stock (maintains consistency with sale decrement)
3. `service` product → never touch `stock_quantity` (no decrement occurred at sale, no restore at refund)

Write a test matrix covering all three cases. The test for case 3 should verify that `stock_quantity` is unchanged after a service product refund regardless of add-on status.

**Warning signs:**
- The refund RPC does not check `product_type`
- Service product `stock_quantity` changes after a refund
- No test covering refund behaviour for service products
- Physical product `stock_quantity` drifts low over time for free-tier stores that process refunds

**Phase to address:** Phase 1 (Service Product Type) and Phase 3 (Feature Gating). Both changes must include a refund RPC audit as a non-optional step.

---

### Pitfall 7: CSV Import Sets `stock_quantity` Without Respecting Product Type

**What goes wrong:**
The CSV import currently sets `stock_quantity` from an import column. When service products are introduced, merchants will import CSV files that include both physical and service products. If the import does not check `product_type` (or set it from a CSV column), service products get `stock_quantity` set to whatever value is in the CSV — typically 0 or a legacy number from the previous system. This triggers low-stock alerts for service products immediately after import.

The inverse problem: if a merchant re-imports a CSV to update prices, and the CSV has a `stock_quantity` column, the import may silently overwrite manually managed stock levels that were the whole point of the paid add-on. A price update import inadvertently resets all stock quantities to the CSV's (possibly months-old) values.

**Why it happens:**
CSV import is a batch operation that was designed with physical products in mind. Each new product type or conditional feature added to the system requires revisiting the import logic — but CSV import is "done" code that developers don't revisit instinctively.

**How to avoid:**
1. Add `product_type` as a CSV column (optional, defaults to `physical`).
2. Service products in the import must have `stock_quantity` set to NULL or 0 and ignored in stock reports.
3. For stock quantity updates via CSV import, require explicit opt-in: a `update_stock` column flag, or a separate "stock import" mode distinct from "product import." Never silently overwrite existing `stock_quantity` values during a price/description update import.
4. After import, show a summary: "X products updated, Y service products skipped for stock quantity, Z products had stock quantity changed."

**Warning signs:**
- CSV import has no `product_type` column support
- A "price update" CSV import changes `stock_quantity` values
- Low-stock alerts fire immediately after a CSV import containing service products
- No import summary showing which products had stock quantities changed

**Phase to address:** Phase 1 (Service Product Type) — the CSV import must be updated in the same phase that introduces service products.

---

### Pitfall 8: Free-Tier "No Stock Numbers Shown" Still Leaks Stock Data via the API

**What goes wrong:**
The free-tier UX decision is to hide stock numbers — merchants sell freely with no quantities shown. The implementation removes stock displays from the UI. But the Supabase client queries still return `stock_quantity` in the product data. Any merchant who inspects the network tab, uses a direct API call to their store's Supabase endpoint, or uses a browser dev tool can see the raw `stock_quantity` values. If the product requirement is strict data privacy (free users must not see stock data), UI hiding is insufficient.

More practically: the POS product grid fetches full product records. If a free-tier store has 20 products all showing `stock_quantity: 0` in the API response, and the POS has no stock gating, out-of-stock blocking is silently absent — any of those products can be sold to negative stock without warning.

**Why it happens:**
UI-layer feature gating is the default approach because it is fastest to implement. Developers assume "if the UI doesn't show it, the feature is off." In a multi-tenant SaaS with sophisticated merchants, API access is a realistic concern.

**How to avoid:**
For this project specifically: the decision is that free-tier stores still have `stock_quantity` tracked (Pitfall 1, Option A). Therefore the data *is* present and the concern is only about UI surface, not API privacy. The free-tier restriction is "no inventory management UI, no stock badges, no alerts" — not "the data does not exist."

Document this clearly. Do not attempt to null-out or hide `stock_quantity` in API responses for free-tier stores — it creates complexity and the data is already there from sales decrements. The feature gate controls the inventory *management* features (adjustments, stocktake, alerts), not the stock *data itself*.

If a future requirement demands true stock data privacy, that requires a schema-level change (separate `inventory` table for paid tier) — not a UI hide.

**Warning signs:**
- Product API response omits `stock_quantity` for free-tier stores (inconsistency risk)
- The POS product grid has different query shapes for paid vs free tier (maintenance burden)
- "Stock is hidden for free tier" is interpreted as "stock is not tracked for free tier" in implementation

**Phase to address:** Phase 1 (Free-tier Simplification). Establish the canonical mental model before writing any gating code: what is gated is the *management UI*, not the *data*.

---

### Pitfall 9: Manual Stock Adjustments Have No Reason Code Validation or Reversal Path

**What goes wrong:**
The stock adjustment feature allows a merchant to add or subtract units with a reason code (e.g., "received stock," "damaged goods," "theft," "stocktake correction"). If the reason code is free-text with no enumeration, two problems emerge: (1) reports grouping adjustments by reason are useless because "received" vs "Received stock" vs "stock received" are treated as different reasons; (2) there is no reversal path — if an adjustment is entered incorrectly (wrong quantity, wrong product), the merchant must make a compensating adjustment, but there is no UI for "undo" or "reverse this adjustment."

A related data integrity issue: if an adjustment is submitted and the network fails mid-request, the optimistic UI may show the adjustment as applied while the Server Action failed. The merchant may not realize the adjustment was not committed, leading to silent stock discrepancy.

**Why it happens:**
Reason codes are often implemented as free-text first for flexibility, with enumeration planned "later." The reversal path is not designed upfront because "they can just enter a compensating adjustment." The network failure case is missed because local testing has reliable connectivity.

**How to avoid:**
1. Use a predefined enum for reason codes at the database level: `('received', 'damaged', 'theft', 'returned_to_supplier', 'stocktake_correction', 'other')`. Free-text notes field is separate and optional.
2. For the reversal path: each adjustment row should have a nullable `reverses_adjustment_id` foreign key. The "undo" action creates a new compensating adjustment row referencing the original — the audit trail is preserved and reversals are traceable.
3. Server Actions for stock adjustment must return explicit success/failure states and the UI must show confirmation before dismissing. Use `useActionState` (React 19) to surface the result. Never use optimistic updates for financial adjustments.

**Warning signs:**
- Reason code is stored as `VARCHAR` with no CHECK constraint or enum
- No `reverses_adjustment_id` column in the adjustment schema
- Stock adjustment UI uses optimistic updates (visually commits before server confirmation)
- Report shows dozens of different spelling variants for the same reason

**Phase to address:** Phase 2 (Inventory Add-on — Manual Adjustments). Reason code enum and reversal pattern must be in the schema migration, not added later.

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Gate inventory at UI layer only, leave RPCs unchanged | Fast to ship, no RPC risk | Free-tier stores still decrement stock silently; service products hit RPC without a type check | Acceptable only if documented as intentional (Option A) and service product check is still in the RPC |
| Free-text reason codes for stock adjustments | Flexible for merchant | Reports useless; no grouping possible; "received" vs "Received Stock" are different categories | Never — use enum from day one |
| Stocktake variance using live `stock_quantity` (not snapshot) | Simple implementation | Variance incorrectly includes sales that occurred during counting | Acceptable only with an explicit "count after close" requirement enforced in UI |
| Skip refund RPC audit when adding product types | Faster Phase 1 delivery | Service product refunds corrupt `stock_quantity`; physical refund behaviour wrong for free tier | Never — the refund RPC must be audited in the same phase as product type introduction |
| Single `stock_adjustment_history` table with no date-range query enforcement | Simple schema | Table grows unboundedly; reports time out in 12-18 months | Acceptable at v3.0 single-tenant scale; add date range enforcement before multi-tenant rollout |
| JWT fast path for inventory mutation feature checks | Low latency on mutations | Cancelled subscriptions retain inventory write access for up to 60 minutes | Never for mutations — DB path required |

---

## Integration Gotchas

Common mistakes when connecting inventory features to existing systems.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| `complete_pos_sale` RPC | Add feature gate check inside RPC to skip decrement for free tier | Keep decrement unconditional; gate the management UI only. Adding a plan check to the checkout hot path adds latency and a failure mode |
| `complete_online_sale` RPC | Forget to update this RPC when `complete_pos_sale` is updated for `product_type` | Both RPCs are modified in the same migration. Write a single shared function for the stock decrement logic and call it from both |
| Partial refund RPC | Fix the sale path for service products but not the refund path | Audit every RPC that touches `stock_quantity` as a single unit: sale, refund, adjustment, import |
| Low-stock email notifications | Send alerts for service products (stock_quantity = 0 triggers threshold) | Add `product_type = 'physical'` filter to all alert queries. Also check if store has inventory add-on before sending any alert |
| Xero daily sync | Stock adjustment transactions are included in daily Xero sync as "adjustments" | Stock adjustments are an internal inventory operation, not a financial transaction. They must not be synced to Xero. Add explicit exclusion in the Xero sync logic |
| CSV import | Stock quantity column in a "price update" CSV inadvertently resets managed stock levels | Require separate explicit import mode for stock quantities. Default CSV import never changes `stock_quantity` if an existing value is present and `update_stock` flag is not set |
| Stripe billing webhook | Inventory add-on subscription cancelled, stock adjustment history records remain | History records belong to the store and must not be deleted on cancellation. Re-subscribing should restore full access to existing history |

---

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Stock history query without date range filter | Stock history page slow; timeouts in reporting | Mandatory date range in all stock history queries; paginate by default | ~500 adjustment rows per product |
| `SELECT *` on products table for POS grid includes `stock_quantity` even for free-tier stores | Unnecessary data transfer; no functional impact | No issue — data is present and correct. Do not add query complexity to omit it | Not a real trap — document and move on |
| N+1 query in stocktake: fetch each product's current quantity separately | Stocktake load slow for 100+ product stores | Batch-fetch all products for the store in a single query when creating stocktake session | 50+ products in stocktake |
| `stock_adjustment_history` table JOIN with `products` on every report row | Report query slow with 10K+ history rows | Use indexed FK with composite index; avoid joining to products table in aggregation queries — store product name snapshot at insertion time | 5K+ adjustment rows |
| Recalculating "current stock from history" instead of using `stock_quantity` column | Correct but exponentially slow as history grows | Always use `products.stock_quantity` as the authoritative current value; history is for audit only | 1K+ adjustment rows per product |

---

## Security Mistakes

Domain-specific security issues for inventory management in a multi-tenant POS.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Stock adjustment Server Action accepts `quantity` without a min/max range check | Merchant sets `stock_quantity` to 99,999,999 or -99,999,999; reports break; possible integer overflow | Zod schema: `z.number().int().min(-10000).max(10000)` for single adjustment. Apply both in Server Action and database CHECK constraint |
| Manual stock adjustment available to staff PIN sessions (not just owner) | Staff can manipulate stock to cover theft | Stock adjustments should require owner-level auth (Supabase Auth session), not staff PIN session. Add explicit auth check at top of adjustment Server Action |
| Stock history visible across tenants due to missing `store_id` filter | Merchant sees another store's adjustment history | RLS policy on `stock_adjustment_history` must require `store_id` match. Standard pattern — but new tables are the most common place RLS is forgotten |
| `product_type` field settable by any authenticated user including customers | Customer sets their own product listing to `service` type to bypass stock checks in online store | `product_type` is an admin-only field. Online store checkout must validate `product_type` server-side, not from client-submitted data |
| Stocktake commit RPC has no concurrency guard — two simultaneous commits overwrite each other | Two staff members commit separate counts for the same stocktake; last write wins; earlier count silently lost | Stocktake sessions should have a `status` column (`in_progress` → `committed`). Commit RPC uses `WHERE status = 'in_progress'` with atomic update. Second commit attempt returns an error |

---

## UX Pitfalls

Common user experience mistakes when introducing inventory management.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Free-tier merchants see no explanation of why stock numbers are absent | Confusion: "where did my stock levels go?" — support tickets | Show a clear "Inventory Management add-on" upsell message in the product admin and POS where stock data would appear. Never silently remove a feature; explain the gate |
| Stocktake UI allows committing while POS sales are in progress with no warning | Variance figures are wrong; merchant trusts incorrect shrinkage numbers | Show a banner: "X sales recorded since this stocktake started. Variance calculation will account for these." Or block commit until a quiet period |
| Stock adjustment "reason" field is the only place to describe what happened | Rich adjustment context lost; auditor cannot reconstruct what happened from reason code alone | Provide both an enum reason code (for filtering/reporting) and a free-text notes field (for narrative context) |
| Service product type not clearly distinguished in product list | Merchants can't tell which products have inventory tracked and which don't | Show a clear badge ("Service" or "No stock") on all service products in admin, POS grid, and stock reports |
| Inventory add-on upsell shown in the middle of a POS transaction | Merchant distracted mid-sale; customer waiting | Show upsell only in admin dashboard / product settings, never mid-transaction. POS must always feel clean and fast |

---

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **Service product type added:** `product_type` column exists — but verify `complete_pos_sale` RPC skips decrement for `service`, online checkout allows service products regardless of stock, low-stock alerts filter to `physical` only, CSV import handles service type
- [ ] **Free-tier simplification done:** Stock badges removed from free-tier POS UI — but verify RPCs still decrement for free tier, refund RPC still restores for free tier, no low-stock alerts fire for free-tier stores, the behaviour is documented
- [ ] **Inventory add-on feature gate wired:** `requireFeature('inventory')` added to Server Actions — but verify mutations use DB path (not JWT fast path), cancelled subscription cannot commit adjustments within 60 minutes, Stripe cancellation webhook updates JWT claims
- [ ] **Manual stock adjustment built:** Adjustment form ships — but verify reason code is enum (not free text), adjustment has reversal path, Server Action uses DB auth check (not staff PIN), `stock_quantity` has CHECK constraint against extreme values
- [ ] **Stocktake built:** Count form and commit RPC ship — but verify snapshot quantity is captured at session start (not live quantity at commit), concurrent commit guard via status field, sales-during-count accounted for in variance, commit is atomic
- [ ] **Stock history table built:** Table and queries ship — but verify composite index `(store_id, product_id, created_at DESC)` exists, all queries have mandatory date range, Xero sync explicitly excludes adjustment rows
- [ ] **CSV import updated:** Import processes service products — but verify `stock_quantity` is never silently overwritten for existing products unless explicit flag is set, import summary shows what changed

---

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| `stock_quantity` corrupted for service products (went negative) | LOW | Write a migration that sets `stock_quantity = NULL` or 0 for all products where `product_type = 'service'`. Add the RPC fix. Audit history table for incorrect entries and mark as `void` |
| Stocktake committed with incorrect variance (sales not accounted for) | MEDIUM | Add a `void` status to the stocktake table. Allow re-running the stocktake. Do not delete history — mark the bad session as void with a correction note |
| JWT stale claims allowed inventory mutations after cancellation | LOW-MEDIUM | The mutation is already in the DB. Review the specific adjustments made during the stale window. If incorrect, allow merchant to void them. Add the DB-path enforcement to Server Actions |
| Reason codes accumulated as unstructured free text (no enum) | MEDIUM | Write a migration to map existing free-text values to canonical enum values (use CASE statement for known variants, map remainder to `'other'`). Add CHECK constraint. Update the UI |
| Stock adjustment history table without date range — timeout in production | MEDIUM | Add the composite index via migration (non-blocking in Postgres with `CREATE INDEX CONCURRENTLY`). Add mandatory date range parameter to the Server Action and enforce it |
| CSV import overwrote managed stock quantities | HIGH | Use the stock adjustment history to reconstruct what the quantities should have been. Emit compensating adjustments with reason `'csv_import_correction'`. Add the opt-in flag to prevent recurrence |

---

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| RPC still decrements when add-on disabled | Phase 1: Service Product + Free-tier | Unit test: physical product sale decrements; service product sale does not; free-tier store sale still decrements |
| Service products break `stock_quantity` constraints | Phase 1: Service Product Type | Test: purchase service product 100x; `stock_quantity` unchanged; no low-stock alert; always purchasable online |
| JWT stale claims on cancellation | Phase 3: Feature Gating | Test: cancel subscription, immediately attempt stock adjustment; expect error (DB path used) |
| History table growth without indexes | Phase 2: Inventory Data Model | Migration includes composite indexes; EXPLAIN ANALYZE on stock history query shows index scan |
| Stocktake variance wrong during live sales | Phase 2: Inventory Stocktake | Test: create stocktake, make 5 sales, commit; verify variance excludes those 5 sales |
| Refund RPC breaks for service products | Phase 1: Service Product Type | Test matrix: physical + inventory on/off + refund; service + refund; all cases verified |
| CSV import overwrites managed stock | Phase 1: CSV Import Update | Test: import CSV with stock column on existing products; existing quantities unchanged without explicit flag |
| API leaks stock data for free tier | Phase 1: Free-tier Simplification | Document intentional (not a leak — data tracked by design); verify no query shape difference between tiers |
| Manual adjustments lack validation | Phase 2: Manual Adjustments | Zod schema test: negative 50,000 rejected; reason code not in enum rejected; staff PIN session rejected |
| Concurrent stocktake commits | Phase 2: Stocktake | Test: two simultaneous commit requests; only first succeeds; second returns error |

---

## Sources

- WooCommerce NULL vs zero stock_quantity bug (GitHub issue #21392): https://github.com/woocommerce/woocommerce/issues/21392 — confirms NULL/zero/product type distinctions cause real production bugs
- Negative stock in POS systems — causes and prevention: https://www.possolutions.com.au/blog/negative-stock-inventory-how-to-find-your-stock-discrepancies-fast
- Immutable audit trails — dual write atomicity failure modes: https://www.designgurus.io/answers/detail/how-do-you-enforce-immutability-and-appendonly-audit-trails
- SELECT FOR UPDATE trap (Fresha Data Engineering, Medium): https://medium.com/fresha-data-engineering/the-select-for-update-trap-everyone-falls-into-8643089f94c7
- Stocktake freeze methodology (Caliach Knowledge Base): https://caliach.com/knowledge-base/wsttfreeze/ — confirms snapshot-at-start is the correct approach
- Inventory discrepancies from concurrent POS + stocktake: https://www.unleashedsoftware.com/inventory-management-guide/stock-discrepancies/
- Why JWTs make poor authorisation tokens (DEV Community): https://dev.to/stevenstuartm/why-jwts-make-terrible-authorization-tokens-3c8g — confirms stale JWT claims problem for subscription state
- SaaS feature gating — gate power not access: https://www.withorb.com/blog/feature-gating — confirms UI-only gating strategy for free-tier UX
- PostgreSQL race conditions and inventory: https://oneuptime.com/blog/post/2026-01-25-postgresql-race-conditions/view
- PostgreSQL audit trail with triggers: https://oneuptime.com/blog/post/2026-01-25-postgresql-audit-trails-triggers/view
- POS returns and inventory management (Shopify Retail): https://www.shopify.com/retail/stock-take — confirmed snapshot stocktake pattern
- Inventory variance causes (Unleashed Software): https://www.unleashedsoftware.com/blog/12-reasons-stocktake-discrepancies/ — confirmed common variance root causes

---
*Pitfalls research for: v3.0 Inventory Management — adding paid inventory add-on and service product types to existing NZPOS multi-tenant SaaS POS*
*Researched: 2026-04-04*
