# Architecture Research

**Domain:** Multi-tenant SaaS transformation of existing NZ retail POS
**Researched:** 2026-04-03
**Confidence:** HIGH (Vercel official docs, Supabase patterns, existing codebase reviewed)

---

## Context: What Already Exists

The v1 app has a clean foundation for multi-tenancy:

- Every table has `store_id UUID NOT NULL REFERENCES public.stores(id)` — tenant isolation at the data layer is done.
- RLS policies enforce `store_id = (auth.jwt() -> 'app_metadata' ->> 'store_id')::UUID` — no cross-tenant leakage.
- `custom_access_token_hook` injects `store_id` and `role` into JWT `app_metadata` — the pattern for tenant resolution is already established.
- `resolveAuth()` reads `store_id` from JWT app_metadata (owner) or staff PIN JWT — all Server Actions are already tenant-scoped.
- `stores` table exists as the tenant root, with `owner_auth_id` pointing to `auth.users`.
- Middleware (`src/middleware.ts`) handles auth routing for `/admin`, `/pos`, and `/` — this is where tenant resolution will be added.

**What does NOT exist yet:**
- No subdomain routing — all routes are path-based under a single domain.
- No tenant provisioning flow — the founder's store was seeded manually.
- No Stripe billing — Stripe is used for customer payments, not merchant subscriptions.
- No feature gating table or entitlements check.
- No super admin role or panel.
- No marketing landing page.

---

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                      Vercel Edge (Middleware)                         │
│  Request → hostname extraction → tenant lookup → header injection     │
│                                                                       │
│  *.nzpos.app   →  subdomain = tenant slug  →  resolve store_id       │
│  shop.acme.nz  →  custom domain lookup     →  resolve store_id       │
│  nzpos.app     →  marketing / signup (no tenant)                     │
└──────────────────────────────────┬──────────────────────────────────┘
                                   │ x-tenant-id header
         ┌─────────────────────────┼────────────────────────────────┐
         │                         │                                │
         ▼                         ▼                                ▼
┌─────────────────┐    ┌─────────────────────┐    ┌───────────────────────┐
│  Marketing Site │    │  Tenant App Routes  │    │  Super Admin Panel    │
│  /              │    │  /admin             │    │  /superadmin          │
│  /pricing       │    │  /pos               │    │  service_role client  │
│  /signup        │    │  / (storefront)     │    │  cross-tenant queries │
└─────────────────┘    └──────────┬──────────┘    └───────────────────────┘
                                  │
                    ┌─────────────┼─────────────┐
                    │                           │
                    ▼                           ▼
          ┌──────────────────┐      ┌────────────────────┐
          │  Supabase Auth   │      │  Supabase Postgres │
          │  (owner logins)  │      │  (RLS by store_id) │
          └──────────────────┘      └────────────────────┘
                                              │
                                    ┌─────────┴──────────┐
                                    │                    │
                                    ▼                    ▼
                          ┌──────────────────┐  ┌──────────────────┐
                          │  Stripe (billing)│  │  Vercel SDK      │
                          │  subscriptions   │  │  custom domains  │
                          └──────────────────┘  └──────────────────┘
```

### Component Responsibilities

| Component | Responsibility | New vs Modified |
|-----------|----------------|-----------------|
| Middleware | Hostname → tenant slug/custom domain → store_id → x-tenant-id header | **MODIFIED** — add hostname resolution before existing auth checks |
| `stores` table | Tenant root: slug, plan, stripe_customer_id, custom_domain | **MODIFIED** — add new columns |
| `store_plans` table | Feature entitlements per store | **NEW** |
| Tenant provisioning | Server Action: create auth user + store + staff + custom_access_token_hook | **NEW** |
| Setup wizard | Multi-step onboarding UI (logo, categories, products, branding) | **NEW** |
| Stripe billing | Subscription create/update/cancel via Stripe Checkout + Customer Portal | **NEW** |
| Webhook handler | `/api/webhooks/stripe` extended for `customer.subscription.*` events | **MODIFIED** |
| Feature gate helper | `requireFeature(store_id, 'xero')` — throws if not entitled | **NEW** |
| Super admin | `/superadmin` route with service_role client, cross-tenant queries | **NEW** |
| Marketing pages | `/` landing, `/pricing`, route group `(marketing)` | **NEW** |
| Custom domain API | Server Action wrapping `@vercel/sdk` `projectsAddProjectDomain` | **NEW** |

---

## Recommended Project Structure Changes

```
src/
├── app/
│   ├── (marketing)/            # NEW: public landing pages (no tenant context)
│   │   ├── layout.tsx          # marketing layout (no sidebar/POS chrome)
│   │   ├── page.tsx            # landing page
│   │   └── pricing/page.tsx    # pricing page
│   │
│   ├── (onboarding)/           # NEW: signup + setup wizard
│   │   ├── signup/page.tsx     # merchant email signup (replaces stub)
│   │   └── setup/
│   │       ├── page.tsx        # wizard entry
│   │       ├── store/page.tsx  # step 1: store name + slug
│   │       ├── brand/page.tsx  # step 2: logo + colors
│   │       └── catalog/page.tsx # step 3: first products
│   │
│   ├── (tenant)/               # MODIFIED: wraps existing admin/pos/storefront
│   │   ├── layout.tsx          # injects tenant context from x-tenant-id header
│   │   ├── admin/...           # unchanged routes
│   │   ├── (pos)/...           # unchanged routes
│   │   └── (store)/...         # unchanged routes
│   │
│   ├── superadmin/             # NEW: super admin panel
│   │   ├── layout.tsx          # service_role auth guard
│   │   ├── page.tsx            # tenant list + metrics
│   │   ├── stores/[id]/page.tsx
│   │   └── billing/page.tsx
│   │
│   └── api/
│       ├── webhooks/
│       │   └── stripe/         # MODIFIED: handle subscription events
│       └── domains/            # NEW: Vercel SDK domain provisioning endpoint
│
├── lib/
│   ├── tenant.ts               # NEW: resolveTenantFromHostname(), getTenantContext()
│   ├── features.ts             # NEW: requireFeature(), hasFeature()
│   ├── stripe-billing.ts       # NEW: createSubscription(), getBillingPortalUrl()
│   ├── vercel-domains.ts       # NEW: addCustomDomain(), removeCustomDomain()
│   └── supabase/               # UNCHANGED
│
├── middleware.ts               # MODIFIED: hostname → tenant resolution
└── types/
    └── database.ts             # MODIFIED: new stores columns + store_plans table
```

---

## Architectural Patterns

### Pattern 1: Hostname-First Tenant Resolution in Middleware

**What:** Middleware extracts tenant from hostname before any auth check, injects `x-tenant-id` as a request header so all downstream Server Components and Server Actions can read it without hitting the database again.

**When to use:** Every request to a tenant route.

**Trade-offs:** Adds one DB lookup per request (or Edge Config cache hit) at the middleware layer. Acceptable because middleware runs at Vercel Edge — fast. Eliminates the need to pass tenant through every function call.

**Example:**
```typescript
// src/lib/tenant.ts
export async function resolveTenantFromHostname(
  hostname: string,
  supabase: SupabaseClient
): Promise<string | null> {
  const appHost = process.env.NEXT_PUBLIC_APP_HOST // 'nzpos.app'

  // Subdomain: tenant.nzpos.app
  if (hostname.endsWith(`.${appHost}`)) {
    const slug = hostname.replace(`.${appHost}`, '')
    const { data } = await supabase
      .from('stores')
      .select('id')
      .eq('slug', slug)
      .single()
    return data?.id ?? null
  }

  // Custom domain: shop.acme.nz
  const { data } = await supabase
    .from('stores')
    .select('id')
    .eq('custom_domain', hostname)
    .single()
  return data?.id ?? null
}

// src/middleware.ts (addition to existing)
const tenantId = await resolveTenantFromHostname(hostname, supabase)
if (tenantId) {
  response.headers.set('x-tenant-id', tenantId)
}
```

### Pattern 2: Atomic Tenant Provisioning via Server Action

**What:** A single database transaction creates the Supabase auth user, `stores` row, and owner `staff` row together. The `custom_access_token_hook` then fires on first login, injecting `store_id` into the JWT — no manual step required.

**When to use:** Merchant signup flow.

**Trade-offs:** All-or-nothing atomicity is correct. If Supabase Auth user creation succeeds but `stores` insert fails, the auth user is orphaned — handle with a cleanup function or use a Postgres function that calls `auth.users` directly via service_role.

**Example:**
```typescript
// src/actions/provision-store.ts
'use server'
export async function provisionStore(input: ProvisionInput) {
  const admin = createSupabaseAdminClient() // service_role

  // 1. Create auth user
  const { data: authUser } = await admin.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
  })

  // 2. Create store + owner staff in a single RPC to ensure atomicity
  const { data: store } = await admin.rpc('provision_store', {
    owner_auth_id: authUser.user.id,
    store_name: input.storeName,
    slug: input.slug,
  })
  // RPC creates: stores row + staff row (role='owner')
  // custom_access_token_hook fires on next login, injects store_id

  return { storeId: store.id }
}
```

### Pattern 3: Stripe Subscription Sync via Webhook

**What:** Stripe webhook events (`customer.subscription.created`, `updated`, `deleted`) update a `store_plans` table. All feature gate checks read from `store_plans` — never from Stripe directly at request time.

**When to use:** Any time subscription status changes.

**Trade-offs:** Database is the source of truth for feature access. Avoids Stripe API latency on every request. Risk: webhook delivery delay means a brief window where Stripe state and DB diverge — acceptable for a SaaS add-on (not a payment blocker).

**Example:**
```typescript
// supabase/migrations/014_saas_billing.sql
CREATE TABLE public.store_plans (
  store_id    UUID PRIMARY KEY REFERENCES public.stores(id),
  plan        TEXT NOT NULL DEFAULT 'free', -- 'free' | 'starter' | 'pro'
  stripe_customer_id    TEXT,
  stripe_subscription_id TEXT,
  xero_enabled          BOOLEAN NOT NULL DEFAULT false,
  email_notifications_enabled BOOLEAN NOT NULL DEFAULT false,
  custom_domain_enabled BOOLEAN NOT NULL DEFAULT false,
  current_period_end    TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

```typescript
// src/lib/features.ts
export async function hasFeature(
  storeId: string,
  feature: 'xero' | 'email_notifications' | 'custom_domain'
): Promise<boolean> {
  const supabase = await createSupabaseServerClient()
  const col = `${feature}_enabled`
  const { data } = await supabase
    .from('store_plans')
    .select(col)
    .eq('store_id', storeId)
    .single()
  return data?.[col] ?? false
}

export async function requireFeature(storeId: string, feature: FeatureKey) {
  const has = await hasFeature(storeId, feature)
  if (!has) throw new Error(`Feature '${feature}' requires a paid plan.`)
}
```

### Pattern 4: Super Admin with Service Role Client

**What:** A dedicated route group `/superadmin` uses a Supabase client initialised with `SUPABASE_SERVICE_ROLE_KEY` (bypasses RLS). Access is gated by a custom `is_super_admin` column in `staff` (or a separate `super_admins` table).

**When to use:** All super admin operations.

**Trade-offs:** Service role bypasses RLS entirely — a bug in super admin routes can expose all tenant data. Mitigate by keeping the service role client confined to `src/lib/supabase/admin.ts` (already exists in v1) and never importing it in tenant-facing code.

**Example:**
```typescript
// Super admin middleware guard
if (pathname.startsWith('/superadmin')) {
  const { supabase } = await createSupabaseMiddlewareClient(request)
  const { data: { user } } = await supabase.auth.getUser()
  const isSuperAdmin = user?.app_metadata?.is_super_admin === true
  if (!isSuperAdmin) return NextResponse.redirect('/login')
}
```

### Pattern 5: Custom Domain Provisioning via Vercel SDK

**What:** When a merchant enables the custom domain add-on, a Server Action calls `@vercel/sdk` to register the domain with the Vercel project, then stores the domain in `stores.custom_domain`. Middleware's custom domain lookup then starts resolving the tenant from that hostname.

**When to use:** Merchant upgrades to custom domain add-on and enters their domain.

**Trade-offs:** Requires `VERCEL_TOKEN` and `VERCEL_TEAM_ID` env vars. Domain verification can take 24-48h for DNS propagation — UX must surface verification status. The Vercel SDK is the authoritative approach (confirmed in official Vercel docs 2026).

**Example:**
```typescript
// src/lib/vercel-domains.ts
import { VercelCore } from '@vercel/sdk/core.js'
import { projectsAddProjectDomain } from '@vercel/sdk/funcs/projectsAddProjectDomain.js'

const client = new VercelCore({ bearerToken: process.env.VERCEL_TOKEN! })

export async function addCustomDomain(domain: string) {
  await projectsAddProjectDomain(client, {
    idOrName: process.env.VERCEL_PROJECT_ID!,
    teamId: process.env.VERCEL_TEAM_ID,
    requestBody: { name: domain },
  })
}
```

---

## Data Flow

### New Merchant Signup Flow

```
/signup form submit (email, password, store name, slug)
    ↓
Server Action: provisionStore()
    ├── admin.auth.admin.createUser()
    ├── rpc('provision_store')          — creates stores + staff rows
    └── create store_plans row (plan='free')
    ↓
Redirect → /setup (onboarding wizard)
    ↓
Setup wizard steps (store brand, first products)
    ↓
Redirect → tenant.nzpos.app/admin  (first login, JWT claims injected by hook)
```

### Tenant Request Resolution Flow

```
Request: myshop.nzpos.app/admin
    ↓
Middleware
    ├── extract hostname → slug = 'myshop'
    ├── DB lookup: stores WHERE slug = 'myshop' → store_id
    ├── set header: x-tenant-id = store_id
    └── existing auth checks (unchanged)
    ↓
Layout: read x-tenant-id from headers()
    ↓
Server Components: use store_id from layout context
    ↓
RLS: JWT app_metadata.store_id must match store_id (unchanged)
```

### Stripe Billing Flow

```
Merchant clicks "Upgrade to Starter"
    ↓
Server Action: createCheckoutSession(storeId, priceId)
    ├── lookup or create Stripe customer for store
    └── stripe.checkout.sessions.create({ mode: 'subscription' })
    ↓
Redirect → Stripe Checkout (hosted)
    ↓
Stripe webhook: customer.subscription.created
    ↓
/api/webhooks/stripe: verify signature
    ↓
UPDATE store_plans SET xero_enabled=true WHERE stripe_subscription_id=...
    ↓
Merchant is now entitled to the feature
```

### Feature Gate Check Flow

```
Server Action or Server Component
    ↓
requireFeature(store_id, 'xero')
    ↓
SELECT xero_enabled FROM store_plans WHERE store_id = $1
    ├── true  → proceed
    └── false → throw / return upgrade prompt
```

---

## Integration Points

### New vs Modified Integrations

| Integration | Status | What Changes |
|-------------|--------|--------------|
| Middleware tenant resolution | **NEW** | Add hostname parsing before existing auth logic |
| `stores` table | **MODIFIED** | Add: `slug TEXT UNIQUE`, `custom_domain TEXT`, `stripe_customer_id TEXT` |
| `store_plans` table | **NEW** | Track plan + per-feature flags + Stripe subscription ref |
| `custom_access_token_hook` | **UNCHANGED** | Already injects `store_id` — no change needed |
| Stripe webhook handler | **MODIFIED** | Extend `/api/webhooks/stripe` for `customer.subscription.*` events |
| Stripe (merchant billing) | **NEW** | Second use of Stripe — subscriptions, not customer payments |
| Vercel SDK (`@vercel/sdk`) | **NEW** | Custom domain add/remove/verify |
| Supabase admin client | **UNCHANGED** | `src/lib/supabase/admin.ts` already exists — use for provisioning |
| `resolveAuth()` | **UNCHANGED** | Still reads `store_id` from JWT — middleware just ensures the right tenant loads first |

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Stripe (merchant billing) | Checkout Session → webhook sync → `store_plans` table | Separate from existing Stripe customer payments. Same Stripe account, different objects. |
| Vercel SDK | Server Action calling `projectsAddProjectDomain` | Requires `VERCEL_TOKEN`, `VERCEL_PROJECT_ID`, `VERCEL_TEAM_ID` env vars. Wildcard DNS (`*.nzpos.app`) must use Vercel nameservers. |
| Supabase Auth | `admin.auth.admin.createUser()` in provisioning | Service role required for admin user creation. |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Middleware → Server Components | `x-tenant-id` request header | Server Components read via `headers()` from `next/headers` |
| Middleware → existing auth checks | Additive — header set first, then existing auth logic runs | No existing auth code needs to change |
| Super admin routes → Supabase | Service role client (no RLS) | Confined to `src/lib/supabase/admin.ts` — never in tenant code paths |
| Feature gate → store_plans | Direct DB read via server Supabase client | Called in Server Actions before executing gated operations |
| Custom domain API → Vercel SDK | Server Action → Vercel REST API via SDK | Must run server-side only (API token must not leak to client) |

---

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 1-50 tenants | Current approach works fine. Supabase free tier sufficient. One middleware DB lookup per request is acceptable. |
| 50-500 tenants | Add Vercel Edge Config cache for slug→store_id lookups (sub-10ms vs ~50ms DB). Cache TTL 5 min is safe. |
| 500+ tenants | Consider Upstash Redis for tenant cache layer. Evaluate Supabase Pro for connection pooling under load. |

### Scaling Priorities

1. **First bottleneck: middleware DB lookup.** Every request hits `stores WHERE slug = ?`. Solved by Edge Config cache keyed on slug with a short TTL. Vercel provides native Edge Config integration.
2. **Second bottleneck: RLS policy evaluation.** Already mitigated in v1 by JWT claims pattern (no table joins in policies). No change needed.
3. **Third bottleneck: Stripe webhook throughput.** Not relevant at this scale — webhooks are async and low volume.

---

## Anti-Patterns

### Anti-Pattern 1: Resolving Tenant in Every Server Action

**What people do:** Call `SELECT id FROM stores WHERE slug = ?` at the start of every Server Action to validate the tenant.

**Why it's wrong:** Redundant. RLS already enforces store_id isolation. The JWT claim already carries store_id. A second lookup is wasted latency and code noise.

**Do this instead:** Trust the JWT's `store_id` (set by `custom_access_token_hook`). The middleware header is for routing only. Server Actions use `resolveAuth()` which reads from JWT — same as v1.

### Anti-Pattern 2: Two Separate Stripe Accounts

**What people do:** Create a separate Stripe account for merchant billing, separate from the Stripe account used for customer payments.

**Why it's wrong:** Fragmented billing, double key management, complex reconciliation. NZ merchant payments and SaaS billing can both live in the same Stripe account with different Product/Price objects.

**Do this instead:** Same Stripe account. Distinguish by Stripe metadata: `metadata.type = 'merchant_subscription'` vs `metadata.type = 'customer_order'`. Webhook handler routes by event type.

### Anti-Pattern 3: Storing Subscription Status Only in Stripe

**What people do:** Check feature access by calling `stripe.subscriptions.retrieve()` at request time.

**Why it's wrong:** Latency (Stripe API ~200ms), rate limits, and a Stripe outage blocks your entire app.

**Do this instead:** Stripe is the billing source of truth. `store_plans` is the application source of truth. Webhooks keep them in sync. App always reads from `store_plans` — never calls Stripe at request time for access checks.

### Anti-Pattern 4: Super Admin Shares the Owner Auth Path

**What people do:** Give the super admin user `role='owner'` in the existing staff table and share the `/admin` route.

**Why it's wrong:** Super admin needs cross-tenant access (all stores). Owner access is RLS-scoped to a single store_id. Mixing them means either breaking RLS or writing special-case bypass logic everywhere.

**Do this instead:** Separate route group `/superadmin` with its own middleware guard checking `app_metadata.is_super_admin`. Uses service role client. Completely separate from tenant `/admin`.

### Anti-Pattern 5: Subdomain Slug = Store ID (UUID)

**What people do:** Use the store's UUID as the subdomain: `550e8400-e29b-41d4-a716-446655440000.nzpos.app`.

**Why it's wrong:** Ugly URLs, hard for merchants to share, no marketing value.

**Do this instead:** `slug` field in `stores` table (e.g., `myshop`). Short, URL-safe, merchant-chosen. Add `UNIQUE` constraint. Validate on creation (alphanumeric + hyphens, 3-32 chars, no reserved words like `admin`, `api`, `www`).

---

## Build Order Rationale

The SaaS features have hard dependencies. Building in this order avoids rework:

1. **Database schema changes** (`stores` columns + `store_plans` table) — everything else reads from here.
2. **Tenant resolution middleware** — must exist before any tenant-specific routing works.
3. **Tenant provisioning + signup** — merchants need accounts before anything else.
4. **Setup wizard** — requires provisioned store.
5. **Marketing page** — independent, can be built any time, but logically follows signup.
6. **Stripe billing + webhook** — requires provisioned stores to attach subscriptions to.
7. **Feature gating** — requires `store_plans` rows to exist (created by provisioning in step 3 with `plan='free'`).
8. **Custom domains** — requires Stripe billing (it's a paid add-on); requires Vercel SDK setup.
9. **Super admin panel** — can read from everything above; logical last step.

---

## Sources

- Vercel multi-tenant domain management (official, 2026): https://vercel.com/docs/multi-tenant/domain-management
- Vercel Platforms concepts (official): https://vercel.com/platforms/docs/multi-tenant-platforms/concepts
- Vercel wildcard domains blog: https://vercel.com/blog/wildcard-domains
- Vercel Platforms Starter Kit: https://vercel.com/templates/next.js/platforms-starter-kit
- Supabase JWT app_metadata pattern (community consensus, verified in existing codebase): https://github.com/orgs/supabase/discussions/1615
- Next.js subscription payments reference (Vercel official): https://github.com/vercel/nextjs-subscription-payments
- Stripe subscriptions guide: https://docs.stripe.com/billing/subscriptions/build-subscriptions
- Stripe customer portal: https://docs.stripe.com/customer-management/integrate-customer-portal
- Existing codebase reviewed: `src/middleware.ts`, `supabase/migrations/001_initial_schema.sql`, `supabase/migrations/002_rls_policies.sql`, `supabase/migrations/003_auth_hook.sql`, `src/lib/resolveAuth.ts`

---

*Architecture research for: NZPOS v2.0 SaaS multi-tenant transformation*
*Researched: 2026-04-03*
