# Phase 13: Merchant Self-Serve Signup - Research

**Researched:** 2026-04-03
**Domain:** Supabase Auth signup flow, atomic DB provisioning via RPC, email verification gating, in-memory rate limiting, slug validation
**Confidence:** HIGH

## Summary

This phase builds the complete new-merchant signup pipeline: form → auth user creation → atomic store provisioning via Postgres RPC → email verification gate → redirect to the new store's admin subdomain. All the building blocks exist in the codebase (admin client, auth hook, tenant cache, existing RPC pattern from `complete_pos_sale`). The work is assembly and extension, not invention.

The most technically nuanced piece is the cross-domain email verification redirect. Supabase sends a verification email with a link back to the root domain; after code exchange the browser must be redirected to `{slug}.{domain}/admin/dashboard`. This requires the callback route to know the user's slug, which is derivable from the database after the session is established. The provisioning loading page (Decision D-05/D-06) is a simple polling loop from the client — Server-Sent Events are out of scope per context.

The atomic provisioning RPC must be `SECURITY DEFINER` (same pattern as `complete_pos_sale`) so it can write stores/staff/store_plans without relying on JWT claims that do not yet exist at signup time.

**Primary recommendation:** Follow the `complete_pos_sale` RPC pattern exactly — SECURITY DEFINER function, single transaction, raise exceptions on failure, called via the admin client from a Server Action.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** 4 fields: email, password, store name, store slug. Slug auto-generated from store name (slugify) with manual edit option.
- **D-02:** Live slug availability check — debounced API call on keystroke shows inline availability status (green checkmark or "taken"). Standard SaaS pattern.
- **D-03:** Signup page lives at root domain `/signup` (nzpos.co.nz/signup). Already has a placeholder at `src/app/signup/page.tsx`.
- **D-04:** Atomic provisioning via Postgres RPC function (`provision_store`). Single transaction creates store + staff (owner role) + store_plans row. If any step fails, all roll back. Auth user created first via Supabase Auth, then RPC called. If RPC fails, delete the auth user.
- **D-05:** After form submit, redirect to `/signup/provisioning` loading page that shows progress steps ("Creating your store...", "Setting up dashboard..."). Polls or waits for completion, then redirects to `{slug}.{domain}/admin/dashboard`.
- **D-06:** If provisioning fails mid-flight, show clear error message with "Retry provisioning" button. Auth user already exists, so retry only re-runs the DB provisioning RPC. No need to re-enter the form.
- **D-07:** Hard gate — merchant CANNOT access admin dashboard until email is verified. Middleware checks `email_confirmed_at` on the session. Unverified users are redirected to the verification screen.
- **D-08:** After clicking the verification link, merchant is redirected directly to their store's admin dashboard (`{slug}.{domain}/admin/dashboard`). First real interaction with their new store.
- **D-09:** Verification screen shows "We sent a verification email to {email}" with a Resend button (rate-limited) and a "Wrong email? Change it" link. Existing `resendVerification.ts` action can be adapted.
- **D-10:** Reserved slugs managed as a hardcoded TypeScript constant array (admin, www, api, app, signup, login, support, billing, help, docs, status, etc.). Checked in slug validation function. Version-controlled, easy to extend.
- **D-11:** Strict slug rules: 3-30 characters, lowercase alphanumeric + hyphens only. Must start with a letter, no consecutive hyphens, no leading/trailing hyphens. Subdomain-safe format.
- **D-12:** Rate limiting at the Server Action level: max 5 signup attempts per IP per hour, 1 store per verified email ever. In-memory rate limiter (no Redis needed at v2.0 scale). Supabase Auth already rate-limits `auth.signUp` calls.

### Claude's Discretion
- Exact reserved slug list contents (must include at minimum: admin, www, api, app, signup, login, support, billing)
- Loading page animation/design on provisioning screen
- Exact error messages and copy
- Slug availability check debounce timing
- In-memory rate limiter implementation details
- Whether to use polling or server-sent events for provisioning status
- Verification email template customization (if Supabase allows)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SIGNUP-01 | Merchant can sign up with email and password and get a provisioned store automatically | D-01 through D-06 cover the full flow; `provision_store` RPC with SECURITY DEFINER handles atomicity |
| SIGNUP-02 | Store provisioning is atomic (auth user + store + staff + store_plans in one transaction) | Postgres RPC with `SECURITY DEFINER` and single transaction block; rollback on any RAISE EXCEPTION |
| SIGNUP-03 | Merchant must verify email before accessing the dashboard | Middleware gate checks `email_confirmed_at`; `enable_confirmations = true` must be set in `supabase/config.toml` |
| SIGNUP-04 | Reserved slugs (admin, www, api, app, etc.) are blocked during signup | Hardcoded TypeScript constant array + Zod `.refine()` in the signup schema; checked before any DB write |
| SIGNUP-05 | Signup is rate-limited (1 store per verified email, throttled requests) | In-memory IP-keyed rate limiter in the signup Server Action; 1-store check queries `stores` table by `owner_auth_id` |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @supabase/supabase-js | ^2.101.1 (installed) | Auth signup, session, resend verification | Already the project auth layer |
| @supabase/ssr | ^0.10.0 (installed) | Cookie-based session in App Router | Required adapter — DO NOT use auth-helpers |
| zod | ^4.3.6 (installed) | Schema validation for signup form inputs | Project standard; used in every existing Server Action |
| next | 16.2.1 (installed) | Server Actions, middleware, routing | Project framework |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| server-only | installed | Guard admin client imports | Import in any file using `SUPABASE_SERVICE_ROLE_KEY` |
| react-hook-form + @hookform/resolvers | installed | Client-side form state for signup form | Use for the 4-field signup form — live slug check requires client-side controlled input |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| In-memory rate limiter | Redis / Upstash | Redis adds infra cost; in-memory is adequate at v2.0 scale per D-12 |
| Server Actions for signup | Route Handler | Server Actions are the project pattern; consistent with all other auth actions |
| Polling for provisioning status | Server-Sent Events | SSE adds complexity; polling from `/signup/provisioning` page is sufficient for a one-time flow |

**Installation:** No new packages required — all dependencies are already installed.

## Architecture Patterns

### Recommended Project Structure
```
src/
├── actions/auth/
│   ├── ownerSignup.ts         # REWRITE — atomic RPC flow, email verification
│   ├── checkSlugAvailability.ts  # NEW — debounced Server Action for live check
│   ├── retryProvisioning.ts   # NEW — re-run provision_store RPC for failed signups
│   └── resendVerification.ts  # ADAPT — update emailRedirectTo for subdomain redirect
├── app/signup/
│   ├── page.tsx               # REBUILD — 4-field form with live slug check
│   ├── provisioning/
│   │   └── page.tsx           # NEW — polling/loading screen post-signup
│   └── verify/
│       └── page.tsx           # NEW — verification screen (check email + resend)
├── app/api/auth/
│   └── callback/route.ts      # NEW — PKCE code exchange + slug redirect
├── lib/
│   ├── slugValidation.ts      # NEW — reserved slug list + regex rules (D-10, D-11)
│   └── signupRateLimit.ts     # NEW — in-memory IP rate limiter
└── middleware.ts              # EXTEND — add email_confirmed_at gate for /admin routes
supabase/migrations/
└── 017_provision_store_rpc.sql  # NEW — provision_store() SECURITY DEFINER function
```

### Pattern 1: Atomic Provisioning RPC (SECURITY DEFINER)

**What:** A single Postgres function that wraps all INSERT operations in one transaction. If any step fails, the entire transaction rolls back. The function runs as the DB owner (SECURITY DEFINER) so it bypasses RLS — the caller is the service role via the admin client, which is already trusted.

**When to use:** Any operation that must create rows across multiple tables atomically when the caller has no JWT claims yet (newly created auth user).

**Example:**
```sql
-- supabase/migrations/017_provision_store_rpc.sql
-- Mirrors complete_pos_sale pattern from 005_pos_rpc.sql
CREATE OR REPLACE FUNCTION provision_store(
  p_auth_user_id UUID,
  p_store_name   TEXT,
  p_slug         TEXT,
  p_owner_email  TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_store_id UUID;
BEGIN
  -- 1. Insert store
  INSERT INTO public.stores (name, slug, owner_auth_id, is_active)
  VALUES (p_store_name, p_slug, p_auth_user_id, true)
  RETURNING id INTO v_store_id;

  -- 2. Insert owner staff record (auth hook reads this to inject JWT claims)
  INSERT INTO public.staff (store_id, auth_user_id, name, role)
  VALUES (v_store_id, p_auth_user_id, p_owner_email, 'owner');

  -- 3. Insert store_plans row (all features off by default)
  INSERT INTO public.store_plans (store_id)
  VALUES (v_store_id);

  RETURN jsonb_build_object('store_id', v_store_id, 'slug', p_slug);
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'SLUG_TAKEN:%', p_slug;
  WHEN OTHERS THEN
    RAISE EXCEPTION 'PROVISION_FAILED:%', SQLERRM;
END;
$$;

GRANT EXECUTE ON FUNCTION provision_store TO service_role;
REVOKE EXECUTE ON FUNCTION provision_store FROM authenticated, anon, public;
```

**Caller pattern in Server Action:**
```typescript
// src/actions/auth/ownerSignup.ts
const admin = createSupabaseAdminClient()
const { data, error } = await admin.rpc('provision_store', {
  p_auth_user_id: authData.user.id,
  p_store_name: parsed.data.storeName,
  p_slug: parsed.data.slug,
  p_owner_email: parsed.data.email,
})
if (error) {
  // Rollback: delete the auth user that was created before the RPC
  await admin.auth.admin.deleteUser(authData.user.id)
  return { error: { slug: [error.message.includes('SLUG_TAKEN') ? 'Slug already taken' : 'Provisioning failed'] } }
}
```

### Pattern 2: Email Verification Callback with Subdomain Redirect (PKCE flow)

**What:** Supabase email verification uses PKCE — the verification link contains a `code` parameter. The callback route exchanges the code for a session, then queries the database for the user's store slug to redirect to `{slug}.{domain}/admin/dashboard`.

**Why this is needed:** The verification email is sent from the root domain context. After verification the user needs to land on their store's subdomain. The callback route on the root domain can read the now-verified session to look up the slug.

**Critical configuration requirement:** `additional_redirect_urls` in `supabase/config.toml` must include the root domain callback URL: `http://127.0.0.1:3000/api/auth/callback`. For production, Supabase Dashboard must include `https://nzpos.co.nz/api/auth/callback` in allowed redirect URLs.

```typescript
// src/app/api/auth/callback/route.ts (NEW — on root domain)
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const rootDomain = process.env.ROOT_DOMAIN ?? 'lvh.me:3000'

  if (code) {
    const supabase = await createSupabaseServerClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error && data.user) {
      // Look up slug via admin client (user has no JWT claims yet at this point)
      const admin = createSupabaseAdminClient()
      const { data: store } = await admin
        .from('stores')
        .select('slug')
        .eq('owner_auth_id', data.user.id)
        .single()
      if (store?.slug) {
        const protocol = rootDomain.includes('localhost') || rootDomain.includes('lvh.me') ? 'http' : 'https'
        return NextResponse.redirect(`${protocol}://${store.slug}.${rootDomain}/admin/dashboard`)
      }
    }
  }

  return NextResponse.redirect(new URL('/signup?error=verification_failed', request.url))
}
```

**emailRedirectTo in signup:**
```typescript
// The verification email must point to the root-domain callback
await supabase.auth.signUp({
  email: parsed.data.email,
  password: parsed.data.password,
  options: {
    emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/api/auth/callback`,
  },
})
```

### Pattern 3: Email Verification Gate in Middleware (D-07)

**What:** Middleware intercepts all `/admin` requests on store subdomains and checks `email_confirmed_at` on the Supabase session. Unverified users are redirected to `/signup/verify`.

**When to add:** In the existing `/admin` middleware branch (line 58–86 of `src/middleware.ts`), after the user is confirmed to exist and before the role check.

```typescript
// Inside the admin branch in middleware.ts — add after getUser() check
const emailVerified = user.email_confirmed_at != null
if (!emailVerified) {
  // Redirect to root-domain verification screen, pass email as param
  const verifyUrl = new URL(`http://${rootDomain}/signup/verify`)
  verifyUrl.searchParams.set('email', user.email ?? '')
  return NextResponse.redirect(verifyUrl)
}
```

**Important:** `user.email_confirmed_at` is the canonical field. It is set by Supabase Auth when the user clicks the verification link. Do NOT rely on session JWT claims — read the fresh `getUser()` response which always hits the Supabase Auth server.

### Pattern 4: In-Memory IP Rate Limiter (D-12)

**What:** A simple module-level Map that tracks signup attempts per IP. On Vercel serverless each instance is independent — this is acceptable at v2.0 scale. The rate limiter covers IP-based throttling (5 attempts per hour). The 1-store-per-email rule is enforced via a database query.

```typescript
// src/lib/signupRateLimit.ts
const attempts = new Map<string, { count: number; windowStart: number }>()
const WINDOW_MS = 60 * 60 * 1000 // 1 hour
const MAX_ATTEMPTS = 5

export function checkRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now()
  const entry = attempts.get(ip)
  if (!entry || now - entry.windowStart > WINDOW_MS) {
    attempts.set(ip, { count: 1, windowStart: now })
    return { allowed: true, remaining: MAX_ATTEMPTS - 1 }
  }
  if (entry.count >= MAX_ATTEMPTS) return { allowed: false, remaining: 0 }
  entry.count++
  return { allowed: true, remaining: MAX_ATTEMPTS - entry.count }
}
```

**IP extraction in Server Action:**
```typescript
import { headers } from 'next/headers'
const headersList = await headers()
const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '127.0.0.1'
```

### Pattern 5: Slug Validation (D-10, D-11)

**What:** Pure validation function used by both the Zod schema (server-side) and client-side form validation. The reserved list is a TypeScript constant — no database lookup needed.

```typescript
// src/lib/slugValidation.ts
export const RESERVED_SLUGS = [
  'admin', 'www', 'api', 'app', 'signup', 'login', 'support',
  'billing', 'help', 'docs', 'status', 'mail', 'ftp', 'cdn',
  'assets', 'static', 'dashboard', 'account', 'settings', 'about',
  'contact', 'terms', 'privacy', 'blog', 'home', 'index',
] as const

// Subdomain-safe slug rules per D-11
const SLUG_REGEX = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/

export function validateSlug(slug: string): { valid: boolean; reason?: string } {
  if (slug.length < 3 || slug.length > 30) return { valid: false, reason: 'Slug must be 3-30 characters' }
  if (!SLUG_REGEX.test(slug)) return { valid: false, reason: 'Lowercase letters, numbers, hyphens only. Must start with a letter.' }
  if (RESERVED_SLUGS.includes(slug as typeof RESERVED_SLUGS[number])) return { valid: false, reason: 'This slug is reserved' }
  return { valid: true }
}

// Zod schema integration
export const SlugSchema = z.string()
  .min(3).max(30)
  .regex(SLUG_REGEX, 'Invalid slug format')
  .refine(s => !RESERVED_SLUGS.includes(s as typeof RESERVED_SLUGS[number]), 'Slug is reserved')
```

### Pattern 6: Slugify Utility

**What:** Auto-generate a slug from the store name on the client. This runs in the browser as the user types the store name — no library needed, pure string transform.

```typescript
// Used in signup form component (client-side)
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')   // remove non-alphanumeric except spaces/hyphens
    .trim()
    .replace(/\s+/g, '-')            // spaces to hyphens
    .replace(/-+/g, '-')             // collapse multiple hyphens
    .replace(/^-|-$/g, '')           // strip leading/trailing hyphens
    .slice(0, 30)
}
```

### Pattern 7: Live Slug Availability Check (D-02)

**What:** Debounced Server Action called from the signup form's slug field onChange. Returns `{ available: boolean }`. No auth required — anon check against the `stores` table using the admin client.

```typescript
// src/actions/auth/checkSlugAvailability.ts
'use server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { validateSlug } from '@/lib/slugValidation'

export async function checkSlugAvailability(slug: string): Promise<{ available: boolean; reason?: string }> {
  const validation = validateSlug(slug)
  if (!validation.valid) return { available: false, reason: validation.reason }

  const admin = createSupabaseAdminClient()
  const { data } = await admin
    .from('stores')
    .select('id')
    .eq('slug', slug)
    .maybeSingle()

  return { available: data === null }
}
```

**Client-side debounce pattern (in form component):**
```typescript
// 400ms debounce is standard for availability checks
import { useDebouncedCallback } from 'use-debounce'  // OR implement manually with useEffect + setTimeout
```

Note: `use-debounce` is NOT installed. Use a `useEffect` + `clearTimeout` pattern to avoid adding a new dependency.

### Anti-Patterns to Avoid

- **Calling provision_store with the anon/user client:** The auth user just created has no JWT claims. All provisioning DB writes must use `createSupabaseAdminClient()`.
- **Skipping the auth user delete on RPC failure:** If `provision_store` fails after `auth.signUp()` succeeds, the orphaned auth user must be deleted via `admin.auth.admin.deleteUser()`. If not, the email address is permanently "taken" in Supabase Auth but has no store.
- **Using `getSession()` instead of `getUser()` for the email verification check:** `getSession()` reads from the cookie cache and may return a stale session. `getUser()` always verifies with the Supabase Auth server — critical for security gates per Supabase official docs.
- **Putting the auth callback route on a store subdomain:** The verification email's redirect URL must be on the root domain. Supabase's PKCE callback hits whatever URL was set in `emailRedirectTo`.
- **Forgetting to update `supabase/config.toml` `additional_redirect_urls`:** The PKCE callback URL must be in the allowed list. Missing this causes "redirect_uri_mismatch" errors in the email verification flow.
- **Forgetting `enable_confirmations = true`:** Currently `enable_confirmations = false` in `supabase/config.toml`. This must be set to `true` for the email verification gate (SIGNUP-03) to function. Without it, users are auto-confirmed on signup and the gate is bypassed.
- **Forgetting to regenerate Supabase types after migration:** The `provision_store` RPC adds a new function. Run `supabase gen types typescript` after the migration to expose it in `src/types/database.ts`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Atomic multi-table insert | Manual try/catch with manual rollback in TypeScript | Postgres RPC with BEGIN/EXCEPTION/ROLLBACK | Network failure between individual inserts leaves partial state; DB transactions are atomic by definition |
| Slug uniqueness guarantee | Application-level "check then insert" | Postgres UNIQUE constraint on `stores.slug` + catch `unique_violation` in RPC | Race condition between check and insert; UNIQUE constraint is the canonical guarantee |
| Rate limiting | Complex token bucket | Module-level Map with window counter | Token bucket is overkill at this scale; sliding window Map is 15 lines and zero dependencies |
| Slug validation regex | Custom parser | `/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/` regex + reserved list | Edge cases (consecutive hyphens, leading/trailing) are already handled by the regex |
| Email verification state | Custom DB column | `email_confirmed_at` from Supabase Auth's `auth.users` table | Supabase manages this; reading via `getUser()` is always authoritative |

**Key insight:** Postgres is doing the heavy lifting for atomicity and uniqueness. The TypeScript layer is orchestration only.

## Common Pitfalls

### Pitfall 1: Orphaned Auth User on Provisioning Failure
**What goes wrong:** `auth.signUp()` succeeds, `provision_store` RPC fails. The merchant sees an error, re-enters their email on retry, gets "email already in use" from Supabase Auth.
**Why it happens:** Auth user creation and DB provisioning are two separate operations. Only the DB operation is wrapped in a transaction.
**How to avoid:** In the Server Action, after a failed RPC, immediately call `admin.auth.admin.deleteUser(authData.user.id)`. The retry provisioning flow (D-06) re-runs from the point where the auth user already exists — it should accept the `authUserId` from the session and skip re-creating the auth user.
**Warning signs:** "Email already registered" errors on fresh signup attempts after a previous failure.

### Pitfall 2: `enable_confirmations` Not Enabled
**What goes wrong:** The email verification gate in middleware redirects correctly, but users are auto-confirmed at signup (the current dev setting). SIGNUP-03 appears to pass in dev but fails in production or when testing end-to-end.
**Why it happens:** `supabase/config.toml` currently has `enable_confirmations = false`. This is the dev convenience default.
**How to avoid:** Set `enable_confirmations = true` in `supabase/config.toml` as part of this phase migration. Note this changes local dev behavior — developers will need to verify email (via Inbucket at `http://127.0.0.1:54324`) for local testing.
**Warning signs:** Email gate middleware never triggers; users land on dashboard without ever verifying.

### Pitfall 3: Stale Session After Provisioning
**What goes wrong:** After `provision_store` creates the staff record, the user's JWT still has no `store_id` or `role` claims. The middleware role check (`role !== 'owner'`) redirects them to `/unauthorized`.
**Why it happens:** The auth hook fires on token issue. After provisioning, the existing session token does not automatically re-run the hook.
**How to avoid:** After successful provisioning, call `supabase.auth.refreshSession()` before redirecting to the provisioning loading page. This forces the auth hook to re-run and inject `store_id` and `role` into the new JWT. The existing `ownerSignup.ts` does this — preserve the pattern.
**Warning signs:** User sees `/unauthorized` immediately after verifying email and clicking through.

### Pitfall 4: Email Verification Redirect Lands on Root Domain Instead of Store Subdomain
**What goes wrong:** After clicking the verification link, the user lands on the root domain dashboard rather than `{slug}.domain/admin/dashboard`.
**Why it happens:** The callback route uses `origin` from `new URL(request.url)` which is the root domain. It needs to explicitly construct the subdomain URL using the slug looked up from the database.
**How to avoid:** In `src/app/api/auth/callback/route.ts`, after code exchange, query `stores.slug` by `owner_auth_id` and build the full subdomain URL. See Pattern 2 above.
**Warning signs:** Successful verification but user lands on a 404 or the root homepage.

### Pitfall 5: Slug Availability Race Condition During High Load
**What goes wrong:** Two merchants simultaneously check the same slug (both get "available"), both submit, one gets a DB error.
**Why it happens:** The live availability check is advisory, not transactional. Two requests can both check before either inserts.
**How to avoid:** The `UNIQUE` constraint on `stores.slug` (already exists from migration 014) is the real guard. The `provision_store` RPC catches `unique_violation` and raises `SLUG_TAKEN`. The Server Action must handle this error and return a clear field-level error to the form.
**Warning signs:** Generic "provisioning failed" error on slug collision rather than "slug already taken".

### Pitfall 6: `checkSlugAvailability` Bypasses Reserved Slug Check
**What goes wrong:** The availability Server Action queries the DB but doesn't check the reserved list. A merchant can grab "admin" or "www" as a slug because it's not in the database yet.
**Why it happens:** The DB `UNIQUE` constraint only covers slugs already in use; it cannot know about reserved words.
**How to avoid:** Always run `validateSlug()` (which checks the reserved list) before the DB query in `checkSlugAvailability`. The Zod schema in the signup Server Action also includes the reserved list check as a second layer.
**Warning signs:** Reserved slug validation only triggers at form submit, not during the live check.

### Pitfall 7: Middleware Email Verification Check Blocks Non-Admin Routes
**What goes wrong:** The email verification redirect is added too broadly in middleware and blocks storefront or POS routes.
**Why it happens:** The gate should only apply to `/admin` routes on store subdomains.
**How to avoid:** Add the `email_confirmed_at` check only inside the existing `pathname.startsWith('/admin')` branch. Leave POS, storefront, and API routes untouched.

## Code Examples

Verified from existing codebase patterns:

### Admin Client Usage (from `src/lib/supabase/admin.ts`)
```typescript
import 'server-only'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

export function createSupabaseAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
```

### Calling an RPC via Admin Client (from `src/lib/__tests__/rls.test.ts` pattern)
```typescript
const { data, error } = await admin.rpc('provision_store', {
  p_auth_user_id: userId,
  p_store_name: storeName,
  p_slug: slug,
  p_owner_email: email,
})
```

### Seeding Pattern: Store + Staff + Store Plans (from `supabase/seed.ts`)
```typescript
// The RPC must produce the same rows the seed creates:
// 1. stores row with slug + owner_auth_id
// 2. staff row with role: 'owner' + auth_user_id
// 3. store_plans row with store_id (all features false by default)
await admin.from('stores').insert({ id: storeId, name, slug, owner_auth_id: userId })
await admin.from('staff').insert({ store_id: storeId, auth_user_id: userId, name, role: 'owner' })
await admin.from('store_plans').insert({ store_id: storeId })
```

### Middleware Route Check Pattern (from `src/middleware.ts`)
```typescript
if (pathname.startsWith('/admin')) {
  const { supabase, response } = await createSupabaseMiddlewareClient(request)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) { /* redirect to login */ }
  // ADD HERE: check user.email_confirmed_at
  // Then role check as before
}
```

### Zod Server Action Pattern (from existing actions)
```typescript
'use server'
import { z } from 'zod'
const Schema = z.object({ ... })
export async function myAction(formData: FormData) {
  const parsed = Schema.safeParse({ ... })
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }
  // ... proceed with validated data
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Non-atomic signup (separate inserts in TypeScript) | SECURITY DEFINER Postgres RPC | This phase | Eliminates partial provisioning state |
| No email verification (local dev default) | `enable_confirmations = true` | This phase | SIGNUP-03 compliance; changes local dev workflow |
| No slug support in signup | 4-field form with slugify + live check | This phase | Multi-tenant routing becomes self-service |
| v1 single-tenant `ownerSignup.ts` | Multi-tenant `ownerSignup.ts` with slug, RPC, email gate | This phase | Complete rewrite of the existing action |

**Deprecated/outdated in this phase:**
- `ownerSignup.ts` v1 logic: No slug, no store_plans row, no email verification, non-atomic. Must be fully rewritten.
- `resendVerification.ts` emailRedirectTo: Currently points to `/account/callback` (storefront). Must point to root domain `/api/auth/callback` for signup verification.

## Open Questions

1. **Provisioning polling vs. completion detection on `/signup/provisioning`**
   - What we know: D-05 says "polls or waits for completion". The provisioning action in the Server Action is synchronous — by the time the Server Action returns, provisioning is either done or failed.
   - What's unclear: If provisioning is synchronous in the Server Action, the loading page might be unnecessary — the Server Action could redirect directly. However D-05/D-06 explicitly call for a loading page with progress steps and a retry mechanism.
   - Recommendation: Use the loading page as a UX affordance. After the Server Action completes successfully, redirect to `/signup/provisioning?slug={slug}` which immediately auto-redirects to the store dashboard. On failure, the loading page shows the retry button. This avoids actual polling but keeps the UX flow specified in D-05/D-06.

2. **`resendVerification.ts` email parameter**
   - What we know: The current action accepts `email` from formData. The verification screen needs to show the email and let the user resend.
   - What's unclear: Whether to store the email in session state or pass it as a URL parameter.
   - Recommendation: Pass as a URL parameter (`/signup/verify?email=foo%40bar.com`). It is not sensitive (the user just entered it), and avoids session state complexity. Validate it server-side before using it.

3. **Supabase type regeneration timing**
   - What we know: `src/types/database.ts` must be regenerated after adding the `provision_store` RPC function.
   - What's unclear: Whether the plan should include this as an explicit task or whether the developer will remember.
   - Recommendation: Include explicit task in Wave 1: "Run `npx supabase gen types typescript --local > src/types/database.ts` after the migration is applied."

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Supabase CLI | Migration + type gen | Check with `supabase --version` | — | Required, no fallback |
| supabase local (running) | RLS tests, e2e | Requires `supabase start` | — | Tests skip when not running |
| Node.js | Seed script, tsx | ✓ | v20+ (Vercel) | — |

**Missing dependencies with no fallback:**
- Supabase CLI must be installed and `supabase start` running for migration application and local e2e testing.

**Missing dependencies with fallback:**
- Local Supabase not running: RLS tests auto-skip (established pattern in `rls.test.ts`).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 2.x/3.x |
| Config file | `vitest.config.mts` (root) |
| Quick run command | `npm run test -- --reporter=verbose src/lib/slugValidation.test.ts src/lib/signupRateLimit.test.ts` |
| Full suite command | `npm run test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SIGNUP-01 | Signup action creates auth user + triggers provisioning | integration | `npm run test -- src/actions/auth/__tests__/ownerSignup.test.ts` | ❌ Wave 0 |
| SIGNUP-02 | Provisioning is atomic — RPC failure rolls back all rows | integration | `npm run test -- src/lib/__tests__/rls.test.ts` (extend existing) | Extend existing |
| SIGNUP-03 | Email gate redirects unverified users from /admin | unit | `npm run test -- src/middleware.test.ts` | ❌ Wave 0 |
| SIGNUP-04 | Reserved slugs and malformed slugs are rejected by validateSlug() | unit | `npm run test -- src/lib/slugValidation.test.ts` | ❌ Wave 0 |
| SIGNUP-05 | Rate limiter blocks after 5 attempts; 1-store check enforced | unit | `npm run test -- src/lib/signupRateLimit.test.ts` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npm run test -- src/lib/slugValidation.test.ts src/lib/signupRateLimit.test.ts`
- **Per wave merge:** `npm run test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/lib/slugValidation.test.ts` — covers SIGNUP-04 (reserved slugs, regex rules, valid/invalid cases)
- [ ] `src/lib/signupRateLimit.test.ts` — covers SIGNUP-05 (rate window, max attempts, reset)
- [ ] `src/actions/auth/__tests__/ownerSignup.test.ts` — covers SIGNUP-01/02 (mocked Supabase admin client)
- [ ] `src/middleware.test.ts` — covers SIGNUP-03 (email gate logic, mock `getUser` returning unconfirmed user)

## Project Constraints (from CLAUDE.md)

| Directive | Impact on Phase |
|-----------|----------------|
| Tech stack is non-negotiable: Next.js App Router + Supabase + Stripe + Tailwind CSS | No new libraries for auth, DB, or form handling |
| Do NOT use `@supabase/auth-helpers-nextjs` | Use `@supabase/ssr` exclusively for server-side auth |
| Every Server Action must validate inputs with `z.safeParse()` before touching the database | All new actions: `ownerSignup`, `checkSlugAvailability`, `retryProvisioning` must use Zod |
| Use `server-only` guard in any file with Supabase credentials | `admin.ts`, new Server Actions — already enforced |
| Do not use Prisma, NextAuth, Clerk, Redux, Zustand, CSS Modules, Tailwind v3, Supabase Realtime | None of these are in scope for this phase |
| Read DESIGN.md before any visual/UI decisions | Signup form, provisioning screen, and verification screen must follow DESIGN.md |
| GSD workflow enforcement: use `/gsd:execute-phase` for planned work | Execution must go through GSD |

## Sources

### Primary (HIGH confidence)
- Codebase: `supabase/migrations/005_pos_rpc.sql` — SECURITY DEFINER RPC pattern (complete_pos_sale)
- Codebase: `supabase/migrations/014_multi_tenant_schema.sql` — stores.slug schema, store_plans table
- Codebase: `supabase/migrations/015_rls_policy_rewrite.sql` — RLS policy patterns
- Codebase: `supabase/migrations/016_super_admin.sql` — auth hook structure
- Codebase: `src/middleware.ts` — existing tenant resolution and admin gate pattern
- Codebase: `src/lib/supabase/admin.ts` — admin client pattern
- Codebase: `src/app/(store)/account/callback/route.ts` — PKCE code exchange pattern
- Codebase: `supabase/seed.ts` — canonical store + staff + store_plans creation pattern
- Codebase: `supabase/config.toml` — `enable_confirmations = false` confirmed (must change)
- Codebase: `src/actions/auth/resendVerification.ts` — resend pattern, emailRedirectTo location
- Supabase JS docs: `getUser()` vs `getSession()` — `getUser()` always verified server-side

### Secondary (MEDIUM confidence)
- Supabase docs: PKCE flow with `exchangeCodeForSession` — verified by existing callback route code
- Next.js middleware pattern: `getUser()` in middleware — verified by existing middleware.ts usage

### Tertiary (LOW confidence)
- None — all findings verified against codebase

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages already installed and in use
- Architecture: HIGH — all patterns derived from existing codebase code
- Pitfalls: HIGH — pitfalls derived from direct code inspection of `enable_confirmations = false`, existing non-atomic signup, and PKCE callback pattern
- Test map: MEDIUM — test structure follows project conventions but test files are new (Wave 0)

**Research date:** 2026-04-03
**Valid until:** 2026-05-03 (stable stack, 30 days)
