---
phase: 37-loyalty-points-add-on
verified: 2026-04-07T13:50:00Z
status: human_needed
score: 11/11 requirements verified
re_verification: true
previous_status: gaps_found
previous_score: 9/11 truths verified
gaps_closed:
  - "Staff can look up a customer by name/email during POS checkout (LOYAL-04) — POS page now passes hasLoyalty={hasLoyalty} and redeemRateCents={redeemRateCents} to POSClientShell"
  - "Staff can apply customer's points as discount during POS checkout (LOYAL-09) — same POS page fix unblocks LoyaltyRedemptionRow"
  - "Customer can redeem points during online checkout (LOYAL-08) — storefront layout now passes isAuthenticated={isCustomer} to CartDrawer"
gaps_remaining: []
regressions: []
human_verification:
  - test: "Subscribe merchant to Loyalty Points add-on, configure rates, ring up a POS sale with a customer attached"
    expected: "Points earned appear on customer loyalty account after sale completes"
    why_human: "Requires running Supabase instance with migration applied, Stripe add-on subscription, and actual sale completion through UI"
  - test: "Online checkout with logged-in customer who has loyalty points — toggle Use Points control"
    expected: "Stripe checkout shows negative 'Loyalty Points Applied' line item, points deducted after payment"
    why_human: "Requires Stripe webhook round-trip which cannot be verified statically"
  - test: "First-visit privacy banner on account profile page after loyalty activates"
    expected: "Blue info banner appears, can be dismissed with OK, does not reappear on next visit"
    why_human: "Requires real DB state (loyalty_banner_dismissed_at) and live session"
---

# Phase 37: Loyalty Points Add-On Verification Report (Re-Verification)

**Phase Goal:** Loyalty Points Add-On — DB schema, billing integration, admin settings, POS customer lookup with privacy consent, earn/redeem points on POS and online sales, customer account profile, admin customer loyalty views.
**Verified:** 2026-04-07T13:50:00Z
**Status:** human_needed
**Re-verification:** Yes — after gap closure plan 37-07

## Re-Verification Summary

Previous status: `gaps_found` (9/11 truths, 3 requirement IDs blocked)
Current status: `human_needed` (11/11 truths verified, 0 automated gaps remain)

**Gaps closed:** All three gaps resolved by plan 37-07 (commits b76172b, 2cc0128, fc874af):
- Gap 1 (LOYAL-04 + LOYAL-09): `src/app/(pos)/pos/page.tsx` now queries `has_loyalty_points` from `store_plans` and conditionally fetches `redeem_rate_cents` from `loyalty_settings`, passing `hasLoyalty` and `redeemRateCents` to `POSClientShell`
- Gap 2 (LOYAL-08): `src/app/(store)/layout.tsx` now passes `isAuthenticated={isCustomer}` to `CartDrawer`

**Regressions:** None — 17 loyalty tests still GREEN; all previously-verified artifacts confirmed intact.

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Merchant can subscribe to Loyalty Points add-on at $15/mo | ✓ VERIFIED | addons.ts loyalty_points in SubscriptionFeature union, PRICE_ID_MAP, PRICE_TO_FEATURE, FEATURE_TO_COLUMN, ADDONS; billing webhook maps STRIPE_PRICE_LOYALTY to has_loyalty_points |
| 2 | Merchant can configure earn rate in admin loyalty settings | ✓ VERIFIED | saveLoyaltySettings validates earn_rate_cents; getLoyaltySettings reads loyalty_settings; /admin/loyalty feature-gated |
| 3 | Merchant can configure redeem rate in admin loyalty settings | ✓ VERIFIED | Same saveLoyaltySettings validates redeem_rate_cents |
| 4 | Staff can look up a customer by name/email during POS checkout | ✓ VERIFIED | POS page (line 66-68) now includes has_loyalty_points in SELECT; hasLoyalty derived on line 77; passed to POSClientShell on line 100 — Add Customer button visible for subscribed merchants |
| 5 | Staff can create new customer with privacy consent checkbox | ✓ VERIFIED | quickAddCustomer has consent_given: z.literal(true); CustomerLookupSheet has IPP 3A consent text; enabled by same hasLoyalty gate now fixed |
| 6 | Cart state carries attached customer and loyalty discount | ✓ VERIFIED | cart.ts has all 5 CartState fields, 4 CartAction types, 4 reducer cases; 17 tests GREEN |
| 7 | Staff can apply/remove loyalty points discount at POS | ✓ VERIFIED | LoyaltyRedemptionRow wired via CartPanel APPLY_LOYALTY_DISCOUNT; now unblocked by POS page fix |
| 8 | Customer earns points after POS sale when identified | ✓ VERIFIED | completeSale.ts calls earn_loyalty_points RPC with net amount (D-09) |
| 9 | Customer earns points after online order | ✓ VERIFIED | Stripe webhook calls earn_loyalty_points after complete_online_sale |
| 10 | Customer can view points balance on account profile | ✓ VERIFIED | getCustomerLoyalty + LoyaltyBalanceSection on profile page; LoyaltyBanner present |
| 11 | Customer can redeem points during online checkout | ✓ VERIFIED | CartDrawer now receives isAuthenticated={isCustomer} on layout line 68; loyalty data fetch fires for authenticated customers; LoyaltyRedeemControl renders |
| 12 | Merchant can see points column in admin customer table | ✓ VERIFIED | getCustomers batch-fetches loyalty_points; CustomerTable conditional Points column; admin customers page fetches has_loyalty_points |
| 13 | Merchant can view loyalty transaction history in customer detail | ✓ VERIFIED | getCustomerDetail queries loyalty_transactions (last 50); LoyaltySection with transaction table and empty state |

**Score:** 13/13 truths verified (all truths pass automated checks; 3 require human verification for live-system behavior)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `supabase/migrations/035_loyalty.sql` | All tables, RPCs, RLS | ✓ VERIFIED | loyalty_settings, loyalty_points, loyalty_transactions; earn/redeem RPCs; SECURITY DEFINER; RLS policies |
| `src/config/addons.ts` | loyalty_points in all maps | ✓ VERIFIED | 6 occurrences across all required structures |
| `src/lib/loyalty-utils.ts` | calculatePointsEarned, calculateRedemptionDiscount, formatLoyaltyDisplay | ✓ VERIFIED | All 3 functions; 17 tests pass |
| `src/actions/loyalty/saveLoyaltySettings.ts` | Server Action with earn/redeem validation | ✓ VERIFIED | z.number().int().positive() on both rates; upsert; server-only |
| `src/actions/loyalty/getLoyaltySettings.ts` | Read loyalty settings | ✓ VERIFIED | Queries loyalty_settings, returns defaults if no row |
| `src/app/admin/loyalty/layout.tsx` | requireFeature gate | ✓ VERIFIED | requireFeature('loyalty_points') present |
| `src/app/admin/loyalty/page.tsx` | Admin settings page | ✓ VERIFIED | Fetches settings, renders LoyaltySettingsCard |
| `src/app/admin/loyalty/LoyaltySettingsCard.tsx` | Client component with earn/redeem inputs | ✓ VERIFIED | Save, Pause toggle, setup gate present |
| `src/actions/loyalty/lookupCustomerForPOS.ts` | Type-ahead customer search | ✓ VERIFIED | z.string().min(2); ILIKE with loyalty_points LEFT JOIN |
| `src/actions/loyalty/quickAddCustomer.ts` | Create POS customer with consent | ✓ VERIFIED | consent_given: z.literal(true); duplicate email detection |
| `src/lib/cart.ts` | Extended CartState with customer + loyalty | ✓ VERIFIED | All 5 fields + 4 action types + 4 reducer cases |
| `src/components/pos/CustomerLookupSheet.tsx` | Slide-in customer search panel | ✓ VERIFIED | role="dialog", aria-modal, lookupCustomerForPOS, consent text |
| `src/components/pos/LoyaltyRedemptionRow.tsx` | Points display and apply/remove row | ✓ VERIFIED | calculateRedemptionDiscount; Apply/Remove buttons |
| `src/actions/orders/completeSale.ts` | Points earning/redeem after POS sale | ✓ VERIFIED | earn_loyalty_points + redeem_loyalty_points RPC calls; non-fatal try/catch |
| `src/app/api/webhooks/stripe/route.ts` | Points earning after online sale | ✓ VERIFIED | earn_loyalty_points after complete_online_sale with p_channel='online' |
| `src/actions/orders/createCheckoutSession.ts` | Loyalty negative line item in Stripe checkout | ✓ VERIFIED | "Loyalty Points Applied" line item; loyalty metadata passed |
| `src/actions/loyalty/getCustomerLoyalty.ts` | Customer points balance + transactions | ✓ VERIFIED | loyalty_points + loyalty_transactions + store_plans queries |
| `src/app/(store)/account/profile/page.tsx` | Loyalty balance section + privacy banner | ✓ VERIFIED | getCustomerLoyalty called; LoyaltyBanner + LoyaltyBalanceSection rendered |
| `src/components/store/LoyaltyBanner.tsx` | Privacy notice component | ✓ VERIFIED | role="banner", aria-live, dismissLoyaltyBanner |
| `src/components/store/LoyaltyBalanceSection.tsx` | Points balance + transaction table | ✓ VERIFIED | tabular-nums; empty state text present |
| `src/components/store/LoyaltyRedeemControl.tsx` | Points redemption toggle | ✓ VERIFIED | onRedeemChange; calculateRedemptionDiscount; hidden when !isActive or pointsBalance<=0 |
| `src/components/store/CartDrawer.tsx` | Cart drawer with loyalty redemption | ✓ VERIFIED | LoyaltyRedeemControl rendered; loyalty_points_to_redeem passed to createCheckoutSession |
| `src/actions/customers/getCustomers.ts` | Customer list with loyalty balances | ✓ VERIFIED | batch-fetches loyalty_points; CustomerListItem has points_balance |
| `src/actions/customers/getCustomerDetail.ts` | Customer detail with loyalty transactions | ✓ VERIFIED | loyalty_transactions (last 50) + loyalty_points balance |
| `src/app/admin/customers/[id]/page.tsx` | Customer detail loyalty history | ✓ VERIFIED | LoyaltySection with transaction table and empty state |
| `src/app/(pos)/pos/page.tsx` | hasLoyalty + redeemRateCents props to POSClientShell | ✓ VERIFIED | has_loyalty_points in SELECT (line 66); hasLoyalty derived (line 77); redeemRateCents conditional fetch (lines 80-88); both passed to POSClientShell (lines 100-101) |
| `src/app/(store)/layout.tsx` | isAuthenticated prop to CartDrawer | ✓ VERIFIED | isAuthenticated={isCustomer} on CartDrawer line 68 |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| `src/config/addons.ts` | `src/app/api/webhooks/stripe/billing/route.ts` | PRICE_TO_FEATURE map | ✓ WIRED | STRIPE_PRICE_LOYALTY env var maps to has_loyalty_points |
| `src/app/admin/layout.tsx` | `src/components/admin/AdminSidebar.tsx` | hasLoyaltyPoints prop | ✓ WIRED | has_loyalty_points queried, passed as hasLoyaltyPoints to sidebar |
| `src/app/admin/loyalty/page.tsx` | `src/actions/loyalty/saveLoyaltySettings.ts` | form action | ✓ WIRED | saveLoyaltySettings called from LoyaltySettingsCard on submit |
| `src/app/admin/loyalty/layout.tsx` | `src/lib/requireFeature.ts` | requireFeature gate | ✓ WIRED | requireFeature('loyalty_points') present |
| `src/components/pos/CustomerLookupSheet.tsx` | `src/actions/loyalty/lookupCustomerForPOS.ts` | server action on search | ✓ WIRED | lookupCustomerForPOS imported and called with debounce |
| `src/components/pos/CustomerLookupSheet.tsx` | `src/lib/cart.ts` | ATTACH_CUSTOMER dispatch | ✓ WIRED | via POSClientShell onCustomerSelected callback |
| `src/components/pos/LoyaltyRedemptionRow.tsx` | `src/lib/cart.ts` | APPLY_LOYALTY_DISCOUNT dispatch | ✓ WIRED | CartPanel dispatches APPLY_LOYALTY_DISCOUNT on onApply callback |
| `src/app/(pos)/pos/page.tsx` | `src/components/pos/POSClientShell.tsx` | hasLoyalty + redeemRateCents props | ✓ WIRED (was NOT_WIRED) | has_loyalty_points in SELECT line 66; hasLoyalty={hasLoyalty} line 100; redeemRateCents={redeemRateCents} line 101 — gap closed |
| `src/actions/orders/completeSale.ts` | `earn_loyalty_points RPC` | supabase.rpc call | ✓ WIRED | rpc('earn_loyalty_points') present with D-09 net amount |
| `src/actions/orders/completeSale.ts` | `redeem_loyalty_points RPC` | supabase.rpc call | ✓ WIRED | rpc('redeem_loyalty_points') present |
| `src/app/api/webhooks/stripe/route.ts` | `earn_loyalty_points RPC` | supabase.rpc after complete_online_sale | ✓ WIRED | earn_loyalty_points called after complete_online_sale |
| `src/actions/orders/createCheckoutSession.ts` | Stripe session metadata | loyalty_customer_id, loyalty_points_redeemed | ✓ WIRED | Both fields in metadata for webhook processing |
| `src/app/(store)/account/profile/page.tsx` | `src/actions/loyalty/getCustomerLoyalty.ts` | server action call | ✓ WIRED | getCustomerLoyalty() called server-side |
| `src/components/store/CartDrawer.tsx` | `src/actions/orders/createCheckoutSession.ts` | loyalty_points_to_redeem parameter | ✓ WIRED | loyalty_points_to_redeem passed to createCheckoutSession |
| `src/components/store/LoyaltyRedeemControl.tsx` | `src/components/store/CartDrawer.tsx` | onRedeemChange callback | ✓ WIRED | setLoyaltyPointsToRedeem passed as onRedeemChange |
| `src/app/(store)/layout.tsx` | `src/components/store/CartDrawer.tsx` | isAuthenticated prop | ✓ WIRED (was NOT_WIRED) | isAuthenticated={isCustomer} on CartDrawer line 68 — gap closed |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|-------------------|--------|
| `CustomerLookupSheet.tsx` | searchResults | lookupCustomerForPOS server action | ILIKE query with loyalty_points LEFT JOIN | ✓ FLOWING — now reachable via hasLoyalty=true gate |
| `LoyaltyRedemptionRow.tsx` | loyaltyDiscountCents | cart.loyaltyDiscountCents from APPLY_LOYALTY_DISCOUNT | calculateRedemptionDiscount from real balance | ✓ FLOWING — now reachable via hasLoyalty=true gate |
| `LoyaltyRedeemControl.tsx` | loyaltyData | getCustomerLoyaltyForCheckout in CartDrawer | Real DB queries | ✓ FLOWING — now fires when isAuthenticated=true |
| `LoyaltyBalanceSection.tsx` | transactions | getCustomerLoyalty server action | Real loyalty_transactions queries | ✓ FLOWING |
| `CustomerTable.tsx` | points_balance | getCustomers with loyalty_points batch query | Real loyalty_points queries | ✓ FLOWING |
| `LoyaltySection` (customer detail) | loyalty.transactions | getCustomerDetail loyalty_transactions query | Real DB queries | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Loyalty utils + cart tests GREEN | vitest run loyalty-utils.test.ts pos-cart-loyalty.test.ts | 17 tests, 2 files pass | ✓ PASS |
| TypeScript errors in modified files | tsc --noEmit \| grep pos/page\|store\)/layout | No output — zero errors | ✓ PASS |
| POS page has_loyalty_points in SELECT | grep -c loyalty pattern in pos/page.tsx | 10 matches found | ✓ PASS |
| hasLoyalty prop passed to POSClientShell | grep "hasLoyalty={hasLoyalty}" pos/page.tsx | 1 match on line 100 | ✓ PASS |
| redeemRateCents prop passed to POSClientShell | grep "redeemRateCents={redeemRateCents}" pos/page.tsx | 1 match on line 101 | ✓ PASS |
| loyalty_settings conditional fetch | grep "loyalty_settings" pos/page.tsx | 1 match on line 83 | ✓ PASS |
| isAuthenticated prop in storefront layout | grep "isAuthenticated={isCustomer}" layout.tsx | 1 match on line 68 | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| LOYAL-01 | 37-01 | Merchant can enable Loyalty Points add-on ($15/mo) via Stripe subscription | ✓ SATISFIED | addons.ts wired; billing webhook maps STRIPE_PRICE_LOYALTY to has_loyalty_points |
| LOYAL-02 | 37-01, 37-02 | Merchant can configure points-per-dollar earn rate | ✓ SATISFIED | saveLoyaltySettings validates earn_rate_cents; admin UI at /admin/loyalty |
| LOYAL-03 | 37-01, 37-02 | Merchant can configure points-to-dollar redemption rate | ✓ SATISFIED | saveLoyaltySettings validates redeem_rate_cents; admin UI at /admin/loyalty |
| LOYAL-04 | 37-03 | Staff can look up a customer by name or email during POS checkout | ✓ SATISFIED | POS page now passes hasLoyalty={hasLoyalty} to POSClientShell; CustomerLookupSheet visible for subscribed merchants |
| LOYAL-05 | 37-04 | Customer earns loyalty points on completed POS sales when identified | ✓ SATISFIED | completeSale.ts calls earn_loyalty_points RPC with net amount (D-09) |
| LOYAL-06 | 37-04 | Customer earns loyalty points on completed online orders | ✓ SATISFIED | Stripe webhook calls earn_loyalty_points after complete_online_sale |
| LOYAL-07 | 37-05 | Customer can view points balance on account profile page | ✓ SATISFIED | getCustomerLoyalty + LoyaltyBalanceSection on profile page |
| LOYAL-08 | 37-05 | Customer can redeem points as discount during online checkout | ✓ SATISFIED | Storefront layout now passes isAuthenticated={isCustomer} to CartDrawer; loyalty data fetch fires; LoyaltyRedeemControl renders |
| LOYAL-09 | 37-03 | Staff can apply customer's points as discount during POS checkout | ✓ SATISFIED | Same POS page fix (hasLoyalty prop) unblocks LoyaltyRedemptionRow and APPLY_LOYALTY_DISCOUNT in CartPanel |
| LOYAL-10 | 37-06 | Merchant can view customer loyalty balances and transaction history in admin | ✓ SATISFIED | getCustomers returns points_balance; getCustomerDetail returns loyalty transactions; admin UI conditional on hasLoyaltyPoints |
| LOYAL-11 | 37-03, 37-05 | Privacy notice displayed to customers before loyalty enrollment | ✓ SATISFIED | IPP 3A consent checkbox in CustomerLookupSheet quickAdd; LoyaltyBanner (dismissible, role="banner") on profile page |

**All 11 requirement IDs SATISFIED. No orphaned requirements.**

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/app/(pos)/pos/page.tsx` | 63-64, 81-82 | `(supabase as any)` cast with eslint-disable for columns not in generated database.ts types | Warning | Type safety gap — pre-existing from Phase 37 migrations not regenerating types; matches established admin/layout.tsx pattern; non-blocking |
| Multiple loyalty RPC calls | Various | `(supabase as any).rpc('earn_loyalty_points')` etc. | Warning | Type safety gap; noted in 37-04 SUMMARY as post-phase cleanup |

No blocker anti-patterns remain. Both warnings are pre-existing type generation gaps documented in the SUMMARY and consistent with established codebase patterns.

### Human Verification Required

#### 1. POS Loyalty Flow End-to-End

**Test:** With a merchant subscribed to the Loyalty Points add-on and configured earn/redeem rates, open the POS and tap "Add Customer". Search for an existing customer, attach them, then apply their points discount before completing the sale.
**Expected:** Customer is attached (amber name button visible in cart header). Loyalty redemption row appears showing available points. Applying points discount updates cart total. After sale completes, customer's loyalty_points balance decrements and a new loyalty_transactions row is created with channel='pos'.
**Why human:** Requires live Supabase instance with 035_loyalty.sql migration applied, a Stripe-subscribed merchant account with has_loyalty_points=true, and a real POS checkout flow through browser UI.

#### 2. Online Checkout Loyalty Redemption End-to-End

**Test:** Log in as a customer with a positive points balance. Add items to cart. Open CartDrawer — verify LoyaltyRedeemControl is visible. Toggle "Use Points" and proceed to Stripe checkout.
**Expected:** Stripe checkout page shows "Loyalty Points Applied" as a negative line item. After payment completes, Stripe webhook fires and the customer's points_balance decrements in the loyalty_points table.
**Why human:** Requires Stripe webhook round-trip in test mode; LoyaltyRedeemControl visibility depends on live isAuthenticated=true session state; cannot verify statically.

#### 3. Privacy Banner Dismiss Persistence

**Test:** Log in as a customer for the first visit after their merchant activates loyalty. Navigate to /account/profile. Observe LoyaltyBanner. Click OK to dismiss. Navigate away and return.
**Expected:** Banner appears on first visit (loyalty_banner_dismissed_at is null). After dismiss, banner disappears immediately. On return visit, banner does not reappear (loyalty_banner_dismissed_at is now set in DB).
**Why human:** Requires real DB state inspection + multi-visit browser session to verify persistence.

### Re-Verification Summary

**Gaps closed (3/3):**

1. **LOYAL-04 — POS customer lookup now works:** `src/app/(pos)/pos/page.tsx` was fixed by plan 37-07. The store_plans SELECT now includes `has_loyalty_points` (line 66). The `hasLoyalty` boolean is derived on line 77. When true, `loyalty_settings` is queried for `redeem_rate_cents` (lines 80-88). Both `hasLoyalty={hasLoyalty}` (line 100) and `redeemRateCents={redeemRateCents}` (line 101) are passed to POSClientShell. The Add Customer button and CustomerLookupSheet are now visible for subscribed merchants.

2. **LOYAL-09 — POS loyalty redemption row now works:** Unblocked by the same POS page fix as LOYAL-04. LoyaltyRedemptionRow in CartPanel was always fully implemented — it was only invisible because hasLoyalty defaulted to false in POSClientShell. Now fixed.

3. **LOYAL-08 — Online checkout loyalty control now works:** `src/app/(store)/layout.tsx` line 68 now passes `isAuthenticated={isCustomer}` to CartDrawer. The `isCustomer` variable (already computed on line 19 via `user?.app_metadata?.role === 'customer'`) is forwarded correctly. CartDrawer's `getCustomerLoyaltyForCheckout` fetch now fires for authenticated customers, and `LoyaltyRedeemControl` renders.

**No regressions detected.** All previously-verified artifacts remain intact. Loyalty test suite: 17 tests pass across 2 files.

---

_Verified: 2026-04-07T13:50:00Z_
_Verifier: Claude (gsd-verifier)_
_Re-verification after plan 37-07 gap closure_
