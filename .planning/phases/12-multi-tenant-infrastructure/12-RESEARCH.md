# Phase 12: Multi-Tenant Infrastructure - Research

**Researched:** 2026-04-03
**Domain:** Next.js middleware subdomain routing, Supabase RLS with super admin JWT claims, schema migration, Playwright subdomain E2E testing
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Subdomain Routing**
- D-01: Middleware-based routing. Next.js middleware reads hostname, extracts slug from `{slug}.domain.tld`, looks up `store_id` in DB, injects into request headers. All existing routes work unchanged.
- D-02: In-memory Map with TTL (~5 min) for slug-to-store_id lookup caching. No external cache dependency. Slug mappings rarely change.
- D-03: Unknown subdomains show a 404 "Store not found" page. No redirect to marketing site.
- D-04: Subdomain serves storefront, admin (/admin), and POS (/pos) on the same subdomain via path-based routing. No separate admin subdomain.
- D-05: Root domain (domain.tld) and www serve the marketing/landing page. No store content on root.
- D-06: Local dev uses `lvh.me` wildcard — `slug.lvh.me:3000` resolves to 127.0.0.1 automatically. More realistic than query params.

**Schema Migration**
- D-07: Add `slug` column to existing `stores` table (UNIQUE, NOT NULL). Existing seed store gets a default slug (e.g. 'demo' or founder's store name). Existing data stays intact.
- D-08: `store_plans` table with boolean columns: `has_xero`, `has_email_notifications`, `has_custom_domain`, plus `stripe_customer_id`, `stripe_subscription_id`. One row per store.
- D-09: Include branding columns on `stores` now: `logo_url`, `store_description`, `primary_color`. Pre-populates schema for Phase 14 wizard.
- D-10: Also add `is_active` (boolean, default true) and `created_at` timestamp to `stores`.
- D-11: Add `stripe_customer_id` on `stores` table.

**RLS and Super Admin**
- D-12: `is_super_admin` JWT claim set via auth hook. Auth hook checks a `super_admins` table (or flag). Same pattern as existing role injection into `app_metadata`.
- D-13: Super admin has read-all, write-own access. Can SELECT across all tenants but INSERT/UPDATE/DELETE still requires matching `store_id`.
- D-14: Full RLS policy rewrite — drop and recreate all policies with a unified pattern that handles owner, staff, customer, and super_admin roles cleanly.

**E2E Isolation Testing**
- D-15: Both test layers: Vitest integration tests for DB-level RLS assertions + Playwright E2E tests for routing-level assertions.
- D-16: Four attack vectors asserted: direct API with wrong JWT, RPC with wrong store_id, super admin write attempt, subdomain spoofing.

### Claude's Discretion
- Production domain selection (Claude picks what's sensible for NZ SaaS)
- Migration numbering and ordering
- In-memory cache TTL exact value
- Super admin table design (dedicated table vs flag on staff)
- 404 page design/content for unknown subdomains
- Vitest test fixture setup for multi-tenant scenarios
- Playwright subdomain test configuration with lvh.me

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| TENANT-01 | Wildcard subdomain routing resolves {slug}.domain.tld to the correct store | Middleware hostname extraction, in-memory TTL cache, lvh.me local dev, Next.js `matcher` config |
| TENANT-02 | Schema supports multi-tenant SaaS (stores.slug, store_plans table, stripe_customer_id) | Migration 014 design: slug UNIQUE NOT NULL, store_plans boolean columns, branding columns |
| TENANT-03 | RLS policies enforce tenant isolation via JWT claims (not middleware headers) | Full policy rewrite covering all 11 tables; super_admin OR store_id pattern |
| TENANT-04 | Super admin JWT claim (is_super_admin) bypasses store-scoped RLS where needed | Auth hook extension pattern from migration 012, super_admins table design |
| TENANT-05 | Cross-tenant isolation verified with E2E tests (tenant A cannot access tenant B data) | Extension of existing rls.test.ts pattern + Playwright lvh.me subdomain config |
</phase_requirements>

---

## Summary

Phase 12 is a pure infrastructure phase — schema, RLS, and routing — with no UI work. The codebase already has a working multi-store foundation (all tables have `store_id`, RLS is enabled, the JWT auth hook injects `store_id` and `role` into `app_metadata`), so this phase extends that foundation to handle multiple stores accessed via subdomains.

The three major work streams are independent enough to execute in parallel waves: (1) schema migration adding `slug`, `store_plans`, and branding columns; (2) middleware rewrite for subdomain tenant resolution with in-memory caching; and (3) RLS policy rewrite with super admin support plus the E2E test suite. Each wave can be verified independently before the next.

The most technically complex part is the middleware rewrite. The existing `src/middleware.ts` handles auth routing (owner, staff, customer) but has no concept of multi-tenancy from the hostname. The new middleware must layer tenant resolution (hostname → slug → store_id) on top of the existing auth routing without breaking the established patterns. The admin client (`createSupabaseAdminClient`) is already available for the slug lookup.

**Primary recommendation:** Implement in migration sequence: (1) schema migration, (2) seed update, (3) middleware rewrite with cache, (4) RLS rewrite, (5) auth hook extension for super admin, (6) test suite. This order ensures each layer is testable before the next is built.

---

## Standard Stack

### Core (already installed in project)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next | 16.2.1 | Middleware and routing | `middleware.ts` runs on Edge Runtime; `request.nextUrl` and `request.headers` APIs used for hostname extraction |
| @supabase/supabase-js | ^2.101.1 | DB queries in middleware for slug lookup | Admin client with service role key bypasses RLS for slug → store_id lookup |
| @supabase/ssr | ^0.10.0 | Cookie-based session handling in middleware | Already used in `createSupabaseMiddlewareClient`; unchanged |
| jose | ^6.2.2 | Staff PIN JWT verification | Already used in middleware for POS routes; unchanged |
| vitest | ^4.1.2 | DB-level RLS integration tests | Existing rls.test.ts uses this; extend pattern |
| @playwright/test | ^1.58.2 | E2E subdomain routing tests | Already installed; needs config and test files created |

### No New Dependencies Required

All required libraries are already present. This phase adds no new npm packages.

## Architecture Patterns

### Recommended Project Structure

```
supabase/migrations/
  014_multi_tenant_schema.sql   # slug, store_plans, branding columns, stripe fields
  015_rls_policy_rewrite.sql    # Drop all existing policies, recreate unified set
  016_super_admin.sql           # super_admins table + auth hook extension

src/
  middleware.ts                 # REWRITTEN: subdomain tenant resolution + existing auth logic
  lib/
    tenantCache.ts              # In-memory Map<string, {store_id, expires}> TTL cache
    resolveAuth.ts              # EXTENDED: read x-store-id header injected by middleware

tests/
  e2e/
    playwright.config.ts        # lvh.me baseURL, storageState setup
    tenant-routing.spec.ts      # Playwright: subdomain → correct store
    tenant-isolation.spec.ts    # Playwright: cross-tenant header spoofing

src/lib/__tests__/
  rls.test.ts                   # EXTENDED: 4 attack vectors (already has 1)
```

### Pattern 1: Middleware Tenant Resolution

**What:** Middleware reads `request.headers.get('host')`, extracts the subdomain slug, looks up `store_id` from DB (with in-memory TTL cache), then injects `x-store-id` and `x-store-slug` headers for downstream Server Components and Route Handlers to consume.

**When to use:** Every request except webhook routes and root/www domain requests.

**Key detail:** The slug lookup uses `createSupabaseAdminClient()` (service role, bypasses RLS) — NOT the anon client. The anon client cannot read `stores` without a JWT that matches the store's own `store_id`, which is a chicken-and-egg problem.

**Example structure:**

```typescript
// src/lib/tenantCache.ts
const cache = new Map<string, { store_id: string; expires: number }>()
const TTL_MS = 5 * 60 * 1000 // 5 minutes

export function getCached(slug: string) {
  const entry = cache.get(slug)
  if (!entry) return null
  if (Date.now() > entry.expires) { cache.delete(slug); return null }
  return entry.store_id
}

export function setCache(slug: string, store_id: string) {
  cache.set(slug, { store_id, expires: Date.now() + TTL_MS })
}
```

```typescript
// src/middleware.ts — tenant resolution section (before existing auth logic)
const host = request.headers.get('host') ?? ''
const rootDomain = process.env.ROOT_DOMAIN ?? 'lvh.me:3000' // e.g. nzpos.co.nz in prod
const isRoot = host === rootDomain || host === `www.${rootDomain}`

if (!isRoot) {
  const slug = host.replace(`.${rootDomain}`, '')
  let storeId = getCached(slug)

  if (!storeId) {
    const admin = createSupabaseAdminClient()
    const { data } = await admin
      .from('stores')
      .select('id')
      .eq('slug', slug)
      .eq('is_active', true)
      .single()

    if (!data) {
      return NextResponse.rewrite(new URL('/not-found', request.url))
    }
    storeId = data.id
    setCache(slug, storeId)
  }

  // Inject store context into request headers for downstream consumption
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-store-id', storeId)
  requestHeaders.set('x-store-slug', slug)
  // ... continue with existing auth logic using modified request
}
```

**IMPORTANT — Edge Runtime constraint:** `createSupabaseAdminClient()` in `src/lib/supabase/admin.ts` imports `server-only` which causes build errors in middleware. The admin client for middleware must be created inline without `server-only` import, using `createClient` directly from `@supabase/supabase-js`. Create a separate `src/lib/supabase/middlewareAdmin.ts` that does NOT import `server-only`.

**Confidence:** HIGH — verified from Next.js middleware docs and existing codebase patterns.

### Pattern 2: Unified RLS Policy Structure

**What:** Every table gets three policy variants under a unified naming scheme: `{table}_{role}_access`. The super admin bypass uses `OR` with the JWT `is_super_admin` claim check.

**Existing pattern (002_rls_policies.sql):**
```sql
CREATE POLICY "tenant_isolation" ON public.products
  FOR ALL USING (store_id = (auth.jwt() -> 'app_metadata' ->> 'store_id')::UUID);
```

**New unified pattern (D-14 full rewrite):**
```sql
-- Drop existing policies
DROP POLICY IF EXISTS "tenant_isolation" ON public.products;
DROP POLICY IF EXISTS "public_read_active" ON public.products;
-- ... etc for all tables

-- Products: owner/staff access (tenant-scoped)
CREATE POLICY "products_staff_access" ON public.products
  FOR ALL USING (
    store_id = (auth.jwt() -> 'app_metadata' ->> 'store_id')::UUID
    AND (auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'staff')
  );

-- Products: super admin read (cross-tenant)
CREATE POLICY "products_super_admin_read" ON public.products
  FOR SELECT USING (
    (auth.jwt() -> 'app_metadata' ->> 'is_super_admin')::BOOLEAN = true
  );

-- Products: public read (storefront, anon)
CREATE POLICY "products_public_read" ON public.products
  FOR SELECT USING (is_active = true);
```

**Tables requiring full policy rewrite (from canonical refs):**
- `stores` — owner_isolation
- `staff` — tenant_isolation
- `categories` — tenant_isolation
- `products` — tenant_isolation + public_read_active
- `orders` — staff_owner_orders + customer_own_orders (already role-split in 012)
- `order_items` — staff_owner_order_items + customer_own_order_items (already role-split in 012)
- `promo_codes` — tenant_isolation + public_read_active
- `stripe_events` — tenant_isolation
- `cash_sessions` — tenant_isolation
- `customers` — customer_own_profile + staff_read_customers (from 012)
- `refunds` — from 013 (uses different JWT path — see pitfall below)
- `refund_items` — from 013

**Confidence:** HIGH — derived from reading all existing migrations.

### Pattern 3: Auth Hook Extension for Super Admin

**What:** The existing `custom_access_token_hook` function is extended (CREATE OR REPLACE) to also check the `super_admins` table. If found, sets `is_super_admin: true` in `app_metadata`.

**Super admins table design (Claude's discretion — recommending dedicated table):**
```sql
CREATE TABLE public.super_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID NOT NULL REFERENCES auth.users(id) UNIQUE,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- No RLS needed — only super_admins themselves can read, and hook uses service role
GRANT SELECT ON public.super_admins TO supabase_auth_admin;
```

Rationale for dedicated table over flag on staff: Super admins are not store-scoped; putting them in the `staff` table requires a nullable `store_id` and adds confusion to the three-tier auth pattern.

**Hook extension:**
```sql
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event JSONB)
RETURNS JSONB LANGUAGE plpgsql AS $$
DECLARE
  claims JSONB;
  user_store_id UUID;
  user_role TEXT;
  v_is_super_admin BOOLEAN := false;
BEGIN
  claims := event -> 'claims';

  -- Check super admin first (cross-tenant, no store_id needed)
  SELECT true INTO v_is_super_admin
  FROM public.super_admins
  WHERE auth_user_id = (event ->> 'user_id')::UUID;

  -- Check staff (owner/staff)
  SELECT s.store_id, s.role INTO user_store_id, user_role
  FROM public.staff s
  WHERE s.auth_user_id = (event ->> 'user_id')::UUID;

  -- Check customer if not staff
  IF user_store_id IS NULL THEN
    SELECT c.store_id, 'customer' INTO user_store_id, user_role
    FROM public.customers c
    WHERE c.auth_user_id = (event ->> 'user_id')::UUID;
  END IF;

  -- Inject claims
  IF v_is_super_admin OR user_store_id IS NOT NULL THEN
    IF jsonb_typeof(claims -> 'app_metadata') IS NULL THEN
      claims := jsonb_set(claims, '{app_metadata}', '{}');
    END IF;
    IF user_store_id IS NOT NULL THEN
      claims := jsonb_set(claims, '{app_metadata,store_id}', to_jsonb(user_store_id::TEXT));
      claims := jsonb_set(claims, '{app_metadata,role}', to_jsonb(user_role));
    END IF;
    IF v_is_super_admin THEN
      claims := jsonb_set(claims, '{app_metadata,is_super_admin}', 'true'::JSONB);
    END IF;
  END IF;

  event := jsonb_set(event, '{claims}', claims);
  RETURN event;
END;
$$;
```

**Confidence:** HIGH — follows identical pattern already established in migrations 003 and 012.

### Pattern 4: Playwright Subdomain Testing with lvh.me

**What:** Playwright configured with `baseURL: 'http://lvh.me:3000'`. Tests navigate to `http://storeslug.lvh.me:3000` for subdomain assertion. The `lvh.me` domain resolves to `127.0.0.1` in DNS — no /etc/hosts changes needed.

```typescript
// tests/e2e/playwright.config.ts
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  use: {
    baseURL: 'http://lvh.me:3000',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://lvh.me:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
```

```typescript
// tests/e2e/tenant-routing.spec.ts
test('slug subdomain resolves to correct store', async ({ page }) => {
  await page.goto('http://demo.lvh.me:3000/')
  // assert store name visible on storefront
})

test('unknown subdomain returns 404', async ({ page }) => {
  await page.goto('http://nonexistent.lvh.me:3000/')
  await expect(page).toHaveURL(/not-found|404/)
})
```

**Confidence:** MEDIUM — lvh.me DNS behaviour is a well-known development pattern but Playwright's ability to navigate to lvh.me subdomains depends on the dev server accepting `HOST` header wildcards. Next.js `next dev` accepts all hostnames by default (confirmed from docs). The `webServer.url` should be the root domain; tests individually navigate to slug subdomains.

**Note:** The middleware `ROOT_DOMAIN` env var must be set in `.env.local` for dev: `ROOT_DOMAIN=lvh.me:3000`. This is a new required env var.

### Pattern 5: Vitest RLS Attack Vector Tests

**What:** Extend the existing `src/lib/__tests__/rls.test.ts` to add the four attack vectors from D-16.

The existing test creates two stores, signs in as User A, and verifies User A cannot read Store B's products. Extend with:

```typescript
// Attack Vector 2: super admin write attempt
it('super admin JWT cannot INSERT into tenant data', async () => {
  // Create super admin user, get their JWT
  // Attempt INSERT into products with store_id = storeAId
  // Expect: RLS blocks it (super admin only has SELECT)
})

// Attack Vector 3: RPC with wrong store_id
it('complete_pos_sale with mismatched store_id raises exception', async () => {
  // Call complete_pos_sale with storeB's order_id but storeA's JWT
  // Expect: RAISE EXCEPTION from the RPC
})

// Attack Vector 4: subdomain spoofing (header injection)
it('x-store-id header cannot be spoofed by client', async () => {
  // Attempt to set x-store-id header on a request from User A to read Store B
  // RLS must block regardless of header (JWT is the authority, not headers)
})
```

**Critical insight from codebase:** RLS policies do NOT read middleware headers. They read `auth.jwt() -> 'app_metadata' ->> 'store_id'`. This means header injection by a malicious client cannot bypass RLS — the Supabase client uses the authenticated user's JWT token regardless of what headers are set. Attack vector 4 is already protected by design; the test confirms it.

**Confidence:** HIGH — verified from all existing RLS migration files.

### Anti-Patterns to Avoid

- **RLS that reads middleware headers:** Headers can be spoofed. All policies must use `auth.jwt() -> 'app_metadata'` only. Never use `request.headers.get('x-store-id')` as an RLS input.
- **Admin client in middleware without removing `server-only`:** The `admin.ts` file imports `server-only`. That module throws at build time if imported in Edge Runtime (middleware). Use a middleware-specific admin client that skips the `server-only` guard.
- **Slug lookup using anon client:** The anon client cannot read `stores` without a matching JWT — use service role for the slug lookup.
- **Synchronous cache without TTL eviction:** A `Map` that grows indefinitely leaks memory on long-running serverless instances. Always store expiry timestamp and evict on read.
- **Mixing JWT claim paths:** Migration 013 uses `current_setting('request.jwt.claims', true)::json->>'store_id'` while migrations 002/012 use `auth.jwt() -> 'app_metadata' ->> 'store_id'`. These are DIFFERENT paths. The D-14 rewrite must standardise on `auth.jwt() -> 'app_metadata' ->> 'store_id'` (the correct Supabase JWT path where custom claims live). See pitfall below.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Wildcard DNS for local dev | Edit /etc/hosts for each slug | `slug.lvh.me:3000` | lvh.me resolves *.lvh.me to 127.0.0.1 — no configuration needed |
| Tenant cache with TTL | Build a Redis/Upstash cache | In-memory Map with expiry timestamp | Slug-to-store_id mappings are tiny (~100 bytes each) and rarely change; Redis adds network hop and another service dependency |
| Super admin JWT bypass | Separate middleware JWT check | Supabase auth hook + RLS `is_super_admin` claim | JWT claims are verified cryptographically; middleware header checks can be spoofed |
| Cross-tenant policy per table | Write bespoke policies for each new feature | Standard `auth.jwt() -> 'app_metadata' ->> 'store_id'` OR `is_super_admin` pattern | Consistent pattern is auditable; bespoke policies diverge and create security gaps |

**Key insight:** In Supabase, the JWT is the only trustworthy identity signal. Middleware headers are convenience (for Server Components to avoid re-querying), not security. All security gates must live in RLS policies that read the JWT.

---

## Common Pitfalls

### Pitfall 1: Inconsistent JWT Claim Path in RLS Policies

**What goes wrong:** Migration 013 uses `current_setting('request.jwt.claims', true)::json->>'store_id'` — this reads the top-level claims object, not the `app_metadata` sub-object. The existing claims from the auth hook inject `store_id` into `app_metadata`, not the top-level. This means the 013 RLS policies for `refunds` and `refund_items` are CURRENTLY BROKEN for tenant isolation — they would match `null` against the tenant's `store_id` and return empty results for all authenticated users.

**Why it happens:** Different developers (or different AI sessions) wrote policies without cross-referencing the auth hook claim path.

**How to avoid:** The D-14 rewrite standardises all policies on: `auth.jwt() -> 'app_metadata' ->> 'store_id'`. Verify by running `SELECT auth.jwt() -> 'app_metadata' ->> 'store_id'` in a Supabase SQL editor with a test user.

**Warning signs:** `refunds` queries returning empty results for authenticated owners; no error, just empty data.

### Pitfall 2: Admin Client in Middleware Causes Build Failure

**What goes wrong:** `src/lib/supabase/admin.ts` imports `import 'server-only'`. Middleware runs on Edge Runtime. If `createSupabaseAdminClient()` is imported in `middleware.ts`, the build fails with: `You're importing a component that needs "server-only" but it doesn't have it.` (or similar).

**Why it happens:** `server-only` is a guard against accidentally shipping server code to the browser, but Edge Runtime is also "not the browser" — the guard is overly broad.

**How to avoid:** Create `src/lib/supabase/middlewareAdmin.ts` without the `server-only` import. Export a `createMiddlewareAdminClient()` function that uses `createClient` from `@supabase/supabase-js` with the service role key. Import only THIS in middleware.

### Pitfall 3: Middleware In-Memory Cache Not Shared Between Serverless Instances

**What goes wrong:** On Vercel, each serverless function invocation may get a fresh in-memory Map (no shared state between instances). The "cache" effectively becomes a per-request cache, not a process-level cache.

**Why it happens:** Serverless cold starts and scale-out mean multiple instances run concurrently with independent memory.

**How to avoid:** The TTL cache is still valuable for warm instances that handle multiple requests. The expected behaviour is: a warm instance benefits from the cache; cold starts always hit DB. This is acceptable given slug lookups are a single indexed query (`stores` table, `slug` column with UNIQUE index). Document this in code comments so future developers don't expect Redis-like behaviour.

**Warning signs:** Not a bug — just means the performance benefit is less than expected in high-concurrency scenarios.

### Pitfall 4: `stores` Table RLS Breaks Admin Client Slug Lookup

**What goes wrong:** The existing `owner_isolation` policy on `stores` blocks reads unless the JWT `store_id` matches. If the middleware uses an anon client (not service role) to look up slugs, queries return empty — the chicken-and-egg problem.

**Why it happens:** Using the wrong Supabase client for the slug lookup.

**How to avoid:** Slug lookup in middleware MUST use `SUPABASE_SERVICE_ROLE_KEY`. The service role client bypasses RLS entirely. This is appropriate here because we're doing a single, read-only, non-sensitive lookup (`stores.slug → stores.id`).

### Pitfall 5: Existing Seed Does Not Set `slug` on the Demo Store

**What goes wrong:** After migration 014 adds `slug NOT NULL`, the `supabase db reset` flow will fail because `seed.ts` does not set a slug on the demo store. Seed insert will violate the NOT NULL constraint.

**Why it happens:** The migration adds a new required column; the seed predates it.

**How to avoid:** As part of migration 014, either (a) use a default slug expression `DEFAULT 'demo'` on the column (and update seed to pass explicit slug), or (b) use `NOT NULL` with a migration-time `UPDATE stores SET slug = 'demo' WHERE id = DEV_STORE_ID` for the seed store. Update `seed.ts` to always pass a `slug` field in the store insert.

### Pitfall 6: `stores` Table Missing `created_at` Column

**What goes wrong:** D-10 says add `created_at` to `stores`. Looking at `001_initial_schema.sql`, `stores` already has `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`. The migration should NOT add this column again — only `is_active` is new.

**Why it happens:** Context decision said both `is_active` and `created_at` — `created_at` already exists.

**How to avoid:** Migration 014 should use `ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true` only. Do NOT add `created_at` (already exists). Confirm by reading 001 schema before writing the migration.

---

## Code Examples

### Verified: Middleware Hostname Extraction

```typescript
// Source: Next.js middleware docs + existing codebase pattern
export async function middleware(request: NextRequest) {
  const host = request.headers.get('host') ?? ''
  const rootDomain = process.env.ROOT_DOMAIN!

  // Strip port for comparison if present
  const isRoot = host === rootDomain ||
                 host === `www.${rootDomain}` ||
                 host.startsWith('localhost')

  if (!isRoot) {
    const slug = host.split('.')[0] // 'demo' from 'demo.lvh.me:3000'
    // ... lookup and inject
  }
}
```

### Verified: Supabase JWT Claim Path for app_metadata

```sql
-- Source: existing migrations 002 and 012
-- CORRECT path (what the auth hook injects):
auth.jwt() -> 'app_metadata' ->> 'store_id'
auth.jwt() -> 'app_metadata' ->> 'role'

-- INCORRECT path (in migration 013 — bug to fix in rewrite):
current_setting('request.jwt.claims', true)::json->>'store_id'
-- This reads top-level claims, not app_metadata
```

### Verified: Supabase Anon Client with Custom Auth Header (for Vitest tests)

```typescript
// Source: existing src/lib/__tests__/rls.test.ts
const userAClient = createClient(supabaseUrl, anonKey, {
  global: { headers: { Authorization: `Bearer ${userAAccessToken}` } },
})
// The access token embeds the user's JWT with their app_metadata claims
// RLS sees these claims — this is the correct way to test RLS as a specific user
```

### Verified: New Required Env Vars

```bash
# .env.local additions for Phase 12
ROOT_DOMAIN=lvh.me:3000         # Dev: lvh.me:3000 | Prod: nzpos.co.nz
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single-store: store_id from env var | Multi-tenant: store_id from middleware (hostname) | Phase 12 | `resolveAuth.ts` and Server Components must read `x-store-id` header instead of env var |
| `tenant_isolation` broad policy | Role-split policies (owner/staff/customer/super_admin) | Phase 12 (building on Phase 12's migration 012) | More granular, auditable, avoids customers seeing other customers' data |

---

## Open Questions

1. **Production domain for NZ SaaS**
   - What we know: User delegated this to Claude's discretion
   - What's unclear: No domain registered yet; wildcard SSL on Vercel requires NS delegation (noted in STATE.md as a known blocker)
   - Recommendation: Use `nzpos.co.nz` as the root domain. `.co.nz` is the NZ business TLD (equivalent to `.co.uk`). Vercel wildcard requires adding the domain to Vercel project and delegating nameservers. This is infrastructure work outside the code phase — planner should flag it as a prerequisite for production deployment of phase 12 but not block local dev work (lvh.me works without DNS changes).

2. **`stores` RLS after rewrite — can a super admin read store records?**
   - What we know: The current `owner_isolation` policy blocks any user whose JWT `store_id` doesn't match the store's `id`. A super admin user won't have a `store_id` in their JWT (they're not associated with any store).
   - What's unclear: The super admin dashboard (Phase 16) needs to list all stores. The D-13 read-all grant must cover the `stores` table itself.
   - Recommendation: The new `stores` policy must have an explicit super admin SELECT path: `FOR SELECT USING ((auth.jwt() -> 'app_metadata' ->> 'is_super_admin')::BOOLEAN = true OR id = (auth.jwt() -> 'app_metadata' ->> 'store_id')::UUID)`.

3. **`store_plans` table RLS design**
   - What we know: `store_plans` is new; needs RLS enabled.
   - What's unclear: Who can read `store_plans`? Owner needs to read their own plan (for billing UI in Phase 15). Super admin needs to read all.
   - Recommendation: Owner read via store_id match, super admin read via `is_super_admin` claim, write only via service role (billing webhook in Phase 15). No staff/customer access to billing data.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | All tooling | Yes | v22.22.0 | — |
| Playwright | E2E tests | Yes | 1.58.2 | — |
| Vitest | RLS integration tests | Yes | 4.1.2 | — |
| supabase CLI (local) | Migration runs, `db reset` | Assumed (used in prior phases) | — | `supabase db push` for remote |
| lvh.me DNS | Local subdomain dev | Yes (public DNS) | — | Falls back to lvh.me (always works) |

**Missing dependencies with no fallback:** None identified.

**Missing dependencies with fallback:** None — all required tools are present.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.2 (unit/integration) + Playwright 1.58.2 (E2E) |
| Config file | `vitest.config.ts` (exists), `tests/e2e/playwright.config.ts` (Wave 0 gap) |
| Quick run command | `npx vitest run src/lib/__tests__/rls.test.ts` |
| Full suite command | `npx vitest run && npx playwright test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TENANT-01 | slug.lvh.me:3000 resolves to correct store | E2E | `npx playwright test tests/e2e/tenant-routing.spec.ts` | Wave 0 gap |
| TENANT-01 | Unknown subdomain returns 404 | E2E | `npx playwright test tests/e2e/tenant-routing.spec.ts` | Wave 0 gap |
| TENANT-02 | stores.slug column exists and is unique | Integration | `npx vitest run src/lib/__tests__/schema.test.ts` | Wave 0 gap |
| TENANT-02 | store_plans row exists for each store | Integration | `npx vitest run src/lib/__tests__/schema.test.ts` | Wave 0 gap |
| TENANT-03 | Tenant A JWT cannot read Tenant B products | Integration | `npx vitest run src/lib/__tests__/rls.test.ts` | Exists (extend) |
| TENANT-03 | Tenant A JWT cannot read Tenant B orders | Integration | `npx vitest run src/lib/__tests__/rls.test.ts` | Exists (extend) |
| TENANT-04 | Super admin JWT can SELECT across all tenants | Integration | `npx vitest run src/lib/__tests__/rls.test.ts` | Wave 0 gap |
| TENANT-04 | Super admin JWT cannot INSERT/UPDATE tenant data | Integration | `npx vitest run src/lib/__tests__/rls.test.ts` | Wave 0 gap |
| TENANT-05 | RPC with wrong store_id fails | Integration | `npx vitest run src/lib/__tests__/rls.test.ts` | Wave 0 gap |
| TENANT-05 | Subdomain with wrong session still sees correct store | E2E | `npx playwright test tests/e2e/tenant-isolation.spec.ts` | Wave 0 gap |

### Sampling Rate

- **Per task commit:** `npx vitest run src/lib/__tests__/rls.test.ts`
- **Per wave merge:** `npx vitest run && npx playwright test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/e2e/playwright.config.ts` — Playwright config with lvh.me baseURL and webServer
- [ ] `tests/e2e/tenant-routing.spec.ts` — covers TENANT-01
- [ ] `tests/e2e/tenant-isolation.spec.ts` — covers TENANT-05 routing layer
- [ ] `src/lib/__tests__/schema.test.ts` — covers TENANT-02 column/table existence
- [ ] Extend `src/lib/__tests__/rls.test.ts` with 3 new attack vectors — covers TENANT-03, TENANT-04, TENANT-05

---

## Project Constraints (from CLAUDE.md)

Actionable directives that planning MUST comply with:

| Directive | Constraint | Impact on Phase 12 |
|-----------|------------|---------------------|
| Tech stack non-negotiable | Next.js App Router + Supabase + Tailwind | Middleware approach only; no external proxy |
| No Supabase Realtime | Polling only for inventory sync | Slug cache must be TTL-based (no Realtime invalidation) |
| No Prisma/ORM | Supabase JS client for all queries | Admin client for slug lookup, not raw pg |
| No Redux/Zustand | React state only | No global store for tenant context; use headers/cookies |
| No offline mode | Internet required | Cache failure → DB fallback always viable |
| Vitest over Jest | Required for unit tests | RLS tests use Vitest (already compliant) |
| Playwright over Cypress | Required for E2E | Subdomain tests use Playwright |
| DESIGN.md must be read before UI changes | No UI in this phase | N/A — phase 12 is no-UI |
| GSD workflow enforcement | All changes via GSD command | Planning artifacts via gsd:execute-phase |
| `server-only` guard | Import in files with Supabase credentials | Middleware admin client must NOT import server-only |

---

## Sources

### Primary (HIGH confidence)

- Existing migrations: `001_initial_schema.sql` through `013_partial_refunds.sql` — full schema and RLS policy baseline
- `src/middleware.ts` — existing auth routing logic to preserve
- `src/lib/__tests__/rls.test.ts` — existing test pattern to extend
- `src/lib/resolveAuth.ts` — auth resolution pattern
- `supabase/config.toml` — auth hook registration (confirmed `custom_access_token_hook` is registered)
- `vitest.config.ts` — test runner configuration
- `package.json` — confirmed versions: Playwright 1.58.2, Vitest 4.1.2, jose 6.2.2

### Secondary (MEDIUM confidence)

- lvh.me wildcard DNS behaviour — well-documented community pattern for local subdomain dev; confirmed resolves *.lvh.me to 127.0.0.1
- Next.js middleware hostname extraction — standard `request.headers.get('host')` pattern documented in Next.js middleware guide
- Supabase auth hook `app_metadata` claim path — verified from existing working migrations (002, 012)

### Tertiary (LOW confidence)

- Vercel serverless in-memory cache behaviour (cold starts) — inferred from general serverless architecture knowledge; actual instance lifetime on Vercel free tier is ~5 min, aligning well with the 5-min TTL choice

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages already installed, versions confirmed from package.json
- Architecture patterns: HIGH — all patterns derived from reading existing codebase files directly
- Pitfalls: HIGH (pitfalls 1, 2, 4, 5, 6 found from reading actual code) / MEDIUM (pitfall 3 from general serverless knowledge)
- RLS policy design: HIGH — derived from all 13 existing migrations
- Test infrastructure: HIGH (Vitest), MEDIUM (Playwright subdomain behaviour with lvh.me)

**Research date:** 2026-04-03
**Valid until:** 2026-05-03 (stable libraries; Supabase auth hook API is stable)
