---
phase: 35-gift-cards-add-on
plan: "04"
subsystem: storefront
tags: [gift-cards, checkout, stripe, webhook, server-actions, react, storefront]
dependency_graph:
  requires: [35-00, 35-02, 35-03]
  provides: [storefront-gift-card-redemption, checkout-gift-card-entry, full-cover-bypass, partial-cover-stripe]
  affects: [src/components/store/CartDrawer.tsx, src/actions/orders/createCheckoutSession.ts, src/app/api/webhooks/stripe/route.ts]
tech_stack:
  added: []
  patterns: [collapsible-gift-card-input, negative-stripe-line-item, full-cover-server-side-order, partial-cover-webhook-deduction]
key-files:
  created:
    - src/components/store/GiftCardInput.tsx
  modified:
    - src/components/store/CartDrawer.tsx
    - src/app/(store)/layout.tsx
    - src/actions/orders/createCheckoutSession.ts
    - src/app/api/webhooks/stripe/route.ts
key-decisions:
  - "Gift card entry implemented in CartDrawer (not a separate checkout page) — project uses subdomain routing with CartDrawer as the checkout UI, matching (store) route group pattern from Plan 02"
  - "Stripe partial cover uses negative line item 'Gift Card Applied' to reduce session total — simpler than Stripe Coupons API which requires on-the-fly coupon creation"
  - "Full-cover path creates order with payment_method='gift_card', calls complete_online_sale RPC with placeholder stripe_session_id='gift_card_{order.id}' for stock decrement, then redeems gift card"
  - "redeem_gift_card RPC takes p_gift_card_id (UUID) not p_code — webhook and createCheckoutSession both look up gift card by code first to get the UUID"
  - "Webhook partial gift card redemption: look up gift card by code from metadata, call redeem_gift_card with UUID after complete_online_sale; failure logs warning but does not fail webhook"
  - "Server-computed giftCardAmountCents: Math.min(balance, total) — client amount is ignored, server recalculates"
patterns-established:
  - "Negative Stripe line item pattern: add { price_data: { unit_amount: -giftCardAmountCents }, quantity: 1 } to reduce Stripe session total for partial gift card coverage"
  - "Full-cover bypass: create PENDING order → complete_online_sale (stock) → redeem_gift_card → send email → return { redirect } — mirrors webhook in a single server action"
requirements-completed: [GIFT-07]

duration: 25min
completed: 2026-04-07
---

# Phase 35 Plan 04: Online Storefront Gift Card Redemption Summary

**Gift card code entry in CartDrawer with collapsible toggle, full-cover Stripe bypass (server-side order completion), and partial-cover webhook redemption with race-condition prevention.**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-04-07T00:00:00Z
- **Completed:** 2026-04-07T00:25:00Z
- **Tasks:** 2
- **Files modified:** 5 (1 created, 4 modified)

## Accomplishments

- GiftCardInput component: collapsible entry field with XXXX-XXXX auto-format, Apply/Remove states, full-cover CTA toggle
- createCheckoutSession extended with optional giftCardCode + giftCardAmountCents, server re-validation, full-cover bypass (no Stripe), partial-cover negative line item
- Webhook extended to redeem gift card after Stripe payment confirms (Pitfall 1: race condition prevented)

## Task Commits

1. **Task 1: Add gift card code entry to storefront cart drawer** - `01e58e6` (feat)
2. **Task 2: Extend createCheckoutSession and webhook for gift card redemption** - `0e31370` (feat)

**Plan metadata:** (separate commit after SUMMARY)

## Files Created/Modified

- `src/components/store/GiftCardInput.tsx` (new) — Collapsible gift card code entry component with collapsed/expanded/applied states per UI-SPEC section 8. validateGiftCard server action call, XXXX-XXXX auto-format, full-cover detection, inline error states.
- `src/components/store/CartDrawer.tsx` — Added storeId + hasGiftCards props, AppliedGiftCard state, GiftCardInput integration, full-cover "Complete Order" CTA, partial-cover breakdown row, formatNZD import
- `src/app/(store)/layout.tsx` — Passes storeId and hasGiftCards props to CartDrawer
- `src/actions/orders/createCheckoutSession.ts` — giftCardCode/giftCardAmountCents Zod schema, gift card DB re-validation, full-cover bypass path (creates order + calls complete_online_sale RPC + redeems + sends email + returns redirect), partial-cover negative line item in Stripe session, gift_card_code in metadata
- `src/app/api/webhooks/stripe/route.ts` — Partial gift card redemption after complete_online_sale RPC: reads gift_card_code from metadata, looks up UUID by code, calls redeem_gift_card RPC, logs warning on failure without blocking webhook

## Decisions Made

- **Cart drawer as checkout UI:** The plan references a non-existent `(storefront)/[slug]/checkout/page.tsx` route. The actual checkout UI is the CartDrawer component, matching the `(store)` route group subdomain architecture established in Plan 02. Implemented there instead.
- **Negative Stripe line item:** Instead of creating Stripe Coupons on-the-fly (which requires an extra Stripe API call and coupon lifecycle management), used a negative unit_amount line item named "Gift Card Applied" to reduce the session total.
- **redeem_gift_card UUID lookup:** The RPC takes `p_gift_card_id` (UUID), not `p_code` as the plan spec suggested. Both the webhook and createCheckoutSession now look up the gift card by code first to get the UUID before calling the RPC. This also means Plan 03's completeSale.ts passes `p_code` incorrectly (pre-existing bug — not in scope of this plan, noted in deferred items).
- **Full-cover stripe_session_id:** complete_online_sale RPC requires `p_stripe_session_id` (non-nullable TEXT). For full-cover gift card orders (no Stripe session), a placeholder `gift_card_{order.id}` is used.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Cart drawer is the checkout UI, not a separate checkout page**
- **Found during:** Task 1 (planning implementation)
- **Issue:** Plan referenced `src/app/(storefront)/[slug]/checkout/page.tsx` which doesn't exist. The `(storefront)` route group was documented as non-existent in Plan 02 SUMMARY. The actual checkout flow is `CartDrawer` in the `(store)` layout.
- **Fix:** Implemented gift card entry in `CartDrawer.tsx` with `storeId` and `hasGiftCards` props threaded from the layout. Created `GiftCardInput.tsx` as a separate component.
- **Files modified:** src/components/store/CartDrawer.tsx, src/components/store/GiftCardInput.tsx (new), src/app/(store)/layout.tsx
- **Commit:** 01e58e6

**2. [Rule 1 - Bug] redeem_gift_card RPC takes p_gift_card_id UUID, not p_code string**
- **Found during:** Task 2 (reading migration 033_gift_cards.sql)
- **Issue:** Plan spec documented `redeem_gift_card(p_store_id, p_code, p_amount_cents, ...)` but the actual RPC signature is `redeem_gift_card(p_store_id, p_gift_card_id UUID, p_amount_cents, ...)`. Plan 03's completeSale.ts already has this bug with p_code.
- **Fix:** Added gift card lookup by code before calling the RPC in both createCheckoutSession (full-cover) and the webhook (partial-cover). Both now pass `p_gift_card_id` UUID correctly.
- **Files modified:** src/actions/orders/createCheckoutSession.ts, src/app/api/webhooks/stripe/route.ts
- **Commit:** 0e31370

**3. [Rule 2 - Missing Critical] Server re-validation of gift card amounts**
- **Found during:** Task 2 (implementation)
- **Issue:** Plan spec passed `giftCardAmountCents` from client to Stripe session, but client amounts can't be trusted. A malicious client could specify a larger gift card deduction than the actual balance.
- **Fix:** createCheckoutSession re-fetches gift card from DB, computes `serverGiftCardAmount = Math.min(card.balance_cents, totalCents)` server-side, ignores client's giftCardAmountCents.
- **Files modified:** src/actions/orders/createCheckoutSession.ts
- **Commit:** 0e31370

---

**Total deviations:** 3 auto-fixed (1 bug - route correction, 1 bug - RPC signature, 1 missing critical - server validation)
**Impact on plan:** Route correction is the same pattern as Plan 02. RPC fix is a correctness requirement. Server validation is a security requirement. No scope creep.

## Deferred Items

- `src/actions/orders/completeSale.ts` (Plan 03): passes `p_code` to `redeem_gift_card` RPC which expects `p_gift_card_id` UUID. This is a pre-existing bug from Plan 03. Deferred — does not block Plan 04 (POS redemption is a separate path).

## Known Stubs

None. All data paths are wired to live Supabase and Stripe:
- GiftCardInput calls validateGiftCard server action (real DB query)
- createCheckoutSession re-validates gift card from DB server-side
- Full-cover path calls complete_online_sale RPC (real stock decrement) + redeem_gift_card RPC
- Partial-cover path stores gift card code in Stripe metadata, webhook deducts after payment

## Self-Check: PASSED

Files created:
- FOUND: src/components/store/GiftCardInput.tsx

Files modified:
- FOUND: src/components/store/CartDrawer.tsx
- FOUND: src/app/(store)/layout.tsx
- FOUND: src/actions/orders/createCheckoutSession.ts
- FOUND: src/app/api/webhooks/stripe/route.ts

Commits:
- FOUND: 01e58e6 (feat(35-04): add gift card code entry to storefront cart drawer)
- FOUND: 0e31370 (feat(35-04): extend createCheckoutSession and webhook for gift card redemption)
