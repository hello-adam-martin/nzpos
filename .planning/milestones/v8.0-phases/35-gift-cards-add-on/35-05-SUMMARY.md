---
phase: 35-gift-cards-add-on
plan: "05"
subsystem: gift-cards
tags: [admin, gift-cards, data-table, drawer, server-actions, rbac]
dependency_graph:
  requires: [35-00, 35-01, 35-02]
  provides: [gift_cards_admin_ui, gift_cards_list_page, gift_cards_detail_drawer, void_gift_card_action]
  affects:
    - src/app/admin/gift-cards/page.tsx
    - src/components/admin/gift-cards/GiftCardDataTable.tsx
    - src/components/admin/gift-cards/GiftCardStatusBadge.tsx
    - src/components/admin/gift-cards/GiftCardDetailDrawer.tsx
    - src/actions/gift-cards/voidGiftCard.ts
    - src/actions/gift-cards/listGiftCards.ts
    - src/actions/gift-cards/getGiftCard.ts
tech_stack:
  added: []
  patterns: [server_action_pagination, resolveStaffAuth, RSC_list_page, slide_in_drawer, useTransition_optimistic]
key_files:
  created:
    - src/actions/gift-cards/listGiftCards.ts
    - src/actions/gift-cards/getGiftCard.ts
    - src/actions/gift-cards/voidGiftCard.ts
    - src/app/admin/gift-cards/page.tsx
    - src/components/admin/gift-cards/GiftCardDataTable.tsx
    - src/components/admin/gift-cards/GiftCardStatusBadge.tsx
    - src/components/admin/gift-cards/GiftCardDetailDrawer.tsx
  modified: []
decisions:
  - "listGiftCards returns only last 4 digits of code in list view — full code only in getGiftCard detail response"
  - "Active-but-expired filtering uses Supabase .or() with expires_at.lt comparison for server-side efficiency"
  - "voidGiftCard checks role === 'owner' from staff JWT — lightweight check sufficient for action guard (D-14)"
  - "getGiftCard batches staff name lookups with .in() query — avoids N+1 per redemption"
metrics:
  duration: "4 min"
  completed_date: "2026-04-06T12:22:00Z"
  tasks_completed: 2
  tasks_total: 2
  files_created: 7
  files_modified: 0
---

# Phase 35 Plan 05: Admin Gift Card Management Interface Summary

**One-liner:** Admin gift card list page with server-side pagination, status/search filters, 7-column data table (last-4 code, value, balance, status badge, dates), slide-in detail drawer with transaction timeline, and owner-only void flow with inline reason confirmation.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Create gift card server actions for list, detail, and void | d8cdc4f | listGiftCards.ts, getGiftCard.ts, voidGiftCard.ts |
| 2 | Build admin gift card list page, data table, and detail drawer | 8a0645e | page.tsx, GiftCardDataTable.tsx, GiftCardStatusBadge.tsx, GiftCardDetailDrawer.tsx |

## What Was Built

### Task 1 — Server Actions

**src/actions/gift-cards/listGiftCards.ts:**
- Zod schema with page, pageSize, status, search, sortBy, sortOrder params
- `resolveStaffAuth()` for auth — store_id scoped queries
- Returns only last 4 digits of code (`codeLast4`) — never exposes full code in list
- Effective expired status: active + past expiry computed server-side using `effectiveGiftCardStatus()`
- Active-expired split: `.gte('expires_at', now)` for active filter, `.or(status.eq.expired,and(status.eq.active,...))` for expired filter
- Returns `{ success, data, total, page, pageSize }`

**src/actions/gift-cards/getGiftCard.ts:**
- Fetches full gift card record + all redemptions ordered by `redeemed_at ASC` (timeline order)
- Batched staff name join with `.in('id', staffIds)` — single extra query regardless of redemption count
- Returns full 8-digit code formatted as `XXXX-XXXX` via `formatGiftCardCode()` utility
- Computes effective status (active past expiry = expired)

**src/actions/gift-cards/voidGiftCard.ts:**
- Role check: `staff.role !== 'owner'` → 403 error (D-14 owner-only action)
- Zod validation: `reason: z.string().min(4, ...)` — minimum 4 characters
- Calls `void_gift_card` SECURITY DEFINER RPC via admin client
- Revalidates `/admin/gift-cards` on success

### Task 2 — Admin UI

**src/app/admin/gift-cards/page.tsx:**
- RSC page — fetches initial 20 gift cards via admin client
- Applies `effectiveGiftCardStatus()` to initial server data
- Passes role string to `GiftCardDataTable` for void permission
- Auth via `resolveStaffAuth()` with redirect to `/admin/login`

**src/components/admin/gift-cards/GiftCardStatusBadge.tsx:**
- 4 states: active (green), redeemed (blue), expired (warning amber), voided (red)
- Inline Tailwind hex colors per UI-SPEC section 3 color map
- `inline-flex items-center px-2 py-0.5 rounded-full text-[14px] font-medium capitalize`

**src/components/admin/gift-cards/GiftCardDataTable.tsx:**
- 7 columns: Code (****-last4, font-mono), Original Value, Balance (bold if > 0), Status badge, Issued, Expires, Actions
- `bg-navy text-white` table header per UI-SPEC
- Status dropdown (All/Active/Redeemed/Expired/Voided) + search by last 4 digits
- Sortable columns (original_value_cents, balance_cents, issued_at, expires_at) with sort arrow icons
- Server-side pagination (Previous/Next + page indicator)
- Expires column: `text-[var(--color-warning)]` within 30 days and card is active
- Row click and eye button both open detail drawer
- Empty state: "No gift cards yet" / "When customers purchase gift cards, they will appear here."
- Uses `useTransition` for loading state with opacity transition on table

**src/components/admin/gift-cards/GiftCardDetailDrawer.tsx:**
- `fixed right-0 top-0 h-full z-50 w-full sm:w-[480px]` with `transition-transform ease-out duration-[250ms]`
- `role="dialog" aria-modal="true"` with overlay backdrop
- Focus trap: closes button focused on open via `useEffect` + `closeButtonRef`
- Escape key handler closes drawer
- Header: full code in `font-mono text-[20px] font-semibold tracking-[0.05em]` + GiftCardStatusBadge
- Balance section: 2-column stats (Original value, Remaining balance) both at Heading 20px
- Expiry date: Label 14px text-muted with full NZ date format
- Transaction timeline: vertical connector line (1px border-border), issuance (Gift icon navy), redemptions (Minus icon muted), void (XCircle icon red)
- Channel badges: "POS" (navy tint) / "Online" (info blue) — Label 14px inline pills
- Void action (D-14): "Void Gift Card" ghost link (text-error) → inline form with reason input + "Void Card" confirm (solid red, disabled until reason > 3 chars) + Cancel
- Skeleton loader while fetching; error state if fetch fails
- On void success: refreshes card data via `getGiftCard` — drawer stays open with updated state

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None. All UI components are fully wired to server actions:
- `GiftCardDataTable` calls `listGiftCards` server action on every filter/sort/page change
- `GiftCardDetailDrawer` calls `getGiftCard` on open and `voidGiftCard` on confirm
- `GiftCardsPage` fetches initial data server-side via admin client

## Self-Check: PASSED

| Item | Status |
|------|--------|
| src/actions/gift-cards/listGiftCards.ts | FOUND |
| src/actions/gift-cards/getGiftCard.ts | FOUND |
| src/actions/gift-cards/voidGiftCard.ts | FOUND |
| src/app/admin/gift-cards/page.tsx | FOUND |
| src/components/admin/gift-cards/GiftCardDataTable.tsx | FOUND |
| src/components/admin/gift-cards/GiftCardStatusBadge.tsx | FOUND |
| src/components/admin/gift-cards/GiftCardDetailDrawer.tsx | FOUND |
| commit d8cdc4f (Task 1) | FOUND |
| commit 8a0645e (Task 2) | FOUND |
