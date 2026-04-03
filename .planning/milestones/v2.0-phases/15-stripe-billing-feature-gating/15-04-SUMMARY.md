---
phase: 15
plan: "04"
subsystem: billing-ui
tags: [billing, stripe, ui, admin, feature-gating]
dependency_graph:
  requires: ["15-02", "15-03"]
  provides: ["billing-page", "addon-cards", "sidebar-billing-nav"]
  affects: ["admin-sidebar", "integrations-page"]
tech_stack:
  added: []
  patterns: ["Server Component + Client Component split", "?upgrade= query param scroll-to-highlight", "Stripe subscriptions list for status", "JWT refresh on Stripe return"]
key_files:
  created:
    - src/app/admin/billing/page.tsx
    - src/app/admin/billing/BillingClient.tsx
    - src/components/admin/billing/AddOnCard.tsx
  modified:
    - src/components/admin/AdminSidebar.tsx
decisions:
  - "Admin sidebar also gains Settings link (was missing) — added alongside Billing"
  - "Price display uses formatNZD(unit_amount) from Stripe Price fetch — no hardcoded values"
  - "Stripe subscriptions.list used to determine trial/active status with fallback to store_plans booleans"
  - "cardRefs.current tracks highlight-consumed state to prevent re-highlight on re-render"
metrics:
  duration_seconds: 127
  completed_date: "2026-04-03"
  tasks_completed: 3
  tasks_total: 3
  files_changed: 4
---

# Phase 15 Plan 04: Billing UI — Add-on Cards, Billing Page, Sidebar Navigation

**One-liner:** Admin billing page with three-state add-on cards (active/trial/inactive), Stripe portal link, ?upgrade= scroll-to-highlight, and JWT refresh on Stripe return.

## What Was Built

**Task 1 — AddOnCard component + BillingClient + billing page (COMPLETE)**

Three new files implement the complete billing UI:

- `src/components/admin/billing/AddOnCard.tsx` — Client Component with three visual states:
  - **Active:** green "Active" badge (`bg-[#ECFDF5] text-[#059669]`), "Active since {date}" footer, "Manage billing" link
  - **Trial:** amber "Trial — N days left" badge (`bg-[#FFFBEB] text-[#D97706]`), "Trial ends {date}" footer
  - **Inactive:** no badge, price line, full-width amber "Start free trial" / "Subscribe to {name}" CTA
  - Highlight ring (`ring-2 ring-[var(--color-amber)] ring-offset-2`) on `?upgrade=` param, fades after 2 seconds via useEffect + setTimeout

- `src/app/admin/billing/BillingClient.tsx` — Client Component handling:
  - `?subscribed=` query param: calls `createSupabaseBrowserClient().auth.refreshSession()` to pick up new JWT claims after Stripe return
  - `?upgrade=` query param: passes `highlight` prop to matching AddOnCard for scroll-to behavior
  - `handleSubscribe`: calls `createSubscriptionCheckoutSession(feature)` Server Action, redirects on success
  - `handleManage`: calls `createBillingPortalSession()` Server Action, redirects on success
  - Inline error messages for both actions per UI-SPEC Copywriting Contract
  - Portal button conditionally rendered based on `stripeCustomerId` prop; shows descriptive text when no customer

- `src/app/admin/billing/page.tsx` — Server Component:
  - Auth check via `createSupabaseServerClient` + `getUser()`
  - Parallel fetch of `store_plans` and `stores.stripe_customer_id` via admin client
  - Stripe `subscriptions.list` to get trial_end/created/status for each add-on (when customer exists)
  - Stripe `prices.retrieve` for each PRICE_ID_MAP entry, formatted with `formatNZD`
  - Layout: `space-y-[var(--space-xl)] max-w-3xl` matching integrations/page.tsx pattern
  - Heading: `font-display font-semibold text-2xl` per UI-SPEC

**Task 2 — Admin sidebar Billing link (COMPLETE)**

Added two nav links to `AdminSidebar.tsx`:
- `{ href: '/admin/settings', label: 'Settings' }` — was missing from sidebar
- `{ href: '/admin/billing', label: 'Billing' }` — per plan requirement, after Settings

**Task 3 — Human verification (APPROVED)**

User verified billing page visual correctness. Billing page at /admin/billing renders with heading, three add-on cards in inactive state, billing portal section, and admin sidebar Billing link. All acceptance criteria confirmed.

## Deviations from Plan

### Auto-added Items

**1. [Rule 2 - Missing] Settings link added to AdminSidebar**
- **Found during:** Task 2
- **Issue:** Plan specified adding Billing "between Settings and the bottom". Settings was not in the navLinks array.
- **Fix:** Added both Settings and Billing entries. Settings is required for the layout to match the plan's positioning intent.
- **Files modified:** src/components/admin/billing/AdminSidebar.tsx
- **Commit:** 917272b

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | c578a22 | feat(15-04): add AddOnCard component, BillingClient, and billing page |
| 2 | 917272b | feat(15-04): add Billing nav link to AdminSidebar |

## Known Stubs

None. Price display fetches live from Stripe API (`stripe.prices.retrieve`). Subscription details fetched from `stripe.subscriptions.list`. Store plans from database. No hardcoded values.

## Self-Check: PASSED

- [x] src/app/admin/billing/page.tsx exists
- [x] src/app/admin/billing/BillingClient.tsx exists
- [x] src/components/admin/billing/AddOnCard.tsx exists
- [x] src/components/admin/AdminSidebar.tsx contains "billing"
- [x] Commits c578a22 and 917272b exist
- [x] TypeScript check: no errors in billing files
