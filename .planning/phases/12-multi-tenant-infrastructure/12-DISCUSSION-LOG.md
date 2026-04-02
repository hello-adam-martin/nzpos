# Phase 12: Multi-Tenant Infrastructure - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-03
**Phase:** 12-multi-tenant-infrastructure
**Areas discussed:** Subdomain routing strategy, Schema migration approach, RLS & super admin policy, E2E isolation testing

---

## Subdomain Routing Strategy

### Routing Approach

| Option | Description | Selected |
|--------|-------------|----------|
| Middleware-based | Next.js middleware reads hostname, extracts slug, looks up store_id, injects into headers | ✓ |
| Vercel rewrites + middleware | vercel.json rewrites map wildcard subdomains to path prefix, middleware resolves from path | |

**User's choice:** Middleware-based
**Notes:** Recommended approach — all existing routes work unchanged.

### Unknown Subdomain Handling

| Option | Description | Selected |
|--------|-------------|----------|
| 404 page | Simple "Store not found" page | ✓ |
| Redirect to marketing site | Send unknown subdomains to landing page for signup conversion | |

**User's choice:** 404 page
**Notes:** Clean and honest.

### Production Domain

| Option | Description | Selected |
|--------|-------------|----------|
| nzpos.co.nz | NZ-specific TLD | |
| nzpos.com | Global TLD | |
| You decide | Claude picks what's available and sensible | ✓ |

**User's choice:** You decide
**Notes:** Claude has discretion on domain selection.

### Local Dev Subdomains

| Option | Description | Selected |
|--------|-------------|----------|
| Query param fallback | localhost:3000?store=slug, zero DNS config | |
| lvh.me wildcard | slug.lvh.me:3000 resolves to 127.0.0.1 | ✓ |

**User's choice:** lvh.me wildcard
**Notes:** More realistic dev experience preferred over zero-config convenience.

### Slug-to-Store Caching

| Option | Description | Selected |
|--------|-------------|----------|
| In-memory Map with TTL | Module-level Map, ~5 min TTL, no external dependency | ✓ |
| No cache | Hit Supabase every request | |
| Vercel Edge Config | Near-zero latency reads, requires sync on store creation | |

**User's choice:** In-memory Map with TTL
**Notes:** Simple, slug mappings rarely change.

### Route Split (Storefront vs Admin/POS)

| Option | Description | Selected |
|--------|-------------|----------|
| Subdomain = all routes | {slug}.domain.tld serves storefront, /admin, and /pos on same subdomain | ✓ |
| Separate admin subdomain | admin.{slug}.domain.tld for admin — doubles DNS complexity | |

**User's choice:** Subdomain = storefront + admin + POS via path routing
**Notes:** Recommended — simpler DNS.

### Root Domain

| Option | Description | Selected |
|--------|-------------|----------|
| Marketing site | domain.tld and www serve landing page | ✓ |
| Redirect to www | Root redirects to www | |

**User's choice:** Marketing site on root
**Notes:** No store content on root domain.

---

## Schema Migration Approach

### Existing Seed Store Handling

| Option | Description | Selected |
|--------|-------------|----------|
| Add slug to existing store | ALTER TABLE, UPDATE existing store with default slug | ✓ |
| Recreate store with slug | Drop and recreate — breaks existing dev references | |

**User's choice:** Add slug to existing store
**Notes:** Existing data stays intact.

### Store Plans Table Structure

| Option | Description | Selected |
|--------|-------------|----------|
| Boolean columns | has_xero, has_email_notifications, has_custom_domain + Stripe IDs | ✓ |
| Feature rows | One row per feature per store — more flexible, more complex | |

**User's choice:** Boolean columns
**Notes:** Already decided in STATE.md. Simple, always available offline from Stripe.

### Additional Stores Columns

| Option | Description | Selected |
|--------|-------------|----------|
| Minimal | slug, stripe_customer_id, created_at, is_active only | |
| Include branding now | Also add logo_url, store_description, primary_color | ✓ |
| You decide | Claude determines based on Phase 12 requirements | |

**User's choice:** Include branding now
**Notes:** Pre-populates for Phase 14 wizard, avoids future migration.

---

## RLS & Super Admin Policy

### Super Admin Claim Setup

| Option | Description | Selected |
|--------|-------------|----------|
| Auth hook check | Auth hook checks super_admins table/flag, injects is_super_admin into JWT | ✓ |
| Manual Supabase metadata | Set is_super_admin directly in auth.users.app_metadata via dashboard | |

**User's choice:** Auth hook check
**Notes:** Same pattern as existing role injection.

### Cross-Tenant Access Model

| Option | Description | Selected |
|--------|-------------|----------|
| Read-all, write-own | Super admin can SELECT all tenants, write requires matching store_id | ✓ |
| Full cross-tenant access | Bypasses store_id check entirely | |
| You decide | Claude designs safest approach | |

**User's choice:** Read-all, write-own
**Notes:** Prevents accidental data corruption.

### RLS Policy Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Extend with OR clause | Add super_admin check to existing SELECT policies | |
| Replace all policies | Drop and recreate with unified pattern | ✓ |

**User's choice:** Replace all policies
**Notes:** Bigger migration but cleaner, more maintainable result. User chose this over the recommended "extend" approach.

---

## E2E Isolation Testing

### Testing Approach

| Option | Description | Selected |
|--------|-------------|----------|
| Vitest integration tests | Tests against local Supabase, extends existing rls.test.ts | |
| Playwright E2E tests | Browser-based subdomain routing assertions | |
| Both | Vitest for DB-level + Playwright for routing-level | ✓ |

**User's choice:** Both
**Notes:** Comprehensive coverage at both layers.

### Attack Vectors to Assert

| Option | Description | Selected |
|--------|-------------|----------|
| Direct API with wrong JWT | Tenant A JWT querying tenant B data | ✓ |
| RPC with wrong store_id | Mismatched store_id in RPC calls | ✓ |
| Super admin write attempt | Super admin INSERT/UPDATE on tenant data | ✓ |
| Subdomain spoofing | Tenant A cookie on tenant B subdomain | ✓ |

**User's choice:** All four vectors
**Notes:** Comprehensive security posture before any multi-tenant features go live.

---

## Claude's Discretion

- Production domain selection
- Migration numbering and ordering
- In-memory cache TTL exact value
- Super admin table design (dedicated table vs flag)
- 404 page content for unknown subdomains
- Vitest test fixture setup
- Playwright subdomain test configuration

## Deferred Ideas

None — discussion stayed within phase scope.
