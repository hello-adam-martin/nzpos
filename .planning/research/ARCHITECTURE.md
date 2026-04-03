# Architecture Research

**Domain:** Multi-tenant SaaS POS + Online Store — v2.1 Hardening & Documentation
**Researched:** 2026-04-04
**Confidence:** HIGH (direct codebase inspection: middleware.ts, 20 migrations, all action files, webhook routes)

---

## Context: This Is Not Greenfield Research

v2.0 shipped a complete architecture. v2.1 adds no new routes or major components. This document maps the existing system to answer: **where does security review, code quality review, and documentation apply, in what order, and why?**

All components described below exist and are in production.

---

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         REQUEST ENTRY POINTS                                │
├──────────────────┬──────────────────┬───────────────────┬───────────────────┤
│  Root Domain     │  Store Subdomain  │  Webhook Routes   │  Cron Routes      │
│  (marketing,     │  (pos/, admin/,   │  /api/webhooks/   │  /api/cron/       │
│   signup,        │   store/, /)      │  stripe/          │  daily-summary    │
│   super-admin)   │                   │  stripe/billing/  │  expire-orders    │
└────────┬─────────┴─────────┬─────────┴──────────┬────────┴────────┬──────────┘
         │                   │                     │                 │
         ▼                   ▼                     │                 │
┌──────────────────────────────────────────┐       │                 │
│         MIDDLEWARE (Edge, 221 LOC)        │       │                 │
│  src/middleware.ts                        │       │                 │
│                                           │       │                 │
│  1. Webhook bypass (/api/webhooks)        │       │                 │
│  2. Root vs subdomain detection           │       │                 │
│  3. Super admin auth gate                 │       │                 │
│  4. Slug → store_id lookup                │       │                 │
│     (5-min TTL in-memory cache +          │       │                 │
│      active status check on every hit)   │       │                 │
│  5. Suspension enforcement                │       │                 │
│  6. Admin route: owner-only auth          │       │                 │
│  7. POS route: jose JWT or owner auth     │       │                 │
│  8. Storefront: public + session refresh  │       │                 │
│  Injects: x-store-id, x-store-slug       │       │                 │
└───────────────────┬──────────────────────┘       │                 │
                    │                              │                 │
         ┌──────────┘                              │                 │
         ▼                                         ▼                 ▼
┌────────────────────────┐           ┌──────────────────────────────────────┐
│  SERVER COMPONENTS &   │           │       ROUTE HANDLERS (self-auth)     │
│  SERVER ACTIONS        │           │                                      │
│                        │           │  /api/webhooks/stripe/               │
│  src/actions/          │           │    HMAC sig verify → raw body        │
│    auth/ (14 files)    │           │    Idempotency: stripe_events table  │
│    orders/ (6 files)   │           │    complete_online_sale RPC          │
│    products/ (5 files) │           │    GST fallback (duplicates gst.ts)  │
│    billing/ (2 files)  │           │                                      │
│    xero/ (3 files)     │           │  /api/webhooks/stripe/billing/       │
│    super-admin/ (4)    │           │    Separate HMAC secret              │
│    setup/ (?)          │           │    store_plans feature flag update   │
│    cash-sessions/ (?)  │           │    JWT stale window: documented      │
│                        │           │                                      │
│  Auth pattern per      │           │  /api/xero/callback, /connect        │
│  action:               │           │    OAuth PKCE exchange               │
│    resolveAuth() or    │           │    Tokens → Supabase Vault           │
│    resolveStaffAuth()  │           │                                      │
│  + Zod.safeParse()     │           │  /api/cron/* (Vercel cron)           │
│    on all inputs       │           │    CRON_SECRET header auth only      │
└───────────┬────────────┘           └──────────────────┬───────────────────┘
            └──────────────────┬──────────────────────────┘
                               ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                         SUPABASE LAYER                                       │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  DUAL AUTH SYSTEM                                                            │
│  ┌────────────────────────────────┐  ┌─────────────────────────────────┐    │
│  │ Supabase Auth                  │  │ Jose JWT (staff PIN sessions)   │    │
│  │ owners + customers + superadmin│  │ HMAC HS256, 8h expiry           │    │
│  │ Custom token hook injects:     │  │ HttpOnly cookie: staff_session  │    │
│  │   store_id, role,              │  │ Verified by: resolveStaffAuth() │    │
│  │   is_super_admin,              │  └─────────────────────────────────┘    │
│  │   billing feature flags        │                                          │
│  └────────────────────────────────┘  FEATURE GATING (requireFeature.ts)    │
│                                      ┌─────────────────────────────────┐    │
│                                      │ Fast path: JWT app_metadata     │    │
│                                      │ DB fallback: store_plans table  │    │
│                                      │ (requireDbCheck: true for       │    │
│                                      │  billing-critical mutations)    │    │
│                                      └─────────────────────────────────┘    │
│                                                                              │
│  ROW LEVEL SECURITY (20 migrations, canonical rewrite in 015)               │
│  Unified pattern: auth.jwt() -> 'app_metadata' ->> 'store_id'               │
│  Super admin: SELECT-only across all tenants                                 │
│  Public read: products (active), promo_codes (active + non-expired)          │
│  Customer isolation: own orders/profile only                                 │
│  store_plans: owner-read, service_role write only                            │
│  orders_public_read: channel = 'online' (no store_id filter — by design)   │
│                                                                              │
│  SECURITY DEFINER RPCs (service_role caller required)                       │
│  provision_store, complete_pos_sale, complete_online_sale,                   │
│  increment_promo_uses, restore_stock, check_rate_limit,                     │
│  get/upsert/delete_xero_tokens (Vault access)                               │
│                                                                              │
│  SUPABASE VAULT                                                              │
│  Xero OAuth tokens — encrypted at rest, never in plain columns              │
│  Access only via SECURITY DEFINER RPCs                                       │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Component Boundaries

### Entry Points by Risk Level

| Entry Point | Auth Mechanism | Risk Level | Notes |
|-------------|----------------|------------|-------|
| `middleware.ts` | Supabase Auth + jose JWT | CRITICAL | All tenant routing flows through here |
| `/super-admin/*` | Supabase Auth (`is_super_admin`) | CRITICAL | Cross-tenant read access |
| `/api/webhooks/stripe/` | Stripe HMAC signature | CRITICAL | Payment completion + stock decrement |
| `/api/webhooks/stripe/billing/` | Stripe HMAC signature (separate secret) | HIGH | Subscription feature flag updates |
| `/admin/*` | Supabase Auth (owner role) | HIGH | Financial data, product mutations |
| `/pos/*` | Supabase Auth or jose JWT | HIGH | Sale completion, cash sessions |
| Server Actions (`src/actions/`) | `resolveAuth()` or `resolveStaffAuth()` | HIGH | All mutations |
| `/api/xero/*` | PKCE state + Supabase Auth | HIGH | OAuth token exchange |
| `/api/cron/*` | `CRON_SECRET` header | MEDIUM | Scheduled jobs |
| `/store/*` (storefront) | Public + optional session | MEDIUM | Read-heavy, Stripe Checkout link |
| `/(marketing)` | None | LOW | Static pages |

### Auth Context Flow

```
Browser Request
    ↓
middleware.ts
    ├─ Bypass: /api/webhooks/* → no auth, no tenant resolution
    ├─ Root domain detection (host === ROOT_DOMAIN)
    │    ├─ /super-admin → Supabase Auth + is_super_admin check
    │    └─ other root paths → pass through (marketing)
    └─ Subdomain:
         ├─ slug → store_id (tenantCache → DB)
         ├─ Suspension check (even for cached entries)
         ├─ Inject x-store-id, x-store-slug headers
         └─ Route-specific auth:
              /admin  → Supabase Auth, owner role + email verified
              /pos    → jose JWT (staff_session) OR Supabase Auth (owner)
              /       → public pass-through (storefront)

Server Action / Route Handler
    ├─ resolveAuth() [owner or staff fallback] or resolveStaffAuth() [staff only]
    │    ├─ Supabase Auth user → app_metadata.store_id
    │    └─ jose JWT staff_session cookie → store_id
    │    Both: prefer x-store-id header over JWT store_id (subdomain context)
    ├─ Zod.safeParse() on all input
    └─ admin client → atomic RPC or scoped query
```

### Data Isolation Chain

```
store_id encoded in JWT (app_metadata)
    ↓ set by: custom_access_token_hook (003_auth_hook.sql)
    ↓ reads: public.staff WHERE auth_user_id = event.user_id
    ↓
Carried by middleware as x-store-id request header
    ↓
Read by resolveAuth() / resolveStaffAuth()
    ↓ x-store-id header preferred over JWT store_id
    ↓
All queries filtered WHERE store_id = resolved_store_id
    ↓
Enforced independently by RLS (015_rls_policy_rewrite.sql)
    ↓ auth.jwt() -> 'app_metadata' ->> 'store_id'
```

---

## Security Review Integration Points

### 1. RLS Policy Layer (HIGHEST PRIORITY)

**Location:** `supabase/migrations/015_rls_policy_rewrite.sql` + any tables added in 016–020.

**Specific concerns to audit:**

`orders_public_read` — policy is `FOR SELECT USING (channel = 'online')`. This allows any caller (including anonymous) to read any online order across all stores with no `store_id` filter. This is intentional for guest checkout confirmation (the order page needs to load without auth). Verify: (a) no sensitive merchant data is exposed on the `orders` row that a competitor could harvest; (b) the client always scopes queries by `order_id` + `lookup_token`, not by `store_id`.

`products_public_read` — active products across all stores are readable. Correct for public storefronts. Verify no sensitive fields (cost price, internal notes) are on the `products` table.

`promo_codes_public_read` — all active, non-expired promo codes across all stores are readable via the Supabase API. Any authenticated or anonymous caller can enumerate codes. Verify the storefront promo validation action scopes by `store_id` (so store A's codes don't apply to store B's checkout).

`refund_items_staff_read` uses a subquery join to `refunds` which itself has an RLS policy (`refunds_staff_access`). The subquery inherits the caller's RLS context. Document this dependency explicitly so future policy changes don't break the chain.

`super_admin_actions` table — verify this table has RLS preventing non-super-admin reads. It records suspension reasons and admin actions; leaking it to store owners would be a privacy issue.

`store_plans` — `store_plans_owner_read` allows owner to read their own plan. No INSERT/UPDATE policies exist — only service_role can write. Verify no migration after 015 accidentally added an UPDATE policy.

**Tables added after 015 (016–020):** Each new table in migrations 016–020 needs explicit RLS audit. Confirm RLS is enabled (`ENABLE ROW LEVEL SECURITY`) and appropriate policies exist.

### 2. Webhook Security (CRITICAL)

**Location:** `src/app/api/webhooks/stripe/route.ts`, `src/app/api/webhooks/stripe/billing/route.ts`

**What to audit:**

Both webhooks correctly use `req.text()` before `constructEvent()`. Middleware bypasses `/api/webhooks/*` entirely (line 13–15 in middleware.ts). Verify no `bodyParser` or middleware intercepts the request before the raw body is consumed.

Idempotency in `route.ts`: reads `stripe_events` BEFORE the RPC, inserts AFTER success. This is correct — a failed RPC leaves no dedup row, so Stripe retries will re-execute. Verify `complete_online_sale` RPC handles duplicate calls gracefully (same order + same stripe session = no double-processing).

Idempotency in `billing/route.ts`: same pattern. Verify `store_plans UPDATE` is idempotent (it is — setting a boolean to the same value is safe).

The `billing/route.ts` does not update JWT claims after changing `store_plans`. The `requireFeature()` fast path (JWT) will return stale data until the owner refreshes their session. This is an accepted design trade-off. Document it explicitly in `requireFeature.ts` with a note about when to use `requireDbCheck: true`.

GST fallback in `route.ts` (line ~134): `Math.round(item.line_total_cents * 3 / 23)` duplicates `gstFromInclusiveCents()` from `src/lib/gst.ts`. Flag as a code quality issue — should import the shared utility.

### 3. Authentication Layer (HIGH PRIORITY)

**Location:** `src/middleware.ts`, `src/lib/resolveAuth.ts`, `src/actions/auth/`

**What to audit:**

`resolveAuth()` tries Supabase Auth first (owner/customer), then falls back to jose staff JWT. A valid Supabase Auth session with role `customer` will produce a `store_id` from `app_metadata`. Verify that Server Actions which should be staff/owner only call `resolveStaffAuth()` (not `resolveAuth()`), or that `resolveAuth()` callers check the returned role before proceeding.

Middleware email verification gate (line 103–111): blocks unverified owners from `/admin`. This gate only runs in middleware. Verify that Server Actions in `src/actions/` that perform owner-only mutations independently re-verify authentication (via `resolveAuth()` + Supabase JWT) — they cannot rely on middleware having already done the check.

Staff PIN lockout: `src/actions/auth/staffPin.ts` — verify lockout state is stored server-side (ideally in the database, not in-memory), cannot be reset by the client, and has a defined lockout duration.

`ownerSignup.ts` orphaned user cleanup: on RPC failure, it calls `admin.auth.admin.deleteUser(authData.user.id)`. Verify this cleanup itself is error-handled — if `deleteUser` fails, the orphaned auth user will persist with no store record, blocking re-signup with the same email.

Rate limiting: `src/lib/signupRateLimit.ts` — the migration 009 comment says "replaces in-memory Map" but the actual `signupRateLimit.ts` lib may still use an in-memory `Map`. Verify which implementation is active. In-memory rate limiting does not survive server restarts and does not work across multiple Vercel instances. If in-memory, migrate to the `check_rate_limit` DB RPC.

### 4. Multi-Tenant Isolation (CRITICAL)

**Location:** `src/middleware.ts`, `src/lib/tenantCache.ts`, `src/lib/resolveAuth.ts`

**What to audit:**

`tenantCache.ts` module-level `Map` is per-process. On Vercel serverless, each instance is isolated — no cross-tenant cache leakage. However, middleware still queries `is_active` on every request even for cached entries (lines 55–63). This is correct — suspension takes effect within one request cycle even for cached stores. Verify this active check is always reached for cached entries (the code shows it is, but confirm it cannot be short-circuited).

`resolveAuth()` and `resolveStaffAuth()` both use `middlewareStoreId` from the `x-store-id` header when present. The `x-store-id` header is set by middleware — but a direct HTTP request (not via browser) could include a spoofed `x-store-id` header. Verify: are Server Actions reachable via direct POST without going through middleware? In Next.js App Router, Server Actions are invoked via POST to the page URL with special headers — middleware runs for these requests. However, Route Handlers at `/api/*` bypass some middleware gates. Confirm all `/api/*` handlers that read `x-store-id` independently verify the authenticated user's `store_id` matches.

Super admin: middleware checks `user.app_metadata?.is_super_admin === true` for `/super-admin` routes. Verify every super admin Server Action (`src/actions/super-admin/`) independently calls `supabase.auth.getUser()` and re-checks `is_super_admin` — it cannot rely solely on middleware having guarded the route. (Inspected `suspendTenant.ts`: it does this correctly. Audit the other 3 actions.)

`invalidateCachedStoreId()` must be called whenever a store's `is_active` status changes. `suspendTenant.ts` calls it. Verify `unsuspendTenant.ts` also calls it. Verify no other code path sets `is_active = false` without cache invalidation.

### 5. Financial Logic (HIGH PRIORITY)

**Location:** `src/lib/gst.ts`, `src/lib/money.ts`, `src/actions/orders/completeSale.ts`, `src/actions/orders/processPartialRefund.ts`

**What to audit:**

All monetary values are INTEGER cents throughout the codebase. Verify no division or multiplication in any action or utility produces a non-integer intermediate value without immediate `Math.round()`.

`gstFromInclusiveCents(cents)` = `Math.round(cents * 3 / 23)`. Verify Vitest tests cover: zero, odd cent values that round at exactly 0.5, large values (>100,000 cents), negative values (should this be allowed?).

Partial refund in `processPartialRefund.ts`: per-item refund amounts are summed. Verify the sum cannot exceed the original order total. Verify Stripe partial refund amount is calculated in NZD cents (not dollars — Stripe uses smallest currency unit for NZD).

`completeSale.ts` passes `p_cash_tendered_cents` to the RPC. If payment method is not cash, this should be undefined. Verify there is no path where a non-cash payment accidentally records a cash_tendered amount that affects the cash session reconciliation.

---

## Code Quality Review Order (Risk-Based)

Review in this order, highest risk first. Later tiers should not be started until Tier 1 is complete, as security fixes may affect code that later tiers document.

### Tier 1: Security-Critical

1. `supabase/migrations/015_rls_policy_rewrite.sql` + migrations 016–020
2. `src/middleware.ts`
3. `src/lib/resolveAuth.ts`
4. `src/app/api/webhooks/stripe/route.ts`
5. `src/app/api/webhooks/stripe/billing/route.ts`
6. `src/actions/auth/` (all 14 files)
7. `supabase/migrations/003_auth_hook.sql`
8. `src/lib/requireFeature.ts`
9. `src/actions/super-admin/` (all 4 files)

### Tier 2: Financial Logic

10. `src/lib/gst.ts` + `src/lib/gst.test.ts`
11. `src/lib/money.ts` + `src/lib/money.test.ts`
12. `src/actions/orders/completeSale.ts`
13. `src/actions/orders/processPartialRefund.ts`
14. `src/actions/orders/processRefund.ts`
15. `supabase/migrations/005_pos_rpc.sql` (complete_pos_sale PL/pgSQL)
16. `supabase/migrations/006_online_store.sql` (complete_online_sale PL/pgSQL)

### Tier 3: Data Integrity

17. `src/actions/orders/createCheckoutSession.ts`
18. `src/lib/cart.ts`
19. `src/actions/products/importProducts.ts` (CSV import, stock values)
20. `src/lib/tenantCache.ts` (cache invalidation completeness)
21. `src/lib/signupRateLimit.ts` (in-memory vs DB-backed determination)

### Tier 4: General Code Quality

22. All remaining `src/actions/` files — error handling consistency, return type shapes
23. `src/app/api/cron/` — `CRON_SECRET` verification, error handling
24. `src/lib/xero/` — token refresh logic, sync error handling
25. Dead code scan: unused exports, `server-only` import coverage, commented-out code

---

## Documentation Structure

### Where Documentation Lives (target state after v2.1)

```
/
├── README.md                        ← TO CREATE: project overview, quick start for devs
│
├── CLAUDE.md                        ← Exists, comprehensive — tech rationale, stack decisions
├── DESIGN.md                        ← Exists — design system spec
│
├── docs/
│   ├── setup.md                     ← TO CREATE: local dev environment, env vars, Supabase local
│   ├── architecture.md              ← TO CREATE: system overview, component diagram, data flow
│   ├── security.md                  ← TO CREATE: auth model, RLS design, webhook security
│   ├── gst-compliance.md            ← TO CREATE: IRD requirements, GST formula, test cases
│   ├── multi-tenancy.md             ← TO CREATE: tenant isolation, subdomain routing, RLS patterns
│   ├── api-reference.md             ← TO CREATE: Server Actions catalogue, Route Handlers, webhooks
│   ├── deployment.md                ← TO CREATE: production Supabase, Stripe live keys, Vercel config
│   ├── merchant-onboarding.md       ← TO CREATE: user-facing signup flow, setup wizard, first sale
│   └── admin-manual.md              ← TO CREATE: POS usage, admin dashboard, Xero, reports
│
├── supabase/
│   └── migrations/                  ← Most have header comments — fill gaps (016–020)
│
└── src/
    ├── lib/
    │   ├── gst.ts                   ← Has JSDoc header ✓ — add edge case notes
    │   ├── resolveAuth.ts           ← Has inline comments ✓ — document x-store-id trust decision
    │   ├── requireFeature.ts        ← Has JSDoc ✓ — document stale JWT trade-off more explicitly
    │   └── tenantCache.ts           ← Has JSDoc header ✓
    └── actions/
        ├── orders/completeSale.ts   ← Has numbered step comments ✓
        ├── auth/ownerSignup.ts      ← Has numbered step comments ✓
        └── [others]                 ← Coverage varies — add where missing
```

### Inline Documentation Priority

Files that most need documentation added or improved, in order of complexity and review risk:

| File | What to Document |
|------|-----------------|
| `src/middleware.ts` | Why super admin is checked before subdomain resolution. Why webhook bypass is first. Security reasoning for each auth gate. |
| `src/lib/resolveAuth.ts` | Why x-store-id header is trusted over JWT store_id. Why owner auth takes priority over staff JWT. The role check gap for customer sessions. |
| `supabase/migrations/003_auth_hook.sql` | Why REVOKE is applied from `authenticated`, `anon`, `public`. What happens if the hook function errors. |
| `src/lib/requireFeature.ts` | Exactly when `requireDbCheck: true` is required. The stale JWT window with concrete timing estimate. |
| `src/actions/auth/ownerSignup.ts` | The orphaned user cleanup race condition. Why `refreshSession()` is called after `updateUserById`. |
| `src/app/api/webhooks/stripe/route.ts` | The idempotency pattern — why dedup insert is AFTER the RPC, not before. |
| `supabase/migrations/015_rls_policy_rewrite.sql` | Why `orders_public_read` has no store_id filter. The `refund_items` subquery RLS chain dependency. |

---

## Architectural Patterns in Use

### Pattern 1: SECURITY DEFINER RPC for Sensitive Mutations

**What:** Any mutation that requires atomicity across multiple tables (or bypasses RLS) runs as a PostgreSQL `SECURITY DEFINER` function called via the service_role admin client.

**Integration point for security review:** Every SECURITY DEFINER function accepts a `p_store_id` parameter. Verify each function internally validates ownership (e.g., confirm the product being decremented belongs to `p_store_id`). A misconfigured function could allow one tenant's action to affect another tenant's data.

### Pattern 2: Dual-Path Feature Gating

**What:** `requireFeature()` reads JWT `app_metadata` claims (fast, no DB) for most checks. For billing-critical mutations, it queries `store_plans` directly (`requireDbCheck: true`).

**Integration point for review:** Audit all `requireFeature()` call sites. Confirm that actions which process payments or grant entitlements use `requireDbCheck: true`. Actions that merely show/hide UI features may use the fast path.

### Pattern 3: Tenant Header Propagation

**What:** Middleware resolves subdomain → `store_id`, injects `x-store-id` and `x-store-slug` headers. Server Components and Server Actions read via `headers()`.

**Integration point for security review:** The `x-store-id` header is set by middleware, but a crafted HTTP request could include a spoofed `x-store-id` header. Middleware runs for all routes in Next.js App Router including Server Action invocations. However, any Server Action that reads `x-store-id` directly (without using `resolveAuth()`) should be flagged — `resolveAuth()` cross-checks the header against the authenticated user's JWT `store_id`.

### Pattern 4: In-Memory Tenant Cache with Active Verification

**What:** `tenantCache.ts` caches `slug → store_id` for 5 minutes. Middleware checks `is_active` on every request even for cached stores — suspension is immediate.

**Integration point for review:** `invalidateCachedStoreId()` must be called every time a store's `is_active` status changes. Audit all code paths that write to `stores.is_active`.

### Pattern 5: Idempotent Webhook Processing

**What:** Both Stripe webhooks check `stripe_events` for the event ID before processing. The dedup row is inserted AFTER the RPC succeeds.

**Integration point for review:** The `complete_online_sale` and `complete_pos_sale` RPCs must handle duplicate invocations without double-processing. Verify each RPC either uses `ON CONFLICT DO NOTHING` for the order insert, or checks for an existing order before creating one.

---

## Anti-Patterns to Avoid During Review

### Anti-Pattern 1: Trusting x-store-id Without Ownership Verification

**What people might do:** Read `headers().get('x-store-id')` in a Server Action and trust it implicitly without checking the authenticated user's JWT.

**Why wrong:** The header is set by middleware based on the request's subdomain. It cannot be fully trusted in isolation.

**Instead:** Use `resolveAuth()` which cross-checks `x-store-id` against `user.app_metadata.store_id`. Flag any Server Action that reads `x-store-id` directly without routing through `resolveAuth()`.

### Anti-Pattern 2: Admin Client Where Server Client Suffices

**What people might do:** Default to `createSupabaseAdminClient()` everywhere because it bypasses RLS and eliminates "not found" errors.

**Why wrong:** Bypasses all RLS — removes tenant isolation guarantee. The existing codebase uses admin client correctly (only in Server Actions after `resolveAuth()`, in webhooks after signature verification).

**Instead:** Use `createSupabaseServerClient()` for user-context reads. Reserve admin client for: atomic RPCs, webhook handlers, super admin actions, orphan cleanup.

### Anti-Pattern 3: Monetary Values as Floats

**What people might do:** Compute `total * 0.15` for a 15% GST component and store the result.

**Why wrong:** Floating point arithmetic is non-deterministic for financial data.

**Instead:** All monetary values must be INTEGER cents. Any percentage calculation must round immediately. Flag any occurrence of `* 0.` or `/ 100` without `Math.round()` wrapping.

### Anti-Pattern 4: Inline GST Calculation Instead of Shared Utility

**What exists:** The Stripe webhook fallback path in `route.ts` contains `Math.round(item.line_total_cents * 3 / 23)` instead of importing `gstFromInclusiveCents` from `@/lib/gst`.

**Why wrong:** If the GST formula changes, the inline copy diverges silently.

**Fix:** Import `gstFromInclusiveCents` from `@/lib/gst` in the webhook fallback. One-line change, no behavior change.

### Anti-Pattern 5: Documenting Before Fixing

**Why wrong:** Writing API reference or architecture docs before the security review is complete means documenting potentially incorrect behavior. When the security fix changes the code, the docs are immediately stale.

**Instead:** Security review → fixes → tests → inline docs → external docs. In that order.

---

## New vs Modified for v2.1

This milestone adds documentation and targeted fixes — no new routes or architectural components.

| Work Item | Type | Scope | Notes |
|-----------|------|-------|-------|
| RLS policy audit | Analysis + possible SQL | `supabase/migrations/` | New migrations only if policies need correction |
| Server Action auth review | Analysis + possible code fixes | `src/actions/`, `src/lib/resolveAuth.ts` | Surgical edits to role checks — not rewrites |
| Webhook security review | Analysis + possible code fixes | `src/app/api/webhooks/stripe/` | Idempotency, error handling |
| GST utility deduplication | Small code fix | `src/app/api/webhooks/stripe/route.ts` | Import `gstFromInclusiveCents`, one line |
| Rate limit investigation | Analysis + possible migration | `src/lib/signupRateLimit.ts` | Determine in-memory vs DB; migrate if needed |
| Inline documentation | Docs only | Various `src/lib/`, `src/actions/` files | JSDoc + step comments. No behavior change. |
| `docs/` directory | New content | Repo root `docs/` | No impact on application code |
| `README.md` | New content | Repo root | No impact on application code |
| Deployment runbook | New content | `docs/deployment.md` | Written last, after security config finalized |
| Test coverage gaps | New test files | `src/**/__tests__/` | New files only; production code unchanged unless a test reveals a bug |

### Build Order (Risk-Driven)

1. Security audit (RLS + auth + webhooks) — fixes first, docs after correct code
2. Financial logic review — completeSale, partialRefund, GST edge cases
3. Code quality fixes — GST dedup, rate limit, error handling
4. Test coverage — lock in correct behavior after fixes
5. Inline documentation — document the now-correct code
6. Developer documentation (`docs/`) — setup guide, architecture overview
7. User-facing documentation — merchant guide, admin manual
8. Deployment runbook — last, after production security configuration is finalized

---

## Sources

- Direct codebase inspection (HIGH confidence):
  - `src/middleware.ts` (221 LOC)
  - `src/lib/resolveAuth.ts`, `src/lib/requireFeature.ts`, `src/lib/tenantCache.ts`, `src/lib/gst.ts`
  - `supabase/migrations/002_rls_policies.sql`, `003_auth_hook.sql`, `009_security_fixes.sql`, `015_rls_policy_rewrite.sql`
  - `src/actions/auth/ownerSignup.ts`, `src/actions/orders/completeSale.ts`
  - `src/actions/super-admin/suspendTenant.ts`
  - `src/app/api/webhooks/stripe/route.ts`, `src/app/api/webhooks/stripe/billing/route.ts`
  - `src/lib/xero/vault.ts`

---

*Architecture research for: NZPOS v2.1 Hardening & Documentation*
*Researched: 2026-04-04*
