# Phase 16: Super Admin Panel - Research

**Researched:** 2026-04-03
**Domain:** Next.js App Router, Supabase RLS + service role, internal admin tooling, JWT-based role detection
**Confidence:** HIGH

## Summary

Phase 16 builds an internal operations panel at `/super-admin/*` on the root domain, separate from tenant admin routes. The JWT infrastructure (`is_super_admin` claim, service-role client, RLS read-all policies) is entirely in place from Phases 12–15. This phase is primarily UI + Server Action work, plus one migration (suspension columns + audit table) and middleware changes.

The three functional areas are: (1) tenant list with search/paginate, (2) tenant detail with plan override controls, and (3) suspend/unsuspend with confirmation modal and suspension enforcement page. All mutations use the existing `createSupabaseAdminClient()` (service role) — the same pattern as billing webhook writes.

The key architectural challenge is middleware: super admin routes live on the root domain, but the current middleware treats the root domain as the marketing site and exits early at step 3. The middleware must be extended before any super admin route can load.

**Primary recommendation:** Follow established project patterns exactly — middleware extension, Server Components for data fetching, Server Actions for mutations with Zod validation, admin client for writes, Supabase regular client (with is_super_admin RLS policies) for reads. No new libraries needed.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Super admin panel lives at `/super-admin/*` on root domain. Fully separate from tenant admin routes.
- **D-02:** Same Supabase email/password login. Middleware detects `is_super_admin` JWT claim and redirects to `/super-admin/dashboard`. No separate login page.
- **D-03:** Own layout with new `SuperAdminSidebar`, using deep navy + amber design system.
- **D-04:** No tenant impersonation. Read-only inspection via RLS read-all policies.
- **D-05:** Tenant list shows: store name, slug, plan status, active/suspended badge, created date.
- **D-06:** Single search box (name + slug). Filter dropdown for status (all/active/suspended).
- **D-07:** Server-side pagination with Previous/Next and page numbers. Supabase range queries.
- **D-08:** Tenant detail: store info, subscription status per add-on (Stripe vs Manual badge), action buttons. All on one screen.
- **D-09:** Suspended tenants see branded suspension page on both storefront and admin routes. Middleware intercepts on `is_active=false`.
- **D-10:** Suspension requires a reason (text field). Stored in DB for audit trail.
- **D-11:** Soft delete — `is_active=false` + `suspended_at` + `suspension_reason`. Unsuspend within 30 days flips back. No data purge this phase.
- **D-12:** Two-step confirmation modal: click "Suspend" → modal shows store name, reason field, impact warning, "Confirm Suspension" button.
- **D-13:** Direct DB toggle for comp'd add-ons. Server Action sets `store_plans` boolean to true directly. No Stripe.
- **D-14:** Each add-on shows "Active (Stripe)" or "Active (Manual)" badge. Distinguishes paid vs comp'd.
- **D-15:** Super admin can deactivate manually comp'd add-ons. Symmetric with activation.
- **D-16:** Need `manual_override` boolean columns (or equivalent) on `store_plans` to distinguish manual vs Stripe-managed.
- **D-17:** `super_admin_actions` table: who (super admin user ID), what action, which tenant (store_id), reason/note, timestamp. Shown on tenant detail as recent activity list.

### Claude's Discretion
- SuperAdminSidebar navigation items and layout details
- Tenant detail page layout and card arrangement
- Suspension page design and copy
- Confirmation modal design
- Audit log display format on tenant detail
- Pagination page size (10, 20, 25)
- Search debounce timing
- How to track manual vs Stripe-managed overrides in store_plans schema (D-16 leaves this open)
- Super admin dashboard content (could be a redirect to tenant list)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SADMIN-01 | Super admin can view a paginated, searchable list of all tenants | Supabase range queries + ilike for search; admin client bypasses RLS for full tenant list |
| SADMIN-02 | Super admin can view tenant detail (plan, subscription status, created date, last active) | store_plans table + stores table + super_admin_read RLS policies already support this |
| SADMIN-03 | Super admin can suspend and unsuspend a tenant with 30-day recovery window | New migration: suspended_at + suspension_reason columns on stores; middleware extension for suspension page |
| SADMIN-04 | Super admin can manually override a tenant's plan (comp free add-ons) | New migration: manual_override columns on store_plans; direct write via admin client |
</phase_requirements>

---

## Standard Stack

### Core (No new libraries needed)

| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| Next.js App Router | 16.2 | Route groups, layouts, Server Actions | Already in use; `/super-admin` is a new route group |
| @supabase/supabase-js | ^2.x | DB queries, auth | Already in use |
| @supabase/ssr | ^0.x | Cookie-based auth in Server Components | Already in use |
| Zod | ^4.x (actually v4 per STATE.md) | Server Action input validation | All mutations must validate inputs first |
| jose | ^5.x | JWT verification in middleware | Already in use for staff PIN |
| Tailwind CSS | 4.2 | Styling | Deep navy + amber design system |
| server-only | latest | Prevent server code client-side | Already on admin client |

### No New Libraries

All functionality is achievable with the existing stack:
- Pagination: Supabase `.range(from, to)` queries
- Search: Supabase `.ilike('name', '%query%').or('slug.ilike.%query%')`
- Modals: React state + Tailwind (same pattern as other interactive UI)
- Audit log: New DB table, displayed with existing query patterns

## Architecture Patterns

### Recommended Project Structure

```
src/
├── app/
│   └── super-admin/            # New route group (root domain only)
│       ├── layout.tsx           # SuperAdminLayout — checks is_super_admin
│       ├── dashboard/
│       │   └── page.tsx         # Redirect to /super-admin/tenants (or summary)
│       └── tenants/
│           ├── page.tsx         # Tenant list with search + pagination
│           └── [id]/
│               └── page.tsx     # Tenant detail page
├── components/
│   └── super-admin/
│       ├── SuperAdminSidebar.tsx  # Clone of AdminSidebar, different navLinks
│       ├── TenantTable.tsx        # Tenant list table component
│       ├── TenantStatusBadge.tsx  # Active/Suspended badge
│       ├── PlanOverrideCard.tsx   # Add-on with Stripe/Manual badge
│       └── SuspendModal.tsx       # Two-step confirmation modal
├── actions/
│   └── super-admin/
│       ├── suspendTenant.ts       # Server Action: suspend
│       ├── unsuspendTenant.ts     # Server Action: unsuspend
│       ├── activateAddon.ts       # Server Action: manual activate
│       └── deactivateAddon.ts     # Server Action: manual deactivate
└── app/
    └── suspended/
        └── page.tsx               # Suspension notice page (root domain)
```

### Pattern 1: Middleware Extension for Super Admin

The current middleware returns early for root domain (step 3, line 23). Super admin routes need to be handled before this early return:

```typescript
// In src/middleware.ts — insert BEFORE the isRoot early return
if (isRoot && pathname.startsWith('/super-admin')) {
  const { supabase, response } = await createSupabaseMiddlewareClient(request)
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const isSuperAdmin = user.app_metadata?.is_super_admin === true
  if (!isSuperAdmin) {
    return NextResponse.redirect(new URL('/unauthorized', request.url))
  }

  return response
}
```

**Critical:** This must come before the `if (isRoot)` block that returns early. The login page at `/login` is already on the root domain — super admin logs in there and is redirected to `/super-admin/dashboard` post-login.

**Login redirect:** The existing `ownerSignin` action always redirects to `/admin/dashboard`. For super admin users logging in at the root domain (not a subdomain), this will fail since `/admin` is tenant-scoped. The middleware must detect `is_super_admin` and redirect to `/super-admin/dashboard` instead, OR a separate super admin sign-in page/action handles the redirect.

**Recommended approach:** Modify `ownerSignin` to check `is_super_admin` in the returned JWT and redirect to `/super-admin/dashboard` when true. Alternatively, add middleware redirect logic that intercepts `/admin/dashboard` visits from super-admin users on the root domain.

### Pattern 2: Super Admin Layout Auth Guard

```typescript
// src/app/super-admin/layout.tsx
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import SuperAdminSidebar from '@/components/super-admin/SuperAdminSidebar'

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.app_metadata?.is_super_admin !== true) {
    redirect('/login')
  }

  return (
    <div className="flex min-h-screen bg-[var(--color-bg)]">
      <SuperAdminSidebar userEmail={user.email} />
      <main className="flex-1 p-6">{children}</main>
    </div>
  )
}
```

**Note:** The layout is a Server Component — no 'use client'. This matches `src/app/admin/layout.tsx`.

### Pattern 3: Tenant List with Server-Side Pagination

```typescript
// src/app/super-admin/tenants/page.tsx
// Source: Supabase range queries + ilike pattern (official docs)
export default async function TenantsPage({ searchParams }: { searchParams: { q?: string; status?: string; page?: string } }) {
  const admin = createSupabaseAdminClient()
  const page = parseInt(searchParams.page ?? '1')
  const pageSize = 20
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = admin
    .from('stores')
    .select('id, name, slug, is_active, created_at, suspended_at', { count: 'exact' })
    .range(from, to)
    .order('created_at', { ascending: false })

  if (searchParams.q) {
    query = query.or(`name.ilike.%${searchParams.q}%,slug.ilike.%${searchParams.q}%`)
  }
  if (searchParams.status === 'active') {
    query = query.eq('is_active', true)
  } else if (searchParams.status === 'suspended') {
    query = query.eq('is_active', false)
  }

  const { data: stores, count } = await query
  const totalPages = Math.ceil((count ?? 0) / pageSize)
  // render...
}
```

**Why admin client for tenant list:** The regular Supabase client with `is_super_admin` RLS policy would also work (via `stores_super_admin_read`), but the admin client (service role) bypasses RLS entirely and is already the established pattern for super admin write operations. Using it for reads too is consistent. Either approach is valid.

### Pattern 4: Server Actions for Mutations

All four mutations (suspend, unsuspend, activate addon, deactivate addon) follow the existing project pattern:

```typescript
// src/actions/super-admin/suspendTenant.ts
'use server'
import 'server-only'
import { z } from 'zod'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

const SuspendSchema = z.object({
  storeId: z.string().uuid(),
  reason: z.string().min(1).max(500),
})

export async function suspendTenant(formData: FormData) {
  // 1. Auth check — caller must be super admin
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.app_metadata?.is_super_admin !== true) {
    return { error: 'Unauthorized' }
  }

  // 2. Validate input
  const parsed = SuspendSchema.safeParse({
    storeId: formData.get('storeId'),
    reason: formData.get('reason'),
  })
  if (!parsed.success) return { error: 'Invalid input' }

  // 3. Write via admin client (service role bypasses RLS)
  const admin = createSupabaseAdminClient()
  const { error } = await admin
    .from('stores')
    .update({
      is_active: false,
      suspended_at: new Date().toISOString(),
      suspension_reason: parsed.data.reason,
    })
    .eq('id', parsed.data.storeId)

  if (error) return { error: 'Failed to suspend tenant' }

  // 4. Log to audit table
  await admin.from('super_admin_actions').insert({
    super_admin_user_id: user.id,
    action: 'suspend',
    store_id: parsed.data.storeId,
    note: parsed.data.reason,
  })

  revalidatePath('/super-admin/tenants')
  return { success: true }
}
```

### Pattern 5: Suspension Page Routing in Middleware

The current middleware (step 4, subdomain path) already queries `is_active=true` and returns `not-found` for inactive stores. This needs adjustment:

Current behavior: inactive subdomain → `/not-found` (generic)
Required behavior: suspended subdomain → `/suspended` (branded suspension page)

```typescript
// In middleware step 4 — change the inactive store handling:
const { data } = await admin
  .from('stores')
  .select('id, is_active')  // add is_active to select
  .eq('slug', slug)
  .single()  // remove is_active filter here — check manually

if (!data) {
  return NextResponse.rewrite(new URL('/not-found', request.url))
}
if (!data.is_active) {
  return NextResponse.rewrite(new URL('/suspended', request.url))
}
```

**Also:** The `/admin` route on a subdomain currently redirects unknown slugs to `/not-found`. Active stores that get suspended should see the suspension page on their admin route too. The middleware already passes through `/admin` routes — as long as the store slug resolves to `is_active=false`, the rewrite to `/suspended` happens before the admin auth check.

**Tenant cache invalidation:** The `getCachedStoreId / setCachedStoreId` only caches `store_id` for active stores. When a store is suspended, the cache entry remains valid but the next middleware run hits DB and finds `is_active=false`. The cache currently stores only the ID (not active status) — the middleware query must NOT filter by `is_active` anymore (it currently does: `.eq('is_active', true)`). Change: remove the `is_active=true` filter from the cache-miss DB query, add manual check after.

**Cache concern:** If a store_id is cached, the middleware skips the DB lookup and proceeds to tenant routes. A suspended tenant with a cached store_id will bypass the suspension check. **Fix:** Either (a) invalidate cache on suspend (call `invalidateStoreCache(slug)` from the suspend Server Action if such a function exists), or (b) don't rely on cache for suspension enforcement — always do a quick `is_active` check when slug is cached. Option (b) adds a DB round-trip per request; option (a) is cleaner but requires cache invalidation capability.

Let me check the tenant cache implementation:

```
// src/lib/tenantCache.ts — need to verify if invalidation exists
```

### Pattern 6: Manual Override Tracking (D-16)

Two implementation options:

**Option A: Boolean columns per add-on on store_plans**
```sql
ALTER TABLE public.store_plans
  ADD COLUMN has_xero_manual_override BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN has_email_notifications_manual_override BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN has_custom_domain_manual_override BOOLEAN NOT NULL DEFAULT false;
```
Pros: Simple, explicit, easy to query. Cons: Three extra columns per add-on.

**Option B: JSONB metadata column**
```sql
ALTER TABLE public.store_plans
  ADD COLUMN manual_overrides JSONB NOT NULL DEFAULT '{}';
-- e.g.: {"xero": {"activated_at": "...", "activated_by": "user-id"}}
```
Pros: Extensible, single column. Cons: Harder to query, no type safety.

**Recommendation (Claude's discretion):** Option A — boolean columns. Matches the existing `has_xero`, `has_email_notifications`, `has_custom_domain` pattern exactly. Simpler to query and reason about. Three columns is not excessive.

**Badge logic:** An add-on shows:
- "Active (Stripe)": `has_xero=true AND has_xero_manual_override=false`
- "Active (Manual)": `has_xero=true AND has_xero_manual_override=true`
- "Inactive": `has_xero=false`

**Deactivation safety:** The deactivate action (D-15) must only work on manually comp'd add-ons (`has_xero_manual_override=true`). It must not disable a Stripe-paid subscription. Guard: check `manual_override=true` before setting `has_xero=false`.

### Pattern 7: Last Active Timestamp (SADMIN-02)

The `stores` table has `created_at` but no `last_active_at` column (not present in migration 014). Two options:

**Option A:** Add `last_active_at TIMESTAMPTZ` to stores, updated by middleware on each admin/POS visit.
**Option B:** Derive from latest order `created_at` for that store (approximate, doesn't track logins).

**Recommendation:** Option A is more accurate for SADMIN-02. Add `last_active_at` to the migration and update it in middleware (upsert pattern via admin client). However this adds a DB write to every admin/POS request — performance concern for future scale, acceptable for v1.

**Simpler alternative for v1:** Show latest order `created_at` as "last active" — no middleware change needed. Label it "Last order" rather than "Last active" to be accurate. This avoids middleware writes.

**Recommended (Claude's discretion):** Use latest order timestamp labelled "Last order" for simplicity. Defer true login tracking to v2.1.

### Anti-Patterns to Avoid

- **Using the regular Supabase client for super admin writes:** RLS blocks UPDATE/INSERT on stores/store_plans from the regular client even with `is_super_admin`. Must use `createSupabaseAdminClient()` for all mutations.
- **Caching suspended store IDs:** The tenant cache only stores `store_id`, not `is_active`. Suspension enforcement requires bypassing or invalidating cache entries.
- **Redirecting to `/admin/dashboard` from ownerSignin when super admin is on root domain:** The `/admin` route is subdomain-scoped. Super admin on root domain hitting `/admin/dashboard` will fail tenant resolution. Must redirect to `/super-admin/dashboard`.
- **Deactivating Stripe-paid add-ons via the manual override toggle:** Guard with `manual_override=true` check before any deactivation write.
- **No Zod validation on Server Actions:** All four mutation actions must validate inputs before any DB write (established project pattern, enforced by CLAUDE.md conventions).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Pagination | Custom offset/limit logic | Supabase `.range(from, to)` with `{ count: 'exact' }` | Built-in, returns total count for page calculation |
| Search | Full-text search | Supabase `.ilike()` + `.or()` | Sufficient for name/slug search at this scale |
| Auth check in actions | Custom JWT parsing | `supabase.auth.getUser()` + `user.app_metadata.is_super_admin` | Established project pattern, consistent with all other actions |
| Modal state | Third-party modal library | React `useState` + Tailwind | Simple two-step confirmation, no external dep needed |
| Audit logging | Complex event sourcing | Simple insert to `super_admin_actions` table | Single table, straightforward |

## Common Pitfalls

### Pitfall 1: Tenant Cache Bypasses Suspension Enforcement

**What goes wrong:** When a store is suspended, its slug is still in the `tenantCache` memory store. The next request from a user on that subdomain finds the cached store_id and skips the DB lookup — the `is_active=false` check is never reached.

**Why it happens:** The cache stores only store_id (confirmed: `getCachedStoreId` / `setCachedStoreId` in middleware.ts). The `is_active` filter was on the cache-miss DB query. Once cached, activity is never re-checked.

**How to avoid:** Two approaches:
1. After `suspendTenant` Server Action succeeds, invalidate the cache. Check if `tenantCache.ts` exports an invalidation function — if not, add one.
2. Always do a quick `is_active` DB check even when slug is cached (adds latency but is simpler).
Given this is a superadmin tool used infrequently, option 1 is preferred.

**Warning signs:** A suspended store is still accessible after suspension. Test by suspending and immediately visiting the subdomain in the same browser session.

### Pitfall 2: Super Admin Login Redirects to Wrong Place

**What goes wrong:** `ownerSignin` always calls `redirect('/admin/dashboard')`. When a super admin (who is not also a store owner) logs in on the root domain, this redirects to `/admin/dashboard` which is subdomain-scoped. Tenant resolution fails (root domain has no subdomain slug), resulting in an error or redirect.

**Why it happens:** The current `ownerSignin` action was written for store owners only. Super admin scenario wasn't in scope until Phase 16.

**How to avoid:** After sign-in succeeds, check `user.app_metadata.is_super_admin`. If true, redirect to `/super-admin/dashboard` instead of `/admin/dashboard`.

**Note:** A super admin who is also a store owner (dual claims from migration 016) logging in on their store's subdomain should still go to `/admin/dashboard` — check both the host and `is_super_admin` to decide redirect target.

### Pitfall 3: Stripe vs Manual Badge Confusion

**What goes wrong:** A store has a Stripe subscription active AND a manual override. If both boolean flags are true, the badge logic breaks or shows incorrect state.

**Why it happens:** D-16 adds manual override tracking, but Stripe webhooks write `has_xero=true` without touching `has_xero_manual_override`. A super admin could accidentally manually activate an add-on that's already Stripe-active, setting the override flag unnecessarily.

**How to avoid:** In `activateAddon` Server Action, check current state first. If add-on is already active via Stripe (`has_xero=true AND has_xero_manual_override=false`), return early with a message ("Already active via Stripe"). Only set `manual_override=true` when activating an otherwise-inactive add-on.

### Pitfall 4: store_plans RLS Blocks Manual Override Writes

**What goes wrong:** The regular Supabase client cannot UPDATE `store_plans` — per migration 015: "No INSERT/UPDATE policies on store_plans — written by service role only (billing webhook)". Using the regular client in a Server Action for plan override writes will silently fail.

**Why it happens:** `store_plans` intentionally has no write RLS policies. Only service role can write.

**How to avoid:** Always use `createSupabaseAdminClient()` for plan override mutations. The billing webhook already does this correctly — follow that pattern.

### Pitfall 5: Missing revalidatePath After Mutations

**What goes wrong:** After suspend/unsuspend/activate/deactivate, the tenant detail page still shows stale data because Next.js cached the Server Component output.

**Why it happens:** Server Components cache their output. Mutations via Server Actions don't automatically invalidate.

**How to avoid:** Call `revalidatePath('/super-admin/tenants')` and `revalidatePath('/super-admin/tenants/[id]')` at the end of each mutation action. The billing webhook (`billing.ts`) does this for the admin billing page — same pattern.

### Pitfall 6: Suspension Page URL Collision

**What goes wrong:** The `/suspended` page is on the root domain (`src/app/suspended/page.tsx`), but `NextResponse.rewrite(new URL('/suspended', request.url))` rewrites the URL relative to the subdomain. The rewritten request hits the subdomain's Next.js app, which doesn't have a `/suspended` route.

**Why it happens:** In Next.js with wildcard subdomains, the "app" being served depends on the host header. With subdomain routing all sharing the same Next.js instance (single Vercel deployment), the `/suspended` page exists in the single app and IS accessible from any host.

**Resolution:** A single Next.js deployment serves all subdomains AND the root domain from the same codebase. The `/suspended` page in `src/app/suspended/page.tsx` is available on all hosts. The middleware `rewrite` to `/suspended` works correctly — it's a URL path rewrite within the same Next.js app, not a redirect to a different server.

## Code Examples

### Supabase Range Query with Count

```typescript
// Source: Supabase JS docs — https://supabase.com/docs/reference/javascript/range
const { data, count, error } = await admin
  .from('stores')
  .select('id, name, slug, is_active, created_at', { count: 'exact' })
  .range(from, to)
  .order('created_at', { ascending: false })
// count is the total number of rows (without range), for pagination math
const totalPages = Math.ceil((count ?? 0) / pageSize)
```

### OR Filter for Multi-Column Search

```typescript
// Source: Supabase JS docs — .or() filter
const q = 'mysearch'
query = query.or(`name.ilike.%${q}%,slug.ilike.%${q}%`)
```

### Revalidate After Mutation

```typescript
// Source: Next.js docs — revalidatePath
import { revalidatePath } from 'next/cache'
revalidatePath('/super-admin/tenants')
revalidatePath(`/super-admin/tenants/${storeId}`)
```

### Super Admin Check in Server Action

```typescript
// Pattern established in Phase 15 gated actions
const supabase = await createSupabaseServerClient()
const { data: { user } } = await supabase.auth.getUser()
if (!user || user.app_metadata?.is_super_admin !== true) {
  return { error: 'Unauthorized' }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Tenant middleware returns early for root domain | Must handle `/super-admin/*` before early return | Phase 16 | Middleware order matters |
| ownerSignin always redirects to `/admin/dashboard` | Must check `is_super_admin` and redirect accordingly | Phase 16 | Login redirect logic needs branching |
| store_plans written only by billing webhook | Super admin can now write directly via admin client | Phase 16 | Consistent with service-role-only pattern |

## Migration Requirements

Phase 16 needs one new migration (`020_super_admin_panel.sql`):

```sql
-- Add suspension columns to stores
ALTER TABLE public.stores
  ADD COLUMN suspended_at TIMESTAMPTZ,
  ADD COLUMN suspension_reason TEXT;

-- Add manual override tracking to store_plans
ALTER TABLE public.store_plans
  ADD COLUMN has_xero_manual_override BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN has_email_notifications_manual_override BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN has_custom_domain_manual_override BOOLEAN NOT NULL DEFAULT false;

-- Create audit table
CREATE TABLE public.super_admin_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  super_admin_user_id UUID NOT NULL REFERENCES auth.users(id),
  action TEXT NOT NULL CHECK (action IN ('suspend', 'unsuspend', 'activate_addon', 'deactivate_addon')),
  store_id UUID NOT NULL REFERENCES public.stores(id),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- No RLS on super_admin_actions — accessed via admin client only
-- (Same pattern as super_admins table in 014)

-- RLS for super_admin_actions (super admin read only)
ALTER TABLE public.super_admin_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "super_admin_actions_read" ON public.super_admin_actions
  FOR SELECT USING (
    (auth.jwt() -> 'app_metadata' ->> 'is_super_admin')::BOOLEAN = true
  );
-- Writes are via admin client (service role) only — no INSERT policy
```

**Note:** `is_active` column already exists on `stores` from migration 014. No change needed there.

## Open Questions

1. **Tenant cache invalidation on suspension — CONFIRMED: no invalidation function exists**
   - What we know: `src/lib/tenantCache.ts` confirmed. It exports only `getCachedStoreId` and `setCachedStoreId`. No delete/invalidation function. TTL is 5 minutes (const TTL_MS = 5 * 60 * 1000). Cache is a module-level Map.
   - Impact: A suspended store remains accessible from cached entries for up to 5 minutes. In production this is low risk (super admin suspension is deliberate, 5-min window is acceptable). In tests it must be handled.
   - Recommendation (Wave 0 action): Add `export function invalidateCachedStoreId(slug: string): void { cache.delete(slug) }` to `tenantCache.ts`. Call from `suspendTenant` Server Action after successful suspend. Note: cache is per-serverless-instance — invalidation only affects the current instance, but is still worth doing for immediate enforcement on the same instance.

2. **last_active_at tracking**
   - What we know: No `last_active_at` column on `stores` yet.
   - What's unclear: Whether to use latest order timestamp vs. true login timestamp.
   - Recommendation: Use latest order `created_at` for "Last order" display in v1. Avoids middleware write overhead.

3. **ownerSignin redirect branching**
   - What we know: `ownerSignin` always redirects to `/admin/dashboard`. Super admin on root domain can't reach `/admin/dashboard`.
   - What's unclear: Whether to fix in `ownerSignin` or in middleware post-login.
   - Recommendation: Fix in `ownerSignin` — after `signInWithPassword` succeeds, call `supabase.auth.getUser()` to check `is_super_admin`, then redirect appropriately. This keeps redirect logic in one place.

4. **Suspension page URL on subdomain rewrites**
   - Resolved: Single Next.js deployment, `/suspended` page works from any host. Rewrite path is valid.

## Environment Availability

Step 2.6: SKIPPED — This phase is entirely code/config changes with no new external service dependencies. All required services (Supabase, Stripe read for subscription status) are already provisioned and in use.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest ^2.x (inferred from config) |
| Config file | `vitest.config.mts` |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SADMIN-01 | Tenant list returns paginated results with search | unit | `npx vitest run src/actions/super-admin/__tests__/` | ❌ Wave 0 |
| SADMIN-02 | Tenant detail shows plan and subscription status | unit | `npx vitest run src/actions/super-admin/__tests__/` | ❌ Wave 0 |
| SADMIN-03 | suspendTenant sets is_active=false, logs audit | unit | `npx vitest run src/actions/super-admin/__tests__/suspendTenant.test.ts` | ❌ Wave 0 |
| SADMIN-03 | unsuspendTenant sets is_active=true, data intact | unit | `npx vitest run src/actions/super-admin/__tests__/unsuspendTenant.test.ts` | ❌ Wave 0 |
| SADMIN-03 | Middleware rewrites suspended subdomain to /suspended | unit | `npx vitest run src/middleware.test.ts` (extend existing) | ✅ extend |
| SADMIN-04 | activateAddon sets store_plans boolean + manual override flag | unit | `npx vitest run src/actions/super-admin/__tests__/activateAddon.test.ts` | ❌ Wave 0 |
| SADMIN-04 | deactivateAddon only works on manual overrides | unit | `npx vitest run src/actions/super-admin/__tests__/deactivateAddon.test.ts` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `npx vitest run src/actions/super-admin/__tests__/`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/actions/super-admin/__tests__/suspendTenant.test.ts` — covers SADMIN-03 suspend
- [ ] `src/actions/super-admin/__tests__/unsuspendTenant.test.ts` — covers SADMIN-03 unsuspend
- [ ] `src/actions/super-admin/__tests__/activateAddon.test.ts` — covers SADMIN-04 activate
- [ ] `src/actions/super-admin/__tests__/deactivateAddon.test.ts` — covers SADMIN-04 deactivate
- [ ] Extend `src/middleware.test.ts` — add test cases for suspended store → /suspended rewrite, super admin root domain pass-through

## Project Constraints (from CLAUDE.md)

All directives from CLAUDE.md apply. Key constraints for this phase:

| Directive | Impact on Phase 16 |
|-----------|-------------------|
| Always read DESIGN.md before visual/UI decisions | SuperAdminSidebar + suspension page must follow deep navy + amber, Satoshi/DM Sans typography |
| Use `createSupabaseAdminClient()` for service-role operations | All mutations (suspend, activate addon) use admin client |
| No Prisma, Redux, NextAuth, Clerk | Not needed — not introduced |
| Use `@supabase/ssr` (not auth-helpers) | Already in use, no change |
| Every Server Action validates inputs with `z.safeParse()` | All four mutation actions validate with Zod before DB writes |
| No offline mode | Not relevant |
| Use server-only import in files with service-role credentials | `suspendTenant.ts`, `activateAddon.ts` etc. must import `server-only` |
| GSD workflow enforcement | Edits via GSD execute-phase only |
| Vitest for unit tests, Playwright for E2E | Unit tests for Server Actions; no E2E specified for this phase |

## Sources

### Primary (HIGH confidence)
- Codebase — `src/middleware.ts` — verified middleware flow and subdomain routing
- Codebase — `supabase/migrations/014_multi_tenant_schema.sql` — stores, store_plans, super_admins table structure
- Codebase — `supabase/migrations/015_rls_policy_rewrite.sql` — super_admin_read policies (SELECT only on all tables)
- Codebase — `supabase/migrations/016_super_admin.sql` — auth hook injecting is_super_admin claim
- Codebase — `supabase/migrations/019_billing_claims.sql` — feature flag claim injection
- Codebase — `src/lib/supabase/admin.ts` — service role client pattern
- Codebase — `src/actions/auth/ownerSignin.ts` — login redirect pattern (must be modified)
- Codebase — `src/components/admin/AdminSidebar.tsx` — sidebar reference pattern
- Codebase — `src/app/admin/billing/page.tsx` — add-on card pattern

### Secondary (MEDIUM confidence)
- Supabase JS docs (range queries, count, ilike) — patterns well-established in existing codebase
- Next.js docs (revalidatePath, Server Actions) — consistent with existing project usage

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new libraries, all existing
- Architecture: HIGH — all patterns directly from existing codebase
- Pitfalls: HIGH — identified from direct codebase analysis (cache, login redirect, RLS)
- Migration: HIGH — follows established migration pattern exactly

**Research date:** 2026-04-03
**Valid until:** 2026-05-03 (stable stack)
