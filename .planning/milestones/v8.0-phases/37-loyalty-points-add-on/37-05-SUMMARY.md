---
phase: 37
plan: "05"
subsystem: loyalty-storefront
tags: [loyalty, online-checkout, storefront, privacy, customer-account]
dependency_graph:
  requires: ["37-03", "37-04"]
  provides: ["online-loyalty-redemption", "customer-profile-loyalty", "privacy-banner"]
  affects: ["src/actions/orders/createCheckoutSession.ts", "src/app/(store)/account/profile/page.tsx", "src/components/store/CartDrawer.tsx"]
tech_stack:
  added: []
  patterns:
    - "Loyalty negative Stripe line item (mirrors gift card pattern)"
    - "Server-side loyalty balance validation before checkout"
    - "Loyalty full-cover path bypasses Stripe (mirrors gift card full-cover)"
    - "One-time dismissible privacy banner backed by DB timestamp"
    - "Client-side loyalty fetch on CartDrawer open for authenticated users"
key_files:
  created:
    - src/actions/loyalty/getCustomerLoyalty.ts
    - src/components/store/LoyaltyBanner.tsx
    - src/components/store/LoyaltyBalanceSection.tsx
    - src/components/store/LoyaltyRedeemControl.tsx
    - src/components/store/__tests__/LoyaltyBanner.test.tsx
  modified:
    - src/actions/orders/createCheckoutSession.ts
    - src/app/(store)/account/profile/page.tsx
    - src/components/store/CartDrawer.tsx
decisions:
  - "Loyalty full-cover uses loyalty_{orderId} placeholder session ID (mirrors gift_card_{orderId} pattern)"
  - "getCustomerLoyaltyForCheckout created as lightweight variant of getCustomerLoyalty for CartDrawer"
  - "LoyaltyBanner extracted as separate client component (not inline in page.tsx) for testability"
  - "CartDrawer isAuthenticated prop controls whether loyalty fetch fires"
  - "Loyalty full-cover calls redeem_loyalty_points immediately (unlike partial cover which defers to webhook)"
metrics:
  duration_seconds: 421
  completed_date: "2026-04-07"
  tasks_completed: 3
  files_modified: 8
---

# Phase 37 Plan 05: Online Checkout Loyalty Redemption + Profile Page Summary

Online customers can redeem loyalty points as a negative Stripe line item during checkout, view their points balance on the account profile page, and see a one-time privacy notice banner on first visit when loyalty activates.

## Tasks Completed

### Task 1: Online checkout points redemption in createCheckoutSession
**Commit:** f8d50f5

Extended `createCheckoutSession` with full loyalty redemption support:
- Added `loyalty_points_to_redeem` to Zod schema
- Server-side balance validation: queries `loyalty_points` + `loyalty_settings` tables, validates `is_active`, `redeem_rate_cents`, and that balance >= requested redemption
- Gets authenticated customer email from `createSupabaseServerClient()` to look up `customer_id`
- Negative Stripe line item "Loyalty Points Applied" (mirrors gift card pattern)
- Loyalty metadata in Stripe session: `loyalty_customer_id`, `loyalty_points_redeemed`, `loyalty_discount_cents` — for webhook to process after payment confirms
- Full-cover loyalty path: bypasses Stripe entirely, calls `complete_online_sale` with `loyalty_{orderId}` placeholder, then calls `redeem_loyalty_points` immediately
- CRITICAL: No `redeem_loyalty_points` RPC call for partial cover (webhook handles it)

### Task 2: Customer account profile loyalty section + privacy banner
**Commit:** 8dbcb12

Created `src/actions/loyalty/getCustomerLoyalty.ts`:
- `getCustomerLoyalty()`: full data fetch — points balance, transactions (last 10), banner dismissed state, is_active check, dollar value calculation
- `dismissLoyaltyBanner()`: upserts `loyalty_points` row with `loyalty_banner_dismissed_at = now()`
- `getCustomerLoyaltyForCheckout()`: lightweight variant returning only `{ pointsBalance, redeemRateCents, isActive }` for CartDrawer

Created `LoyaltyBanner` client component:
- Info-tinted (blue #3B82F6) dismissible banner with "You're now earning loyalty points!" heading
- `role="banner"` with `aria-live="polite"`, dismiss button with `aria-label="Dismiss loyalty notice"`
- 150ms ease-in fade-out animation on dismiss
- Calls `dismissLoyaltyBanner` server action on OK click

Created `LoyaltyBalanceSection` server component:
- Points balance in DM Sans 20px/700 with `font-feature-settings: 'tnum' 1`
- Dollar value in label size below
- Transaction history table: date (date-fns), description with order ID in Geist Mono, +/- points in green/amber
- Empty state: "No loyalty transactions yet."

Updated `profile/page.tsx`:
- Fetches loyalty data server-side via `getCustomerLoyalty()`
- Renders `LoyaltyBanner` above profile form (D-11 compliance)
- Renders `LoyaltyBalanceSection` below profile form when isActive

**Tests:** 9/9 passing for LoyaltyBanner (render conditions, accessibility, dismiss behavior)

### Task 3: Storefront checkout UI - "Use points" control in CartDrawer
**Commit:** c7bc061

Created `LoyaltyRedeemControl` client component:
- Hidden when loyalty not active or balance is 0
- Displays "N pts available ($X.XX)" with amber "Use Points" button
- Toggle: ON calls `onRedeemChange(pointsBalance)`, OFF calls `onRedeemChange(0)`
- Applied state: green success row with "Remove" link (mirrors GiftCardInput pattern)
- `calculateRedemptionDiscount` from loyalty-utils for dollar calculation

Updated `CartDrawer`:
- Added `isAuthenticated` prop to control loyalty fetch
- `loyaltyPointsToRedeem` state (reset on drawer close)
- `loyaltyData` state fetched via `getCustomerLoyaltyForCheckout()` on drawer open
- `LoyaltyRedeemControl` rendered after gift card section
- Loyalty discount line displayed in cart summary when points applied
- `loyalty_points_to_redeem` passed to `createCheckoutSession` in checkout handler
- `isFullyCoveredByLoyalty` flag drives "Complete Order" CTA (no Stripe needed)

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all data wiring is complete:
- `getCustomerLoyalty` reads from live `loyalty_points`, `loyalty_settings`, `loyalty_transactions` tables
- `dismissLoyaltyBanner` writes `loyalty_banner_dismissed_at` to DB
- `createCheckoutSession` validates server-side and stores metadata for webhook

## Self-Check: PASSED

All files created/modified:
- FOUND: src/actions/loyalty/getCustomerLoyalty.ts
- FOUND: src/components/store/LoyaltyBanner.tsx
- FOUND: src/components/store/LoyaltyBalanceSection.tsx
- FOUND: src/components/store/LoyaltyRedeemControl.tsx
- FOUND: src/components/store/__tests__/LoyaltyBanner.test.tsx

All commits exist:
- FOUND: f8d50f5 (Task 1: createCheckoutSession loyalty redemption)
- FOUND: 8dbcb12 (Task 2: profile page loyalty section + privacy banner)
- FOUND: c7bc061 (Task 3: LoyaltyRedeemControl + CartDrawer integration)
