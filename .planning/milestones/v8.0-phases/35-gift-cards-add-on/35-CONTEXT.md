# Phase 35: Gift Cards Add-On - Context

**Gathered:** 2026-04-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Merchants can sell digital gift cards and customers can redeem them in-store (POS) and online, with full NZ Fair Trading Act 2024 compliance. Includes: add-on subscription gating ($14/mo), gift card issuance (POS + online), redemption as payment method (POS + online), admin management, and deferred liability accounting (excluded from Xero sync).

</domain>

<decisions>
## Implementation Decisions

### Gift Card Code & Delivery
- **D-01:** Code format is 8-digit numeric only (e.g. 4827-1593). Easy to type on POS numpad. Uppercase/alpha not needed.
- **D-02:** Buyer-only email delivery. Buyer receives the gift card code and forwards/prints it themselves. No recipient email field at purchase.
- **D-03:** Email template shows code, balance, expiry date, store name prominently. NZ Fair Trading Act requires clear expiry disclosure.
- **D-04:** Gift cards purchasable at both POS (staff issues to in-store customer) and online storefront.

### POS Redemption Flow
- **D-05:** Gift card is a new payment method alongside EFTPOS/Cash in the PaymentMethodToggle. Not a discount or pre-checkout step.
- **D-06:** Auto-split: gift card balance applied first, then EFTPOS or Cash for the remainder. No manual split calculation.
- **D-07:** After code entry, system shows current balance + expiry, auto-applies full available amount against sale total. No extra confirm tap needed.
- **D-08:** Receipt shows gift card amount charged, remaining balance after transaction, and last 4 digits of code.

### Storefront Purchase UX
- **D-09:** Fixed denominations set by merchant in admin (e.g. $25, $50, $100). No custom amount entry.
- **D-10:** Dedicated `/gift-cards` page on storefront, linked from nav. Not mixed into product catalog.
- **D-11:** Online redemption via code entry field on checkout page. System validates, shows balance, applies to order total.
- **D-12:** When gift card fully covers order total, checkout bypasses Stripe entirely. Order completes server-side with gift card as sole payment.

### Admin Management
- **D-13:** Table list view following existing OrderDataTable pattern. Columns: last 4 of code, original value, remaining balance, status (active/redeemed/expired/voided), issued date, expiry date. Sortable and filterable.
- **D-14:** Owner can void a gift card with a reason (owner-only action). Sets status to 'voided', balance non-redeemable.
- **D-15:** Gift card detail view shows transaction history timeline: issuance event + every redemption (date, amount, channel, remaining balance after).
- **D-16:** Gift Cards link appears under a new 'Add-ons' section in admin sidebar. Only shows when subscribed. Groups future add-on pages (loyalty, COGS) here too.

### Prior Decisions (carried forward)
- **D-17:** requireFeature() JWT/DB dual-path is the gating mechanism (established pattern for Xero/Inventory add-ons)
- **D-18:** Gift card issuance writes to a separate `gift_cards` table — never to `orders` table (deferred liability, not revenue)
- **D-19:** NZ Fair Trading Act 2024: 3-year minimum gift card expiry enforced by DB check constraint
- **D-20:** Gift card issuance excluded from Xero sales sync (GIFT-11) — deferred liability accounting

### Claude's Discretion
- Email template layout and styling (within the constraint of prominent code/balance/expiry)
- Gift card DB schema design (tables, columns, indexes)
- RPC design for atomic gift card operations (issuance, redemption)
- Denomination management UI in admin settings
- Error handling UX (invalid code, expired card, insufficient balance)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Feature Gating & Billing
- `src/lib/requireFeature.ts` — JWT/DB dual-path feature gate; add `gift_cards` feature
- `src/config/addons.ts` — Add-on type definitions and Stripe Price ID mapping
- `src/actions/billing/createSubscriptionCheckoutSession.ts` — Subscription checkout pattern to replicate
- `src/app/api/webhooks/stripe/billing/route.ts` — Billing webhook; add `has_gift_cards` flag handling

### POS Checkout
- `src/lib/cart.ts` — Cart state machine; needs new payment method and gift card actions
- `src/components/pos/PaymentMethodToggle.tsx` — Payment method UI; add Gift Card option
- `src/components/pos/CashEntryScreen.tsx` — Reference for payment entry modal pattern
- `src/actions/orders/completeSale.ts` — POS sale completion RPC; needs gift card deduction logic

### Online Checkout
- `src/actions/orders/createCheckoutSession.ts` — Online checkout; add gift card validation + Stripe bypass
- `src/app/api/webhooks/stripe/route.ts` — Online payment webhook; reference for order completion

### Email
- `src/lib/email.ts` — Resend + React Email pattern; add gift card email template
- `src/emails/PosReceiptEmail.tsx` — Receipt template pattern to follow

### Admin
- `src/components/admin/orders/OrderDataTable.tsx` — Table pattern for gift card list view
- `src/components/admin/AdminSidebar.tsx` — Sidebar nav; add Add-ons section
- `src/components/admin/billing/AddOnCard.tsx` — Add-on card pattern for billing page

### Schema & Migrations
- `supabase/migrations/` — Migration numbering sequence; add gift card tables
- `src/schemas/order.ts` — Zod schema patterns for server action validation

### Requirements
- `.planning/REQUIREMENTS.md` — GIFT-01 through GIFT-11 acceptance criteria

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **requireFeature()** (`src/lib/requireFeature.ts`): Extend SubscriptionFeature type with 'gift_cards', add `has_gift_cards` to store_plans
- **AddOnCard** (`src/components/admin/billing/AddOnCard.tsx`): Reuse for gift card add-on card on billing page
- **OrderDataTable** pattern: Replicate for gift card list view (server-side pagination, allowlist filters, sortable columns)
- **sendEmail()** (`src/lib/email.ts`): Fire-and-forget pattern for gift card delivery email
- **React Email templates** (`src/emails/`): Follow existing template patterns for gift card email
- **PaymentMethodToggle** (`src/components/pos/PaymentMethodToggle.tsx`): Extend with gift card payment method
- **Cart state machine** (`src/lib/cart.ts`): Add APPLY_GIFT_CARD and related actions/phases
- **GST utilities** (`src/lib/gst.ts`): Use for any monetary calculations (integer cents, formatNZD)
- **Receipt builder** (`src/lib/receipt.ts`): Extend to include gift card payment details

### Established Patterns
- All monetary values stored as integer cents — gift card balances must follow this
- Atomic RPCs for mutations (complete_pos_sale, complete_online_sale) — gift card operations need similar atomicity
- Idempotent webhook processing via stripe_events table — reuse for gift card subscription webhook
- Feature flags in JWT app_metadata — add `gift_cards` boolean
- Server-side data fetching with Supabase client in RSC pages, client components for interactivity
- Zod validation on all server actions

### Integration Points
- `store_plans` table: Add `has_gift_cards` + `has_gift_cards_manual_override` columns
- AdminSidebar: Add 'Add-ons' section with conditional gift card link
- Billing page: Add gift card AddOnCard
- POS cart state machine: New payment method + gift card code entry phase
- Online checkout action: Gift card validation step before Stripe session creation
- Receipt data: Extend ReceiptData type with gift card payment info

</code_context>

<specifics>
## Specific Ideas

No specific references or "I want it like X" moments — standard retail gift card patterns apply.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 35-gift-cards-add-on*
*Context gathered: 2026-04-06*
