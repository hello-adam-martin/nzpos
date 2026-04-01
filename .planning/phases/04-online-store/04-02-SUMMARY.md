---
phase: 04-online-store
plan: "02"
subsystem: storefront-cart
tags: [cart, context, localStorage, storefront, layout, header]
dependency_graph:
  requires:
    - 04-01  # store routes scaffold
    - src/lib/gst.ts
  provides:
    - CartProvider (React Context + useReducer + localStorage)
    - useCart hook (itemCount, subtotalCents, discountCents, totalCents, gstCents)
    - StorefrontHeader (sticky, search, cart badge)
    - store layout shell (CartProvider + header + footer)
  affects:
    - all store routes (wrapped by CartProvider via layout)
    - 04-03 through 04-06 (all consume useCart)
tech_stack:
  added: []
  patterns:
    - React Context + useReducer for client-side cart state
    - localStorage hydration via HYDRATE action (mount effect)
    - useMemo for all computed cart values (performance)
    - Pro-rata discount distribution matching cart.ts algorithm (D-19)
key_files:
  created:
    - src/contexts/CartContext.tsx
    - src/components/store/StorefrontHeader.tsx
  modified:
    - src/app/(store)/layout.tsx
decisions:
  - StoreCartItem does not include lineTotalCents/gstCents — computed dynamically in useCart to avoid stale GST
  - isDrawerOpen excluded from localStorage persistence — always starts closed on hydration
  - Pro-rata GST discount uses Math.floor for all lines, last line absorbs rounding remainder (consistent with Phase 3 cart.ts pattern)
  - StorefrontHeader uses useSearchParams + router.push for search to enable URL-based search state
metrics:
  duration: "98s"
  completed: "2026-04-01"
  tasks_completed: 2
  files_changed: 3
---

# Phase 04 Plan 02: Cart Context and Storefront Layout Shell Summary

Client-side cart state management via React Context + useReducer + localStorage, plus the storefront layout shell with sticky header and CartProvider wrapping.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create CartContext with localStorage persistence and useCart hook | 1d7e0c5 | src/contexts/CartContext.tsx |
| 2 | Expand store layout and create StorefrontHeader | 7773452 | src/app/(store)/layout.tsx, src/components/store/StorefrontHeader.tsx |

## What Was Built

### CartContext (`src/contexts/CartContext.tsx`)

Full client-side cart module with:
- `StoreCartItem` type: productId, productName, unitPriceCents, quantity, imageUrl, slug, maxStock
- `StoreCartState` with items, promo fields, isDrawerOpen
- `StoreCartAction` union: ADD_ITEM (stock-aware), SET_QUANTITY (clamped to maxStock), REMOVE_ITEM, APPLY_PROMO, CLEAR_PROMO, CLEAR_CART, TOGGLE/OPEN/CLOSE_DRAWER, HYDRATE
- localStorage persistence using key `nzpos_store_cart` — isDrawerOpen excluded, HYDRATE always starts drawer closed
- `CartProvider` wraps children with hydration and persistence effects
- `useCart()` hook returns state + dispatch + computed values (all via `useMemo`):
  - `itemCount`: total quantity across all items
  - `subtotalCents`: sum of unitPriceCents * quantity
  - `discountCents`: promoDiscountCents
  - `totalCents`: max(0, subtotal - discount)
  - `gstCents`: pro-rata discount distribution per D-19, calcLineItem per line, calcOrderGST

### StorefrontHeader (`src/components/store/StorefrontHeader.tsx`)

- Sticky nav: `h-16 sticky top-0 z-50 bg-surface border-b border-border`
- Store name in Display role (Satoshi, text-xl, font-semibold), links to `/`
- Search input: full-width, max-w-md on desktop, debounced 300ms, pushes `?q=value` to URL
- Cart icon (shopping bag SVG) with amber badge showing itemCount
- Badge hidden when itemCount === 0, `aria-label="Cart, {n} items"` updates dynamically
- On cart click: dispatches OPEN_DRAWER

### Store Layout (`src/app/(store)/layout.tsx`)

- CartProvider wraps all children
- StorefrontHeader rendered above main content
- `<main>` with `max-w-[1200px] px-6 lg:px-8` per UI-SPEC
- Footer with `bg-surface border-t border-border`, "Powered by NZPOS"

## Verification

- TypeScript: no errors (`npx tsc --noEmit`)
- CartProvider wraps all store routes via layout
- useCart returns computed totals with GST
- localStorage key `nzpos_store_cart` used correctly
- StorefrontHeader shows cart count from useCart
- ADD_ITEM rejects products with stockQuantity <= 0 (STORE-08)

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None. CartContext is wired with real logic; StorefrontHeader connects to live cart state. Layout wraps real CartProvider.

## Self-Check: PASSED

- [x] `src/contexts/CartContext.tsx` exists
- [x] `src/components/store/StorefrontHeader.tsx` exists
- [x] `src/app/(store)/layout.tsx` modified
- [x] Commit 1d7e0c5 exists (CartContext)
- [x] Commit 7773452 exists (StorefrontHeader + layout)
