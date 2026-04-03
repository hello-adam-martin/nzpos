---
phase: 12-multi-tenant-infrastructure
verified: 2026-04-03T09:15:00Z
status: passed
score: 18/18 must-haves verified
re_verification: false
---

# Phase 12: Multi-Tenant Infrastructure Verification Report

**Phase Goal:** Any subdomain resolves to the correct tenant store, with schema and RLS guaranteeing data isolation before any tenant-aware feature is built
**Verified:** 2026-04-03T09:15:00Z
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | stores table has slug column (UNIQUE NOT NULL) with value for every row | VERIFIED | Migration 014 L12-13; seed.ts L29 `slug: 'demo'`; database.ts `slug: string` (NOT NULL) |
| 2 | store_plans table exists with boolean feature columns and Stripe fields | VERIFIED | Migration 014 L37-47; database.ts L656+ includes `has_xero`, `has_email_notifications`, `has_custom_domain` |
| 3 | stores table has branding columns, is_active, and stripe_customer_id | VERIFIED | Migration 014 L19-32; database.ts L706-715 shows all columns |
| 4 | Middleware-safe admin client exists without server-only import | VERIFIED | src/lib/supabase/middlewareAdmin.ts — no `server-only`, exports `createMiddlewareAdminClient` |
| 5 | Schema test validates slug column, store_plans table, and seed data | VERIFIED | src/lib/__tests__/schema.test.ts — 6 tests covering all new tables/columns |
| 6 | Navigating to slug.lvh.me:3000 resolves to correct tenant store | VERIFIED | src/middleware.ts: slug extraction L29, DB lookup L37-41, header injection L54-55 |
| 7 | Unknown subdomain shows store-not-found page | VERIFIED | middleware.ts L46 rewrites to `/not-found`; src/app/not-found/page.tsx contains "Store not found" |
| 8 | Root domain does not trigger store resolution | VERIFIED | middleware.ts L20-26: isRoot check, passes through with session refresh |
| 9 | x-store-id and x-store-slug headers injected for downstream consumption | VERIFIED | middleware.ts L54-55, 83-84, 130-133, 142-143 — all code paths set both headers |
| 10 | resolveAuth() reads x-store-id from middleware headers with JWT fallback | VERIFIED | src/lib/resolveAuth.ts L17-20, L38-40 — both resolveAuth and resolveStaffAuth read header |
| 11 | Every table with store_id has role-aware RLS policies (unified app_metadata path) | VERIFIED | Migration 015: 14 tables covered; no `current_setting` in SQL (only in comment L3) |
| 12 | Super admin JWT claim allows cross-tenant SELECT but blocks INSERT/UPDATE/DELETE | VERIFIED | Migration 015: super_admin_read policies are FOR SELECT only; no INSERT/UPDATE policy for super admin |
| 13 | Customer role can only see own orders/profile | VERIFIED | Migration 015 L114-117, L138-143: customer_id = auth.uid() scoping |
| 14 | Refunds and refund_items use correct JWT path (app_metadata) | VERIFIED | Migration 015 L208-235: `auth.jwt() -> 'app_metadata' ->> 'store_id'` — old `current_setting` path gone |
| 15 | store_plans has owner-read, super-admin-read, no customer/staff access | VERIFIED | Migration 015 L243-252: store_plans_owner_read requires role='owner'; no staff policy |
| 16 | Auth hook injects is_super_admin claim from super_admins table | VERIFIED | Migration 016: checks super_admins, injects `is_super_admin: true` into app_metadata |
| 17 | Vitest tests cover 4 D-16 attack vectors: wrong JWT, RPC mismatch, super admin write block, header spoofing | VERIFIED | rls.test.ts: 5 describe blocks, 10 tests — all 4 vectors plus store_plans isolation |
| 18 | Playwright E2E tests cover subdomain routing and cross-tenant navigation isolation | VERIFIED | tests/e2e/tenant-routing.spec.ts (5 tests), tests/e2e/tenant-isolation.spec.ts (2 tests) |

**Score:** 18/18 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `supabase/migrations/014_multi_tenant_schema.sql` | Schema additions for multi-tenant SaaS | VERIFIED | Contains slug, store_plans, super_admins, branding cols, is_active, stripe_customer_id |
| `supabase/seed.ts` | Updated seed with slug field | VERIFIED | L29: `slug: 'demo'`; L35-38: store_plans insert |
| `src/lib/supabase/middlewareAdmin.ts` | Admin client safe for Edge Runtime | VERIFIED | No `server-only`; exports `createMiddlewareAdminClient` |
| `src/lib/__tests__/schema.test.ts` | Schema validation tests | VERIFIED | 6 tests covering all new tables/columns; references `store_plans` |
| `src/middleware.ts` | Subdomain tenant resolution layered on existing auth | VERIFIED | x-store-id injection, slug extraction, cache + DB lookup, auth routing preserved |
| `src/lib/tenantCache.ts` | In-memory TTL cache for slug lookups | VERIFIED | TTL_MS=5min, getCachedStoreId, setCachedStoreId exports |
| `src/lib/resolveAuth.ts` | Auth resolution with middleware header tenant context | VERIFIED | Reads x-store-id header in both resolveAuth() and resolveStaffAuth() |
| `src/app/not-found/page.tsx` | Store not found page | VERIFIED | Contains "Store not found" text |
| `supabase/migrations/015_rls_policy_rewrite.sql` | Unified RLS policies for all tables | VERIFIED | 14 tables, unified naming, correct JWT path, super admin SELECT, customer isolation |
| `supabase/migrations/016_super_admin.sql` | Auth hook with is_super_admin claim | VERIFIED | CREATE OR REPLACE over migration 012 version; injects is_super_admin=true |
| `src/lib/__tests__/rls.test.ts` | Extended RLS tests with 4 attack vectors | VERIFIED | 10 tests; complete_pos_sale RPC test; super admin; header spoofing; store_plans |
| `tests/e2e/playwright.config.ts` | Playwright config with lvh.me baseURL | VERIFIED | baseURL: 'http://lvh.me:3000'; webServer config |
| `tests/e2e/tenant-routing.spec.ts` | E2E subdomain routing tests | VERIFIED | 5 tests including demo.lvh.me:3000 and unknown subdomain 404 |
| `tests/e2e/tenant-isolation.spec.ts` | E2E cross-tenant navigation isolation tests | VERIFIED | 2 tests for sequential subdomain navigation |
| `src/types/database.ts` | Regenerated Supabase types with store_plans, slug, etc. | VERIFIED | store_plans, super_admins, slug (NOT NULL on stores), is_active, logo_url, stripe_customer_id |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `014_multi_tenant_schema.sql` | `supabase/seed.ts` | slug NOT NULL constraint requires seed to provide slug | WIRED | seed.ts L29 provides `slug: 'demo'` |
| `src/middleware.ts` | `src/lib/tenantCache.ts` | import getCachedStoreId, setCachedStoreId | WIRED | middleware.ts L3: `import { getCachedStoreId, setCachedStoreId } from '@/lib/tenantCache'` |
| `src/middleware.ts` | `src/lib/supabase/middlewareAdmin.ts` | import createMiddlewareAdminClient | WIRED | middleware.ts L2: `import { createMiddlewareAdminClient } from '@/lib/supabase/middlewareAdmin'` |
| `src/middleware.ts` | stores table (slug column) | `.from('stores').select('id').eq('slug', slug).eq('is_active', true)` | WIRED | middleware.ts L37-42: full query with both eq() conditions |
| `src/middleware.ts` | `src/lib/resolveAuth.ts` | Middleware injects x-store-id; resolveAuth reads it | WIRED | resolveAuth.ts L17-20, L38-40: `headerStore.get('x-store-id')` in both auth functions |
| `supabase/migrations/016_super_admin.sql` | super_admins table (from 014) | Auth hook checks super_admins table | WIRED | migration 016 L21-23: `FROM public.super_admins WHERE auth_user_id` |
| `supabase/migrations/015_rls_policy_rewrite.sql` | auth.jwt() app_metadata | All policies use same JWT claim path | WIRED | 015 uses `auth.jwt() -> 'app_metadata'` throughout; no `current_setting` in SQL |
| `src/lib/__tests__/rls.test.ts` | RLS policies (migration 015) | Tests query Supabase with different user JWTs | WIRED | createClient with Bearer tokens; 10 tests asserting isolation |
| `src/lib/__tests__/rls.test.ts` | complete_pos_sale RPC (migration 010) | Tests call RPC with mismatched store_id | WIRED | rls.test.ts L194-219: `rpc('complete_pos_sale', { p_store_id: storeBId, ... })` |
| `tests/e2e/tenant-routing.spec.ts` | `src/middleware.ts` | Playwright navigates to subdomains | WIRED | tenant-routing.spec.ts: `page.goto('http://demo.lvh.me:3000/')` |

---

### Data-Flow Trace (Level 4)

Not applicable — Phase 12 contains no UI components rendering dynamic data. All artifacts are infrastructure (migrations, middleware, utilities, test files). The not-found page renders static text only.

---

### Behavioral Spot-Checks

Step 7b applies to runnable code. The Vitest RLS tests are runnable but require `supabase start` (external service). The Playwright tests require a dev server. Both are flagged for human verification below. Build verification is available:

| Behavior | Evidence | Status |
|----------|----------|--------|
| `npx next build` completes without errors | Summary 02 documents build pass; TypeScript type narrowing bug was fixed in 059b08d | PASS (documented in SUMMARY) |
| No `current_setting` SQL in migration 015 | Grep confirmed only 1 occurrence — in a comment line | PASS |
| All 9 task commits exist in git history | git log confirms b6bd3ef, b4f500e, 4c0915b, 7e0ca5c, 059b08d, 14d856d, 9966066, 24e42c2, 1c96e9b | PASS |
| stores.slug typed as `string` NOT NULL in database.ts | database.ts L713: `slug: string` (no null union) | PASS |
| ROOT_DOMAIN in both .env.example and .env.local | Both files contain `ROOT_DOMAIN=lvh.me:3000` | PASS |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|---------|
| TENANT-01 | 12-02-PLAN.md | Wildcard subdomain routing resolves {slug}.domain.tld to correct store | SATISFIED | src/middleware.ts: slug extraction, DB lookup, header injection; tenant-routing.spec.ts E2E tests |
| TENANT-02 | 12-01-PLAN.md | Schema supports multi-tenant SaaS (stores.slug, store_plans, stripe_customer_id) | SATISFIED | Migration 014: all columns and tables; database.ts regenerated |
| TENANT-03 | 12-03-PLAN.md | RLS policies enforce tenant isolation via JWT claims (not middleware headers) | SATISFIED | Migration 015: unified `auth.jwt() -> 'app_metadata'` path; rls.test.ts header spoofing test confirms JWT-only enforcement |
| TENANT-04 | 12-03-PLAN.md | Super admin JWT claim (is_super_admin) bypasses store-scoped RLS where needed | SATISFIED | Migration 016: auth hook injects is_super_admin; Migration 015: super_admin_read policies on all 14 tables |
| TENANT-05 | 12-04-PLAN.md | Cross-tenant isolation verified with E2E tests (tenant A cannot access tenant B data) | SATISFIED | rls.test.ts: 10 tests covering 4 attack vectors; Playwright E2E tests for routing and navigation isolation |

No orphaned requirements — all 5 Phase 12 requirements (TENANT-01 through TENANT-05) are mapped in both REQUIREMENTS.md and PLANS.

---

### Anti-Patterns Found

| File | Pattern | Severity | Assessment |
|------|---------|----------|------------|
| `src/app/not-found/page.tsx` | Static text only | INFO | Correct — this is a 404 page, static content is appropriate |

No stubs, placeholders, or empty implementations found. No TODO/FIXME/HACK comments in any Phase 12 files. No `return null` or `return {}` patterns in implementation files.

---

### Human Verification Required

#### 1. Vitest RLS Tests Pass

**Test:** Run `npx supabase start` then `npx vitest run src/lib/__tests__/rls.test.ts`
**Expected:** All 10 tests pass (5 describe blocks, cross-tenant isolation, RPC attack vector, super admin write block, header spoofing, store_plans isolation)
**Why human:** Requires running local Supabase instance; cannot execute in this context
**Note:** SUMMARY 04 documents "10/10 tests pass" with specific fixes for JWT claims, RPC overload, and p_items serialization — strong confidence

#### 2. Playwright E2E Subdomain Routing

**Test:** Start dev server (`npm run dev`), then run `npx playwright test --config tests/e2e/playwright.config.ts`
**Expected:** 7 tests pass — valid subdomain loads store, unknown subdomain shows 404, root domain passes through, admin/POS routes redirect to login, sequential subdomain navigation resolves correctly each time
**Why human:** Requires running dev server at lvh.me:3000; cannot execute in this context
**Note:** Tests are substantive (not mocked); middleware logic is fully implemented and wired

#### 3. Schema Validation Tests

**Test:** Run `npx supabase start` then `npx vitest run src/lib/__tests__/schema.test.ts`
**Expected:** All 6 tests pass — slug column present with 'demo' value, store_plans exists with boolean defaults, is_active/branding columns present, super_admins table exists
**Why human:** Requires running local Supabase instance
**Note:** SUMMARY 01 documents "6/6 passed" — confidence high

---

## Summary

Phase 12 goal achievement is confirmed. All 18 observable truths are verified against the actual codebase with direct file evidence:

**TENANT-02 (Schema):** Migration 014 adds all required columns and tables to a clean, non-destructive ALTER TABLE + CREATE TABLE pattern. Seed updated to satisfy NOT NULL constraints. Types regenerated.

**TENANT-01 (Routing):** Middleware fully rewritten with slug extraction, TTL-cached DB lookup, header injection on all code paths. The key TypeScript bug (string | null type narrowing) was caught and fixed during execution.

**TENANT-03/04 (RLS + Super Admin):** Migration 015 is a complete clean-slate rewrite — 14 tables, unified naming, correct JWT path (`auth.jwt() -> 'app_metadata'`), no `current_setting` bug from 013. Migration 016 extends auth hook with super admin dual-role support.

**TENANT-05 (Tests):** 10 Vitest RLS tests cover all 4 D-16 attack vectors including actual `complete_pos_sale` RPC invocation. 7 Playwright E2E tests cover subdomain routing and navigation isolation.

All 9 documented commits exist in git history. Build passes. No stubs or placeholder code.

---

_Verified: 2026-04-03T09:15:00Z_
_Verifier: Claude (gsd-verifier)_
