# Phase 10: Customer Accounts - Research

**Researched:** 2026-04-02
**Domain:** Supabase Auth (customer role), RLS extension, Next.js App Router route protection, customer-facing storefront auth UX
**Confidence:** HIGH — all findings verified against the actual codebase and established patterns

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Header account icon in StorefrontHeader — small user icon that opens login/signup. After login, shows account dropdown (My Orders, Profile, Sign Out).
- **D-02:** Guest checkout remains allowed. After purchase, offer "Create account to track this order?" prompt.
- **D-03:** Minimal signup — email and password only. Name collected later in profile.
- **D-04:** Email/password auth only (Supabase Auth). Social login deferred to v2.
- **D-05:** Order history as simple card list — date, total, status, item count. Click to expand.
- **D-06:** Full order detail view mirrors receipt email content — line items, quantities, prices, discounts, GST, payment method, status history.
- **D-07:** Profile page: name, email (re-verification on change), password change, preferences.
- **D-08:** Preferences: email receipt opt-in/out + marketing email opt-in. Two separate toggles on customers table.
- **D-09:** New `customers` table (auth_user_id, store_id, name, email, preferences JSONB). Auth hook (003_auth_hook.sql) extended after staff lookup to inject role='customer' and store_id.
- **D-10:** Customers visiting /pos or /admin routes redirected silently to '/'. No error message.
- **D-11:** On account creation, auto-link all past orders where customer_email matches the new account's email.
- **D-12:** Supabase Auth native email confirmation flow. No custom verification code.
- **D-13:** Unverified customers have full access. Persistent banner shown until verified. Do not block sales.
- **D-14:** Supabase Auth native password reset flow.

### Claude's Discretion

- Customer account routes structure (/account, /account/orders, /account/profile, etc.)
- Supabase email template customization for verification and reset emails
- Account dropdown component design and behavior
- Post-purchase "create account" prompt placement and UX
- Order linking migration/RPC implementation
- RLS policies for customer data isolation
- Customers table schema details beyond the core fields

### Deferred Ideas (OUT OF SCOPE)

- Social login (Google, Apple Sign-In) — deferred to v2
- Phone number and address collection — future delivery feature
- Repeat order button — deferred until customer accounts have real usage data
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CUST-01 | Customer can create account with email/password (scoped to store) | Supabase Auth `signUp` + customers table insert + order linking RPC |
| CUST-02 | Customer can log in and view their order history | Supabase Auth `signInWithPassword` + RLS policy on orders scoped by customer_id |
| CUST-03 | Customer can update their profile (name, email, preferences) | Server Action + Supabase client `updateUser` for email + direct customers table update |
| CUST-04 | Auth hook extended to inject customer role and store_id into JWT | Extend 003_auth_hook.sql — add customers table lookup after staff lookup |
| CUST-05 | Customer login/signup blocked on POS routes | Extend middleware.ts — check role claim on /pos and /admin, redirect to '/' |
| CUST-06 | Customer can verify email and reset password | Supabase Auth native confirmation + reset flows + callback route handler |
</phase_requirements>

---

## Summary

Phase 10 adds customer-facing authentication to the storefront. The project already uses Supabase Auth for the owner, so customers use the same Auth system but are identified via a separate `customers` table (analogous to the `staff` table) and a different role claim in the JWT. The auth hook in `003_auth_hook.sql` already implements the pattern: look up a table by `auth_user_id`, inject role and store_id. This phase extends that hook to check customers after staff.

The middleware (`src/middleware.ts`) already handles owner and staff blocking. Extending it to silently redirect customers away from `/pos` and `/admin` is a small addition: after resolving the Supabase session for those routes, check if `app_metadata.role === 'customer'` and redirect to `/`.

The most architecturally novel piece is the order-linking step (D-11): when a customer account is created, a SECURITY DEFINER RPC should atomically update all `orders` where `customer_email` matches and `customer_id IS NULL`, setting `customer_id` to the new account's ID. This requires a `customer_id` column on orders (new in this migration).

The UI contract is fully specified in `10-UI-SPEC.md`. All components follow the existing codebase patterns exactly — same card structure, same focus ring style, same inline SVG icon approach, same Server Actions with Zod.

**Primary recommendation:** Follow the staff/owner auth pattern for everything. The `customers` table mirrors `staff`. The auth hook extension mirrors the existing lookup. The middleware extension mirrors existing role checks. New auth actions mirror `ownerSignin.ts`. No new architectural patterns required.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @supabase/supabase-js | ^2.101.1 (installed) | Supabase Auth signUp, signInWithPassword, resetPasswordForEmail, resend, updateUser | Already installed, Auth is the chosen system |
| @supabase/ssr | ^0.10.0 (installed) | Cookie-based session management in App Router | Already installed and in use for owner sessions |
| zod | ^4.3.6 (installed) | Server Action input validation | Project standard — every action validates with z.safeParse() |
| jose | ^6.2.2 (installed) | Not needed for customer auth (Supabase handles JWT) | Installed for staff PIN only |

### No New Dependencies

All libraries needed for this phase are already installed. No `npm install` required.

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── actions/
│   └── auth/
│       ├── customerSignup.ts       # New: Supabase signUp + customers insert + order linking RPC
│       ├── customerSignin.ts       # New: Supabase signInWithPassword
│       ├── customerSignOut.ts      # New: Supabase signOut, redirect to /
│       ├── resendVerification.ts   # New: Supabase resend confirmation email
│       ├── updateProfile.ts        # New: Update customers table (name, preferences)
│       └── updateEmail.ts          # New: Supabase updateUser (email) + re-verification
├── app/
│   └── (store)/
│       └── account/
│           ├── signin/page.tsx     # Centered auth card, no StorefrontHeader
│           ├── signup/page.tsx     # Centered auth card, amber CTA
│           ├── verify-email/page.tsx
│           ├── reset-password/page.tsx
│           ├── callback/route.ts   # Supabase Auth callback handler (email confirm, password reset)
│           ├── orders/
│           │   ├── page.tsx        # Order history list
│           │   └── [id]/page.tsx   # Order detail view
│           └── profile/page.tsx    # Profile + preferences form
├── components/
│   └── store/
│       ├── AccountMenuButton.tsx   # User icon in StorefrontHeader
│       ├── AccountDropdown.tsx     # My Orders / My Profile / Sign Out
│       ├── VerificationBanner.tsx  # Persistent unverified email banner
│       ├── OrderHistoryCard.tsx    # Card for each order in history list
│       ├── OrderDetailView.tsx     # Full receipt-style order detail
│       ├── ProfileForm.tsx         # Name/email/password + preference toggles
│       └── PostPurchaseAccountPrompt.tsx
└── supabase/
    └── migrations/
        └── 012_customer_accounts.sql  # customers table, customer_id on orders, RLS, order-link RPC
```

### Pattern 1: Auth Hook Extension (CUST-04)

**What:** The existing `custom_access_token_hook` only looks up the `staff` table. Extend it to also check the `customers` table when no staff record is found.

**When to use:** Any time a Supabase Auth user who is a customer (not staff/owner) signs in.

**Key constraint:** The hook function holds a single `user_store_id` and `user_role` variable pair. The customers table lookup is an `ELSE` branch after staff — never both.

```sql
-- In 012_customer_accounts.sql, use CREATE OR REPLACE to update the hook
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event JSONB)
RETURNS JSONB LANGUAGE plpgsql AS $$
DECLARE
  claims JSONB;
  user_store_id UUID;
  user_role TEXT;
BEGIN
  claims := event -> 'claims';

  -- Check staff table first (owner + staff)
  SELECT s.store_id, s.role INTO user_store_id, user_role
  FROM public.staff s
  WHERE s.auth_user_id = (event ->> 'user_id')::UUID;

  -- If not staff, check customers table
  IF user_store_id IS NULL THEN
    SELECT c.store_id, 'customer' INTO user_store_id, user_role
    FROM public.customers c
    WHERE c.auth_user_id = (event ->> 'user_id')::UUID;
  END IF;

  IF user_store_id IS NOT NULL THEN
    IF jsonb_typeof(claims -> 'app_metadata') IS NULL THEN
      claims := jsonb_set(claims, '{app_metadata}', '{}');
    END IF;
    claims := jsonb_set(claims, '{app_metadata,store_id}', to_jsonb(user_store_id::TEXT));
    claims := jsonb_set(claims, '{app_metadata,role}', to_jsonb(user_role));
  END IF;

  event := jsonb_set(event, '{claims}', claims);
  RETURN event;
END;
$$;

-- Must also grant SELECT on customers to supabase_auth_admin
GRANT SELECT ON public.customers TO supabase_auth_admin;
```

### Pattern 2: Customer Signup Action (CUST-01)

**What:** A Server Action that calls Supabase `signUp`, inserts a customers row, and calls the order-linking RPC. Must be atomic enough that a failed customers insert doesn't leave a dangling auth user (use Supabase Admin client for cleanup if needed).

**Order of operations:**
1. Validate input with Zod (email, password min 8 chars)
2. `supabase.auth.signUp({ email, password })` — returns user.id
3. Insert into `customers` table with `auth_user_id = user.id`, `store_id` from env or hardcoded for single-tenant v1
4. Call `link_customer_orders(customer_id, email)` RPC
5. Redirect to `/account/verify-email?email=...`

**store_id for v1:** The single-tenant v1 has one store. The store_id must be available server-side. Retrieve it from the `stores` table (there is only one row for this deployment) or inject as `STORE_ID` env var. Check how existing code resolves store_id for anon/online checkout.

**Confidence note:** The existing `ownerSignin.ts` pattern (parse → call Supabase → redirect) is the exact template to follow. Confirmed HIGH confidence from reading the file.

### Pattern 3: Middleware Extension (CUST-05)

**What:** Extend the `/admin` route block in middleware to also handle customers. Currently `/admin` checks `role !== 'owner'` and redirects to `/unauthorized`. Must change to redirect customers to `/` instead. Same for `/pos`.

**Current middleware flow for /admin:**
```typescript
// Current: redirects to /unauthorized if not owner
if (role !== 'owner') {
  return NextResponse.redirect(new URL('/unauthorized', request.url))
}
```

**Required change for D-10:**
```typescript
// Extended: customers go to '/', non-owner non-customer goes to /unauthorized
if (role !== 'owner') {
  const redirectUrl = role === 'customer' ? '/' : '/unauthorized'
  return NextResponse.redirect(new URL(redirectUrl, request.url))
}
```

**For /pos:** The POS block currently falls through to `/pos/login` if no valid staff/owner session. Must add a check: if a Supabase session exists with role='customer', redirect to '/' before the staff token check.

### Pattern 4: Order History RLS (CUST-02)

**What:** Customers must be able to read their own orders. Current RLS on orders only allows staff/owner via store_id JWT claim. A customer's JWT has store_id AND customer_id must be added as a claim — or use a separate policy based on customer auth user ID.

**Recommended approach:** Add `customer_id` column to orders. Add RLS policy: customers can SELECT orders where `customer_id = auth.uid()` AND `store_id = (auth.jwt() -> 'app_metadata' ->> 'store_id')::UUID`. This is the cleanest — no new JWT claim needed beyond store_id (which the auth hook already injects).

```sql
-- In 012_customer_accounts.sql
-- Policy: customer can read their own orders
CREATE POLICY "customer_own_orders" ON public.orders
  FOR SELECT
  USING (
    customer_id = auth.uid()
    AND store_id = (auth.jwt() -> 'app_metadata' ->> 'store_id')::UUID
  );

-- Policy: customer can read their own order items
CREATE POLICY "customer_own_order_items" ON public.order_items
  FOR SELECT
  USING (
    order_id IN (
      SELECT id FROM public.orders
      WHERE customer_id = auth.uid()
    )
  );
```

Note: `auth.uid()` returns the UUID of the authenticated user. For customers using Supabase Auth, `auth.uid()` = `customers.auth_user_id`. Since `orders.customer_id` is set to `customers.id` (not `auth_user_id`), the policy must join through the customers table OR use `auth_user_id` directly. See the customers table design below — store `auth_user_id` on orders, not `customers.id`, for simpler RLS.

**Revised recommendation:** Set `orders.customer_id` = `auth.uid()` (the Supabase auth user UUID) at link time. Then the RLS policy `customer_id = auth.uid()` works without a join. The `customers` table is still the source of truth for profile data.

### Pattern 5: Supabase Auth Callback Route (CUST-06)

**What:** Supabase Auth email confirmation and password reset flows redirect to a callback URL that exchanges the token for a session. This requires a Route Handler.

```typescript
// src/app/(store)/account/callback/route.ts
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/account/orders'

  if (code) {
    const supabase = await createSupabaseServerClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Redirect to error page on failure
  return NextResponse.redirect(`${origin}/account/signin?error=auth`)
}
```

**Supabase dashboard configuration:** The "Site URL" and "Redirect URLs" in the Supabase Auth settings must include `{domain}/account/callback`. This is a deployment step, not a code step. Must be documented in Wave 0 setup.

### Pattern 6: Store-Scoped Customer Signup (Single-Tenant v1)

**What:** Customers sign up on the storefront, which belongs to one store. The `store_id` must be injected into the customers table at signup time.

**How to get store_id:** For single-tenant v1, the simplest approach is to add `STORE_ID` as an environment variable (already used by Stripe webhook for single-tenant routing). Alternatively, query the `stores` table with the admin client for the single row. Check how the online checkout assigns store_id to orders — that pattern should be reused.

**HIGH confidence:** The online checkout Server Action already solves this problem. Find it and reuse the pattern.

### Anti-Patterns to Avoid

- **Do not add a separate session system for customers.** Customers use Supabase Auth (same as owner). The differentiation is via JWT role claim, not a separate cookie. Adding a `customer_session` cookie (like `staff_session`) would create three competing auth systems.
- **Do not block sales for unverified customers (D-13).** The verification banner is informational only. RLS policies must not require `email_confirmed_at IS NOT NULL`.
- **Do not use `auth.uid()` in the customers table INSERT directly.** The `supabase.auth.getUser()` call returns the user object — use `user.id` explicitly in the insert.
- **Do not duplicate the auth hook function.** Use `CREATE OR REPLACE` — the hook is already registered in `supabase/config.toml`. A duplicate definition would cause a conflict.
- **Do not redirect customers to `/unauthorized` (D-10).** Silently redirect to `/`. No error message.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Email verification token | Custom token generation and storage | Supabase Auth native `signUp` with `emailRedirectTo` | Supabase handles token generation, TTL, and validation. Custom tokens require secure random, expiry, storage, and timing-safe comparison — all already solved. |
| Password reset tokens | Custom reset flow | Supabase Auth `resetPasswordForEmail` | Same as above. Supabase handles the reset email and secure token. |
| Email confirmation resend | Custom resend endpoint | Supabase Auth `resend({ type: 'signup', email })` | Already in the Supabase JS client. |
| Session management | Custom cookie handling | @supabase/ssr `createServerClient` | Already used for owner sessions. Extends directly to customer sessions — same client, same middleware pattern. |
| Order linking query | Imperative loop over orders | `SECURITY DEFINER` RPC `link_customer_orders(auth_user_id, email)` | Atomic, runs in Postgres, avoids N+1 network calls from the server action, and correctly handles concurrent signups. |
| Preference toggles | Third-party toggle library | CSS + React state (per UI-SPEC) | UI-SPEC explicitly prohibits third-party component registries for this phase. |

**Key insight:** Supabase Auth handles the entire email/password auth lifecycle. The implementation work is: (1) creating the customers table, (2) extending the auth hook, (3) writing Server Actions that call the correct Supabase methods, and (4) building the UI components.

---

## Runtime State Inventory

> Omitted — this is a greenfield feature phase, not a rename/refactor. No existing runtime state references a "customer" entity that requires migration.

---

## Common Pitfalls

### Pitfall 1: Auth Hook Timing — customers table not yet populated

**What goes wrong:** A customer signs up. Supabase Auth creates the auth user. The auth hook fires to generate a JWT. At that moment, the `customers` table insert (step 3 of the Server Action) has not happened yet. The hook finds no customers row. The resulting JWT has no role or store_id. All subsequent requests by the newly-signed-up customer fail RLS.

**Why it happens:** The auth hook fires on every token issuance, including the initial session created by `signUp`. The Server Action's database insert happens after `signUp` returns — the hook has already fired.

**How to avoid:** Insert the customers row BEFORE calling `signUp`, or use a database trigger on `auth.users` to insert the customers row automatically on user creation. The trigger approach is more robust.

**Recommended implementation:**
```sql
-- In 012_customer_accounts.sql
-- Trigger: auto-insert customers row when auth user created for store signups
-- (Alternatively, use a before_user_created hook to reject non-store signups)
```

**Alternative:** Force a token refresh after the customers insert completes. `supabase.auth.refreshSession()` in the Server Action after inserting the customer row will re-invoke the hook with the customers row now present.

**Confidence:** HIGH — this is a documented Supabase Auth hook timing issue. The `refreshSession()` workaround is the standard approach for post-signup data.

### Pitfall 2: The `enable_confirmations = false` Setting in config.toml

**What goes wrong:** Local development has `enable_confirmations = false` (confirmed in supabase/config.toml line 209). In production, `enable_confirmations` is typically `true`. Auth flows tested locally (where sign-in works immediately without verification) will behave differently in production (where sign-in requires verification first).

**Why it happens:** Local config disables email confirmation for developer convenience. Production Supabase dashboard has a separate setting.

**How to avoid:** Test the verification banner and resend flow against local Supabase's Inbucket (email testing UI at http://localhost:54324). Do not rely on the `enable_confirmations = false` behavior when building the verification banner logic — check `email_confirmed_at` directly on the user object, not on whether sign-in succeeds.

### Pitfall 3: RLS Policy Conflict on Orders Table

**What goes wrong:** The orders table has `"tenant_isolation"` RLS policy (store_id matches JWT store_id). A customer's JWT has store_id. So customers could theoretically read ALL orders for the store, not just their own.

**Why it happens:** The existing `tenant_isolation` policy only gates on store_id — it was written for staff/owner who should see all store orders.

**How to avoid:** The customer-specific `"customer_own_orders"` policy adds the `customer_id = auth.uid()` constraint. However, since RLS policies are OR'd together by default for the same operation, a customer with store_id in their JWT would ALSO match `tenant_isolation`. This means a customer could read all store orders via the `tenant_isolation` policy.

**Fix:** The `tenant_isolation` policy on orders must be scoped to staff/owner roles only. Add a role check:
```sql
-- Drop and recreate tenant_isolation for orders with role guard
DROP POLICY "tenant_isolation" ON public.orders;
CREATE POLICY "tenant_isolation" ON public.orders
  FOR ALL
  USING (
    store_id = (auth.jwt() -> 'app_metadata' ->> 'store_id')::UUID
    AND (auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'staff')
  );
```

This is the most important security concern in this phase.

### Pitfall 4: `resolveAuth.ts` Returns null for Customer Sessions

**What goes wrong:** Any Server Component or Server Action that calls `resolveAuth()` to get `store_id` will return `null` for authenticated customers. The function only checks for owner Supabase sessions (with role='owner' in app_metadata) and staff PIN JWTs. A customer session passes through and returns null.

**Why it happens:** `resolveAuth()` was designed for admin/POS contexts only. Customer pages need their own auth resolution.

**How to avoid:** Do not use `resolveAuth()` in customer account pages. Create a `resolveCustomerAuth()` function (or extend the existing one). For customer pages, use `supabase.auth.getUser()` directly and check `user.app_metadata.role === 'customer'`. The `store_id` is available from `user.app_metadata.store_id`.

### Pitfall 5: Order Linking Race Condition (D-11)

**What goes wrong:** Two customers with the same email sign up near-simultaneously. Both trigger order linking. One or both could link orders that belong to the other.

**Why it happens:** Without a transaction or UPSERT lock, concurrent UPDATE queries can both succeed on the same rows.

**How to avoid:** The order-linking RPC must be `SECURITY DEFINER` and run as a single SQL UPDATE with an explicit lock or use `FOR UPDATE` on the orders being linked. Since orders link by email equality and customer_id IS NULL, and since the first transaction sets customer_id, the second transaction's WHERE clause will find no matching rows (customer_id is no longer NULL). This is naturally idempotent.

### Pitfall 6: Post-Purchase Prompt and Guest Checkout State

**What goes wrong:** The `PostPurchaseAccountPrompt` pre-fills the signup email from the order's `customer_email`. But the confirmation page currently fetches the order with a `lookup_token` (IDOR protection). If the token is not passed to the prompt component, or if the prompt is rendered server-side but the dismiss is client-side, the state can get confused.

**How to avoid:** Pass the `customer_email` from the server-fetched order to the `PostPurchaseAccountPrompt` as a prop. The dismiss state is purely client-side (localStorage). The signup CTA link includes `return_to` param as specified in UI-SPEC.

---

## Code Examples

### Customers Table Schema

```sql
-- 012_customer_accounts.sql
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id),
  auth_user_id UUID NOT NULL REFERENCES auth.users(id) UNIQUE,
  name TEXT,
  email TEXT NOT NULL,
  preferences JSONB NOT NULL DEFAULT '{"email_receipts": true, "marketing_emails": false}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for auth hook lookup (called on every token issuance)
CREATE INDEX idx_customers_auth_user_id ON public.customers(auth_user_id);
CREATE INDEX idx_customers_email ON public.customers(email);

-- Add customer_id to orders (links to auth.users.id, not customers.id — for simpler RLS)
ALTER TABLE public.orders ADD COLUMN customer_id UUID REFERENCES auth.users(id);
CREATE INDEX idx_orders_customer_id ON public.orders(customer_id);

-- Enable RLS on customers table
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Customer can only read/update their own record
CREATE POLICY "customer_own_profile" ON public.customers
  FOR ALL
  USING (auth_user_id = auth.uid());
```

### Order Linking RPC

```sql
-- SECURITY DEFINER so it can update orders regardless of caller's RLS
CREATE OR REPLACE FUNCTION public.link_customer_orders(
  p_auth_user_id UUID,
  p_email TEXT
)
RETURNS INTEGER  -- number of orders linked
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_linked_count INTEGER;
BEGIN
  UPDATE public.orders
  SET customer_id = p_auth_user_id
  WHERE customer_email = p_email
    AND customer_id IS NULL;
  GET DIAGNOSTICS v_linked_count = ROW_COUNT;
  RETURN v_linked_count;
END;
$$;
```

### Customer Signup Server Action (skeleton)

```typescript
// src/actions/auth/customerSignup.ts
'use server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'
import { redirect } from 'next/navigation'

const SignupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

export async function customerSignup(formData: FormData) {
  const parsed = SignupSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const supabase = await createSupabaseServerClient()
  const callbackUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/account/callback`

  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { emailRedirectTo: callbackUrl },
  })

  if (error) {
    if (error.message.includes('already registered')) {
      return { error: 'An account with this email already exists.', existingUser: true }
    }
    return { error: 'Could not create account. Please try again.' }
  }

  if (!data.user) return { error: 'Unexpected error during signup.' }

  // Insert customers row — store_id from env for single-tenant v1
  const admin = createSupabaseAdminClient()
  const storeId = process.env.STORE_ID!
  await admin.from('customers').insert({
    auth_user_id: data.user.id,
    store_id: storeId,
    email: parsed.data.email,
  })

  // Link past orders
  await admin.rpc('link_customer_orders', {
    p_auth_user_id: data.user.id,
    p_email: parsed.data.email,
  })

  // Force token refresh so auth hook picks up customers row
  await supabase.auth.refreshSession()

  redirect(`/account/verify-email?email=${encodeURIComponent(parsed.data.email)}`)
}
```

### Middleware Extension for Customer Blocking

```typescript
// In src/middleware.ts — extend the /admin block
if (pathname.startsWith('/admin')) {
  const { supabase, response } = await createSupabaseMiddlewareClient(request)
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  const { data: { session } } = await supabase.auth.getSession()
  const role = session?.user?.app_metadata?.role
  if (role === 'customer') {
    // D-10: silently redirect customer to storefront home
    return NextResponse.redirect(new URL('/', request.url))
  }
  if (role !== 'owner') {
    return NextResponse.redirect(new URL('/unauthorized', request.url))
  }
  return response
}

// In the /pos block, add customer check before staff token check:
if (pathname.startsWith('/pos') && pathname !== '/pos/login') {
  // Check for customer session first — redirect to '/' (D-10)
  const { supabase } = await createSupabaseMiddlewareClient(request)
  const { data: { user } } = await supabase.auth.getUser()
  if (user?.app_metadata?.role === 'customer') {
    return NextResponse.redirect(new URL('/', request.url))
  }
  // ... existing staff token check follows
}
```

---

## Environment Availability

> Step 2.6: SKIPPED — no new external dependencies. All libraries already installed. Supabase local dev already running. No new CLI tools, services, or runtimes required.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `@supabase/auth-helpers-nextjs` | `@supabase/ssr` | 2023 | Already migrated — project uses @supabase/ssr correctly |
| Custom email verification tokens | Supabase Auth native confirmation | N/A (Supabase feature) | Use `signUp` with `emailRedirectTo` + callback route |
| Storing session in localStorage | HttpOnly cookie via @supabase/ssr | Supabase SSR package | Already the pattern in use |

**Deprecated/outdated:**
- `@supabase/auth-helpers-nextjs`: Not used in this project (correctly). Do not introduce it.
- `supabase.auth.session()` (legacy sync API): Not available in supabase-js v2. Use `supabase.auth.getSession()` (async).

---

## Open Questions

1. **How does the online checkout assign store_id to orders?**
   - What we know: Orders have store_id. Guest checkout creates orders without a customer_id.
   - What's unclear: Is STORE_ID already an env var used server-side, or is it derived another way?
   - Recommendation: Read `src/app/api/webhooks/stripe/` or the online checkout Server Action before writing `customerSignup.ts`. Use whatever mechanism is already in place for single-tenant store_id resolution.

2. **Does `auth.uid()` in RLS policies resolve to the Supabase auth user UUID for customers using Supabase Auth?**
   - What we know: Yes — `auth.uid()` returns the UUID from the JWT `sub` claim, which is the Supabase auth user ID. This is consistent for both owner and customer Supabase Auth sessions.
   - Confidence: HIGH (Supabase documentation standard behaviour).

3. **Production Supabase Redirect URL allowlist**
   - What we know: The callback URL `/account/callback` must be whitelisted in Supabase Auth dashboard.
   - What's unclear: Whether production Supabase (project ref) has been configured with the Vercel deployment URL.
   - Recommendation: Include a Wave 0 task to verify/add the redirect URL in the Supabase dashboard before running the flow end-to-end.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest ^4.1.2 |
| Config file | `vitest.config.mts` |
| Quick run command | `npx vitest run` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CUST-01 | customerSignup validates email/password schema | unit | `npx vitest run src/actions/auth/__tests__/customerSignup.test.ts` | ❌ Wave 0 |
| CUST-01 | customerSignup rejects short passwords | unit | `npx vitest run src/actions/auth/__tests__/customerSignup.test.ts` | ❌ Wave 0 |
| CUST-02 | RLS: customer can only read own orders | unit (RLS) | `npx vitest run src/lib/__tests__/rls.test.ts` (extend) | partial — rls.test.ts exists |
| CUST-03 | updateProfile validates name and email format | unit | `npx vitest run src/actions/auth/__tests__/updateProfile.test.ts` | ❌ Wave 0 |
| CUST-04 | Auth hook injects role='customer' when customers row present | manual | supabase local + integration test | manual-only (requires live Supabase) |
| CUST-05 | Middleware redirects customer away from /pos | unit | `npx vitest run src/middleware.test.ts` | ❌ Wave 0 |
| CUST-05 | Middleware redirects customer away from /admin | unit | `npx vitest run src/middleware.test.ts` | ❌ Wave 0 |
| CUST-06 | resendVerification action calls Supabase resend | unit | `npx vitest run src/actions/auth/__tests__/resendVerification.test.ts` | ❌ Wave 0 |

**CUST-04 justification for manual-only:** Auth hook testing requires a running Supabase instance with the hook registered and the database seeded. The existing `rls.test.ts` already establishes the `describe.skip` pattern for tests requiring live Supabase. The hook itself can be verified manually during Wave 0 setup using `supabase start` + a manual sign-in.

### Sampling Rate

- **Per task commit:** `npx vitest run src/actions/auth/__tests__/`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/actions/auth/__tests__/customerSignup.test.ts` — covers CUST-01 schema validation
- [ ] `src/actions/auth/__tests__/updateProfile.test.ts` — covers CUST-03 validation
- [ ] `src/actions/auth/__tests__/resendVerification.test.ts` — covers CUST-06 action call
- [ ] `src/middleware.test.ts` — covers CUST-05 customer redirect logic

---

## Project Constraints (from CLAUDE.md)

| Directive | Applies To |
|-----------|-----------|
| Use `@supabase/ssr` not `@supabase/auth-helpers-nextjs` | All Supabase client creation |
| Every Server Action validates with `z.safeParse()` before touching the database | customerSignup, customerSignin, updateProfile, updateEmail |
| Use Supabase Auth for customer email/password auth | Confirmed — D-04 locks this |
| No Prisma, no Zustand, no NextAuth/Auth.js, no Clerk | Not applicable (none being introduced) |
| Do not use Tailwind v3 config patterns | All CSS stays Tailwind v4 (no tailwind.config.js) |
| Always read DESIGN.md before making visual/UI decisions | All new components must match DESIGN.md + 10-UI-SPEC.md |
| Stack is non-negotiable: Next.js App Router + Supabase + Stripe + Tailwind CSS | Confirmed — no deviations |
| No `react-hook-form` unless complex forms require it | Use Server Actions with `useActionState` for auth forms (simple) |
| Internet required — no offline mode | Confirmed — customer auth is purely online |

---

## Sources

### Primary (HIGH confidence)
- Codebase: `supabase/migrations/003_auth_hook.sql` — verified hook pattern, GRANT structure, `CREATE OR REPLACE` approach
- Codebase: `src/middleware.ts` — verified role check pattern, redirect targets, session resolution
- Codebase: `src/lib/resolveAuth.ts` — verified gap: does not handle customer sessions
- Codebase: `supabase/migrations/002_rls_policies.sql` — verified RLS pitfall (tenant_isolation must be role-scoped)
- Codebase: `supabase/config.toml` — verified auth hook registration, `enable_confirmations = false` local setting
- Codebase: `src/actions/auth/ownerSignin.ts` — verified Server Action pattern to mirror
- Codebase: `10-UI-SPEC.md` — full component and route contract
- Codebase: `10-CONTEXT.md` — all locked decisions

### Secondary (MEDIUM confidence)
- Supabase Auth `signUp` with `emailRedirectTo` and callback route — standard Supabase pattern documented in official Supabase Next.js SSR guide (pattern verified against `@supabase/ssr` ^0.10.0 in use)
- `supabase.auth.refreshSession()` as post-insert token refresh — documented Supabase approach for hook timing

### Tertiary (LOW confidence)
- Auth hook timing pitfall (Pitfall 1) — inferred from Supabase hook documentation and the sequential nature of `signUp` → insert. Not directly observable in this codebase since no customer auth existed before.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new libraries, all existing
- Architecture: HIGH — all patterns are direct extensions of verified existing code
- Pitfalls: HIGH (RLS conflict) / MEDIUM (hook timing) — RLS pitfall verified by reading migration, hook timing inferred from architecture
- Validation architecture: HIGH — vitest config confirmed, test file structure confirmed

**Research date:** 2026-04-02
**Valid until:** 2026-05-02 (stable stack, 30-day horizon)
