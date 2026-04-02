---
phase: 10-customer-accounts
verified: 2026-04-02T00:00:00Z
status: passed
score: 13/13 must-haves verified
re_verification: false
---

# Phase 10: Customer Accounts Verification Report

**Phase Goal:** Customers can create accounts on the storefront, log in, and view their order history
**Verified:** 2026-04-02
**Status:** PASSED
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| #  | Truth                                                                                        | Status     | Evidence                                                                          |
|----|----------------------------------------------------------------------------------------------|------------|-----------------------------------------------------------------------------------|
| 1  | Auth hook injects role='customer' and store_id into JWT when a customers row exists          | VERIFIED   | Migration 012 has `CREATE OR REPLACE FUNCTION public.custom_access_token_hook` with customers lookup after staff lookup |
| 2  | A customer visiting /admin is silently redirected to /                                        | VERIFIED   | `middleware.ts` line 34: `if (role === 'customer') { return NextResponse.redirect(new URL('/', request.url)) }` before the `role !== 'owner'` check |
| 3  | A customer visiting /pos is silently redirected to /                                          | VERIFIED   | `middleware.ts` line 55: `posUser?.app_metadata?.role === 'customer'` check at top of /pos block, before staffToken check |
| 4  | Existing staff and owner auth flows are unaffected                                            | VERIFIED   | `role !== 'owner'` check retained; customer check is additive guard before it; all 8 commits verified in git log |
| 5  | A new customer can sign up with email and password on the storefront                          | VERIFIED   | `customerSignup.ts` uses `supabase.auth.signUp`, Zod schema `z.string().email()` + `z.string().min(8)`, redirects to verify-email page |
| 6  | After signup, the customer is redirected to a verify-email page                               | VERIFIED   | `customerSignup.ts` line 66+ redirects to `/account/verify-email?email=...` |
| 7  | Past orders with matching email are automatically linked to the new customer account          | VERIFIED   | `customerSignup.ts` calls `untypedAdmin.rpc('link_customer_orders', { p_auth_user_id, p_email })` after insert |
| 8  | A customer can sign in with their email and password                                          | VERIFIED   | `customerSignin.ts` calls `supabase.auth.signInWithPassword`, returns `{ error: 'Incorrect email or password.' }` on failure, redirects to `/account/orders` or `return_to` |
| 9  | Email verification and password reset callbacks exchange the code for a session               | VERIFIED   | `callback/route.ts` calls `supabase.auth.exchangeCodeForSession(code)`, defaults `next` to `/account/orders` |
| 10 | A logged-in customer can see all their past orders on the order history page                  | VERIFIED   | `account/orders/page.tsx` fetches `supabase.from('orders').select('id, created_at, status, total_cents, order_items(id)')`, redirects to signin if no user |
| 11 | A customer can click an order card to see full order details                                  | VERIFIED   | `OrderHistoryCard.tsx` wraps entire card in `<Link href="/account/orders/{id}">`, order detail page fetches `orders` with `order_items(*)` and calls `notFound()` on missing orders |
| 12 | A customer can update their name, email, and preferences on the profile page                  | VERIFIED   | `profile/page.tsx` fetches from `customers` table, renders `ProfileForm`. `updateProfile.ts` updates `customers.name` and `customers.preferences` via Zod-validated Server Action. `updateEmail.ts` calls `supabase.auth.updateUser`. `changePassword.ts` uses Zod with `.refine()` for confirmation. |
| 13 | The StorefrontHeader shows an account icon that opens a dropdown when logged in               | VERIFIED   | `StorefrontHeader.tsx` imports and renders `AccountMenuButton`. `layout.tsx` resolves customer via `supabase.auth.getUser()` and passes `customer` prop. `AccountDropdown` has `role="menu"` with My Orders, My Profile, Sign out (calls `customerSignOut` action) |

**Score:** 13/13 truths verified

---

### Required Artifacts

| Artifact | Provided By Plan | Status | Evidence |
|----------|-----------------|--------|----------|
| `supabase/migrations/012_customer_accounts.sql` | 10-01 | VERIFIED | Exists, 7 sections present: customers table, customer_id on orders, RLS policies, auth hook extension, link_customer_orders RPC, DROP POLICY x2 |
| `src/middleware.ts` | 10-01 | VERIFIED | Contains `role === 'customer'` check in both /admin and /pos blocks (2 occurrences) |
| `src/actions/auth/customerSignup.ts` | 10-02 | VERIFIED | `'use server'`, Zod, `auth.signUp`, customers insert, `link_customer_orders` RPC, `refreshSession`, cleanup on failure |
| `src/actions/auth/customerSignin.ts` | 10-02 | VERIFIED | `'use server'`, `signInWithPassword`, `return_to` support |
| `src/actions/auth/customerSignOut.ts` | 10-02 | VERIFIED | `'use server'`, `signOut`, redirect to `/` |
| `src/actions/auth/resendVerification.ts` | 10-02 | VERIFIED | `'use server'`, `auth.resend({ type: 'signup' })` |
| `src/actions/auth/resetPassword.ts` | 10-02 | VERIFIED | `'use server'`, `resetPasswordForEmail` |
| `src/app/(store)/account/callback/route.ts` | 10-02 | VERIFIED | `GET` export, `exchangeCodeForSession`, defaults `next` to `/account/orders` |
| `src/app/(store)/account/signin/page.tsx` | 10-02 | VERIFIED | Client component, `useActionState` with `customerSignin`, `return_to` hidden input, navy button |
| `src/app/(store)/account/signup/page.tsx` | 10-02 | VERIFIED | Client component, `useActionState` with `customerSignup`, amber button, `existingUser` flag handling |
| `src/app/(store)/account/verify-email/page.tsx` | 10-02 | VERIFIED | Server component, dynamic copy by `type` searchParam, `ResendButton` island |
| `src/app/(store)/account/reset-password/page.tsx` | 10-02 | VERIFIED | Client component, `resetPassword` action |
| `src/components/store/AccountMenuButton.tsx` | 10-03 | VERIFIED | `'use client'`, shows "Sign in" link when null, user icon button (h-10 w-10) when logged in |
| `src/components/store/AccountDropdown.tsx` | 10-03 | VERIFIED | `'use client'`, `role="menu"`, My Orders (`/account/orders`), My Profile (`/account/profile`), Sign out form with `customerSignOut` |
| `src/components/store/VerificationBanner.tsx` | 10-03 | VERIFIED | `'use client'`, `role="alert"`, `#EFF6FF` background, calls `resendVerification`, 30s cooldown |
| `src/app/(store)/account/orders/page.tsx` | 10-03 | VERIFIED | Server component, fetches orders via `supabase.from('orders').select(...)`, redirects unauthenticated users, renders `OrderHistoryCard` |
| `src/app/(store)/account/orders/[id]/page.tsx` | 10-03 | VERIFIED | Server component, fetches order+items, `notFound()` on missing, "Back to orders" link |
| `src/app/(store)/account/profile/page.tsx` | 10-03 | VERIFIED | Server component, fetches from `customers` table, renders `ProfileForm` client component |
| `src/actions/auth/updateProfile.ts` | 10-03 | VERIFIED | `'use server'`, Zod, updates `customers.name` and `customers.preferences` |
| `src/actions/auth/updateEmail.ts` | 10-03 | VERIFIED | `'use server'`, `supabase.auth.updateUser` for email change |
| `src/actions/auth/changePassword.ts` | 10-03 | VERIFIED | `'use server'`, Zod with `.refine()` for password confirmation |
| `src/components/store/OrderHistoryCard.tsx` | 10-03 | VERIFIED | `STATUS_CONFIG` mapping all 6 statuses, `rounded-full` pill, `formatNZD`, `<Link>` wrapping card |
| `src/components/store/PostPurchaseAccountPrompt.tsx` | 10-03 | VERIFIED | `'use client'`, localStorage dismiss, amber "Create account" CTA, guest detection |

---

### Key Link Verification

| From | To | Via | Status | Evidence |
|------|----|-----|--------|----------|
| `012_customer_accounts.sql` | `003_auth_hook.sql` | `CREATE OR REPLACE FUNCTION public.custom_access_token_hook` | WIRED | Migration contains `CREATE OR REPLACE FUNCTION public.custom_access_token_hook` — replaces without duplicating |
| `src/middleware.ts` | Supabase auth JWT | `app_metadata.role` check | WIRED | Lines 34 and 55 check `role === 'customer'` via app_metadata |
| `customerSignup.ts` | `supabase.auth.signUp` | Server Action | WIRED | Line 25: `await supabase.auth.signUp(...)` with `emailRedirectTo` |
| `customerSignup.ts` | `public.link_customer_orders` | `untypedAdmin.rpc('link_customer_orders')` | WIRED | Line 60: `await untypedAdmin.rpc('link_customer_orders', { p_auth_user_id, p_email })` |
| `callback/route.ts` | `supabase.auth.exchangeCodeForSession` | GET handler | WIRED | Line 11: `await supabase.auth.exchangeCodeForSession(code)` |
| `StorefrontHeader.tsx` | `AccountMenuButton.tsx` | import + render in header flex row | WIRED | Line 7 import, line 107 render `<AccountMenuButton user={customer ?? null} />` |
| `layout.tsx` | `VerificationBanner.tsx` | conditional render below header | WIRED | Line 4 import, lines 29-31 conditional render when `customer && !customer.emailVerified` |
| `account/orders/page.tsx` | `supabase.from('orders')` | server-side fetch | WIRED | Line 19: `.select('id, created_at, status, total_cents, order_items(id)')` |
| `account/profile/page.tsx` | `updateProfile.ts` | form action via ProfileForm | WIRED | `ProfileForm.tsx` renders `updateProfile` action |
| `order/[id]/confirmation/page.tsx` | `PostPurchaseAccountPrompt.tsx` | conditional render for guests | WIRED | Lines 251-256: `{isGuest && order.customer_email && (<PostPurchaseAccountPrompt .../>)}` |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `account/orders/page.tsx` | `orders` | `supabase.from('orders').select(...)` with RLS | Yes — live Postgres query via Supabase, RLS scopes to customer | FLOWING |
| `account/orders/[id]/page.tsx` | `order` | `supabase.from('orders').select('*, order_items(*)')` | Yes — live query with `notFound()` on null | FLOWING |
| `account/profile/page.tsx` | `customer` | `supabase.from('customers').select('*').eq('auth_user_id', user.id).single()` | Yes — live Postgres query scoped to auth user | FLOWING |
| `StorefrontHeader.tsx` | `customer` prop | `layout.tsx` server component calls `supabase.auth.getUser()` | Yes — live session check, prop passed at render time | FLOWING |
| `VerificationBanner.tsx` | `email` prop | From `customer.email` in layout.tsx, resolved from live session | Yes — derived from live auth session | FLOWING |
| `PostPurchaseAccountPrompt.tsx` | `isGuest`, `email` | `confirmation/page.tsx` calls `supabase.auth.getUser()`, uses `order.customer_email` | Yes — live session check + DB-sourced order email | FLOWING |

---

### Behavioral Spot-Checks

Step 7b: SKIPPED — no runnable entry points can be tested without starting the Next.js dev server. The auth flows (signUp, signIn, exchangeCodeForSession) require live Supabase connection and email delivery. These are routed to human verification.

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| CUST-01 | 10-02 | Customer can create account with email/password (scoped to store) | SATISFIED | `customerSignup.ts` creates auth user + customers row, uses `process.env.STORE_ID` for tenant scoping; signup page at `/account/signup` |
| CUST-02 | 10-03 | Customer can log in and view their order history | SATISFIED | `customerSignin.ts` + `account/orders/page.tsx` fetching orders via RLS-scoped query |
| CUST-03 | 10-03 | Customer can update their profile (name, email, preferences) | SATISFIED | `updateProfile.ts`, `updateEmail.ts`, `changePassword.ts` + `profile/page.tsx` with `ProfileForm.tsx` including `role="switch"` preference toggles |
| CUST-04 | 10-01 | Auth hook extended to inject customer role and store_id into JWT | SATISFIED | Migration 012 contains `CREATE OR REPLACE FUNCTION public.custom_access_token_hook` with customers lookup and `GRANT SELECT ON public.customers TO supabase_auth_admin` |
| CUST-05 | 10-01 | Customer login/signup blocked on POS routes | SATISFIED | Middleware blocks customers from `/pos` (before staffToken check) and `/admin` (before owner check) with silent redirect to `/` |
| CUST-06 | 10-02 | Customer can verify email and reset password | SATISFIED | `callback/route.ts` exchanges codes for sessions; `resetPassword.ts` calls `resetPasswordForEmail`; `verify-email/page.tsx` with `ResendButton` island |

No orphaned requirements found — all 6 CUST-* IDs appear in plan frontmatter and REQUIREMENTS.md marks all as Complete.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `customerSignup.ts`, `updateProfile.ts`, `profile/page.tsx` | Multiple | `as unknown as SupabaseClient` cast for `customers` table queries | Info | Pre-migration type regeneration needed (`supabase gen types`). Documented in both summaries as a known deferred task. No runtime impact — untyped cast still calls correct Postgres functions. Not a stub. |

No TODO/FIXME/placeholder comments, no empty return stubs, no hardcoded empty arrays flowing to user-visible render found across all phase 10 files.

---

### Human Verification Required

#### 1. End-to-End Signup Flow

**Test:** Visit `/account/signup` on the live storefront. Enter a valid email and password (8+ chars). Submit.
**Expected:** Supabase creates auth user, customers row is inserted with correct `store_id`, resend verification email arrives, page redirects to `/account/verify-email?email=...` with correct dynamic copy.
**Why human:** Requires live Supabase + Resend email delivery; exchangeCodeForSession needs a real auth code from an email link.

#### 2. Auth Hook JWT Injection

**Test:** Complete signup and sign in. Inspect the JWT (e.g., via browser DevTools or `supabase.auth.getSession()` in browser console). Confirm `app_metadata.role === 'customer'` and `app_metadata.store_id` is the correct store UUID.
**Why human:** JWT contents are not verifiable without a live Supabase instance with the migration applied and the hook registered.

#### 3. Order History RLS Isolation

**Test:** Sign in as a known customer who has placed at least one order. Visit `/account/orders`. Confirm only their own orders appear, not orders from other customers.
**Why human:** RLS policy correctness requires live database with data from multiple customers.

#### 4. Header Account Dropdown (Visual + Interaction)

**Test:** Load the storefront while signed in. Confirm the account icon appears in the header (right of cart). Click it — confirm dropdown opens with My Orders, My Profile, Sign out. Click outside — confirm dropdown closes. Press Escape — confirm dropdown closes.
**Why human:** Visual appearance, click-outside detection, and Escape key handling require a browser.

#### 5. Verification Banner Resend Cooldown

**Test:** Sign up but do not verify email. Reload the storefront. Confirm the blue verification banner appears below the header. Click "Resend email". Confirm button becomes disabled for 30 seconds with "Sent!" inline text.
**Why human:** 30-second cooldown and inline confirmation require live interaction and timing.

#### 6. Post-Purchase Account Prompt Dismiss

**Test:** Complete a guest checkout. On the order confirmation page, confirm the "Track this order" prompt appears. Click "No thanks". Reload the page. Confirm the prompt does not reappear (localStorage `dismissed_account_prompt` persists).
**Why human:** localStorage persistence requires browser interaction across page reloads.

---

### Gaps Summary

No gaps. All 13 observable truths verified against the codebase. All 23 artifacts exist and are substantive (not stubs). All 10 key links are wired. All 6 requirement IDs satisfied. All 8 documented commits confirmed in git history.

The only notable deferred item across all three plans is that Supabase generated types (`database.ts`) have not been regenerated since migration 012 was applied. This causes `as unknown as SupabaseClient` casts in 3 files but has no runtime impact and is an expected deferred step after applying migrations to a live database.

---

_Verified: 2026-04-02_
_Verifier: Claude (gsd-verifier)_
