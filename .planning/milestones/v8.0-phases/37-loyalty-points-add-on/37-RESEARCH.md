# Phase 37: Loyalty Points Add-On - Research

**Researched:** 2026-04-07
**Domain:** Loyalty points system — DB schema, POS cart extension, online checkout, add-on billing pipeline, NZ privacy law compliance
**Confidence:** HIGH (all findings from direct codebase inspection of prior phases + project patterns)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**POS Customer Lookup**
- D-01: Customer lookup appears before payment, after cart is built. A small "Add Customer" button near the cart summary. Non-blocking — staff can skip and proceed to payment without identifying a customer.
- D-02: Type-ahead search by name or email. Results appear as staff types. Follows existing admin customer search pattern.
- D-03: If customer not found: show "No match found" with a "Create new customer" button. Staff chooses whether to add the customer inline or skip.
- D-04: Quick-add form captures name + email. Includes privacy consent checkbox (see D-14).
- D-05: After lookup, display customer name, points balance, and available dollar discount (e.g. "Jane: 450 pts ($4.50 available)"). Staff can offer to redeem before selecting payment method.

**Points Earn & Redeem Mechanics**
- D-06: No default earn rate. Merchant must configure earn rate (points per dollar) and redeem rate (points to dollar) in loyalty settings before points start accumulating.
- D-07: Earn and redeem rates are independent merchant-configurable settings. Example: earn 1 pt/$1, redeem 100 pts = $1 discount.
- D-08: No minimum redemption threshold. Any points balance can be redeemed.
- D-09: Points earned on net amount paid — excludes promo discounts, gift card portions, and loyalty point redemptions. Prevents points-on-points loops.
- D-10: Setup gate: after subscribing, merchant must save both earn rate and redeem rate before the loyalty system activates. Points do not accumulate until configuration is complete.

**Privacy Enrollment Flow**
- D-11: Online account holders auto-enroll when merchant activates loyalty. A one-time dismissible banner appears on the account page: "You're earning loyalty points! We track your purchase history to calculate rewards. [Learn more] [OK]". Shows on first visit after loyalty activates.
- D-12: POS customers are added via the quick-add flow during customer lookup. Not auto-enrolled — must be explicitly identified by staff.
- D-13: Privacy notice for POS quick-add: form includes a checkbox "Customer has been informed about loyalty data collection" that must be checked to save. Staff explains verbally per IPP 3A requirements.
- D-14: Privacy Act 2020 + Privacy Amendment Act 2025 (IPP 3A) compliance: customers must be informed before personal data is collected for loyalty purposes. The banner (online) and consent checkbox (POS) satisfy this requirement.

**Admin Loyalty Settings & Management**
- D-15: Single settings card on the Loyalty admin page with earn rate, redeem rate, and a toggle to pause earning/redemption. Follows compact Store Settings pattern.
- D-16: Points column added to existing admin customer table. Click through to customer detail page which shows loyalty transaction history. Reuses existing CustomerDataTable pattern.
- D-17: Loyalty admin page appears under "Add-ons" section in admin sidebar, alongside Gift Cards and Advanced Reporting. Only visible when subscribed.

**Prior Decisions (carried forward)**
- D-18: requireFeature() JWT/DB dual-path is the gating mechanism for all add-ons.
- D-19: Add-on billing uses `src/config/addons.ts` + Stripe Price ID env var + webhook handler pattern.
- D-20: Add-on admin pages appear under "Add-ons" section in admin sidebar.

### Claude's Discretion
- DB schema design (loyalty_points table, loyalty_transactions table, indexes, RLS policies)
- Points rounding strategy (floor/round on fractional points)
- POS customer lookup sheet/modal UI design and interaction
- Points redemption UX at POS (how staff applies points as discount in the payment flow)
- Online checkout points redemption UI (where the "Use points" control appears)
- Customer account page points balance display and transaction history layout
- Error handling (insufficient points, loyalty paused, rates not configured)
- Points earning timing (on sale completion vs. after refund window)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| LOYAL-01 | Merchant can enable the Loyalty Points add-on ($15/mo) via Stripe subscription | addons.ts pattern from Phase 35/36; billing webhook maps STRIPE_PRICE_LOYALTY to has_loyalty_points |
| LOYAL-02 | Merchant can configure points-per-dollar earn rate in loyalty settings | Loyalty settings table in DB; admin settings page follows Gift Cards denomination pattern |
| LOYAL-03 | Merchant can configure points-to-dollar redemption rate in loyalty settings | Same settings card as LOYAL-02; D-15 |
| LOYAL-04 | Staff can look up a customer by name or email during POS checkout (optional step) | getCustomers() action already has name/email; GiftCardCodeEntryScreen pattern for sheet UX |
| LOYAL-05 | Customer earns loyalty points automatically on completed POS sales when identified | completeSale.ts — hook after complete_pos_sale RPC, following gift card earn pattern |
| LOYAL-06 | Customer earns loyalty points automatically on completed online orders when logged in | route.ts webhook handleCheckoutComplete — after complete_online_sale, use customer_email to look up customer |
| LOYAL-07 | Customer can view their points balance on their account profile page | ProfilePage at src/app/(store)/account/profile/page.tsx — add loyalty balance query |
| LOYAL-08 | Customer can redeem points as a discount during online checkout | createCheckoutSession.ts — follows gift card negative line item pattern |
| LOYAL-09 | Staff can apply a customer's points as a discount during POS checkout | cart.ts reducer — APPLY_LOYALTY_DISCOUNT action; completeSale.ts — pass loyalty data |
| LOYAL-10 | Merchant can view customer loyalty balances and transaction history in admin | getCustomers.ts + getCustomerDetail.ts extension; admin customer table gets points column |
| LOYAL-11 | Privacy notice is displayed to customers before loyalty enrollment | D-11/D-12/D-13/D-14 — banner on account page, consent checkbox in POS quick-add form |
</phase_requirements>

---

## Summary

Phase 37 adds a loyalty points add-on ($15/mo) to the existing add-on pipeline established in Phases 35 and 36. The implementation follows an exact template: extend `addons.ts`, add a DB migration, hook earning into both POS and online sale completion paths, add redemption to both checkout flows, and gate everything behind `requireFeature('loyalty_points')`.

The key complexity lies in **three new integration surfaces not present in prior add-ons**: (1) extending the POS cart state machine to carry an attached customer + loyalty discount, (2) a new "customer lookup" UX within the POS flow (a sheet/modal that is optionally invoked before payment), and (3) the online checkout points redemption path, which closely mirrors the gift card negative line item pattern.

The NZ Privacy Act 2020 + Privacy Amendment Act 2025 (IPP 3A) compliance is satisfied by two UI elements already decided: a dismissible banner on the customer account page (online), and a consent checkbox in the POS quick-add form. No external privacy service is needed — these are pure UI + DB flag requirements.

**Primary recommendation:** Structure plans as: Wave 0 (RED test stubs for loyalty utils + cart state machine extension), Wave 1 (DB schema + billing pipeline), Wave 2 (POS customer lookup + points earning/redemption), Wave 3 (online checkout redemption + customer account balance), Wave 4 (admin customer loyalty management). This mirrors the Phase 35 five-wave structure.

---

## Standard Stack

All libraries are already installed. No new dependencies required.

### Core (already installed)
| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| @supabase/supabase-js | ^2.x | DB queries, RLS, RPC calls | Established data layer; atomic RPCs follow gift_cards pattern |
| zod | ^3.x | Input validation on all Server Actions | Required by CLAUDE.md for every Server Action |
| server-only | latest | Prevent server code leaking to client | All Server Actions already import this |
| jose | ^5.x | Staff JWT verification in resolveAuth | Already in place; loyalty actions use resolveStaffAuth() |

### Supporting (already installed)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| date-fns | ^3.x | Date formatting for transaction history | Customer loyalty transaction timestamps |
| lucide-react | latest | Icons | Loyalty icon in AddOnCard (use Star or Award) |

**No new npm packages required.** Phase 35 and 36 added no new dependencies. This phase follows the same pattern.

---

## Architecture Patterns

### Recommended File Structure

```
supabase/migrations/
└── 035_loyalty.sql              # DB schema: loyalty_settings, loyalty_points, loyalty_transactions, RPCs, RLS

src/config/
└── addons.ts                    # Add 'loyalty_points' to all 4 structures

src/lib/
└── loyalty-utils.ts             # Pure functions: calculatePointsEarned, calculateRedemptionDiscount, etc.

src/actions/loyalty/
├── getLoyaltySettings.ts        # Read earn/redeem rates for the store
├── saveLoyaltySettings.ts       # Owner saves earn rate + redeem rate
├── lookupCustomerForPOS.ts      # Type-ahead search: name or email, returns id + points balance
├── quickAddCustomer.ts          # Create new POS customer with consent flag
├── applyLoyaltyRedemption.ts    # Server-side validate redemption before checkout
└── getCustomerLoyalty.ts        # Customer's own balance + transaction history

src/components/pos/
├── CustomerLookupSheet.tsx      # Sheet overlay: search → result display → attach or skip
└── LoyaltyRedemptionRow.tsx     # Shows "Jane: 450 pts → Apply $4.50 discount" in cart

src/app/admin/loyalty/
├── layout.tsx                   # requireFeature('loyalty_points') gate
└── page.tsx                     # Settings card (earn rate, redeem rate, pause toggle)
                                  # Customer list with points column (reuse CustomerDataTable)

src/app/(store)/account/
└── profile/page.tsx             # Add loyalty balance + recent transactions section
                                  # Add dismissible loyalty banner (D-11)
```

### Pattern 1: Add-On Billing Pipeline Extension (from Phase 35/36)

**What:** Add `loyalty_points` to all structures in `addons.ts`; billing webhook auto-activates via `PRICE_TO_FEATURE` map.

**Example — addons.ts additions:**
```typescript
// Source: src/config/addons.ts (inspected directly)
export type SubscriptionFeature = 'xero' | 'custom_domain' | 'inventory' | 'gift_cards' | 'advanced_reporting' | 'loyalty_points'

interface FeatureFlags {
  // ... existing
  has_loyalty_points: boolean
}

export const PRICE_ID_MAP: Record<SubscriptionFeature, string> = {
  // ... existing
  loyalty_points: process.env.STRIPE_PRICE_LOYALTY ?? '',
}

export const PRICE_TO_FEATURE: Record<string, keyof FeatureFlags> = {
  // ... existing
  ...(process.env.STRIPE_PRICE_LOYALTY
    ? { [process.env.STRIPE_PRICE_LOYALTY]: 'has_loyalty_points' as const }
    : {}),
}

export const FEATURE_TO_COLUMN: Record<SubscriptionFeature, keyof FeatureFlags> = {
  // ... existing
  loyalty_points: 'has_loyalty_points',
}
```

**Admin layout pattern (from admin/layout.tsx):**
```typescript
// Source: src/app/admin/layout.tsx (inspected directly)
const { data: storePlan } = await (adminClient as any)
  .from('store_plans')
  .select('has_gift_cards, has_advanced_reporting, has_loyalty_points')  // add has_loyalty_points
  .eq('store_id', storeId)
  .maybeSingle()
hasLoyaltyPoints = storePlan?.has_loyalty_points === true
```

### Pattern 2: DB Migration (from 033_gift_cards.sql)

**What:** Single migration file with: store_plans column, settings columns on stores table (or separate settings table), loyalty_points table (customer balance ledger), loyalty_transactions table (append-only log), and atomic RPCs (earn_points, redeem_points).

**Recommended DB design (Claude's Discretion):**

```sql
-- Option A: settings columns directly on stores (simpler, follows gift_card_denominations pattern)
ALTER TABLE public.stores
  ADD COLUMN loyalty_earn_rate_cents INTEGER NULL,    -- cents per point (e.g. 100 = earn 1pt per $1)
  ADD COLUMN loyalty_redeem_rate_cents INTEGER NULL,  -- cents per point (e.g. 100 = 100pts = $1)
  ADD COLUMN loyalty_is_active BOOLEAN NOT NULL DEFAULT false;
  -- NULL rates = not configured (D-10 gate: both must be non-null to activate)
```

```sql
-- Option B: separate loyalty_settings table (more flexible, cleaner separation)
CREATE TABLE public.loyalty_settings (
  store_id UUID PRIMARY KEY REFERENCES public.stores(id),
  earn_rate_cents INTEGER NULL,     -- cents per dollar earned. NULL = not configured
  redeem_rate_cents INTEGER NULL,   -- cents per point value. NULL = not configured
  is_active BOOLEAN NOT NULL DEFAULT true,  -- merchant pause toggle (D-15)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Recommendation:** Use Option B (separate `loyalty_settings` table). Reason: settings will have more fields over time (e.g. pause toggle, future config), and it avoids widening the `stores` table further. This also enables a clean `upsert` pattern for saveLoyaltySettings.

```sql
-- Customer points ledger (current balance — denormalized for performance)
CREATE TABLE public.loyalty_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id),
  customer_id UUID NOT NULL REFERENCES public.customers(id),
  points_balance INTEGER NOT NULL DEFAULT 0 CHECK (points_balance >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (store_id, customer_id)
);

-- Transaction log (append-only)
CREATE TABLE public.loyalty_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id),
  customer_id UUID NOT NULL REFERENCES public.customers(id),
  points_delta INTEGER NOT NULL,              -- positive = earn, negative = redeem
  balance_after INTEGER NOT NULL CHECK (balance_after >= 0),
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('earn', 'redeem', 'adjustment')),
  order_id UUID REFERENCES public.orders(id),
  channel TEXT CHECK (channel IN ('pos', 'online')),
  staff_id UUID REFERENCES public.staff(id),  -- nullable (online has no staff)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Atomic RPCs (SECURITY DEFINER, service_role only — follows redeem_gift_card pattern):**

```sql
-- earn_loyalty_points: called after sale completion
-- earn_loyalty_points(p_store_id, p_customer_id, p_order_id, p_net_amount_cents, p_channel, p_staff_id)
-- 1. Look up loyalty_settings — if not configured or not active, return 0 (silent no-op)
-- 2. Calculate points: FLOOR(p_net_amount_cents / earn_rate_cents)
-- 3. UPSERT loyalty_points with balance += points_earned
-- 4. INSERT loyalty_transactions with points_delta = points_earned
-- 5. Return jsonb with points_earned, balance_after

-- redeem_loyalty_points: called before/during checkout
-- redeem_loyalty_points(p_store_id, p_customer_id, p_points_to_redeem, p_order_id, p_channel, p_staff_id)
-- 1. SELECT FOR UPDATE on loyalty_points (concurrent redemption protection)
-- 2. Validate: balance >= points_to_redeem, loyalty active and configured
-- 3. Deduct balance
-- 4. INSERT loyalty_transactions with points_delta = -points_to_redeem
-- 5. Return jsonb with discount_cents, balance_after
```

### Pattern 3: Points Earning Hook (from completeSale.ts + route.ts)

**POS path — completeSale.ts (after step 6a gift card redemption):**
```typescript
// Source: src/actions/orders/completeSale.ts (inspected directly)
// After gift card redemption block:
if (parsed.data.customer_id && parsed.data.loyalty_points_to_redeem === undefined) {
  // Earn points on net amount = total_cents - gift_card_amount - loyalty_discount
  const netAmountCents = parsed.data.total_cents
    - (parsed.data.gift_card_amount_cents ?? 0)
    - (parsed.data.loyalty_discount_cents ?? 0)

  if (netAmountCents > 0) {
    await supabase.rpc('earn_loyalty_points', {
      p_store_id: staff.store_id,
      p_customer_id: parsed.data.customer_id,
      p_order_id: orderId,
      p_net_amount_cents: netAmountCents,
      p_channel: 'pos',
      p_staff_id: staff.staff_id,
    })
    // Silent no-op if loyalty not configured (RPC handles gracefully)
  }
}
```

**Online path — stripe webhook route.ts (after complete_online_sale):**
```typescript
// Source: src/app/api/webhooks/stripe/route.ts (inspected directly)
// After complete_online_sale RPC succeeds:
// Look up customer by email (session.customer_details?.email or from order.customer_email)
// Then: supabase.rpc('earn_loyalty_points', { ... p_channel: 'online', p_staff_id: null })
```

**Key insight on timing (Claude's Discretion):** Points are earned immediately after sale completion (not after refund window). This matches the gift card redemption pattern. Refunds are handled separately — refund processing can deduct points in a future phase if needed. For v1, earn on completion, no automatic refund reversal.

### Pattern 4: POS Cart State Machine Extension (from cart.ts)

**What:** Add customer attachment and loyalty discount to CartState + CartAction.

```typescript
// Source: src/lib/cart.ts (inspected directly)
// New fields to add to CartState:
export type CartState = {
  // ... existing fields ...
  // Loyalty / customer attachment (all null when no customer attached)
  attachedCustomerId: string | null          // customers.id (UUID)
  attachedCustomerName: string | null        // display name
  attachedCustomerPoints: number | null      // current balance
  loyaltyDiscountCents: number | null        // applied redemption amount
  loyaltyPointsRedeemed: number | null       // points to deduct on completion
}

// New actions:
export type CartAction =
  // ... existing actions ...
  | { type: 'ATTACH_CUSTOMER'; customerId: string; name: string; pointsBalance: number }
  | { type: 'DETACH_CUSTOMER' }
  | { type: 'APPLY_LOYALTY_DISCOUNT'; discountCents: number; pointsRedeemed: number }
  | { type: 'REMOVE_LOYALTY_DISCOUNT' }
```

**Points-on-points prevention (D-09):** When calculating net amount for point earning in completeSale.ts, subtract `loyalty_discount_cents` from total before computing points. This is a server-side calculation — never trust client-side net amount.

**Cart total with loyalty discount:** Loyalty discount reduces the cart total sent to payment (like a discount_cents). The total passed to `complete_pos_sale` must reflect the reduced amount. The existing cart total calculation via `calcCartTotals` gives the gross total; loyalty discount is then applied as a pre-payment reduction.

### Pattern 5: Online Checkout Redemption (from createCheckoutSession.ts gift card pattern)

**What:** Points redemption in online checkout follows the gift card negative line item pattern.

```typescript
// Source: src/actions/orders/createCheckoutSession.ts (inspected directly)
// After gift card validation, add loyalty validation:
if (loyaltyPointsToRedeem && customerId) {
  // Server-side: look up customer points balance, validate sufficient balance
  // Server-computed redemption amount: NEVER trust client loyaltyDiscountCents
  const { data: loyaltyRow } = await supabase
    .from('loyalty_points')
    .select('points_balance')
    .eq('store_id', storeId)
    .eq('customer_id', customerId)
    .maybeSingle()

  const settings = await getLoyaltySettingsForStore(storeId)
  if (loyaltyRow && settings && loyaltyRow.points_balance >= loyaltyPointsToRedeem) {
    const discountCents = Math.floor(loyaltyPointsToRedeem * settings.redeem_rate_cents)
    verifiedLoyaltyDiscountCents = Math.min(discountCents, totalCents)
    // Pass in Stripe session metadata:
    // loyalty_customer_id, loyalty_points_redeemed, loyalty_discount_cents
    // Redemption RPC called in webhook AFTER payment confirms (same as gift card pattern)
  }
}

// Add negative line item to Stripe session:
...(verifiedLoyaltyDiscountCents > 0
  ? [{ price_data: { currency: 'nzd', product_data: { name: 'Loyalty Points Applied' }, unit_amount: -verifiedLoyaltyDiscountCents }, quantity: 1 }]
  : [])
```

**Redemption in webhook:** Call `redeem_loyalty_points` RPC after `complete_online_sale` succeeds, passing `loyalty_customer_id` and `loyalty_points_redeemed` from `session.metadata`. Failure is a warn + continue (matches gift card deduction pattern — order already completed).

**Earning after redemption in online path:** After calling `redeem_loyalty_points`, compute net amount = total_cents - loyalty_discount_cents - gift_card_amount_cents, then call `earn_loyalty_points`. This ensures points-on-points prevention (D-09).

### Pattern 6: Privacy Banner (D-11) — One-Time Dismissible

**Online account page:** The account layout is currently a passthrough (`return <>{children}</>`). Add a `LoyaltyEnrollmentBanner` server component to the profile page that:
1. Checks if `has_loyalty_points` is active for the store (via store_plans)
2. Checks if customer has a `loyalty_enrolled_at` timestamp (new column on `customers` table or in `loyalty_points` table)
3. If enrolled but banner not dismissed: shows dismissible banner with a Server Action to record dismissal

**Simplest dismissal tracking:** Add `loyalty_banner_dismissed_at TIMESTAMPTZ NULL` to `loyalty_points` table (or to `customers` table). Set on dismissal via a Server Action. Show banner when `loyalty_points` row exists AND `loyalty_banner_dismissed_at IS NULL`.

### Pattern 7: POS Customer Lookup Sheet

**Reference:** `GiftCardCodeEntryScreen.tsx` provides the exact fullscreen sheet pattern. Customer lookup is simpler (no numeric input) — it's a text input with real-time search results.

**UX flow:**
1. Staff taps "Add Customer" button in cart summary area
2. Sheet slides in over POS (fullscreen, z-50, same as GiftCardCodeEntryScreen)
3. Text input: `inputMode="text"`, debounced search via `lookupCustomerForPOS` Server Action
4. Results render as tappable rows: name + email + points balance
5. No match found → "Create Customer" button → quick-add form with consent checkbox (D-13)
6. Customer selected → dispatch `ATTACH_CUSTOMER` to cart reducer → sheet closes
7. Cart summary shows customer name + points display (D-05)
8. Staff taps "Use Points" → dispatches `APPLY_LOYALTY_DISCOUNT` (if balance > 0)

**Key decision:** The points redemption step happens in the cart area (not the payment area), similar to how DiscountSheet applies before payment selection. This keeps the payment flow clean.

### Anti-Patterns to Avoid

- **Earning points before sale completes:** Points must be earned after `complete_pos_sale` / `complete_online_sale` RPC succeeds. Never earn on cart creation or payment initiation.
- **Trusting client-side points balance:** Always re-validate balance server-side before redemption (SELECT FOR UPDATE in RPC). The client display is informational only.
- **Points on the gross amount:** Per D-09, points are earned on `total_cents - gift_card_amount_cents - loyalty_discount_cents`. Compute this server-side in completeSale.ts.
- **Blocking POS flow:** Customer lookup is strictly optional (D-01). The cart must proceed to payment without a customer attached. Never gate `INITIATE_PAYMENT` on customer lookup.
- **Creating a customer without consent:** The `quickAddCustomer` Server Action must validate that the `consent_given` boolean is `true`. Reject and return error if not.
- **Auto-enrolling POS-only customers (D-12):** Online accounts auto-enroll. POS customers require explicit opt-in via staff quick-add flow. Never silently attach a POS customer to loyalty without the consent checkbox.
- **Loyalty page visible before subscription:** `requireFeature('loyalty_points')` must gate both the admin layout and all Server Actions. The sidebar link must be conditional on `hasLoyaltyPoints`.
- **Points accumulating before rates configured (D-10):** The `earn_loyalty_points` RPC must check that `loyalty_settings.earn_rate_cents IS NOT NULL AND loyalty_settings.redeem_rate_cents IS NOT NULL AND loyalty_settings.is_active = true` before doing anything. Return 0 silently if not configured.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Concurrent redemption protection | Custom application-level lock | `SELECT FOR UPDATE` in `redeem_loyalty_points` RPC | PostgreSQL row-level locks are atomic; application locks have race conditions under Vercel serverless |
| Points balance tracking | In-memory calculation from transaction log on every read | `loyalty_points` table with denormalized `points_balance` | Aggregate queries over transactions are slow and error-prone; denormalized balance is updated atomically in RPC |
| Customer search debounce | Manual setTimeout in component | React `useState` with `useTransition` or simple debounce hook | Server Actions are async; debounce prevents excessive calls; `useTransition` keeps UI responsive |
| Feature gating | Custom subscription check | `requireFeature('loyalty_points')` from `src/lib/requireFeature.ts` | Established dual-path JWT/DB pattern; all other add-ons use it |
| Billing webhook | Custom price ID parsing | `PRICE_TO_FEATURE` map in `addons.ts` | Single source of truth; billing webhook already reads this map |

**Key insight:** The atomic RPC pattern (SECURITY DEFINER, FOR UPDATE, single transaction) is what makes the gift card add-on correct under concurrent load. Loyalty points must use the same pattern — a `redeem_loyalty_points` RPC that locks the row, validates, and updates atomically.

---

## Common Pitfalls

### Pitfall 1: Points Earned on Gross Amount (Including Redemptions)
**What goes wrong:** Staff redeems 100 pts for $1 discount, then system awards points on the full $10 gross sale instead of the $9 net — creating an infinite loop where customers earn points on the discounts paid for with points.
**Why it happens:** `total_cents` in completeSale includes all discounts but may not exclude loyalty redemptions without explicit calculation.
**How to avoid:** In `completeSale.ts`, compute `netAmountForPoints = total_cents - gift_card_amount_cents - loyalty_discount_cents`. Use this value as `p_net_amount_cents` in the earn RPC. Enforce this in tests.
**Warning signs:** Points balance growing faster than expected; test: earn rate 1pt/$1, customer pays $10 with $1 loyalty discount — should earn 9 points, not 10.

### Pitfall 2: Online Loyalty Redemption Deducted Before Payment Confirmed
**What goes wrong:** `redeem_loyalty_points` called in `createCheckoutSession` before Stripe confirms payment. Customer abandons checkout — points deducted but no sale completed.
**Why it happens:** Copying the gift card pattern incorrectly — gift card balance deduction is also deferred to the webhook (this is explicitly called out as Pitfall 1 in Phase 35 research).
**How to avoid:** Store `loyalty_customer_id`, `loyalty_points_redeemed`, `loyalty_discount_cents` in Stripe session metadata. Call `redeem_loyalty_points` RPC in the Stripe webhook `handleCheckoutComplete`, AFTER `complete_online_sale` succeeds.
**Warning signs:** Points disappearing from customer balance without a completed order.

### Pitfall 3: POS Customer Lookup Blocks Fast Checkout
**What goes wrong:** The "Add Customer" interaction adds friction to every POS transaction, even when customers don't want loyalty.
**Why it happens:** Placing the lookup button in a prominent position, or requiring it before payment proceeds.
**How to avoid:** Per D-01, the "Add Customer" button must be a secondary, optional element near the cart summary. The primary flow (payment method selection → payment) must be untouched. If no customer is attached, `completeSale` omits the loyalty earning step silently.
**Warning signs:** Staff feedback that checkout feels slower; QA should verify that a sale without a customer attached completes in the same number of taps as before.

### Pitfall 4: Loyalty Settings Race Condition at Activation
**What goes wrong:** Merchant subscribes and immediately starts a sale. Points system activates (has_loyalty_points = true) but earn/redeem rates are still NULL (D-10 gate not yet enforced). Points accumulate at rate 0 or cause division-by-zero errors.
**Why it happens:** `earn_loyalty_points` RPC not checking for NULL rates before computing.
**How to avoid:** The RPC must check: `IF settings.earn_rate_cents IS NULL OR settings.redeem_rate_cents IS NULL OR settings.is_active = false THEN RETURN jsonb_build_object('points_earned', 0, 'reason', 'not_configured'); END IF;`. Also, the admin loyalty page should show a prominent "Configure rates to activate" state before allowing points to flow.
**Warning signs:** Loyalty activated but no points appearing — verify RPC return value.

### Pitfall 5: POS Customer Quick-Add Creates Duplicate Customers
**What goes wrong:** Staff searches "Jane" during one transaction, doesn't find the right Jane, creates a new Jane — now two Jane Smiths in the system.
**Why it happens:** Type-ahead search too fuzzy, or staff proceeds to create without checking all results.
**How to avoid:** Search by exact email if provided. Quick-add form validates email uniqueness server-side (check `customers` table for existing email before INSERT). If email already exists, surface the existing customer record instead.
**Warning signs:** Duplicate customer emails in `customers` table; add UNIQUE constraint on `(store_id, email)` if not already present.

### Pitfall 6: AdminSidebar Not Showing Loyalty Link
**What goes wrong:** Merchant subscribes to loyalty, but the sidebar "Loyalty" link never appears.
**Why it happens:** `admin/layout.tsx` queries `has_gift_cards, has_advanced_reporting` but doesn't include `has_loyalty_points`. The `AdminSidebar` component doesn't receive `hasLoyaltyPoints` prop.
**How to avoid:** Add `has_loyalty_points` to the store_plans SELECT query in `layout.tsx`. Add `hasLoyaltyPoints?: boolean` to `AdminSidebarProps`. Render the "Loyalty" link conditionally in the Add-ons section — alongside Gift Cards and Advanced Reporting.
**Warning signs:** Admin billing page shows "subscribed" for loyalty but no sidebar link appears.

---

## Code Examples

### loyalty-utils.ts — Pure Functions for Testing

```typescript
// Source: Design decision based on cogs.ts and gst.ts patterns (inspected directly)
// All amounts in integer cents — no floats

/**
 * Calculate points earned on a net sale amount.
 * Uses floor() to prevent fractional points.
 * @param netAmountCents - Amount after gift card and loyalty discount deductions
 * @param earnRateCents - Cents per point earned (e.g. 100 = earn 1pt per $1)
 * @returns Points earned (integer, floor'd)
 */
export function calculatePointsEarned(netAmountCents: number, earnRateCents: number): number {
  if (netAmountCents <= 0 || earnRateCents <= 0) return 0
  return Math.floor(netAmountCents / earnRateCents)
}

/**
 * Calculate discount cents from points redeemed.
 * @param pointsToRedeem - Number of points to redeem
 * @param redeemRateCents - Cents value per point (e.g. 1 = 1 point = $0.01)
 * @returns Discount in cents
 */
export function calculateRedemptionDiscount(pointsToRedeem: number, redeemRateCents: number): number {
  if (pointsToRedeem <= 0 || redeemRateCents <= 0) return 0
  return pointsToRedeem * redeemRateCents
}

/**
 * Format points balance for display: "450 pts ($4.50 available)" per D-05.
 */
export function formatLoyaltyDisplay(pointsBalance: number, redeemRateCents: number): string {
  const dollarValue = calculateRedemptionDiscount(pointsBalance, redeemRateCents)
  return `${pointsBalance} pts (${formatNZD(dollarValue)} available)`
}
```

### earn_loyalty_points RPC (SQL pattern)

```sql
-- Source: Design based on redeem_gift_card RPC pattern in 033_gift_cards.sql
CREATE OR REPLACE FUNCTION public.earn_loyalty_points(
  p_store_id UUID,
  p_customer_id UUID,
  p_order_id UUID DEFAULT NULL,
  p_net_amount_cents INTEGER DEFAULT 0,
  p_channel TEXT DEFAULT 'pos',
  p_staff_id UUID DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_settings RECORD;
  v_points_earned INTEGER;
  v_new_balance INTEGER;
BEGIN
  -- Look up loyalty settings for this store
  SELECT * INTO v_settings FROM public.loyalty_settings
  WHERE store_id = p_store_id;

  -- Silent no-op if not configured or inactive (D-10)
  IF v_settings IS NULL
    OR v_settings.earn_rate_cents IS NULL
    OR v_settings.redeem_rate_cents IS NULL
    OR v_settings.is_active = false
  THEN
    RETURN jsonb_build_object('points_earned', 0, 'reason', 'not_configured');
  END IF;

  -- Calculate points (floor to integer)
  v_points_earned := FLOOR(p_net_amount_cents::NUMERIC / v_settings.earn_rate_cents);

  IF v_points_earned <= 0 THEN
    RETURN jsonb_build_object('points_earned', 0, 'reason', 'amount_too_small');
  END IF;

  -- UPSERT loyalty_points balance
  INSERT INTO public.loyalty_points (store_id, customer_id, points_balance)
  VALUES (p_store_id, p_customer_id, v_points_earned)
  ON CONFLICT (store_id, customer_id)
  DO UPDATE SET
    points_balance = public.loyalty_points.points_balance + v_points_earned,
    updated_at = now()
  RETURNING points_balance INTO v_new_balance;

  -- Append transaction record
  INSERT INTO public.loyalty_transactions (
    store_id, customer_id, points_delta, balance_after,
    transaction_type, order_id, channel, staff_id
  ) VALUES (
    p_store_id, p_customer_id, v_points_earned, v_new_balance,
    'earn', p_order_id, p_channel, p_staff_id
  );

  RETURN jsonb_build_object(
    'points_earned', v_points_earned,
    'balance_after', v_new_balance
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.earn_loyalty_points FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.earn_loyalty_points TO service_role;
```

### createSubscriptionCheckoutSession.ts — feature schema extension

```typescript
// Source: src/actions/billing/createSubscriptionCheckoutSession.ts (inspected directly)
// Current: z.enum(['xero', 'custom_domain', 'inventory', 'gift_cards', 'advanced_reporting'])
// Must become:
const featureSchema = z.enum(['xero', 'custom_domain', 'inventory', 'gift_cards', 'advanced_reporting', 'loyalty_points'])
```

### Wave 0 RED Stub Pattern (from pos-cart-gift-card.test.ts)

```typescript
// Source: src/lib/__tests__/pos-cart-gift-card.test.ts (inspected directly)
// Wave 0 stubs should be RED (expect(true).toBe(false)) until implementation
// OR use schema-level tests that will be RED until the field is added

describe('cart state machine — loyalty customer attachment', () => {
  it('attaches customer with ATTACH_CUSTOMER action', () => {
    expect(true).toBe(false) // RED: CartState does not have attachedCustomerId yet
  })
  it('clears customer on DETACH_CUSTOMER', () => {
    expect(true).toBe(false)
  })
  it('applies loyalty discount with APPLY_LOYALTY_DISCOUNT', () => {
    expect(true).toBe(false)
  })
})

describe('loyalty-utils', () => {
  it('calculatePointsEarned returns floor of netAmount / earnRate', () => {
    expect(true).toBe(false) // RED: loyalty-utils.ts does not exist yet
  })
  it('calculateRedemptionDiscount returns points * redeemRate', () => {
    expect(true).toBe(false)
  })
  it('returns 0 points when earnRate is 0', () => {
    expect(true).toBe(false)
  })
})
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Points stored only in transaction log (aggregate on read) | Denormalized `points_balance` in `loyalty_points` table + append-only `loyalty_transactions` log | Phase 37 design | Balance reads are O(1); transaction history for audit |
| Separate auth flow for POS customer creation | Reuse existing `customers` table; POS customers may not have `auth_user_id` | Phase 37 design | Must handle POS-created customers without Supabase Auth accounts |

**Critical schema note:** The existing `customers` table has `auth_user_id UUID NOT NULL REFERENCES auth.users(id) UNIQUE` (inspected directly from `012_customer_accounts.sql`). This means every customer in the table currently has an auth account. POS quick-add (D-04) creates a customer WITHOUT a Supabase Auth account — which means either: (a) the `auth_user_id` constraint must be relaxed (make it nullable), or (b) a separate `pos_customers` table is used, or (c) a Supabase Auth user is created programmatically for POS customers (complex, unwanted).

**Recommended approach (Claude's Discretion):** Make `auth_user_id` nullable in a migration step. This is a `ALTER TABLE public.customers ALTER COLUMN auth_user_id DROP NOT NULL`. POS-created customers have `auth_user_id IS NULL`. Online customers always have `auth_user_id` set. The `loyalty_points` and `loyalty_transactions` tables reference `customers.id` (not `auth_user_id`), so this works cleanly. RLS policies that check `auth_user_id` remain valid — they simply won't match POS-created customers (which is correct; POS customers don't log in).

---

## Environment Availability

Step 2.6: SKIPPED (no external dependencies — all tools, services, and packages already installed; this phase is a code/config/migration-only change within the existing stack).

---

## Validation Architecture

nyquist_validation is enabled (absent key treated as enabled per config.json check — key is `true`).

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (version from package.json test script: `vitest run`) |
| Config file | vitest.config.ts (exists in project root) |
| Quick run command | `npm test -- --reporter=verbose src/lib/__tests__/loyalty` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| LOYAL-01 | Billing webhook activates has_loyalty_points | unit | `npm test -- src/app/api/webhooks/stripe/billing/__tests__/billing.test.ts` | Extends existing; ❌ Wave 0 |
| LOYAL-01 | createSubscriptionCheckoutSession includes loyalty_points in featureSchema | unit | `npm test -- src/actions/billing/__tests__/createSubscriptionCheckoutSession.test.ts` | Extends existing |
| LOYAL-02 | Earn rate validated and saved | unit | `npm test -- src/actions/loyalty/__tests__/saveLoyaltySettings.test.ts` | ❌ Wave 0 |
| LOYAL-03 | Redeem rate validated and saved | unit | (same file as LOYAL-02) | ❌ Wave 0 |
| LOYAL-04 | Customer lookup returns name + email + points balance | unit | `npm test -- src/actions/loyalty/__tests__/lookupCustomerForPOS.test.ts` | ❌ Wave 0 |
| LOYAL-05 | POS: earn_loyalty_points RPC called after complete_pos_sale | unit | `npm test -- src/actions/orders/__tests__/completeSale.test.ts` | Extends existing; ❌ Wave 0 |
| LOYAL-06 | Online: earn_loyalty_points called after complete_online_sale in webhook | unit | `npm test -- src/app/api/webhooks/stripe/webhook.test.ts` | Extends existing; ❌ Wave 0 |
| LOYAL-07 | Customer profile page shows points balance | manual-only | Manual QA: visit /account/profile while logged in with loyalty active | — |
| LOYAL-08 | Online checkout: loyalty discount reduces Stripe total | unit | `npm test -- src/actions/orders/__tests__/createCheckoutSession.test.ts` | Extends existing; ❌ Wave 0 |
| LOYAL-09 | POS: APPLY_LOYALTY_DISCOUNT reduces cart total | unit | `npm test -- src/lib/__tests__/pos-cart-loyalty.test.ts` | ❌ Wave 0 |
| LOYAL-10 | Admin: customer list shows points column | manual-only | Manual QA: visit /admin/customers with loyalty subscribed | — |
| LOYAL-11 | Online: privacy banner shows on first visit | manual-only | Manual QA: log in as customer after loyalty activated | — |
| LOYAL-11 | POS: quickAddCustomer rejects if consent_given = false | unit | `npm test -- src/actions/loyalty/__tests__/quickAddCustomer.test.ts` | ❌ Wave 0 |

**calculatePointsEarned / calculateRedemptionDiscount — core business logic:**
| Behavior | Test Type | File |
|----------|-----------|------|
| `calculatePointsEarned(100, 100)` = 1 | unit | `src/lib/__tests__/loyalty-utils.test.ts` ❌ Wave 0 |
| `calculatePointsEarned(99, 100)` = 0 (floor) | unit | same |
| `calculatePointsEarned(0, 100)` = 0 | unit | same |
| `calculateRedemptionDiscount(100, 1)` = 100 cents | unit | same |
| Points-on-points: net = total - giftCard - loyalty | unit | `completeSale.test.ts` extension |

### Sampling Rate
- **Per task commit:** `npm test -- src/lib/__tests__/loyalty-utils.test.ts`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps (files to create before implementation begins)

- [ ] `src/lib/__tests__/loyalty-utils.test.ts` — covers calculatePointsEarned, calculateRedemptionDiscount (RED stubs)
- [ ] `src/lib/__tests__/pos-cart-loyalty.test.ts` — covers ATTACH_CUSTOMER, DETACH_CUSTOMER, APPLY_LOYALTY_DISCOUNT cart actions (RED stubs)
- [ ] `src/actions/loyalty/__tests__/saveLoyaltySettings.test.ts` — validates schema parsing (RED stubs, LOYAL-02/03)
- [ ] `src/actions/loyalty/__tests__/quickAddCustomer.test.ts` — covers consent_given validation (RED, LOYAL-11)
- [ ] `src/actions/loyalty/__tests__/lookupCustomerForPOS.test.ts` — covers search result shape (RED, LOYAL-04)

---

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection: `src/config/addons.ts` — verified SubscriptionFeature union, all 4 map structures
- Direct codebase inspection: `src/lib/cart.ts` — CartState, CartAction types, reducer pattern
- Direct codebase inspection: `src/actions/orders/completeSale.ts` — gift card post-completion hook pattern
- Direct codebase inspection: `src/app/api/webhooks/stripe/route.ts` — online sale webhook completion pattern
- Direct codebase inspection: `src/app/api/webhooks/stripe/billing/route.ts` — PRICE_TO_FEATURE webhook handler
- Direct codebase inspection: `supabase/migrations/033_gift_cards.sql` — RPC patterns (SECURITY DEFINER, FOR UPDATE, REVOKE/GRANT)
- Direct codebase inspection: `supabase/migrations/012_customer_accounts.sql` — customers table schema; `auth_user_id NOT NULL` constraint identified
- Direct codebase inspection: `src/components/pos/GiftCardCodeEntryScreen.tsx` — fullscreen sheet UX pattern
- Direct codebase inspection: `src/actions/orders/createCheckoutSession.ts` — gift card negative line item pattern, metadata passing to webhook
- Direct codebase inspection: `src/app/admin/layout.tsx` — store_plans query pattern, prop threading to AdminSidebar
- Direct codebase inspection: `src/components/admin/AdminSidebar.tsx` — Add-ons section rendering pattern (hasGiftCards, hasAdvancedReporting)
- Direct codebase inspection: `src/app/(store)/account/profile/page.tsx` — customer profile page structure

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new packages; all patterns directly inspected from source
- Architecture: HIGH — follows Phase 35 template exactly; all integration points verified by reading source
- DB schema design: MEDIUM (Claude's Discretion) — loyalty_settings + loyalty_points + loyalty_transactions structure is reasoned design, not prior art in this codebase; the auth_user_id nullability issue is HIGH confidence (directly read from migration)
- Pitfalls: HIGH — pitfalls 1, 2, 6 directly observed from Phase 35 patterns; pitfalls 3, 4, 5 from D-01 and D-10 requirements

**Research date:** 2026-04-07
**Valid until:** 2026-05-07 (stable stack; 30-day window)
