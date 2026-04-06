---
phase: 35-gift-cards-add-on
plan: "01"
subsystem: gift-cards
tags: [database, billing, admin, rls, rpc, feature-gate]
dependency_graph:
  requires: [35-00]
  provides: [gift_cards_schema, gift_cards_billing_pipeline, gift_cards_admin_shell]
  affects: [src/config/addons.ts, src/app/admin/layout.tsx, src/components/admin/AdminSidebar.tsx]
tech_stack:
  added: []
  patterns: [SECURITY_DEFINER_RPC, requireFeature_gate, tenant_RLS, integer_cents]
key_files:
  created:
    - supabase/migrations/033_gift_cards.sql
    - src/app/admin/gift-cards/layout.tsx
    - src/app/admin/settings/gift-cards/page.tsx
    - src/components/admin/settings/DenominationManager.tsx
    - src/actions/settings/updateGiftCardDenominations.ts
  modified:
    - src/config/addons.ts
    - src/actions/billing/createSubscriptionCheckoutSession.ts
    - src/components/admin/billing/AddOnCard.tsx
    - src/components/admin/AdminSidebar.tsx
    - src/app/admin/layout.tsx
    - .env.example
decisions:
  - "gift_cards table is completely separate from orders table — gift card issuance is deferred liability, not revenue"
  - "3-year minimum expiry enforced by DB CHECK constraint (CONSTRAINT gift_card_expiry_3yr) — NZ Fair Trading Act 2024"
  - "All 3 RPCs (issue, redeem, void) use REVOKE FROM PUBLIC + GRANT TO service_role — no direct authenticated-user access"
  - "has_gift_cards queried from store_plans via admin client in layout — not from JWT claims — to ensure freshness for sidebar nav"
  - "GIFT-11 verified at migration time: zero gift_card references in src/lib/xero/ and cron/xero-sync/"
metrics:
  duration: "4 min"
  completed_date: "2026-04-06T12:05:36Z"
  tasks_completed: 2
  tasks_total: 2
  files_created: 5
  files_modified: 6
---

# Phase 35 Plan 01: Gift Card Database Schema, Billing Pipeline, and Admin Shell Summary

**One-liner:** PostgreSQL gift card schema with NZ-Fair-Trading-Act-enforced 3-year expiry, three SECURITY DEFINER RPCs (issue/redeem/void), billing pipeline extended to $14/mo gift_cards add-on, and admin sidebar Add-ons section with denomination management UI.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Create gift card database schema and atomic RPCs | baca59d | supabase/migrations/033_gift_cards.sql |
| 2 | Extend billing pipeline and admin navigation for gift cards | ac55d7f | src/config/addons.ts, AdminSidebar.tsx, admin/layout.tsx, gift-cards/layout.tsx, settings/gift-cards/page.tsx |

## What Was Built

### Task 1 — Database Schema (033_gift_cards.sql)

- `store_plans.has_gift_cards BOOLEAN NOT NULL DEFAULT false` — feature flag column
- `store_plans.has_gift_cards_manual_override BOOLEAN` — super admin comp override
- `stores.gift_card_denominations JSONB DEFAULT '[2500, 5000, 10000]'` — $25/$50/$100 defaults
- `gift_cards` table: UUID PK, code, original_value_cents/balance_cents (integer cents), status enum (active/redeemed/expired/voided), issued_at/expires_at, `CONSTRAINT gift_card_expiry_3yr CHECK (expires_at >= issued_at + INTERVAL '3 years')`, purchase_channel, buyer_email, stripe_session_id, UNIQUE(store_id, code)
- `gift_card_redemptions` table: append-only audit log (SELECT/INSERT RLS only, no UPDATE/DELETE)
- 5 indexes: store_id, store+code, store+status on gift_cards; gift_card_id and store_id on redemptions
- RLS: both tables enabled with tenant isolation via `auth.jwt() -> 'app_metadata' ->> 'store_id'`
- `issue_gift_card` RPC: SECURITY DEFINER, sets expires_at = now() + 3 years, inserts gift card, returns JSONB
- `redeem_gift_card` RPC: SECURITY DEFINER, `SELECT FOR UPDATE` row lock, validates status/expiry/balance, deducts, inserts redemption record
- `void_gift_card` RPC: SECURITY DEFINER, validates active status, sets voided/zeroes balance
- All 3 RPCs: `REVOKE EXECUTE FROM PUBLIC` + `GRANT EXECUTE TO service_role`

### Task 2 — Billing Pipeline and Admin Navigation

**src/config/addons.ts:**
- `SubscriptionFeature` union extended: `'gift_cards'`
- `FeatureFlags` interface: `has_gift_cards: boolean`
- `PRICE_ID_MAP`: `gift_cards: process.env.STRIPE_PRICE_GIFT_CARDS ?? ''`
- `PRICE_TO_FEATURE`: conditional spread for STRIPE_PRICE_GIFT_CARDS → `'has_gift_cards'`
- `FEATURE_TO_COLUMN`: `gift_cards: 'has_gift_cards'`
- `ADDONS` array: Gift Cards entry with NZ Fair Trading Act benefit line

**Billing webhook:** No changes needed — existing PRICE_TO_FEATURE map auto-activates `has_gift_cards` on subscription via the generic webhook handler.

**featureSchema:** `z.enum([..., 'gift_cards'])` — checkout session action accepts gift_cards as valid feature.

**AddOnCard.tsx:** `Gift` icon from lucide-react imported and rendered for `feature === 'gift_cards'`.

**AdminSidebar.tsx:** `hasGiftCards?: boolean` prop added. Add-ons section rendered after Billing link (owner only) when `hasGiftCards === true`, with Gift Cards link to `/admin/gift-cards`.

**admin/layout.tsx:** `hasGiftCards` variable initialized, store_plans queried via admin client for `has_gift_cards`, passed to `AdminSidebar` as `hasGiftCards`.

**admin/gift-cards/layout.tsx:** `requireFeature('gift_cards')` gate — redirects to billing upgrade URL if not subscribed.

**admin/settings/gift-cards/page.tsx:** Server component fetching `gift_card_denominations` from stores, rendering `DenominationManager` client component.

**DenominationManager.tsx:** Denomination pills (border, rounded-full, semibold label, x remove button), add input with $ prefix, validation ($5-$500), server action integration via `useTransition`.

**updateGiftCardDenominations.ts:** Server action with auth check, store ownership check, `requireFeature('gift_cards')` gate, Zod validation, dedup + sort, Supabase update.

## GIFT-11 Xero Exclusion (Verified)

`grep -r "gift_card" src/lib/xero/ src/app/api/cron/xero-sync/` — zero matches confirmed.

Gift card issuance is inherently excluded from Xero sync because the `gift_cards` table is completely separate from `orders`. The Xero sync queries only the `orders` table. No code changes needed.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None. The denomination management UI is fully wired to the `stores.gift_card_denominations` column via the `updateGiftCardDenominations` server action.

## Self-Check: PASSED

| Item | Status |
|------|--------|
| supabase/migrations/033_gift_cards.sql | FOUND |
| src/config/addons.ts | FOUND |
| src/app/admin/gift-cards/layout.tsx | FOUND |
| src/app/admin/settings/gift-cards/page.tsx | FOUND |
| src/components/admin/settings/DenominationManager.tsx | FOUND |
| commit baca59d (Task 1) | FOUND |
| commit ac55d7f (Task 2) | FOUND |
