# Phase 12: Multi-Tenant Infrastructure - Context

**Gathered:** 2026-04-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Wildcard subdomain routing, schema upgrades (stores.slug, store_plans, branding columns), unified RLS policies with super admin cross-tenant read access, and E2E isolation test suite. This phase makes the system ready for multiple independent stores before any tenant-aware feature (signup, billing, super admin UI) is built. No UI work — pure infrastructure.

</domain>

<decisions>
## Implementation Decisions

### Subdomain Routing
- **D-01:** Middleware-based routing. Next.js middleware reads hostname, extracts slug from `{slug}.domain.tld`, looks up `store_id` in DB, injects into request headers. All existing routes work unchanged.
- **D-02:** In-memory Map with TTL (~5 min) for slug-to-store_id lookup caching. No external cache dependency. Slug mappings rarely change.
- **D-03:** Unknown subdomains show a 404 "Store not found" page. No redirect to marketing site.
- **D-04:** Subdomain serves storefront, admin (/admin), and POS (/pos) on the same subdomain via path-based routing. No separate admin subdomain.
- **D-05:** Root domain (domain.tld) and www serve the marketing/landing page. No store content on root.
- **D-06:** Local dev uses `lvh.me` wildcard — `slug.lvh.me:3000` resolves to 127.0.0.1 automatically. More realistic than query params.

### Schema Migration
- **D-07:** Add `slug` column to existing `stores` table (UNIQUE, NOT NULL). Existing seed store gets a default slug (e.g. 'demo' or founder's store name). Existing data stays intact.
- **D-08:** `store_plans` table with boolean columns: `has_xero`, `has_email_notifications`, `has_custom_domain`, plus `stripe_customer_id`, `stripe_subscription_id`. One row per store. Simple, always available offline from Stripe. (Confirmed from STATE.md decision.)
- **D-09:** Include branding columns on `stores` now: `logo_url`, `store_description`, `primary_color`. Pre-populates schema for Phase 14 wizard, avoids a future migration.
- **D-10:** Also add `is_active` (boolean, default true) for tenant suspension and `created_at` timestamp.
- **D-11:** Add `stripe_customer_id` on `stores` table (per ROADMAP.md success criteria).

### RLS & Super Admin
- **D-12:** `is_super_admin` JWT claim set via auth hook. Auth hook checks a `super_admins` table (or flag). Same pattern as existing role injection into `app_metadata`.
- **D-13:** Super admin has read-all, write-own access. Can SELECT across all tenants but INSERT/UPDATE/DELETE still requires matching `store_id`. Prevents accidental data corruption.
- **D-14:** Full RLS policy rewrite — drop and recreate all policies with a unified pattern that handles owner, staff, customer, and super_admin roles cleanly. Bigger migration but cleaner, more maintainable result.

### E2E Isolation Testing
- **D-15:** Both test layers: Vitest integration tests for DB-level RLS assertions (fast, CI-friendly) + Playwright E2E tests for routing-level assertions (subdomain resolves correctly, middleware blocks).
- **D-16:** Four attack vectors asserted:
  - Direct API with wrong JWT (tenant A's JWT querying tenant B's data — must return empty/403)
  - RPC with wrong store_id (complete_pos_sale/complete_online_sale with mismatched store_id — must fail)
  - Super admin write attempt (super admin JWT attempting INSERT/UPDATE on tenant data — must be blocked)
  - Subdomain spoofing (visiting tenant B's subdomain with tenant A's session cookie — middleware must resolve to B's store)

### Claude's Discretion
- Production domain selection (Claude picks what's sensible for NZ SaaS)
- Migration numbering and ordering
- In-memory cache TTL exact value
- Super admin table design (dedicated table vs flag on staff)
- 404 page design/content for unknown subdomains
- Vitest test fixture setup for multi-tenant scenarios
- Playwright subdomain test configuration with lvh.me

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Database & Migrations
- `supabase/migrations/001_initial_schema.sql` — Core schema with stores table and store_id foreign keys on all tables
- `supabase/migrations/002_rls_policies.sql` — Current RLS policies (will be replaced in this phase)
- `supabase/migrations/003_auth_hook.sql` — Custom JWT claims hook (store_id, role injection) — must be extended for is_super_admin
- `supabase/migrations/006_online_store.sql` — Public read policies for storefront (must be preserved in rewrite)
- `supabase/migrations/012_customer_accounts.sql` — Extended auth hook for 3 roles, role-guarded RLS (latest policy versions)
- `supabase/migrations/013_partial_refunds.sql` — Refund tables with RLS (must be included in policy rewrite)

### Middleware & Auth
- `src/middleware.ts` — Current route protection logic. Must be rewritten for subdomain-based tenant resolution.
- `src/lib/resolveAuth.ts` — Server-side auth resolution (owner + staff + customer). Must inject resolved store_id from middleware.
- `src/lib/supabase/middleware.ts` — Supabase middleware client factory
- `src/lib/supabase/server.ts` — Server-side Supabase client
- `src/lib/supabase/admin.ts` — Admin client (service_role, bypasses RLS)

### Config
- `next.config.ts` — Image remote patterns, server external packages
- `vercel.json` — Cron jobs, deployment config

### Existing Tests
- `src/lib/__tests__/rls.test.ts` — Existing cross-tenant RLS test (2 stores, 2 owners). Extend this pattern.

### Types
- `src/types/database.ts` — Generated Supabase types. Must be regenerated after migration.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/__tests__/rls.test.ts` — Existing RLS isolation test with multi-store fixture. Extend for all 4 attack vectors.
- `src/lib/resolveAuth.ts` — Auth resolution pattern (owner → staff → customer fallback chain). Add tenant resolution from middleware headers.
- `supabase/migrations/003_auth_hook.sql` — Auth hook pattern for JWT claim injection. Extend for super_admin.
- `src/lib/supabase/admin.ts` — Admin client for service_role operations. Useful for slug lookup in middleware.

### Established Patterns
- **JWT app_metadata**: All auth decisions flow through `app_metadata.store_id` and `app_metadata.role` in JWT claims
- **RLS via JWT**: Every RLS policy uses `auth.jwt()->'app_metadata'->>'store_id'` — not middleware headers
- **SECURITY DEFINER RPCs**: Atomic operations (complete_pos_sale, complete_online_sale) bypass RLS via SECURITY DEFINER functions
- **Three-tier auth**: Owner (Supabase Auth) → Staff (jose JWT cookie) → Customer (Supabase Auth with customer role)
- **Integer cents**: All monetary columns are INTEGER (price_cents, total_cents, etc.)

### Integration Points
- Middleware is the primary integration point — must resolve tenant from hostname AND enforce existing auth logic
- Auth hook must be extended (not replaced) to check super_admins table/flag
- All Server Actions use `resolveAuth()` — tenant context flows through this function
- Supabase generated types (`database.ts`) must be regenerated after schema changes

</code_context>

<specifics>
## Specific Ideas

- User chose lvh.me for local dev over query param fallback — wants realistic subdomain experience during development
- User chose full RLS policy rewrite over extending existing policies — values clean unified pattern over minimal diff
- User wants all four cross-tenant attack vectors tested — comprehensive security posture before any multi-tenant features go live
- Branding columns (logo_url, store_description, primary_color) added to stores table now to avoid migration churn in Phase 14

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 12-multi-tenant-infrastructure*
*Context gathered: 2026-04-03*
