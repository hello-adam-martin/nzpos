# Phase 10: Customer Accounts - Context

**Gathered:** 2026-04-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Customer-facing authentication on the online storefront. Customers can create accounts (email/password), log in, view their order history, manage their profile and preferences, verify their email, and reset their password. Guest checkout remains available. Customer role is enforced in middleware — customers cannot access POS or admin routes.

</domain>

<decisions>
## Implementation Decisions

### Account Creation & Login UX
- **D-01:** Header account icon in StorefrontHeader — small user icon that opens login/signup. After login, shows account dropdown (My Orders, Profile, Sign Out). Standard e-commerce pattern.
- **D-02:** Guest checkout remains allowed (current behavior preserved). After purchase, offer "Create account to track this order?" prompt to convert guests.
- **D-03:** Minimal signup — email and password only. Name and other details collected later in profile.
- **D-04:** Email/password auth only (Supabase Auth). Social login (Google, Apple) deferred to v2.

### Order History & Profile Pages
- **D-05:** Order history displayed as a simple card list — each card shows date, total, status, item count. Click to expand/view full details.
- **D-06:** Full order detail view — all line items, quantities, prices, discounts, GST breakdown, payment method, status history. Mirrors the receipt email content.
- **D-07:** Profile page includes: name, email (with re-verification on change), password change, and preferences.
- **D-08:** Preferences include: email receipt opt-in/out toggle and marketing email opt-in toggle. Two separate toggles stored on the customers table.

### Auth Integration & POS Blocking
- **D-09:** New `customers` table (auth_user_id, store_id, name, email, preferences JSONB). Separate from staff table. Auth hook (003_auth_hook.sql) extended to check customers table after staff table, injecting role='customer' and store_id.
- **D-10:** Customers visiting /pos or /admin routes are silently redirected to storefront home ('/'). No error message — they just land back on the shop.
- **D-11:** When a customer creates an account, automatically link all past orders with matching customer_email to the new account. Instant order history from day one.

### Email Verification & Password Reset
- **D-12:** Supabase Auth's native email confirmation flow — verification link sent on signup. Supabase handles token generation and validation. No custom verification code.
- **D-13:** Unverified customers have full access — can browse, buy, and view orders. Persistent banner "Verify your email" with resend link shown until verified. Do not block sales over verification.
- **D-14:** Supabase Auth's native password reset flow — "Forgot password?" link sends reset email. Standard Supabase-managed flow.

### Claude's Discretion
- Customer account routes structure (/account, /account/orders, /account/profile, etc.)
- Supabase email template customization for verification and reset emails
- Account dropdown component design and behavior
- Post-purchase "create account" prompt placement and UX
- Order linking migration/RPC implementation
- RLS policies for customer data isolation
- Customers table schema details beyond the core fields

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Auth & Data Model
- `supabase/migrations/003_auth_hook.sql` — Current auth hook that injects staff role/store_id into JWT. Must be extended for customer role.
- `src/middleware.ts` — Route protection for admin, POS, and store routes. Must add customer blocking for /pos and /admin.
- `src/lib/resolveAuth.ts` — Server-side auth resolution (owner Supabase session + staff PIN JWT). Needs customer session support.
- `src/lib/supabase/middleware.ts` — Supabase middleware client factory used by route middleware.

### Existing Storefront
- `src/app/(store)/layout.tsx` — Store layout with CartProvider, StorefrontHeader, CartDrawer. Customer auth integrates here.
- `src/components/store/StorefrontHeader.tsx` — Header component where account icon will be added.
- `src/app/(store)/order/[id]/confirmation/CartClearer.tsx` — Post-purchase page, potential location for "create account" prompt.

### Auth Pages (stubs to replace/extend)
- `src/app/login/page.tsx` — Owner login page. Customer login needs separate route or conditional rendering.
- `src/app/signup/page.tsx` — Stub owner signup page. Needs replacement with customer signup.
- `src/app/unauthorized/page.tsx` — Existing unauthorized page (not used for customers per D-10, but exists).

### Order Data
- `src/types/database.ts` — Database types including orders with `customer_email` column. Orders linkable to customer accounts via email.
- `src/schemas/order.ts` — Order validation schemas.

### Notification System (Phase 9)
- `src/lib/email.ts` — Resend email sender utility. Verification/reset emails use Supabase Auth, not Resend.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `StorefrontHeader` component — already has search and cart icon; account icon fits naturally alongside
- `CartDrawer` component — slide-out drawer pattern could inspire account panel if needed
- `CartProvider` / `CartContext` — context pattern established for store-wide state
- Supabase middleware client factory — reusable for customer session refresh
- `receipt_data` JSONB on orders — full receipt data available for order detail view
- Resend email infrastructure (Phase 9) — available but not needed for verification/reset (Supabase Auth handles those)

### Established Patterns
- Supabase Auth for owner, jose JWT for staff — customer auth adds a third role via Supabase Auth (same as owner but different role)
- Middleware route protection with role checking — extend existing pattern for customer blocking
- `customer_email` on orders — already captured during checkout, provides the link for D-11
- Server Actions with Zod validation — use same pattern for profile updates
- Design system: deep navy + amber, Satoshi/DM Sans — all customer pages must follow DESIGN.md

### Integration Points
- Auth hook (003_auth_hook.sql): Add customer table lookup after staff lookup
- Middleware (src/middleware.ts): Add customer role blocking for /pos and /admin
- StorefrontHeader: Add account icon with login/dropdown state
- Store layout: Wrap with customer auth context if needed
- Order confirmation page: Add post-purchase account creation prompt
- Stripe webhook: Link order to customer account if logged in at checkout

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches.

</specifics>

<deferred>
## Deferred Ideas

- Social login (Google, Apple Sign-In) — deferred to v2 per D-04
- Phone number and address collection — future delivery feature, not needed for click-and-collect
- Repeat order button — already in PROJECT.md out-of-scope, deferred until customer accounts have real usage data

</deferred>

---

*Phase: 10-customer-accounts*
*Context gathered: 2026-04-02*
