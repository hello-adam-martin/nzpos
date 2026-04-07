---
phase: 35-gift-cards-add-on
plan: "02"
subsystem: gift-cards
tags: [gift-cards, server-actions, email, stripe, webhook, storefront, navigation]
dependency_graph:
  requires: [35-00, 35-01]
  provides: [gift_card_issuance_pos, gift_card_purchase_online, gift_card_email, storefront_gift_cards_page]
  affects: [src/app/api/webhooks/stripe/route.ts, src/components/store/StorefrontHeader.tsx, src/app/(store)/layout.tsx]
tech_stack:
  added: []
  patterns: [fire_and_forget_email, as_any_untyped_tables, metadata_type_webhook_branching, server_action_with_rpc]
key_files:
  created:
    - src/actions/gift-cards/issueGiftCard.ts
    - src/actions/gift-cards/purchaseGiftCardOnline.ts
    - src/actions/gift-cards/validateGiftCard.ts
    - src/emails/GiftCardEmail.tsx
    - src/lib/gift-card-utils.ts
    - src/app/(store)/gift-cards/page.tsx
    - src/components/store/GiftCardPurchaseForm.tsx
  modified:
    - src/app/api/webhooks/stripe/route.ts
    - src/components/store/StorefrontHeader.tsx
    - src/app/(store)/layout.tsx
    - src/lib/__tests__/gift-card-utils.test.ts
decisions:
  - "Storefront gift cards page at (store)/gift-cards/page.tsx not (storefront)/[slug]/gift-cards — project uses subdomain routing with x-store-id headers, not slug params"
  - "formatNZD imported from src/lib/money.ts not src/lib/gst.ts — gst.ts has calculation utilities, money.ts has formatting"
  - "as any cast on supabase client for gift_cards table queries — generated types predate migration 033, matching pattern used in completeSale.ts"
  - "React.createElement used for GiftCardEmail in webhook context — RSC createElement pattern avoids JSX in non-JSX files"
  - "gift-card-utils.ts pure utility module created to share code between server actions and vitest tests"
metrics:
  duration: "8 min"
  completed_date: "2026-04-06T12:15:24Z"
  tasks_completed: 2
  tasks_total: 2
  files_created: 7
  files_modified: 4
---

# Phase 35 Plan 02: Gift Card Issuance (POS + Online) Summary

**One-liner:** Gift card server actions (POS issuance via RPC, online purchase via Stripe Checkout), delivery email (monospace 30px code block, red expiry per NZ FTA), storefront purchase page with denomination pills, and webhook extension to issue cards on payment completion.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Create gift card server actions and email template | d3c25d8 | issueGiftCard.ts, purchaseGiftCardOnline.ts, validateGiftCard.ts, GiftCardEmail.tsx, gift-card-utils.ts |
| 2 | Storefront gift cards page, nav link, webhook extension, layout threading | eec3f2e | (store)/gift-cards/page.tsx, GiftCardPurchaseForm.tsx, StorefrontHeader.tsx, layout.tsx, webhook route.ts |

## What Was Built

### Task 1 — Server Actions and Email Template

**src/lib/gift-card-utils.ts** (new pure utility module):
- `generateGiftCardCode()`: generates padStart(8, '0') 8-digit numeric string
- `formatGiftCardCode(code)`: formats raw code as XXXX-XXXX
- `normalizeGiftCardCode(input)`: strips non-numeric chars (Pitfall 3)
- `effectiveGiftCardStatus(status, expiresAt)`: treats active+past-expiry as expired (Pitfall 2)
- `computeGiftCardSplit(balanceCents, totalCents)`: D-06 split calculation (min + remainder)

**src/lib/__tests__/gift-card-utils.test.ts** (updated — was RED stubs from Plan 00):
- All 9 tests now GREEN — code generation, expiry validation, balance operations

**src/actions/gift-cards/issueGiftCard.ts**:
- resolveStaffAuth() for POS staff authentication
- store_plans.has_gift_cards feature gate check
- generateUniqueCode() with 10-attempt retry loop
- `(supabase as any).rpc('issue_gift_card', ...)` — SECURITY DEFINER RPC
- void sendEmail() fire-and-forget with GiftCardEmail when buyerEmail provided
- Returns `{ success, code, displayCode (XXXX-XXXX format), valueCents, expiresAt }`
- Never writes to orders table (GIFT-09)

**src/actions/gift-cards/purchaseGiftCardOnline.ts**:
- Zod validation with storeId, denominationCents, buyerEmail
- Validates denomination exists in `stores.gift_card_denominations` JSONB array
- Checks `store_plans.has_gift_cards` feature gate
- Creates Stripe Checkout Session with `metadata: { type: 'gift_card', store_id, denomination_cents, buyer_email }`
- Returns `{ url }` for client-side redirect to Stripe

**src/actions/gift-cards/validateGiftCard.ts**:
- normalizeGiftCardCode() transform on code input (Pitfall 3)
- Queries gift_cards by store_id + code (tenant-scoped)
- effectiveGiftCardStatus() for Pitfall 2 expiry detection
- Structured error codes: GIFT_CARD_NOT_FOUND, GIFT_CARD_EXPIRED, GIFT_CARD_VOIDED, GIFT_CARD_ZERO_BALANCE

**src/emails/GiftCardEmail.tsx** (React Email template):
- Store name/logo centered header with navy background (#1E293B)
- "Here's your gift card" heading — Satoshi, Display 30px, weight 700
- Code block: 2px #E7E5E4 border, 8px border-radius, monospace 30px weight 700 letter-spacing 0.1em
- Balance: DM Sans, 20px, weight 600 using formatNZD()
- Expiry: `<strong>Valid until: {date}</strong>` — 14px, bold red (#DC2626) per NZ FTA requirement
- "Redeemable at {storeName}" — 14px, #737373
- Instructions: "Use this code at checkout in-store or online." — 14px

### Task 2 — Storefront Page, Nav, Webhook Extension

**src/app/(store)/gift-cards/page.tsx** (server component):
- Reads storeId from x-store-id header (middleware-injected subdomain routing)
- Checks store_plans.has_gift_cards — notFound() if not enabled
- Fetches gift_card_denominations from stores table
- Passes denominations, storeId, and purchaseSuccess (?success=true) to GiftCardPurchaseForm

**src/components/store/GiftCardPurchaseForm.tsx** (client component):
- Denomination pills: role="radiogroup" + role="radio" + aria-checked accessibility
- Selected state: `border-amber bg-amber/10 text-amber`
- Unselected: `border-border text-text hover:border-navy`
- Helper text, buyer email field (type="email" inputMode="email")
- CTA: "Buy Gift Card — $X.XX" amber button, full-width, min-h-[48px], disabled until valid
- Inline success message with green check SVG after purchase redirect (?success=true)
- Spinner during Stripe redirect

**src/components/store/StorefrontHeader.tsx**:
- Added `hasGiftCards?: boolean` to Props type
- Conditional Gift Cards nav link: `{hasGiftCards && <Link href="/gift-cards">Gift Cards</Link>}`
- Uses same textColorClass as other nav elements for brand color compatibility

**src/app/(store)/layout.tsx**:
- Added `createSupabaseAdminClient` import
- Fetches `store_plans.has_gift_cards` via admin client (avoids RLS auth requirement for storefront)
- Passes `hasGiftCards={storePlan?.has_gift_cards ?? false}` to StorefrontHeader

**src/app/api/webhooks/stripe/route.ts** (extended):
- Idempotency check moved before the gift_card type branch (both paths benefit)
- `if (session.metadata?.type === 'gift_card')` → calls `handleGiftCardCheckoutComplete()` and returns early
- `handleGiftCardCheckoutComplete()`: generates unique code (10-attempt retry), calls issue_gift_card RPC, sends GiftCardEmail fire-and-forget, marks stripe_events for idempotency
- Normal product order path unchanged — orderId validation moved to after the gift_card branch

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Storefront page path correction**
- **Found during:** Task 2
- **Issue:** Plan referenced `src/app/(storefront)/[slug]/gift-cards/page.tsx` but the codebase uses `(store)` route group with subdomain routing via `x-store-id` headers, not `[slug]` params. The `(storefront)` group does not exist.
- **Fix:** Created page at `src/app/(store)/gift-cards/page.tsx` matching the actual routing architecture
- **Files modified:** N/A — correct path used from the start
- **Commit:** eec3f2e

**2. [Rule 1 - Bug] formatNZD import source**
- **Found during:** Task 1 (GiftCardEmail.tsx)
- **Issue:** Plan cited `src/lib/gst.ts` as the source of `formatNZD()` but the function lives in `src/lib/money.ts`
- **Fix:** Imported from `src/lib/money.ts` in all files that use it
- **Files modified:** GiftCardEmail.tsx, GiftCardPurchaseForm.tsx

**3. [Rule 2 - Missing critical functionality] Pure utility module extracted**
- **Found during:** Task 1 (implementation)
- **Issue:** Plan 00 test stubs couldn't import implementations (server actions import 'server-only' which is incompatible with Vitest). Tests need a pure utility module.
- **Fix:** Created `src/lib/gift-card-utils.ts` as a pure, server-only-free module. Updated plan 00 test stubs from RED to GREEN.
- **Files modified:** src/lib/gift-card-utils.ts (new), src/lib/__tests__/gift-card-utils.test.ts
- **Commit:** d3c25d8

## Known Stubs

None. All data is wired to live Supabase queries and Stripe APIs.

## Self-Check: PASSED

Files created:
- FOUND: src/actions/gift-cards/issueGiftCard.ts
- FOUND: src/actions/gift-cards/purchaseGiftCardOnline.ts
- FOUND: src/actions/gift-cards/validateGiftCard.ts
- FOUND: src/emails/GiftCardEmail.tsx
- FOUND: src/lib/gift-card-utils.ts
- FOUND: src/app/(store)/gift-cards/page.tsx
- FOUND: src/components/store/GiftCardPurchaseForm.tsx

Files modified:
- FOUND: src/app/api/webhooks/stripe/route.ts
- FOUND: src/components/store/StorefrontHeader.tsx
- FOUND: src/app/(store)/layout.tsx

Commits:
- FOUND: d3c25d8 (feat(35-02): gift card server actions, email template, and utility library)
- FOUND: eec3f2e (feat(35-02): storefront gift cards page, nav link, webhook extension, and layout threading)

Tests: 9/9 passing (gift-card-utils.test.ts — was 9/9 RED, now 9/9 GREEN)
