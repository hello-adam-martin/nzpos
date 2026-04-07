# Phase 37: Loyalty Points Add-On - Context

**Gathered:** 2026-04-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Customers earn and redeem points on purchases in-store (POS) and online, with merchant-configurable earn/redeem rates, privacy-compliant enrollment per NZ Privacy Act 2020 + Privacy Amendment Act 2025 (IPP 3A), and admin visibility into customer loyalty balances and transaction history. Includes: add-on subscription gating ($15/mo), loyalty settings configuration, POS customer lookup, points earning on completed sales, points redemption as discount (POS + online), customer account balance display, and admin loyalty management.

</domain>

<decisions>
## Implementation Decisions

### POS Customer Lookup
- **D-01:** Customer lookup appears before payment, after cart is built. A small "Add Customer" button near the cart summary. Non-blocking — staff can skip and proceed to payment without identifying a customer.
- **D-02:** Type-ahead search by name or email. Results appear as staff types. Follows existing admin customer search pattern.
- **D-03:** If customer not found: show "No match found" with a "Create new customer" button. Staff chooses whether to add the customer inline or skip.
- **D-04:** Quick-add form captures name + email. Includes privacy consent checkbox (see D-14).
- **D-05:** After lookup, display customer name, points balance, and available dollar discount (e.g. "Jane: 450 pts ($4.50 available)"). Staff can offer to redeem before selecting payment method.

### Points Earn & Redeem Mechanics
- **D-06:** No default earn rate. Merchant must configure earn rate (points per dollar) and redeem rate (points to dollar) in loyalty settings before points start accumulating.
- **D-07:** Earn and redeem rates are independent merchant-configurable settings. Example: earn 1 pt/$1, redeem 100 pts = $1 discount.
- **D-08:** No minimum redemption threshold. Any points balance can be redeemed.
- **D-09:** Points earned on net amount paid — excludes promo discounts, gift card portions, and loyalty point redemptions. Prevents points-on-points loops.
- **D-10:** Setup gate: after subscribing, merchant must save both earn rate and redeem rate before the loyalty system activates. Points do not accumulate until configuration is complete.

### Privacy Enrollment Flow
- **D-11:** Online account holders auto-enroll when merchant activates loyalty. A one-time dismissible banner appears on the account page: "You're earning loyalty points! We track your purchase history to calculate rewards. [Learn more] [OK]". Shows on first visit after loyalty activates.
- **D-12:** POS customers are added via the quick-add flow during customer lookup. Not auto-enrolled — must be explicitly identified by staff.
- **D-13:** Privacy notice for POS quick-add: form includes a checkbox "Customer has been informed about loyalty data collection" that must be checked to save. Staff explains verbally per IPP 3A requirements.
- **D-14:** Privacy Act 2020 + Privacy Amendment Act 2025 (IPP 3A) compliance: customers must be informed before personal data is collected for loyalty purposes. The banner (online) and consent checkbox (POS) satisfy this requirement.

### Admin Loyalty Settings & Management
- **D-15:** Single settings card on the Loyalty admin page with earn rate, redeem rate, and a toggle to pause earning/redemption. Follows compact Store Settings pattern.
- **D-16:** Points column added to existing admin customer table. Click through to customer detail page which shows loyalty transaction history. Reuses existing CustomerDataTable pattern.
- **D-17:** Loyalty admin page appears under "Add-ons" section in admin sidebar, alongside Gift Cards and Advanced Reporting. Only visible when subscribed.

### Prior Decisions (carried forward)
- **D-18:** requireFeature() JWT/DB dual-path is the gating mechanism (established pattern for all add-ons — Phase 35 D-17, Phase 36 D-12)
- **D-19:** Add-on billing uses `src/config/addons.ts` + Stripe Price ID env var + webhook handler pattern (Phase 36 D-13)
- **D-20:** Add-on admin pages appear under "Add-ons" section in admin sidebar (Phase 35 D-16)

### Claude's Discretion
- DB schema design (loyalty_points table, loyalty_transactions table, indexes, RLS policies)
- Points rounding strategy (floor/round on fractional points)
- POS customer lookup sheet/modal UI design and interaction
- Points redemption UX at POS (how staff applies points as discount in the payment flow)
- Online checkout points redemption UI (where the "Use points" control appears)
- Customer account page points balance display and transaction history layout
- Error handling (insufficient points, loyalty paused, rates not configured)
- Points earning timing (on sale completion vs. after refund window)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Feature Gating & Billing
- `src/lib/requireFeature.ts` — JWT/DB dual-path feature gate; add `loyalty_points` feature
- `src/config/addons.ts` — Add-on type definitions and Stripe Price ID mapping; add loyalty_points entry
- `src/actions/billing/createSubscriptionCheckoutSession.ts` — Subscription checkout pattern to replicate
- `src/app/api/webhooks/stripe/billing/route.ts` — Billing webhook; add `has_loyalty_points` flag handling

### POS Checkout
- `src/lib/cart.ts` — Cart state machine; needs customer attachment and points redemption actions
- `src/components/pos/PaymentMethodToggle.tsx` — Payment method UI; reference for where loyalty discount integrates
- `src/components/pos/GiftCardCodeEntryScreen.tsx` — Reference for modal/sheet entry pattern (adapt for customer lookup)
- `src/components/pos/DiscountSheet.tsx` — Reference for applying discounts to cart
- `src/actions/orders/completeSale.ts` — POS sale completion; needs points earning and redemption logic

### Customer Management
- `src/actions/customers/getCustomers.ts` — Existing customer search; reuse for POS type-ahead lookup
- `src/actions/customers/getCustomerDetail.ts` — Customer detail; add loyalty transaction history
- `src/app/admin/customers/` — Admin customer list; add points column

### Online Checkout & Account
- `src/actions/orders/createCheckoutSession.ts` — Online checkout; add points redemption logic
- `src/app/(store)/account/profile/` — Customer profile page; add points balance display
- `src/app/(store)/account/layout.tsx` — Account layout; may need loyalty banner slot

### Admin Navigation
- `src/app/admin/layout.tsx` — Admin sidebar; loyalty page goes under existing Add-ons section

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/config/addons.ts` — SubscriptionFeature union type, ADDONS array, PRICE_ID_MAP, PRICE_TO_FEATURE, FEATURE_TO_COLUMN maps. Add `loyalty_points` to all.
- `src/actions/customers/getCustomers.ts` — Customer search action. Can be adapted for POS type-ahead (may need a lighter query variant).
- `src/components/pos/GiftCardCodeEntryScreen.tsx` — Sheet/modal pattern for POS input. Reference for customer lookup sheet.
- `src/components/pos/DiscountSheet.tsx` — Pattern for applying discounts to cart total.
- `src/app/admin/customers/` — Existing customer list with DataTable. Add points column conditionally when loyalty subscribed.

### Established Patterns
- Add-on gating: requireFeature() checks JWT claims first (fast path), falls back to DB query. All add-ons follow this.
- POS cart state machine: `src/lib/cart.ts` manages state transitions. Gift card added a payment method — loyalty needs customer attachment + points discount.
- Admin sidebar: Add-on pages grouped under "Add-ons" section, conditionally rendered based on subscription.
- Billing webhook: Maps Stripe Price IDs to `store_plans` boolean columns via PRICE_TO_FEATURE.

### Integration Points
- POS checkout flow: New "Add Customer" button in CartPanel or CartSummary area → customer lookup sheet → attach customer to cart state
- Payment flow: Points redemption applies before payment method selection (reduces total) or alongside gift card auto-split
- Online checkout: Points redemption control on checkout page, reducing amount sent to Stripe
- Sale completion: Points earned after successful sale (both POS and online webhook)
- Customer profile page: New section showing points balance and recent loyalty transactions

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 37-loyalty-points-add-on*
*Context gathered: 2026-04-07*
