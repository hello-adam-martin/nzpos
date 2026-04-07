---
phase: 35-gift-cards-add-on
verified: 2026-04-07T00:40:00Z
status: human_needed
score: 11/11 must-haves verified
re_verification:
  previous_status: gaps_found
  previous_score: 10/11
  gaps_closed:
    - "Gift card balance is deducted atomically when staff complete a POS sale using a gift card"
  gaps_remaining: []
  regressions: []
human_verification:
  - test: "Purchase a gift card on the storefront, pay via Stripe, verify email arrives with code in XXXX-XXXX format, balance amount, and expiry date in bold red"
    expected: "Email arrives within ~10 seconds containing monospace code block, NZD balance, and expiry date formatted as 'd MMMM yyyy' in bold red (#DC2626)"
    why_human: "Email delivery requires a live Stripe webhook to trigger and a configured email provider — cannot verify without running the stack"
  - test: "Enable Gift Cards add-on via Stripe billing page ($14/mo), subscribe, verify admin sidebar shows Add-ons > Gift Cards link"
    expected: "After successful Stripe subscription, has_gift_cards = true in store_plans, Add-ons section appears in sidebar with Gift Cards nav link"
    why_human: "Requires live Stripe subscription flow and webhook delivery"
  - test: "On POS, select Gift Card payment method, enter a valid 8-digit code, verify balance and expiry appear, tap Complete Sale"
    expected: "Sale completes, receipt shows gift card last 4 digits and amount applied. Gift card balance is now deducted in admin dashboard (bug was fixed in Plan 35-06)"
    why_human: "Requires iPad POS hardware and a live Supabase instance"
---

# Phase 35: Gift Cards Add-On Verification Report

**Phase Goal:** Merchants can sell digital gift cards and customers can redeem them in-store and online, with full NZ Fair Trading Act 2024 compliance
**Verified:** 2026-04-07T00:40:00Z
**Status:** human_needed — all automated checks pass, 3 items require live-stack testing
**Re-verification:** Yes — after gap closure (Plan 35-06)

## Re-Verification Summary

Previous verification (2026-04-06) found 1 blocker: `completeSale.ts` called `redeem_gift_card` RPC with parameter `p_code` (TEXT) instead of `p_gift_card_id` (UUID), causing silent redemption failure at POS.

Plan 35-06 fixed both outstanding issues:
- Added gift card UUID lookup before RPC call in `completeSale.ts` (matching the pattern already correct in `createCheckoutSession.ts`)
- Updated REQUIREMENTS.md GIFT-04 checkbox from `[ ]` to `[x]` with traceability row from "Pending" to "Complete"

Both fixes verified below. No regressions detected.

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Merchant can subscribe to Gift Cards add-on and feature activates | VERIFIED | addons.ts has gift_cards in all 4 structures; billing webhook auto-activates has_gift_cards via PRICE_TO_FEATURE; requireFeature gates admin/gift-cards |
| 2 | Gift card expiry cannot be less than 3 years (NZ Fair Trading Act) | VERIFIED | CONSTRAINT gift_card_expiry_3yr CHECK (expires_at >= issued_at + INTERVAL '3 years') in 033_gift_cards.sql — enforced at DB level |
| 3 | Staff can issue a gift card at POS and buyer receives code by email | VERIFIED | issueGiftCard.ts: resolveStaffAuth, 10-attempt unique code generation, issue_gift_card RPC call, void sendEmail() fire-and-forget with GiftCardEmail |
| 4 | Customer can purchase a gift card on the storefront and receive code by email | VERIFIED | purchaseGiftCardOnline.ts creates Stripe session with type='gift_card'; webhook handleGiftCardCheckoutComplete issues card + sends email |
| 5 | Gift card code is 8-digit numeric, unique per store | VERIFIED | gift-card-utils.ts: generateGiftCardCode() with padStart(8,'0'); issueGiftCard has 10-attempt retry loop checking store_id + code uniqueness |
| 6 | Gift card issuance never writes to the orders table | VERIFIED | issueGiftCard.ts calls issue_gift_card RPC only (no orders insert); webhook gift_card path returns early before order logic |
| 7 | Email shows code, balance, expiry (bold red), and store name | VERIFIED | GiftCardEmail.tsx: monospace 30px code block, formatNZD(balanceCents), expiry in #DC2626 bold with strong tag, storeName display |
| 8 | Gift Card appears as third payment method at POS alongside EFTPOS and Cash | VERIFIED | PaymentMethodToggle.tsx: showGiftCard prop renders third button; cart.ts: paymentMethod union includes 'gift_card'; POSClientShell renders GiftCardCodeEntryScreen on gift_card_entry phase |
| 9 | Gift card balance is deducted atomically when staff complete a POS sale using a gift card | VERIFIED | completeSale.ts now looks up gift card UUID via .from('gift_cards').select('id').eq('store_id',...).eq('code',...).maybeSingle(), then passes p_gift_card_id: giftCard.id to redeem_gift_card RPC — matching pattern in createCheckoutSession.ts |
| 10 | Customer can redeem a gift card during online checkout (full-cover bypass + partial Stripe) | VERIFIED | GiftCardInput in CartDrawer; createCheckoutSession full-cover path creates order + calls complete_online_sale + redeem_gift_card; partial-cover uses negative Stripe line item + webhook deduction |
| 11 | Merchant can view gift card list with balances, status filters, and void capability | VERIFIED | Admin gift-cards page with GiftCardDataTable (7 columns, pagination, filters); GiftCardDetailDrawer with timeline; voidGiftCard owner-only action calls void_gift_card RPC |

**Score:** 11/11 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `supabase/migrations/033_gift_cards.sql` | gift_cards + gift_card_redemptions tables, 3 RPCs, RLS, 3yr constraint | VERIFIED | All tables, RPCs (issue/redeem/void), REVOKE/GRANT pattern, FOR UPDATE row lock, 3yr CHECK constraint |
| `src/config/addons.ts` | gift_cards in all 4 type structures | VERIFIED | 6 occurrences — SubscriptionFeature, FeatureFlags, PRICE_ID_MAP, PRICE_TO_FEATURE, FEATURE_TO_COLUMN, ADDONS |
| `src/actions/billing/createSubscriptionCheckoutSession.ts` | gift_cards in featureSchema | VERIFIED | z.enum includes 'gift_cards' |
| `src/app/admin/gift-cards/layout.tsx` | requireFeature gate | VERIFIED | requireFeature('gift_cards') called |
| `src/app/admin/settings/gift-cards/page.tsx` | Denomination management page | VERIFIED | File exists, renders DenominationManager |
| `src/actions/gift-cards/issueGiftCard.ts` | POS issuance server action | VERIFIED | 'use server', server-only, resolveStaffAuth, issue_gift_card RPC, sendEmail |
| `src/actions/gift-cards/purchaseGiftCardOnline.ts` | Online purchase server action | VERIFIED | Stripe session with metadata.type='gift_card', denomination validation |
| `src/actions/gift-cards/validateGiftCard.ts` | Code validation (shared POS + online) | VERIFIED | normalizeGiftCardCode (strips non-digits), effectiveGiftCardStatus, 4 error codes |
| `src/emails/GiftCardEmail.tsx` | Gift card delivery email template | VERIFIED | Monospace 30px code, #DC2626 bold expiry, formatNZD balance, storeName |
| `src/lib/gift-card-utils.ts` | Pure utility module (testable without server-only) | VERIFIED | generateGiftCardCode, formatGiftCardCode, normalizeGiftCardCode, effectiveGiftCardStatus, computeGiftCardSplit |
| `src/app/(store)/gift-cards/page.tsx` | Storefront gift cards purchase page | VERIFIED | RSC, x-store-id header routing, has_gift_cards check, denomination pills |
| `src/components/store/GiftCardPurchaseForm.tsx` | Denomination pills + purchase form | VERIFIED | role="radiogroup", aria-checked, amber selected state, amber CTA |
| `src/lib/cart.ts` | Extended cart state machine | VERIFIED | paymentMethod includes 'gift_card', 6 new CartState fields, 4 new CartAction types, auto-split logic |
| `src/components/pos/GiftCardCodeEntryScreen.tsx` | Full-screen POS code entry modal | VERIFIED | inputMode="numeric", XXXX-XXXX auto-format, validateGiftCard call, 4 error states, split remainder buttons |
| `src/components/pos/PaymentMethodToggle.tsx` | Three-button payment toggle | VERIFIED | showGiftCard prop, backward compatible 2-button default |
| `src/actions/orders/completeSale.ts` | Gift card redemption on POS sale | VERIFIED | Looks up UUID by store_id+code, passes p_gift_card_id: giftCard.id — p_code no longer present (grep confirmed 0 matches) |
| `src/components/store/GiftCardInput.tsx` | Collapsible online checkout gift card entry | VERIFIED | collapsed/expanded/applied states, full-cover detection, validateGiftCard call |
| `src/actions/orders/createCheckoutSession.ts` | Gift card checkout bypass + partial payment | VERIFIED | Server re-validates gift card amount, full-cover creates order + complete_online_sale + redeem_gift_card, partial uses negative Stripe line item |
| `src/app/admin/gift-cards/page.tsx` | Admin gift cards list page | VERIFIED | RSC, GiftCardDataTable with initial server data |
| `src/components/admin/gift-cards/GiftCardDataTable.tsx` | Server-paginated data table | VERIFIED | 7 columns, bg-navy header, status filter, search, pagination, listGiftCards call |
| `src/components/admin/gift-cards/GiftCardDetailDrawer.tsx` | Detail drawer with timeline | VERIFIED | role="dialog" aria-modal, font-mono code, transaction timeline, void action (owner-only) |
| `src/actions/gift-cards/voidGiftCard.ts` | Void gift card server action | VERIFIED | role === 'owner' check, min 4 char reason, void_gift_card RPC, revalidatePath |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| src/config/addons.ts | src/app/api/webhooks/stripe/billing/route.ts | PRICE_TO_FEATURE has_gift_cards | VERIFIED | PRICE_TO_FEATURE maps STRIPE_PRICE_GIFT_CARDS to 'has_gift_cards' |
| src/actions/gift-cards/issueGiftCard.ts | supabase RPC issue_gift_card | supabase.rpc('issue_gift_card') | VERIFIED | (supabase as any).rpc('issue_gift_card', ...) |
| src/actions/gift-cards/purchaseGiftCardOnline.ts | Stripe Checkout Session | stripe.checkout.sessions.create | VERIFIED | Session created with metadata.type='gift_card' |
| src/app/api/webhooks/stripe/route.ts | issueGiftCard (handleGiftCardCheckoutComplete) | metadata.type === 'gift_card' | VERIFIED | Branch detected and handled, returns early |
| src/components/pos/GiftCardCodeEntryScreen.tsx | validateGiftCard | server action call | VERIFIED | Import and call confirmed |
| src/lib/cart.ts | src/actions/orders/completeSale.ts | giftCardCode in cart state | VERIFIED | cart.giftCardCode passed to completeSale |
| src/actions/orders/completeSale.ts | supabase RPC redeem_gift_card | p_gift_card_id UUID | VERIFIED | UUID lookup from gift_cards table precedes RPC call; p_gift_card_id: giftCard.id at line 103 |
| src/components/admin/gift-cards/GiftCardDataTable.tsx | listGiftCards | server action | VERIFIED | Import and call confirmed |
| src/components/admin/gift-cards/GiftCardDetailDrawer.tsx | getGiftCard + voidGiftCard | server actions | VERIFIED | Both imported and called |
| src/components/store/StorefrontHeader.tsx | /gift-cards | Gift Cards nav link | VERIFIED | {hasGiftCards && Link href="/gift-cards"} |
| src/components/store/CartDrawer.tsx | GiftCardInput | embedded component | VERIFIED | {hasGiftCards && GiftCardInput ...} |
| src/actions/orders/createCheckoutSession.ts | supabase RPC redeem_gift_card | full-cover bypass | VERIFIED | Looks up UUID by code first, passes p_gift_card_id correctly |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|-------------------|--------|
| GiftCardPurchaseForm.tsx | denominations | stores.gift_card_denominations JSONB | Yes — fetched server-side in RSC page | FLOWING |
| GiftCardDataTable.tsx | data/total | listGiftCards server action → gift_cards table | Yes — Supabase query with RLS scoping | FLOWING |
| GiftCardDetailDrawer.tsx | giftCard + redemptions | getGiftCard server action → gift_cards + gift_card_redemptions | Yes — full gift card + redemptions array | FLOWING |
| GiftCardCodeEntryScreen.tsx | balanceCents/expiresAt | validateGiftCard → gift_cards DB query | Yes — real DB query, effectiveGiftCardStatus | FLOWING |
| GiftCardInput.tsx (CartDrawer) | appliedGiftCard | validateGiftCard server action | Yes — real DB query | FLOWING |
| AdminSidebar.tsx | hasGiftCards | admin/layout.tsx → store_plans.has_gift_cards | Yes — admin client query per request (not JWT) | FLOWING |

### Behavioral Spot-Checks

| Behavior | Check | Result | Status |
|----------|-------|--------|--------|
| 16 gift card tests pass (GREEN) | npx vitest run gift-card-utils.test.ts pos-cart-gift-card.test.ts | 16/16 passed (verified in initial run) | PASS |
| redeem_gift_card RPC signature in migration | grep p_gift_card_id migration | p_gift_card_id UUID confirmed | PASS |
| completeSale.ts passes p_gift_card_id (correct) | grep p_gift_card_id completeSale.ts | p_gift_card_id: giftCard.id at line 103 | PASS |
| completeSale.ts no longer passes p_code (wrong) | grep p_code completeSale.ts | 0 matches — removed | PASS |
| Gift card UUID lookup present in completeSale.ts | grep ".from('gift_cards')" completeSale.ts | .from('gift_cards').select('id').eq('store_id',...).eq('code',...).maybeSingle() | PASS |
| createCheckoutSession.ts passes p_gift_card_id (correct — unchanged) | grep p_gift_card_id createCheckoutSession.ts | Looks up UUID before calling RPC | PASS |
| Xero sync has zero gift_card references | grep -r gift_card src/lib/xero/ src/app/api/cron/ | 0 matches | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| GIFT-01 | 35-01 | Merchant can enable Gift Cards add-on ($14/mo) | SATISFIED | addons.ts + billing webhook + requireFeature gate |
| GIFT-02 | 35-01 | Merchant can configure gift card denominations | SATISFIED | DenominationManager UI + updateGiftCardDenominations server action + stores.gift_card_denominations |
| GIFT-03 | 35-00, 35-02 | Customer can purchase a digital gift card (unique code) | SATISFIED | purchaseGiftCardOnline + webhook handleGiftCardCheckoutComplete + 8-digit unique code generation |
| GIFT-04 | 35-02 | Customer receives gift card code and expiry via email | SATISFIED | GiftCardEmail.tsx renders code+balance+expiry; sendEmail() called in issueGiftCard and webhook. REQUIREMENTS.md checkbox now [x] Complete |
| GIFT-05 | 35-01 | Gift card expiry minimum 3 years (NZ Fair Trading Act) | SATISFIED | CONSTRAINT gift_card_expiry_3yr in migration — DB-enforced |
| GIFT-06 | 35-00, 35-03 | Staff can redeem gift card at POS (enter code, validate balance) | SATISFIED | Cart state machine + GiftCardCodeEntryScreen + validateGiftCard + completeSale.ts RPC fix (Plan 35-06) |
| GIFT-07 | 35-04 | Customer can redeem gift card during online checkout | SATISFIED | GiftCardInput in CartDrawer + createCheckoutSession full-cover/partial paths + webhook deduction |
| GIFT-08 | 35-03 | Gift card supports partial redemption with remaining balance tracked | SATISFIED | Cart auto-split logic correct; gift_card_redemptions table tracks balance_after_cents; POS redemption RPC bug fixed |
| GIFT-09 | 35-02 | Gift card issuance recorded as deferred liability (not revenue) | SATISFIED | issueGiftCard never touches orders table; gift_cards is separate table; webhook gift_card path returns early |
| GIFT-10 | 35-05 | Merchant can view gift card list with balances, status, and history | SATISFIED | GiftCardDataTable + GiftCardDetailDrawer + listGiftCards + getGiftCard + voidGiftCard |
| GIFT-11 | 35-01 | Gift card issuance excluded from Xero sync | SATISFIED | grep confirms zero gift_card references in src/lib/xero/ and src/app/api/cron/ |

### Anti-Patterns Found

No blockers or warnings. The two items flagged in the initial verification have been resolved:
- `p_code` parameter removed from `completeSale.ts` — UUID lookup pattern now correct
- REQUIREMENTS.md GIFT-04 checkbox updated to `[x]` — documentation consistent with implementation

### Human Verification Required

#### 1. Email Delivery End-to-End

**Test:** Purchase a gift card on the storefront, complete Stripe payment, wait for webhook
**Expected:** Email arrives with XXXX-XXXX formatted code in monospace box, NZD balance, expiry date in bold red (#DC2626) formatted as 'd MMMM yyyy'
**Why human:** Requires live Stripe + email provider configured and running

#### 2. Stripe Billing Subscription Activation

**Test:** Click Gift Cards add-on card on billing page, subscribe at $14/mo via Stripe, return to admin
**Expected:** has_gift_cards = true in store_plans; Add-ons section appears in sidebar with Gift Cards link; /admin/gift-cards/ is accessible
**Why human:** Requires live Stripe subscription and webhook delivery

#### 3. POS Gift Card Payment Flow (Bug Fixed — Ready to Test)

**Test:** Enter a valid gift card code at POS, complete sale, verify gift card balance is reduced in admin dashboard
**Expected:** Receipt shows gift card last 4 digits, amount applied, remaining balance. Gift card detail drawer shows redemption event in timeline. Balance in DB is correctly reduced (Plan 35-06 fix applied).
**Why human:** Requires iPad POS hardware and a live Supabase instance

### Gaps Summary

No gaps remain. All 11 observable truths are VERIFIED. The single blocker from the initial verification — the `p_code` / `p_gift_card_id` parameter mismatch in `completeSale.ts` — has been fixed by Plan 35-06.

The fix adds a gift card lookup query (`.from('gift_cards').select('id').eq('store_id', staff.store_id).eq('code', parsed.data.gift_card_code).maybeSingle()`) before calling the RPC, then passes `p_gift_card_id: giftCard.id`. This matches the pattern already used correctly in `createCheckoutSession.ts`. The old `p_code` parameter is absent from the file (confirmed by grep).

The documentation inconsistency (GIFT-04 checkbox unchecked) was also resolved — REQUIREMENTS.md now shows `[x] GIFT-04` with "Complete" in the traceability table.

The phase is ready to mark complete pending live-stack human verification of email delivery, Stripe billing activation, and the POS redemption flow.

---

_Verified: 2026-04-07T00:40:00Z_
_Verifier: Claude (gsd-verifier)_
