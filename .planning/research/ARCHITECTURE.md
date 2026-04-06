# Architecture Research

**Domain:** Multi-tenant SaaS POS — paid add-on integration
**Researched:** 2026-04-06
**Confidence:** HIGH (based on existing codebase, not speculation)

---

## Context: What Already Exists

This is not a greenfield architecture question. The billing and gating infrastructure is fully operational. Every new add-on plugs into an established pipeline. The question is how each add-on type maps to that pipeline and what net-new components each requires.

### Existing Billing Pipeline (Do Not Change)

```
Merchant clicks "Subscribe" in /admin/billing
    ↓
createSubscriptionCheckoutSession(feature) — Server Action
    ↓
Stripe Checkout (hosted, 14-day trial, metadata: store_id + feature)
    ↓
Stripe webhook: customer.subscription.created/updated/deleted
    ↓
/api/webhooks/stripe/billing/route.ts
    ↓ PRICE_TO_FEATURE[priceId] → featureColumn
    ↓
store_plans UPDATE SET has_{feature} = true/false
    ↓
Next JWT refresh → app_metadata.{feature} = true
    ↓
requireFeature(feature) fast-path reads JWT claim
    ↓
Server Action mutations use requireFeature(feature, { requireDbCheck: true })
```

### Existing Schema for Feature Gating

```sql
-- store_plans (one row per store, extends on each new add-on)
store_id UUID UNIQUE
has_xero BOOLEAN DEFAULT false
has_xero_manual_override BOOLEAN DEFAULT false
has_email_notifications BOOLEAN DEFAULT false  -- always true, kept for compat
has_custom_domain BOOLEAN DEFAULT false
has_inventory BOOLEAN DEFAULT false
has_inventory_manual_override BOOLEAN DEFAULT false
```

### Existing Config for Add-ons

```
src/config/addons.ts
  SubscriptionFeature union type
  PRICE_ID_MAP: feature → Stripe Price ID (env var)
  PRICE_TO_FEATURE: Stripe Price ID → store_plans column
  FEATURE_TO_COLUMN: feature → store_plans column
  ADDONS array: display metadata for billing UI
```

---

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      MERCHANT BROWSER                           │
│  /admin/billing  /admin/{addon}  /pos  /store (public)          │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTPS
┌────────────────────────────▼────────────────────────────────────┐
│                       NEXT.JS APP ROUTER                        │
│                                                                 │
│  Server Components (RSC)      Server Actions                    │
│  ┌──────────────────────┐    ┌──────────────────────────────┐   │
│  │  Admin pages         │    │  requireFeature() guard      │   │
│  │  /admin/billing      │    │  JWT fast-path (reads claims) │   │
│  │  /admin/{addon}/*    │    │  DB fallback (mutations)     │   │
│  └──────────────────────┘    └──────────────────────────────┘   │
│                                                                 │
│  API Route Handlers                                             │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  /api/webhooks/stripe/billing  (subscription events)    │   │
│  │  /api/webhooks/stripe          (checkout.session events) │   │
│  │  /api/cron/*                   (scheduled jobs)          │   │
│  └──────────────────────────────────────────────────────────┘   │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                         SUPABASE                                │
│                                                                 │
│  ┌──────────────────┐  ┌──────────────────┐                     │
│  │  Postgres + RLS  │  │  Auth + JWT hook  │                    │
│  │  (store_id on    │  │  custom_access_   │                    │
│  │   all tables)    │  │  token_hook       │                    │
│  └──────────────────┘  └──────────────────┘                     │
│                                                                 │
│  Core tables: stores, store_plans, products, orders, staff      │
│  Add-on tables: stock_adjustments, stocktake_*, loyalty_*...    │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                    EXTERNAL SERVICES                            │
│  Stripe (billing + checkout)  Xero (accounting)  Email          │
└─────────────────────────────────────────────────────────────────┘
```

---

## The Four-Step Add-On Integration Checklist

Every new add-on requires exactly these four steps. The order is non-negotiable — billing must exist before gating works.

### Step 1: Schema Extension

```sql
-- In a new migration file: 0XX_{addon}_core.sql

-- 1a. Add flag columns to store_plans
ALTER TABLE public.store_plans
  ADD COLUMN IF NOT EXISTS has_{addon} BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_{addon}_manual_override BOOLEAN NOT NULL DEFAULT false;

-- 1b. Create add-on-specific tables (with store_id + RLS)
CREATE TABLE public.{addon}_* (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id),
  ...
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.{addon}_* ENABLE ROW LEVEL SECURITY;
CREATE POLICY "{addon}_store_isolation" ON public.{addon}_*
  USING ((store_id)::text = (auth.jwt() -> 'app_metadata' ->> 'store_id'));

-- 1c. Update custom_access_token_hook to inject new claim
-- (Full CREATE OR REPLACE — preserve all existing logic)
```

### Step 2: Config Registration

```typescript
// src/config/addons.ts — four additions per add-on:

// 1. Extend the union type
export type SubscriptionFeature = 'xero' | 'inventory' | '{addon}'

// 2. Extend FeatureFlags interface
interface FeatureFlags {
  has_{addon}: boolean
}

// 3. Add to PRICE_ID_MAP
{addon}: process.env.STRIPE_PRICE_{ADDON}!,

// 4. Add to PRICE_TO_FEATURE (webhook routing)
[process.env.STRIPE_PRICE_{ADDON}!]: 'has_{addon}',

// 5. Add to FEATURE_TO_COLUMN (requireFeature DB-path)
{addon}: 'has_{addon}',

// 6. Add to ADDONS display array (billing UI)
{
  feature: '{addon}' as SubscriptionFeature,
  name: '{Addon Display Name}',
  benefitLine: '...',
  gatedHeadline: '...',
  gatedBody: '...',
}
```

### Step 3: Server Actions with requireFeature Guard

```typescript
// src/actions/{addon}/someAction.ts
'use server'
import 'server-only'
import { requireFeature } from '@/lib/requireFeature'

export async function someAddonMutation(input: Input) {
  // DB-path check for all mutations (stale JWT is unacceptable for writes)
  const gate = await requireFeature('{addon}', { requireDbCheck: true })
  if (!gate.authorized) return { error: 'feature_not_subscribed', upgradeUrl: gate.upgradeUrl }

  // ... rest of action
}
```

### Step 4: UI Gate in Admin Pages

```typescript
// src/app/admin/{addon}/page.tsx (Server Component)
const gate = await requireFeature('{addon}')  // JWT fast-path for reads
if (!gate.authorized) return <UpgradePrompt feature="{addon}" upgradeUrl={gate.upgradeUrl} />

// Render the actual add-on UI
```

---

## Component Boundaries Per Add-On Type

### Add-On: Loyalty Program

**What it is:** Points earned per dollar spent, redeemable for discounts. In-store (POS) and online redemption.

**New tables:**

```sql
loyalty_accounts        -- one per customer, store_id + customer_id (or email)
  store_id UUID
  customer_id UUID REFERENCES customers(id) -- nullable for guest/phone lookup
  email TEXT            -- primary lookup key
  phone TEXT            -- secondary lookup
  points_balance INTEGER NOT NULL DEFAULT 0
  lifetime_points INTEGER NOT NULL DEFAULT 0

loyalty_transactions    -- append-only ledger (like stock_adjustments pattern)
  store_id UUID
  loyalty_account_id UUID
  order_id UUID         -- nullable (manual adjustments have no order)
  points_delta INTEGER  -- positive = earned, negative = redeemed
  points_after INTEGER
  reason TEXT CHECK (reason IN ('purchase', 'redemption', 'manual_adjustment', 'expiry', 'bonus'))
  created_at TIMESTAMPTZ

loyalty_settings        -- one per store, configurable earn rate
  store_id UUID UNIQUE
  points_per_dollar INTEGER NOT NULL DEFAULT 1  -- e.g. 1 point per $1 spent
  dollars_per_point NUMERIC(10,4) NOT NULL DEFAULT 0.01  -- e.g. 100 points = $1
  minimum_redemption INTEGER NOT NULL DEFAULT 100
  expiry_days INTEGER   -- null = no expiry
```

**New RPCs (SECURITY DEFINER):**

```sql
earn_loyalty_points(store_id, order_id, customer_email)
  -- Called by complete_pos_sale / complete_online_sale
  -- Reads loyalty_settings earn rate, inserts loyalty_transaction, updates balance

redeem_loyalty_points(store_id, loyalty_account_id, points_to_redeem)
  -- Returns discount_cents
  -- Validates minimum_redemption, atomically decrements balance
```

**Integration with POS/Storefront:** The complete_pos_sale and complete_online_sale RPCs need loyalty calls added (same pattern as stock_adjustments was added in 025_inventory_core.sql). This is the key dependency — loyalty only works well if sales automatically earn points.

**New Server Actions:**
- `lookupLoyaltyAccount(email | phone)` — POS lookup before checkout
- `redeemPoints(accountId, pointsToRedeem)` — returns discount cents
- `adjustLoyaltyPoints(accountId, delta, reason)` — manual admin adjustment
- `getLoyaltyDashboard(storeId)` — top accounts, total outstanding points liability

**Admin UI pages:**
- `/admin/loyalty/settings` — earn rate, redemption rate, expiry
- `/admin/loyalty/accounts` — customer point balances
- `/admin/loyalty/transactions` — full ledger view

**POS integration:** Search field before checkout shows "Has loyalty account (450 pts)" → optional redemption → discount applied before total.

**Build dependency:** Requires customer accounts to exist (already shipped). No hard dependency on Inventory add-on.

---

### Add-On: Gift Cards

**What it is:** Merchant sells digital gift cards. Customer receives code, redeems in-store or online.

**New tables:**

```sql
gift_cards
  store_id UUID
  code TEXT UNIQUE NOT NULL  -- 16-char alphanumeric, uppercase
  initial_balance_cents INTEGER NOT NULL
  current_balance_cents INTEGER NOT NULL
  issued_to_email TEXT        -- nullable (anonymous purchase)
  issued_order_id UUID        -- the Stripe order that purchased it
  expires_at TIMESTAMPTZ      -- nullable, from gift_card_settings
  is_active BOOLEAN DEFAULT true
  created_at TIMESTAMPTZ

gift_card_transactions       -- redemption audit log
  store_id UUID
  gift_card_id UUID
  order_id UUID
  amount_cents INTEGER        -- negative = redemption, positive = refund
  balance_after_cents INTEGER
  created_at TIMESTAMPTZ
```

**New RPCs (SECURITY DEFINER):**

```sql
generate_gift_card(store_id, initial_balance_cents, issued_to_email, issued_order_id)
  -- Generates unique code, inserts gift_card row

redeem_gift_card(store_id, code, amount_to_redeem_cents)
  -- Validates code active + sufficient balance
  -- Atomically decrements current_balance_cents
  -- Returns actual_amount_redeemed (may be less than requested if partial)
```

**Stripe integration for gift card purchase:** Gift card purchase goes through Stripe Checkout (product = "Gift Card $X"). On checkout.session.completed, the existing Stripe webhook calls generate_gift_card. The gift card code is emailed to the buyer.

**Admin UI pages:**
- `/admin/gift-cards` — list all cards, balance search by code
- `/admin/gift-cards/settings` — expiry policy

**POS integration:** Code entry field at checkout. Partial redemption allowed (remaining balance stays on card).

**Build dependency:** Standalone. No dependency on Loyalty or Inventory.

---

### Add-On: Supplier Management

**What it is:** Track suppliers, record purchase orders, receive stock against POs (auto-updates inventory).

**New tables:**

```sql
suppliers
  store_id UUID
  name TEXT NOT NULL
  contact_name TEXT
  contact_email TEXT
  contact_phone TEXT
  account_number TEXT
  notes TEXT
  is_active BOOLEAN DEFAULT true
  created_at TIMESTAMPTZ

purchase_orders
  store_id UUID
  supplier_id UUID
  status TEXT CHECK (status IN ('draft', 'sent', 'partial', 'received', 'cancelled'))
  po_number TEXT               -- auto-generated or manual
  expected_at DATE
  notes TEXT
  created_by UUID REFERENCES staff(id)
  created_at TIMESTAMPTZ

purchase_order_lines
  store_id UUID
  purchase_order_id UUID
  product_id UUID
  quantity_ordered INTEGER NOT NULL
  quantity_received INTEGER NOT NULL DEFAULT 0
  unit_cost_cents INTEGER      -- cost price, not retail
  created_at TIMESTAMPTZ

supplier_products              -- maps which suppliers supply which products
  store_id UUID
  supplier_id UUID
  product_id UUID
  supplier_sku TEXT
  unit_cost_cents INTEGER
  PRIMARY KEY (store_id, supplier_id, product_id)
```

**New RPC (SECURITY DEFINER):**

```sql
receive_stock_against_po(purchase_order_id, lines: [{product_id, quantity_received}])
  -- For each line: calls adjust_stock with reason='received', updates quantity_received
  -- Updates PO status to 'partial' or 'received'
  -- Atomic: all lines succeed or none
```

**Build dependency:** Hard dependency on Inventory add-on. Stock receiving only makes sense if the store tracks stock. Should be gated as requiring both `supplier_management` AND `inventory`. Consider bundling with inventory or treating it as an inventory sub-feature.

**Admin UI pages:**
- `/admin/suppliers` — supplier list
- `/admin/suppliers/[id]` — supplier detail, products, PO history
- `/admin/purchase-orders` — PO list, status filter
- `/admin/purchase-orders/new` — create PO from supplier + products

---

### Add-On: Advanced Analytics / Reports

**What it is:** Deeper reporting beyond the existing basic dashboard. Period comparison, product performance cohorts, customer lifetime value.

**Architecture note:** The existing Stripe analytics snapshot pattern (030_analytics_snapshot.sql) provides the model — materialised snapshots queried by the admin UI, refreshed by cron jobs. Use the same pattern for add-on analytics.

**New tables:**

```sql
analytics_daily_snapshots    -- pre-aggregated per store per day
  store_id UUID
  snapshot_date DATE
  total_revenue_cents INTEGER
  transaction_count INTEGER
  avg_transaction_cents INTEGER
  top_products JSONB           -- [{product_id, name, revenue_cents, units_sold}]
  hourly_breakdown JSONB       -- [24 integers for revenue by hour]
  channel_breakdown JSONB      -- {pos: cents, online: cents}
  created_at TIMESTAMPTZ
  PRIMARY KEY (store_id, snapshot_date)

analytics_customer_snapshots -- CLV, purchase frequency per customer
  store_id UUID
  customer_id UUID
  snapshot_month DATE          -- first of month
  orders_this_month INTEGER
  revenue_this_month_cents INTEGER
  lifetime_orders INTEGER
  lifetime_revenue_cents INTEGER
  last_order_at TIMESTAMPTZ
  created_at TIMESTAMPTZ
  PRIMARY KEY (store_id, customer_id, snapshot_month)
```

**Cron job:** `/api/cron/analytics-snapshot` — runs nightly via Vercel cron, populates analytics_daily_snapshots for all stores with analytics add-on. Same pattern as existing Stripe snapshot cron.

**No new RPCs needed** — snapshots are read-only from the admin UI. Server Components query directly.

**Build dependency:** Standalone. No dependency on Inventory or Loyalty. The existing orders table has enough data for meaningful analytics from day one.

---

### Add-On: Multi-Location

**What it is:** One merchant account managing multiple physical store locations, each with separate inventory.

**Architecture note:** This is the most complex add-on. The entire existing architecture assumes one store per merchant account. Multi-location requires a concept of "location" within a store.

**New tables:**

```sql
locations                    -- physical locations within a store
  store_id UUID
  name TEXT NOT NULL          -- "CBD Store", "Airport Kiosk"
  address TEXT
  is_active BOOLEAN DEFAULT true
  created_at TIMESTAMPTZ

product_location_stock       -- replaces products.stock_quantity per-location
  store_id UUID
  product_id UUID
  location_id UUID
  stock_quantity INTEGER NOT NULL DEFAULT 0
  PRIMARY KEY (store_id, product_id, location_id)
```

**Impact on existing RPCs:** complete_pos_sale and complete_online_sale currently decrement products.stock_quantity. With multi-location, they must decrement product_location_stock for the correct location. This is a significant migration.

**Recommended approach:** Gate the UI at the location selector. When a multi-location store opens POS, they pick a location first. That location_id is threaded through the entire sale. The RPCs accept an optional location_id parameter — when provided, decrement product_location_stock; when null, decrement products.stock_quantity (backward compat for single-location stores).

**Build dependency:** Hard dependency on Inventory add-on (stock tracking per location). This is the last add-on to build — it modifies core RPCs and needs the most testing.

---

### Add-On: CRM (Customer Relationship Management)

**What it is:** Enhanced customer profiles, purchase history analysis, customer segmentation, manual outreach logging.

**Architecture note:** Customer accounts and basic order history already exist. CRM extends this with segments, tags, and communication activity logging.

**New tables:**

```sql
customer_tags
  store_id UUID
  name TEXT NOT NULL
  color TEXT                   -- hex for UI label
  PRIMARY KEY (store_id, name)

customer_tag_assignments
  store_id UUID
  customer_id UUID
  tag_name TEXT
  PRIMARY KEY (store_id, customer_id, tag_name)

customer_segments            -- saved filter queries
  store_id UUID
  name TEXT NOT NULL
  filter_criteria JSONB        -- {min_orders: 3, last_purchase_within_days: 90, tags: [...]}
  customer_count INTEGER        -- cached, refreshed on cron
  created_at TIMESTAMPTZ

crm_activities               -- log of manual outreach
  store_id UUID
  customer_id UUID
  staff_id UUID
  type TEXT CHECK (type IN ('note', 'email', 'call', 'sms'))
  notes TEXT
  created_at TIMESTAMPTZ
```

**Build dependency:** Requires customer accounts (already shipped). No dependency on Inventory or Loyalty. Can be built independently.

---

## How the Feature Gating Pattern Scales

### Current State (2 active paid add-ons)

The pattern works cleanly at 2-5 add-ons. The JWT hook SELECT is one query that fetches all columns from store_plans. Adding a column per add-on adds negligible overhead.

### At 10+ Add-Ons

The custom_access_token_hook SQL function grows but remains one query. The JWT payload grows by one boolean per add-on — at 10 add-ons the JWT is still under 1KB. No architectural change needed.

### At 20+ Add-Ons

Consider grouping related features (e.g., `loyalty_and_crm: true` instead of separate booleans) only if store_plans grows unwieldy. At 20 columns it is still manageable. The real scaling concern is developer confusion, not technical overhead — the `has_{addon}` naming convention prevents this.

### Webhook Routing Scaling

The PRICE_TO_FEATURE map in addons.ts is a flat lookup. Each new add-on adds one entry. At 20 add-ons this is still a simple object literal. No scaling concern.

### JWT Refresh Timing

After a merchant subscribes, their JWT claims are stale until the next token refresh (up to 1 hour by default in Supabase). The requireFeature DB-path (requireDbCheck: true) on all mutations prevents unauthorized access during this window. The UI may show a gated state for up to 1 hour after subscription — acceptable for a billing flow. Mitigate by calling `supabase.auth.refreshSession()` on the billing page after detecting the `?subscribed={feature}` query param.

---

## Recommended Build Order

Dependencies drive the order. Build the infrastructure additions first, then independent add-ons, then dependent ones.

```
Phase 1: Loyalty Program
  - No dependencies on other add-ons
  - High merchant value; Square NZ charges $45+/mo for loyalty
  - Extends complete_pos_sale / complete_online_sale (establishes pattern for future hooks)

Phase 2: Gift Cards
  - No dependencies
  - Standalone Stripe product purchase flow
  - Well-defined scope, no complex dependencies

Phase 3: Advanced Analytics
  - No dependencies
  - Reuses existing snapshot cron pattern
  - Adds meaningful dashboard value for merchants with order history

Phase 4: CRM
  - Depends on customer accounts (already shipped)
  - No dependency on above add-ons
  - Natural complement to Loyalty data

Phase 5: Supplier Management
  - Hard dependency on Inventory add-on (v3.0, already shipped)
  - Must be built after Inventory is stable in production

Phase 6: Multi-Location
  - Hard dependency on Inventory add-on
  - Modifies core RPCs (highest risk)
  - Build last, test extensively
```

**Rationale for this order:**
- Loyalty and Gift Cards are highest-value NZ retail add-ons with proven willingness to pay
- Analytics and CRM require no risky RPC changes
- Supplier Management and Multi-Location touch the stock system — saved for when Inventory is battle-tested in production

---

## Data Flow: New Add-On Full Lifecycle

```
1. SCHEMA MIGRATION
   Migration file → store_plans ALTER → new tables + RLS → hook rewrite

2. CONFIG REGISTRATION
   addons.ts → SubscriptionFeature type → PRICE_ID_MAP → PRICE_TO_FEATURE → ADDONS array

3. BILLING SUBSCRIBE
   /admin/billing → createSubscriptionCheckoutSession('loyalty')
   → Stripe Checkout → webhook → store_plans.has_loyalty = true
   → JWT refresh → app_metadata.loyalty = true
   → /admin/billing detects ?subscribed=loyalty → refreshSession() → gate lifts immediately

4. FEATURE ACCESS (reads)
   Server Component → requireFeature('loyalty') [JWT fast-path]
   → authorized: true → render add-on UI

5. FEATURE ACCESS (mutations)
   Server Action → requireFeature('loyalty', { requireDbCheck: true }) [DB path]
   → authorized: true → execute mutation

6. CANCEL SUBSCRIPTION
   Stripe webhook: customer.subscription.deleted
   → store_plans.has_loyalty = false
   → Next JWT refresh → gate re-applies
```

---

## Integration Points

### Extending complete_pos_sale and complete_online_sale

These two RPCs are the most critical integration point. Both Loyalty (earning points) and Gift Cards (redemption) need to hook in at sale completion. The pattern established by stock_adjustments (adding INSERT statements inside the RPC) is the correct approach — keep all side effects inside the SECURITY DEFINER RPC, not in application-layer Server Actions.

```sql
-- Pattern: additions to complete_pos_sale RPC
IF p_loyalty_account_id IS NOT NULL THEN
  PERFORM earn_loyalty_points(p_store_id, v_order_id, p_loyalty_account_id, v_total_cents);
END IF;

IF p_gift_card_code IS NOT NULL THEN
  PERFORM redeem_gift_card(p_store_id, p_gift_card_code, p_gift_card_amount_cents);
END IF;
```

**Risk:** These RPCs are already complex. Each new hook adds a failure mode. Mitigation: each helper function is itself SECURITY DEFINER with its own error handling. The outer RPC continues if a loyalty earn fails — a failed point earn should not roll back a completed sale.

### Super Admin Override Pattern

Every new add-on follows the `has_{addon}_manual_override` column pattern. The billing webhook must respect overrides:

```typescript
// requireFeature DB-path reads both columns:
const isAuthorized = plan.has_{addon} || plan.has_{addon}_manual_override
```

This lets the platform comp add-ons to strategic merchants without Stripe subscriptions. The super admin panel already handles this for xero and inventory — extend the same UI.

### Environment Variables

Each add-on requires a new Stripe Price ID env var. Naming convention: `STRIPE_PRICE_{ADDON_UPPERCASE}`. Must be added to `.env.local`, Vercel project settings, and `src/config/addons.ts` PRICE_ID_MAP.

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Creating a New Gating Mechanism Per Add-On

**What people do:** Build a custom permission check for each add-on feature instead of plugging into requireFeature().

**Why it's wrong:** Splits the audit trail, creates inconsistent upgrade flows, breaks the super admin override system, and makes webhook handling per-feature instead of centralized.

**Do this instead:** Every add-on uses requireFeature(). If requireFeature() needs extension (e.g., checking two features simultaneously for Supplier Management), extend the utility with a new option — do not bypass it.

---

### Anti-Pattern 2: Skipping the DB-Path Check on Mutations

**What people do:** Use the JWT fast-path (no requireDbCheck) on Server Action mutations to save one DB round-trip.

**Why it's wrong:** The JWT is up to 1 hour stale. A cancelled subscription's JWT still says `loyalty: true` for up to an hour. This allows unauthorized writes during that window.

**Do this instead:** JWT fast-path for reads (Server Component rendering). DB-path for every mutation. The extra round-trip is ~5ms and worth it.

---

### Anti-Pattern 3: Application-Layer Loops Instead of SECURITY DEFINER RPCs

**What people do:** Call adjust_stock in a JavaScript loop over cart line items in a Server Action.

**Why it's wrong:** Each iteration is a separate DB round-trip. If one fails, previous ones are already committed — partial state is worse than no state.

**Do this instead:** Pass the entire payload to a SECURITY DEFINER RPC that loops in PL/pgSQL. One round-trip, one transaction, atomic.

---

### Anti-Pattern 4: Separate Stripe Products Instead of One Price ID Per Feature

**What people do:** Create multiple Stripe Products for different tiers of an add-on.

**Why it's wrong:** PRICE_TO_FEATURE is a flat lookup — it maps one Price ID to one store_plans column. Multiple Price IDs per feature require custom routing logic.

**Do this instead:** One Stripe Product + one Price ID per add-on feature. If pricing needs to change, create a new Price ID and update the env var — old subscribers keep their original price.

---

### Anti-Pattern 5: Storing Feature State Outside store_plans

**What people do:** Create a separate `loyalty_plans` table to track loyalty subscription state.

**Why it's wrong:** The JWT hook only reads from store_plans. A second table creates two sources of truth and breaks the JWT fast-path.

**Do this instead:** All subscription feature flags live in store_plans as boolean columns. Add-on-specific *configuration* (earn rates, expiry policies, etc.) lives in the add-on's own settings table (e.g., loyalty_settings). These are different concerns.

---

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0-100 stores | Current architecture is correct. No changes needed. |
| 100-1,000 stores | Add composite index on store_plans(store_id) — already exists. Monitor cron job duration for analytics snapshots. |
| 1,000-10,000 stores | Analytics cron may need pagination (process stores in batches of 100). JWT hook stays fast (single SELECT on indexed column). |
| 10,000+ stores | store_plans table is still fast (indexed on store_id UNIQUE). Real bottleneck will be cron analytics jobs — move to queue-based processing (Supabase pg_cron + pg_partman, or Inngest). |

**First bottleneck:** Nightly analytics cron jobs processing all stores synchronously. Fix: paginate by processing stores in batches within the cron budget.

**Second bottleneck:** Stripe webhook processing time if subscription events spike (mass signups during a promotion). Fix: idempotency is already built in — safe to add webhook queueing later if needed.

---

## Sources

- Existing codebase (direct analysis, HIGH confidence):
  - `src/config/addons.ts`
  - `src/lib/requireFeature.ts`
  - `src/app/api/webhooks/stripe/billing/route.ts`
  - `src/actions/billing/createSubscriptionCheckoutSession.ts`
  - `supabase/migrations/019_billing_claims.sql`
  - `supabase/migrations/024_service_product_type.sql`
  - `supabase/migrations/025_inventory_core.sql`
- Competitor feature analysis: Square NZ loyalty ($45+/mo), marketing ($15+/mo) — MEDIUM confidence (WebSearch 2026-04-06)
- Lightspeed Retail NZ add-on landscape — MEDIUM confidence (WebSearch 2026-04-06)
- Multi-tenant feature gating patterns: [WorkOS Developer Guide](https://workos.com/blog/developers-guide-saas-multi-tenant-architecture) — MEDIUM confidence

---

*Architecture research for: NZPOS v8.0 Add-On Catalog Expansion*
*Researched: 2026-04-06*
