# Phase 35: Gift Cards Add-On - Research

**Researched:** 2026-04-06
**Domain:** Gift card systems, Stripe subscriptions, NZ Fair Trading Act compliance, POS payment flow extension, deferred liability accounting
**Confidence:** HIGH — all findings verified against actual codebase; no speculative patterns

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Code format is 8-digit numeric only (e.g. 4827-1593). Easy to type on POS numpad. Uppercase/alpha not needed.
- **D-02:** Buyer-only email delivery. Buyer receives the gift card code and forwards/prints it themselves. No recipient email field at purchase.
- **D-03:** Email template shows code, balance, expiry date, store name prominently. NZ Fair Trading Act requires clear expiry disclosure.
- **D-04:** Gift cards purchasable at both POS (staff issues to in-store customer) and online storefront.
- **D-05:** Gift card is a new payment method alongside EFTPOS/Cash in the PaymentMethodToggle. Not a discount or pre-checkout step.
- **D-06:** Auto-split: gift card balance applied first, then EFTPOS or Cash for the remainder. No manual split calculation.
- **D-07:** After code entry, system shows current balance + expiry, auto-applies full available amount against sale total. No extra confirm tap needed.
- **D-08:** Receipt shows gift card amount charged, remaining balance after transaction, and last 4 digits of code.
- **D-09:** Fixed denominations set by merchant in admin (e.g. $25, $50, $100). No custom amount entry.
- **D-10:** Dedicated `/gift-cards` page on storefront, linked from nav. Not mixed into product catalog.
- **D-11:** Online redemption via code entry field on checkout page. System validates, shows balance, applies to order total.
- **D-12:** When gift card fully covers order total, checkout bypasses Stripe entirely. Order completes server-side with gift card as sole payment.
- **D-13:** Table list view following existing OrderDataTable pattern. Columns: last 4 of code, original value, remaining balance, status (active/redeemed/expired/voided), issued date, expiry date. Sortable and filterable.
- **D-14:** Owner can void a gift card with a reason (owner-only action). Sets status to 'voided', balance non-redeemable.
- **D-15:** Gift card detail view shows transaction history timeline: issuance event + every redemption (date, amount, channel, remaining balance after).
- **D-16:** Gift Cards link appears under a new 'Add-ons' section in admin sidebar. Only shows when subscribed. Groups future add-on pages (loyalty, COGS) here too.
- **D-17:** requireFeature() JWT/DB dual-path is the gating mechanism (established pattern for Xero/Inventory add-ons).
- **D-18:** Gift card issuance writes to a separate `gift_cards` table — never to `orders` table (deferred liability, not revenue).
- **D-19:** NZ Fair Trading Act 2024: 3-year minimum gift card expiry enforced by DB check constraint.
- **D-20:** Gift card issuance excluded from Xero sales sync (GIFT-11) — deferred liability accounting.

### Claude's Discretion
- Email template layout and styling (within the constraint of prominent code/balance/expiry)
- Gift card DB schema design (tables, columns, indexes)
- RPC design for atomic gift card operations (issuance, redemption)
- Denomination management UI in admin settings
- Error handling UX (invalid code, expired card, insufficient balance)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| GIFT-01 | Merchant can enable the Gift Cards add-on ($14/mo) via Stripe subscription | Billing pattern: extend addons.ts + createSubscriptionCheckoutSession.ts + billing webhook handler |
| GIFT-02 | Merchant can create gift card products with configurable denominations | Admin settings page; denominations stored as JSONB array in store config or dedicated table |
| GIFT-03 | Customer can purchase a digital gift card on the storefront (generates unique code) | Server action issues gift card: inserts to `gift_cards` table, generates 8-digit numeric code server-side |
| GIFT-04 | Customer receives gift card code and expiry date via email after purchase | sendEmail() + React Email template pattern (follows PosReceiptEmail.tsx) |
| GIFT-05 | Gift card expiry is enforced at minimum 3 years per NZ Fair Trading Act 2024 | DB CHECK constraint: `expires_at >= issued_at + INTERVAL '3 years'` |
| GIFT-06 | Staff can redeem a gift card as payment method during POS checkout (enter code, validate balance) | Cart state machine extension: new phase + APPLY_GIFT_CARD action; validate via server action |
| GIFT-07 | Customer can redeem a gift card during online storefront checkout | createCheckoutSession.ts extension: validate gift card, deduct or bypass Stripe (D-12) |
| GIFT-08 | Gift card supports partial redemption with remaining balance tracked | Atomic SQL RPC: deduct `amount_used` from `balance_cents`, insert into `gift_card_redemptions` |
| GIFT-09 | Gift card issuance is recorded as deferred liability (not revenue), GST deferred to redemption | gift_cards table is separate from orders; issuance Server Action never touches orders table |
| GIFT-10 | Merchant can view gift card list with balances, status, and transaction history in admin | Admin page replicating OrderDataTable; detail drawer/page with redemption timeline |
| GIFT-11 | Gift card issuance is excluded from Xero sales sync (deferred liability, not revenue) | xero/sync.ts queries orders table only; gift_cards table is invisible to Xero sync by design |
</phase_requirements>

---

## Summary

Phase 35 is an extension phase — it adds a new billable add-on on top of an already-solid foundation. The project already has: a working Stripe subscription billing pipeline, a feature-gate pattern (`requireFeature()`), atomic POS and online checkout RPCs, email sending via Resend + React Email, and a data table pattern for admin views. Gift cards slot into every one of these cleanly.

The phase has three technically distinct sub-domains: (1) billing/gating — trivial extension of `addons.ts` + webhook handler; (2) gift card lifecycle — new DB schema + atomic RPCs for issuance and redemption; (3) UI plumbing — POS cart state machine extension, storefront `/gift-cards` page, checkout gift card field, and admin management. The most complex work is the POS cart state machine extension (new payment method that can trigger a two-leg split payment) and the atomic redemption RPC (must prevent double-spend races).

**Primary recommendation:** Build Wave 0 as schema + billing gating, Wave 1 as issuance (POS + online + email), Wave 2 as POS redemption, Wave 3 as online redemption, Wave 4 as admin management. Each wave is independently deployable and testable.

---

## Standard Stack

All libraries are already installed in the project — no new dependencies required.

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @supabase/supabase-js | ^2.101.1 | Database client for gift_cards table, RPC calls | Already the project data layer |
| Stripe (stripe) | ^21.0.1 | Subscription billing for $14/mo add-on | Already wired; billing webhook handler extended |
| Resend + @react-email/components | ^6.10.0 / ^1.0.11 | Gift card delivery email | Already in use for POS receipt emails |
| Zod | ^4.3.6 | Input validation on all server actions | Required for all server actions per CLAUDE.md |
| jose | ^6.2.2 | JWT verification for staff auth (existing pattern) | Used in completeSale.ts via resolveStaffAuth() |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| date-fns | ^4.1.0 | Date arithmetic for 3-year expiry calculation | Use for expiry display formatting in UI |
| lucide-react | ^1.7.0 | Icons for gift card UI elements | Already used across admin UI |
| server-only | ^0.0.1 | Guard gift card server actions from client import | Required on all server action files |

**No new npm installs required for this phase.**

---

## Architecture Patterns

### Recommended Project Structure
New files this phase creates:

```
supabase/migrations/
└── 033_gift_cards.sql              # gift_cards + gift_card_redemptions + RPCs + RLS

src/config/
└── addons.ts                       # MODIFIED: add 'gift_cards' to SubscriptionFeature

src/lib/
└── requireFeature.ts               # UNCHANGED (add 'gift_cards' to SubscriptionFeature type only via addons.ts)

src/actions/gift-cards/
├── issueGiftCard.ts                 # Server action: POS issuance
├── purchaseGiftCardOnline.ts        # Server action: online storefront purchase
├── validateGiftCard.ts              # Server action: look up code, return balance+expiry
├── redeemGiftCard.ts                # Server action: atomic redemption (calls RPC)
└── voidGiftCard.ts                  # Server action: owner void with reason

src/emails/
└── GiftCardEmail.tsx               # React Email template: code + balance + expiry

src/components/pos/
├── GiftCardEntryScreen.tsx         # Modal: code entry → shows balance → auto-apply
└── PaymentMethodToggle.tsx         # MODIFIED: add 'gift_card' option

src/lib/
└── cart.ts                         # MODIFIED: new CartState fields + actions + phases

src/lib/
└── receipt.ts                      # MODIFIED: ReceiptData extended with giftCard fields

src/app/(storefront)/
├── gift-cards/
│   └── page.tsx                    # Storefront: denomination selector + purchase flow
└── checkout/
    └── page.tsx                    # MODIFIED: gift card code entry field

src/actions/orders/
└── createCheckoutSession.ts        # MODIFIED: gift card validation + Stripe bypass

src/app/admin/gift-cards/
├── page.tsx                         # Gift card list (RSC, server-fetched)
└── [id]/
    └── page.tsx                     # Gift card detail with redemption timeline

src/app/admin/settings/
└── gift-cards/
    └── page.tsx                     # Denomination management UI

src/components/admin/
└── AdminSidebar.tsx                 # MODIFIED: Add-ons section with conditional gift card link
```

### Pattern 1: addons.ts Extension (Billing Gating)

**What:** Add `'gift_cards'` to the `SubscriptionFeature` union and all derived maps.
**When to use:** Every new billable add-on follows this pattern.

```typescript
// src/config/addons.ts — extend these 4 structures
export type SubscriptionFeature = 'xero' | 'custom_domain' | 'inventory' | 'gift_cards'

interface FeatureFlags {
  has_xero: boolean
  has_custom_domain: boolean
  has_inventory: boolean
  has_gift_cards: boolean  // ADD
}

export const PRICE_ID_MAP: Record<SubscriptionFeature, string> = {
  // ...existing...
  gift_cards: process.env.STRIPE_PRICE_GIFT_CARDS ?? '',
}

export const PRICE_TO_FEATURE: Record<string, keyof FeatureFlags> = {
  // ...existing...
  ...(process.env.STRIPE_PRICE_GIFT_CARDS
    ? { [process.env.STRIPE_PRICE_GIFT_CARDS]: 'has_gift_cards' }
    : {}),
}

export const FEATURE_TO_COLUMN: Record<SubscriptionFeature, keyof FeatureFlags> = {
  // ...existing...
  gift_cards: 'has_gift_cards',
}
```

Also: `createSubscriptionCheckoutSession.ts` featureSchema must include `'gift_cards'`.

### Pattern 2: DB Schema — gift_cards + gift_card_redemptions

**What:** Two new tables. `gift_cards` is the source of truth for card state. `gift_card_redemptions` is an immutable audit log. All monetary values in integer cents.

```sql
-- migration 033_gift_cards.sql

CREATE TABLE public.gift_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id),
  code TEXT NOT NULL,                         -- '48271593' (8 numeric digits, no dash stored)
  original_value_cents INTEGER NOT NULL CHECK (original_value_cents > 0),
  balance_cents INTEGER NOT NULL CHECK (balance_cents >= 0),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'redeemed', 'expired', 'voided')),
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  -- NZ Fair Trading Act 2024: minimum 3 years
  CONSTRAINT gift_card_expiry_3yr CHECK (expires_at >= issued_at + INTERVAL '3 years'),
  voided_at TIMESTAMPTZ,
  void_reason TEXT,
  purchase_channel TEXT NOT NULL CHECK (purchase_channel IN ('pos', 'online')),
  buyer_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (store_id, code)  -- code unique per store
);

CREATE TABLE public.gift_card_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id),
  gift_card_id UUID NOT NULL REFERENCES public.gift_cards(id),
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  balance_after_cents INTEGER NOT NULL CHECK (balance_after_cents >= 0),
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  channel TEXT NOT NULL CHECK (channel IN ('pos', 'online')),
  order_id UUID REFERENCES public.orders(id),  -- NULL for gift card purchases
  staff_id UUID REFERENCES public.staff(id),   -- NULL for online redemptions
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Why separate from orders:** Gift card issuance is deferred liability, not recognized revenue. The Xero sync queries only `orders` — gift card issuances are invisible to it by design (GIFT-11 is achieved architecturally, not by filtering).

### Pattern 3: Atomic Redemption RPC

**What:** A SECURITY DEFINER RPC to atomically deduct from balance and log the redemption. Prevents race conditions (concurrent redemption attempts).
**When to use:** Both POS and online redemption call this same RPC.

```sql
CREATE OR REPLACE FUNCTION public.redeem_gift_card(
  p_store_id UUID,
  p_code TEXT,
  p_amount_cents INTEGER,        -- amount to deduct (may be less than balance for split)
  p_channel TEXT,                -- 'pos' or 'online'
  p_order_id UUID DEFAULT NULL,
  p_staff_id UUID DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_card_id UUID;
  v_balance INTEGER;
  v_status TEXT;
  v_new_balance INTEGER;
BEGIN
  -- Lock the row to prevent concurrent redemption
  SELECT id, balance_cents, status
  INTO v_card_id, v_balance, v_status
  FROM public.gift_cards
  WHERE store_id = p_store_id
    AND code = p_code
  FOR UPDATE;

  IF v_card_id IS NULL THEN
    RAISE EXCEPTION 'GIFT_CARD_NOT_FOUND';
  END IF;
  IF v_status != 'active' THEN
    RAISE EXCEPTION 'GIFT_CARD_INVALID_STATUS:%', v_status;
  END IF;
  IF now() > (SELECT expires_at FROM public.gift_cards WHERE id = v_card_id) THEN
    RAISE EXCEPTION 'GIFT_CARD_EXPIRED';
  END IF;
  IF v_balance < p_amount_cents THEN
    RAISE EXCEPTION 'GIFT_CARD_INSUFFICIENT_BALANCE:%', v_balance;
  END IF;

  v_new_balance := v_balance - p_amount_cents;

  -- Deduct balance; mark fully redeemed if balance reaches 0
  UPDATE public.gift_cards
  SET
    balance_cents = v_new_balance,
    status = CASE WHEN v_new_balance = 0 THEN 'redeemed' ELSE 'active' END,
    updated_at = now()
  WHERE id = v_card_id;

  -- Append-only audit record
  INSERT INTO public.gift_card_redemptions (
    store_id, gift_card_id, amount_cents, balance_after_cents,
    channel, order_id, staff_id
  ) VALUES (
    p_store_id, v_card_id, p_amount_cents, v_new_balance,
    p_channel, p_order_id, p_staff_id
  );

  RETURN jsonb_build_object(
    'gift_card_id', v_card_id,
    'amount_deducted_cents', p_amount_cents,
    'balance_after_cents', v_new_balance
  );
END;
$$;
```

### Pattern 4: Cart State Machine Extension

**What:** `CartState` gains new fields for gift card payment. Two new cart phases: `gift_card_entry` (code input modal) and `gift_card_confirmed` (balance shown, ready to complete). A new `INITIATE_PAYMENT` branch handles the gift card path.

```typescript
// src/lib/cart.ts — additions

export type CartState = {
  // ...existing fields...
  paymentMethod: 'eftpos' | 'cash' | 'gift_card' | null
  giftCardCode: string | null               // entered code (digits only)
  giftCardBalanceCents: number | null       // validated balance
  giftCardAmountCents: number | null        // amount to charge to gift card (auto-set)
  giftCardRemainingAfterCents: number | null // balance remaining after this sale
  giftCardExpiresAt: string | null          // ISO for display
  // split: when gift card < total, remainder paid by eftpos or cash
  splitRemainderMethod: 'eftpos' | 'cash' | null
  phase: 'idle' | 'eftpos_confirm' | 'cash_entry' | 'gift_card_entry' | 'gift_card_confirmed' | 'processing' | 'sale_complete' | 'sale_void'
}

export type CartAction =
  // ...existing actions...
  | { type: 'ENTER_GIFT_CARD_CODE'; code: string }
  | { type: 'GIFT_CARD_VALIDATED'; balanceCents: number; expiresAt: string }
  | { type: 'SET_SPLIT_REMAINDER_METHOD'; method: 'eftpos' | 'cash' }
  | { type: 'GIFT_CARD_VALIDATION_FAILED' }
```

**Auto-split logic (D-06):** When `GIFT_CARD_VALIDATED`, compute `giftCardAmountCents = Math.min(balanceCents, totalCents)`. If `giftCardAmountCents < totalCents`, remainder must be EFTPOS or Cash (set via `SET_SPLIT_REMAINDER_METHOD`).

### Pattern 5: Online Checkout Gift Card Bypass (D-12)

**What:** In `createCheckoutSession.ts`, validate gift card before creating Stripe session. If balance covers full order total, complete order server-side without Stripe.

```typescript
// In createCheckoutSession.ts — new flow when giftCardCode provided
if (giftCardCode) {
  // Validate gift card (lock the row via RPC)
  const validation = await validateGiftCardForCheckout(storeId, giftCardCode, totalCents)
  if (!validation.valid) return { error: validation.reason }

  if (validation.balanceCents >= totalCents) {
    // D-12: Bypass Stripe entirely
    const result = await completeGiftCardOnlineSale({
      storeId, orderId, giftCardCode, amountCents: totalCents
    })
    return { redirect: `/order/${orderId}/confirmation?token=${lookupToken}` }
  }

  // Partial: reduce Stripe charge, record gift card portion separately
  const stripeAmount = totalCents - Math.min(validation.balanceCents, totalCents)
  // ... create Stripe session for stripeAmount ...
  // ... gift card deduction happens in webhook after Stripe confirms ...
}
```

**Key risk:** For partial gift card + Stripe, the redemption must happen in the Stripe webhook handler (after payment confirmed), not at session creation — otherwise a failed card payment deducts from the gift card irreversibly.

### Pattern 6: Gift Card Code Generation

**What:** Server-side generation of collision-resistant 8-digit numeric codes.
**When to use:** Both POS issuance and online purchase.

```typescript
// src/actions/gift-cards/issueGiftCard.ts
async function generateUniqueCode(storeId: string, supabase: SupabaseClient): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    // 8 random digits: pad to ensure leading zeros preserved
    const code = String(Math.floor(Math.random() * 100_000_000)).padStart(8, '0')
    const { data } = await supabase
      .from('gift_cards')
      .select('id')
      .eq('store_id', storeId)
      .eq('code', code)
      .maybeSingle()
    if (!data) return code
  }
  throw new Error('Failed to generate unique gift card code after 10 attempts')
}
```

**Display format:** Format as `XXXX-XXXX` in UI and email only; store raw 8-digit string in DB. The DB unique constraint is on the raw digits.

### Pattern 7: Xero Sync Exclusion (GIFT-11)

**What:** No code change to xero/sync.ts is needed. The sync queries only the `orders` table. Gift card issuances write to `gift_cards` — a separate table never queried by Xero sync. Exclusion is architectural.

**Verification in code:** The `aggregateDailySales` function in `src/lib/xero/sync.ts` queries `orders` filtered by `store_id` + date range + status. Gift card records in `gift_cards` never appear in this query.

**GST timing note:** Per standard NZ accounting practice and GIFT-09, GST on gift card issuance is deferred to redemption. No GST entry is written at issuance time. When a gift card is redeemed against an order, the order's GST calculation is unchanged (the gift card is a payment method, not a discount — the price and GST of goods remain the same).

### Anti-Patterns to Avoid

- **Writing gift card issuance to `orders`:** Violates deferred liability accounting (D-18). Gift cards are not revenue until redeemed.
- **Client-side code generation:** Gift card codes must be generated server-side. Never trust client-supplied codes.
- **Deducting gift card balance outside a transaction:** Race condition allows double-spend. Always use the `redeem_gift_card` RPC with `FOR UPDATE`.
- **Expiry less than 3 years:** The DB `CHECK` constraint will reject inserts/updates that violate the NZ Fair Trading Act minimum. Set expiry at `issued_at + INTERVAL '3 years'` exactly (or more).
- **Mixing gift card redemption with the Stripe pre-checkout step:** For partial gift card + Stripe, the gift card deduction must happen in the Stripe webhook (after confirmed payment), not at session creation.
- **Validating gift card code on client before server confirmation:** Only use the server-validated balance. Never display or act on client-computed values.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Concurrent balance deduction | Custom application-level locking | `SELECT FOR UPDATE` in `redeem_gift_card` RPC | Postgres row-level lock is the correct primitive; application locks don't survive process restarts |
| Email delivery | Custom SMTP setup | Resend via `sendEmail()` (already wired) | Fire-and-forget pattern with error swallowing already in production; no new infra needed |
| Subscription checkout flow | Custom billing page | Extend `createSubscriptionCheckoutSession.ts` | Already handles customer reuse, metadata, trial period, success/cancel URL pattern |
| Billing webhook feature flag update | New webhook handler | Extend `PRICE_TO_FEATURE` and `FEATURE_TO_COLUMN` maps | The existing webhook handler already handles all add-on feature flags via `featureColumn` lookup |
| Feature gating | Custom JWT inspection | `requireFeature('gift_cards')` | JWT/DB dual-path already implemented with correct security properties |
| Code uniqueness | UUID-based codes | 8-digit numeric with DB UNIQUE constraint + retry loop | Per D-01, numeric codes are required for numpad entry; uniqueness is guaranteed by constraint |

**Key insight:** This phase adds no new infrastructure — it extends existing patterns. The billing pipeline, email pipeline, RLS model, and feature gate all existed before this phase. The only net-new patterns are the atomic `redeem_gift_card` RPC and the gift card state machine extension.

---

## Common Pitfalls

### Pitfall 1: Stripe partial payment race condition
**What goes wrong:** For split gift card + Stripe payments: gift card balance deducted at session creation, but Stripe payment fails. Customer loses gift card balance without receiving goods.
**Why it happens:** Eager deduction before payment confirmation.
**How to avoid:** Deduct gift card balance only in the Stripe `checkout.session.completed` webhook handler. At session creation, only validate and hold (not deduct). Store `pending_gift_card_code` + `pending_gift_card_amount_cents` in the pending order record.
**Warning signs:** Order records with `status = 'pending'` but no corresponding `gift_card_redemptions` row.

### Pitfall 2: Expired card shown as active in UI
**What goes wrong:** A card with `expires_at` in the past shows as `status = 'active'` because status is only updated at redemption, not proactively.
**Why it happens:** Status is a stored field, not computed from `expires_at` at query time.
**How to avoid:** In validation server actions and list views, always compute effective status as: `IF now() > expires_at AND status = 'active' THEN treat as expired`. Alternatively, a daily cron can update expired cards. In the MVP, compute in the validation RPC (the `redeem_gift_card` RPC already checks `now() > expires_at`).
**Warning signs:** Admin list showing 'active' cards with past expiry dates.

### Pitfall 3: Gift card code display vs. storage format mismatch
**What goes wrong:** Code stored as `'48271593'` in DB, but UI sends `'4827-1593'` (with dash) to server action. Lookup fails.
**Why it happens:** Display format (dashes) leaks into server-side lookup.
**How to avoid:** Strip all non-numeric characters from codes before DB lookup. Add a Zod transform: `z.string().transform(s => s.replace(/\D/g, ''))`.
**Warning signs:** Valid code entered by staff returning "card not found" errors.

### Pitfall 4: AdminSidebar prop threading
**What goes wrong:** AdminSidebar currently takes `hasInventory?: boolean` as a prop. Adding `hasGiftCards` requires threading through every parent RSC that renders the sidebar.
**Why it happens:** Feature flags are fetched server-side in RSC layouts and passed as props to the client sidebar.
**How to avoid:** Read the existing pattern in the admin layout file. Add `hasGiftCards` as an optional prop alongside `hasInventory`. Find the RSC layout that queries `store_plans` and add `has_gift_cards` to the select.

### Pitfall 5: `createSubscriptionCheckoutSession` featureSchema not updated
**What goes wrong:** `featureSchema` in the action is `z.enum(['xero', 'custom_domain', 'inventory'])`. Calling with `'gift_cards'` returns `{ error: 'invalid_feature' }` silently.
**Why it happens:** The Zod enum is a local hardcoded list, not derived from `SubscriptionFeature`.
**How to avoid:** When extending `SubscriptionFeature` in `addons.ts`, also update the `featureSchema` z.enum in `createSubscriptionCheckoutSession.ts`.

### Pitfall 6: Missing REVOKE/GRANT for new RPCs
**What goes wrong:** New RPCs (`redeem_gift_card`, `issue_gift_card`) are callable by the `anon` role if not explicitly restricted.
**Why it happens:** PostgreSQL grants EXECUTE to PUBLIC by default for new functions.
**How to avoid:** After each `CREATE OR REPLACE FUNCTION`, immediately `REVOKE EXECUTE FROM PUBLIC` and `GRANT EXECUTE TO service_role`. Follow pattern in `021_security_audit_fixes.sql`.

### Pitfall 7: NZ Fair Trading Act constraint enforcement
**What goes wrong:** Application code sets expiry to 3 years, but the DB constraint uses `issued_at` (default `now()`) while the insert uses an explicit `issued_at`. If `issued_at` differs from when the constraint is evaluated, edge cases arise.
**Why it happens:** Timing between insert and constraint evaluation.
**How to avoid:** In the `gift_cards` table, do not pass `issued_at` in inserts — let `DEFAULT now()` handle it. Set `expires_at` in application code as `new Date(Date.now() + 3 * 365.25 * 24 * 60 * 60 * 1000).toISOString()`. The 3-year minimum constraint provides a safety net.

---

## Code Examples

Verified patterns from existing codebase:

### Existing billing webhook handler — feature flag update pattern
```typescript
// src/app/api/webhooks/stripe/billing/route.ts (verified)
// Map price ID to feature column — just add to PRICE_TO_FEATURE in addons.ts:
const featureColumn = PRICE_TO_FEATURE[priceId]
// Then update store_plans:
await supabase
  .from('store_plans')
  .update({
    [featureColumn]: isActive,
    updated_at: new Date().toISOString(),
  })
  .eq('store_id', storeId)
```

### Existing sendEmail pattern (fire-and-forget)
```typescript
// src/lib/email.ts (verified)
// Call with void to avoid blocking:
void sendEmail({
  to: buyerEmail,
  subject: `Your gift card from ${storeName}`,
  react: <GiftCardEmail code={code} balanceCents={valueCents} expiresAt={expiresAt} storeName={storeName} />,
})
```

### Existing cart state machine pattern — adding a new phase
```typescript
// src/lib/cart.ts (verified) — INITIATE_PAYMENT handles routing to phase
case 'INITIATE_PAYMENT': {
  if (state.paymentMethod === 'eftpos') return { ...state, phase: 'eftpos_confirm' }
  if (state.paymentMethod === 'cash') return { ...state, phase: 'cash_entry' }
  if (state.paymentMethod === 'gift_card') return { ...state, phase: 'gift_card_entry' }
  return state
}
```

### Existing receipt extension pattern
```typescript
// src/lib/receipt.ts (verified) — add optional gift card fields
export type ReceiptData = {
  // ...existing...
  giftCardCodeLast4?: string       // last 4 digits of code
  giftCardAmountCents?: number     // amount charged to card
  giftCardRemainingCents?: number  // balance remaining after transaction
}
```

### Existing Xero sync — gift cards invisible by architecture
```typescript
// src/lib/xero/sync.ts (verified) — queries orders table only
const { data: completedOrders } = await supabase
  .from('orders')                    // gift_cards table never queried here
  .select('total_cents, payment_method, channel, status')
  .eq('store_id', storeId)
  // ...
```

### store_plans current columns (verified from migrations)
```sql
-- Existing: has_xero, has_email_notifications, has_custom_domain, has_inventory
-- New column needed: has_gift_cards BOOLEAN NOT NULL DEFAULT false
ALTER TABLE public.store_plans ADD COLUMN has_gift_cards BOOLEAN NOT NULL DEFAULT false;
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Gift card as a product in catalog | Gift card as separate entity in `gift_cards` table | This phase design | Prevents gift card issuance appearing as revenue in reports |
| Expiry enforcement in application code only | DB CHECK constraint + application code | This phase design | NZ Fair Trading Act compliance guaranteed at DB level |
| Single payment method per POS sale | Auto-split: gift card first, remainder by EFTPOS/cash | This phase design | Required by D-06 |

---

## Environment Availability

Step 2.6: SKIPPED — no new external services required. All dependencies (Stripe, Resend, Supabase) are already operational. No new env vars are needed beyond `STRIPE_PRICE_GIFT_CARDS` (new Stripe Price ID to be created in Stripe dashboard before testing).

New environment variable required (not an external service, just config):
```
STRIPE_PRICE_GIFT_CARDS=price_xxx   # Created in Stripe dashboard: $14/mo recurring, NZD
```

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.2 |
| Config file | `vitest.config.mts` |
| Quick run command | `npx vitest run src/lib/__tests__/` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| GIFT-01 | Billing webhook enables `has_gift_cards` on subscription created/deleted | unit | `npx vitest run src/lib/__tests__/billing-webhook-gift-cards.test.ts` | ❌ Wave 0 |
| GIFT-02 | Denomination list validation schema | unit | `npx vitest run src/lib/__tests__/gift-card-denominations.test.ts` | ❌ Wave 0 |
| GIFT-03 | issueGiftCard action generates unique 8-digit code | unit | `npx vitest run src/lib/__tests__/gift-cards.test.ts` | ❌ Wave 0 |
| GIFT-04 | GiftCardEmail renders code, balance, expiry, store name | unit | `npx vitest run src/lib/__tests__/gift-card-email.test.tsx` | ❌ Wave 0 |
| GIFT-05 | DB constraint rejects expiry < 3 years from issued_at | unit (zod/logic) | `npx vitest run src/lib/__tests__/gift-cards.test.ts` | ❌ Wave 0 |
| GIFT-06 | Cart reducer: ENTER_GIFT_CARD_CODE → gift_card_entry phase; GIFT_CARD_VALIDATED sets amount fields | unit | `npx vitest run src/lib/__tests__/pos-cart.test.ts` | ✅ (extend existing) |
| GIFT-07 | createCheckoutSession with gift card bypasses Stripe when balance >= total | unit | `npx vitest run src/lib/__tests__/checkout-gift-card.test.ts` | ❌ Wave 0 |
| GIFT-08 | redeem_gift_card RPC (mocked) correctly computes balance_after, logs redemption | unit | `npx vitest run src/lib/__tests__/gift-cards.test.ts` | ❌ Wave 0 |
| GIFT-09 | issueGiftCard never inserts to orders table | unit | `npx vitest run src/lib/__tests__/gift-cards.test.ts` | ❌ Wave 0 |
| GIFT-10 | manual-only | — | — | — |
| GIFT-11 | Xero sync aggregateDailySales does not query gift_cards table | unit | `npx vitest run src/lib/__tests__/xero-sync.test.ts` | ❌ Wave 0 (verify by code inspection; test confirms orders-only query) |

### Sampling Rate
- **Per task commit:** `npx vitest run src/lib/__tests__/gift-cards.test.ts src/lib/__tests__/pos-cart.test.ts`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/lib/__tests__/gift-cards.test.ts` — covers GIFT-03, GIFT-05, GIFT-08, GIFT-09
- [ ] `src/lib/__tests__/gift-card-email.test.tsx` — covers GIFT-04
- [ ] `src/lib/__tests__/billing-webhook-gift-cards.test.ts` — covers GIFT-01
- [ ] `src/lib/__tests__/checkout-gift-card.test.ts` — covers GIFT-07
- [ ] `src/lib/__tests__/gift-card-denominations.test.ts` — covers GIFT-02

Existing file to extend:
- `src/lib/__tests__/pos-cart.test.ts` — add gift card action tests for GIFT-06

---

## Open Questions

1. **Stripe partial redemption webhook sequencing**
   - What we know: For split gift card + Stripe, the gift card deduction must happen after Stripe payment confirms (in webhook). The pending order must carry `pending_gift_card_code` and `pending_gift_card_amount_cents`.
   - What's unclear: Whether to store these in the `orders` table (new columns) or as Stripe checkout session metadata. Stripe metadata has a 500-char limit per key, which is fine for a code and an integer.
   - Recommendation: Store in Stripe session metadata (`gift_card_code`, `gift_card_amount_cents`). The webhook reads these and calls `redeem_gift_card`. This avoids adding nullable columns to `orders` for a partial-payment edge case.

2. **Denomination storage location**
   - What we know: Merchant configures fixed denominations (D-09). Needs to be editable in admin.
   - What's unclear: Store as a JSONB column on `stores` (e.g., `gift_card_denominations: [2500, 5000, 10000]`) or a dedicated table.
   - Recommendation: JSONB column on `stores` table. A dedicated table is overkill for a list of 3-5 integers. Add `gift_card_denominations JSONB DEFAULT '[2500, 5000, 10000]'::JSONB` to the `stores` table via migration.

3. **Gift card purchase on storefront — payment method**
   - What we know: Online gift card purchase is a Stripe transaction (buyer pays real money for the card). D-03 says buyer receives code by email.
   - What's unclear: Does the gift card purchase go through the existing `createCheckoutSession` / `complete_online_sale` flow, or is it a dedicated flow?
   - Recommendation: Dedicated server action `purchaseGiftCardOnline`. It creates a Stripe Checkout Session for the denomination amount, with metadata `type: 'gift_card'` and `denomination_cents`. The Stripe webhook (`checkout.session.completed`) detects this type, issues the gift card (inserts to `gift_cards`), and sends the email. This keeps gift card issuance out of the orders table entirely (GIFT-09).

---

## Project Constraints (from CLAUDE.md)

These directives must be honored in all implementation tasks:

- **Tech stack is non-negotiable:** Next.js 16 App Router + Supabase + Stripe + Tailwind CSS v4 only.
- **No Prisma:** Use Supabase JS client for all DB queries.
- **No Redux/Zustand:** Use React state + Server Actions + cart useReducer.
- **Zod validation required on all server actions** before any DB access.
- **`server-only` import required** in every server action file and any file with Supabase credentials.
- **GST utilities:** Use `calcLineItem()` from `src/lib/gst.ts` for any monetary calculations. All values in integer cents.
- **No floats for money** — ever.
- **`@supabase/ssr`** (not deprecated `@supabase/auth-helpers-nextjs`) for all auth.
- **Tailwind v4** with CSS-native config. No `tailwind.config.js`.
- **Vitest** for unit tests (not Jest). `npm test` = `vitest run`.
- **Stripe Checkout hosted page** for online payments (no custom Stripe Elements).
- **Read DESIGN.md before any UI work.** All visual decisions subject to design system.
- **GSD workflow enforcement:** All file changes must go through GSD execute-phase.

---

## Sources

### Primary (HIGH confidence)
- Codebase: `src/config/addons.ts` — confirmed SubscriptionFeature union and all derived maps
- Codebase: `src/lib/requireFeature.ts` — confirmed JWT/DB dual-path gating pattern
- Codebase: `src/actions/billing/createSubscriptionCheckoutSession.ts` — confirmed billing flow
- Codebase: `src/app/api/webhooks/stripe/billing/route.ts` — confirmed idempotent webhook with `stripe_events` table
- Codebase: `src/lib/cart.ts` — confirmed cart state machine; documented all existing phases and actions
- Codebase: `src/actions/orders/completeSale.ts` — confirmed RPC call pattern and signature
- Codebase: `src/actions/orders/createCheckoutSession.ts` — confirmed online checkout flow
- Codebase: `src/lib/email.ts` + `src/emails/PosReceiptEmail.tsx` — confirmed fire-and-forget email pattern
- Codebase: `src/lib/receipt.ts` — confirmed ReceiptData type and buildReceiptData factory
- Codebase: `src/lib/xero/sync.ts` — confirmed orders-only query for Xero sync (GIFT-11 architectural)
- Codebase: `supabase/migrations/025_inventory_core.sql` — confirmed complete_pos_sale signature and RPC pattern
- Codebase: `supabase/migrations/014_multi_tenant_schema.sql` — confirmed store_plans schema
- Codebase: `src/components/pos/PaymentMethodToggle.tsx` — confirmed current payment methods
- Codebase: `src/components/admin/AdminSidebar.tsx` — confirmed nav structure and prop pattern
- Codebase: `src/components/admin/billing/AddOnCard.tsx` — confirmed add-on card pattern
- Codebase: `src/components/admin/orders/OrderDataTable.tsx` — confirmed table pattern for admin list view

### Secondary (MEDIUM confidence)
- NZ Fair Trading Act 2024, gift card provisions: 3-year minimum expiry requirement (confirmed via prior project discussion and encoded in D-19)
- Standard SQL pattern: `SELECT FOR UPDATE` for preventing concurrent balance deduction races (well-established database pattern)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new libraries; all existing packages verified against package.json
- Architecture: HIGH — patterns derived directly from existing code, not from training data
- DB schema: HIGH — follows established migration pattern; constraints are standard PostgreSQL
- Pitfalls: HIGH — identified from direct code inspection (e.g., billing webhook featureSchema hardcoding, RPC GRANT pattern in migration 021)
- NZ compliance: HIGH — confirmed in project decisions; 3-year minimum is a locked constraint

**Research date:** 2026-04-06
**Valid until:** 2026-07-06 (90 days — stable codebase, no fast-moving dependencies)
