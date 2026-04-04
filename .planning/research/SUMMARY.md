# Project Research Summary

**Project:** NZPOS v4.0 — Admin Platform
**Domain:** SaaS POS admin platform — staff RBAC, customer management, enhanced dashboard analytics, super-admin billing visibility and merchant impersonation
**Researched:** 2026-04-05
**Confidence:** HIGH

## Executive Summary

NZPOS v4.0 is an incremental expansion of an already-shipped multi-tenant SaaS POS system. The stack (Next.js 16 App Router, Supabase, Stripe, Tailwind CSS v4) is confirmed correct and requires no changes. The codebase has established patterns for auth, feature gating, tenant resolution, super-admin actions, and audit logging — v4.0 work is almost entirely additive, extending existing patterns rather than introducing new ones. Most features are low-to-medium complexity because the underlying data (staff, customers, promos, orders, store settings, Stripe subscriptions) already exists in the database.

The recommended approach is to sequence work by dependency order: schema migrations first, then CRUD UI, then analytics and advanced features. Three migration-dependent chains must be unblocked in the first phase — the manager role CHECK constraint expansion, the `stores` table receipt columns, and the shared role constants refactor. The significant complexity risks are concentrated in two features: merchant impersonation (session isolation and audit trail) and Stripe analytics (rate limiting and MRR normalisation). Both have clear solutions documented in the architecture research, but both require getting the architecture right before writing any application code.

The primary risk is security: stale JWT roles acting on wrong permissions, impersonation sessions overwriting the super-admin's own session, and cross-tenant customer data exposure via the Supabase admin client. None of these are novel problems — all have well-established mitigations. The codebase's existing patterns (RLS-enforced server client, `requireFeature()` DB verification, `super_admin_actions` audit trail) provide the right model; v4.0 work must extend those patterns consistently rather than short-circuit them.

## Key Findings

### Recommended Stack

The existing stack is validated and unchanged for v4.0. The only new runtime dependency is `recharts@2.x` for the admin dashboard chart. No ORM, no new auth library, no new BaaS. All features are built on existing packages.

**Core technologies:**
- Next.js 16.2 App Router + React 19: full-stack framework — Server Components for data fetching, Server Actions for mutations, Tailwind v4 CSS-native config
- Supabase (supabase-js ^2.x + @supabase/ssr): Postgres + RLS + Auth — RLS with custom JWT claims enforces multi-tenant isolation; server client for merchant routes, admin client for super-admin routes only
- jose ^5.x: JWT signing for staff PIN sessions and new impersonation tokens — Edge Runtime compatible, already in use; extend to `sa_impersonation` cookie for impersonation
- Stripe node ^17.x: billing API — list subscriptions/invoices for super-admin billing views; normalize all amounts to monthly for MRR calculation
- recharts 2.x (new dependency): `'use client'` chart rendering — server fetches aggregated data, client renders; React 19 compatible as of v2.13+
- Zod ^3.x: Server Action input validation — every mutation validates before DB access; `z.enum(POS_ROLES)` derived from shared constants
- Vitest + Playwright: unit tests for MRR normalisation and role logic, E2E for role-gated action bypass attempts

### Expected Features

**Must have (v4.0 core — table stakes):**
- Staff management UI — add, edit, deactivate, PIN reset (staff table exists; UI-only addition)
- Manager role migration — expand CHECK constraint + permission gates on void/refund/discount Server Actions
- Promo edit and soft delete — create-only today; edit+delete expected by any merchant
- Store settings expansion — address, phone, IRD/GST number, receipt header/footer (most data columns already exist)
- Customer list with search — paginated, store-scoped; `customers` table already exists from v2.0
- Customer order history view — join on `auth_user_id`; no new schema
- Customer account disable — flip `is_active` via service role
- Admin dashboard: 7/30-day sales trend chart and period comparison metrics
- Admin dashboard: recent orders widget
- Super-admin: per-tenant billing visibility (subscriptions, invoices, payment failures)
- Super-admin: platform overview metrics (total tenants, active add-ons, new signups chart)

**Should have (v4.1 — add after core is complete):**
- Super-admin MRR/churn analytics — high complexity Stripe aggregation; validate need before building
- Merchant impersonation — significant security surface; highest value for support operations
- Store hours display on storefront

**Defer (v5+):**
- Loyalty program integration (explicitly out of scope in PROJECT.md)
- Customer email broadcast / CRM campaigns
- Granular per-permission RBAC beyond three fixed tiers

### Architecture Approach

v4.0 follows every established architectural pattern in the codebase. Auth is dual-path (Supabase Auth for owners/super-admins, jose JWT for staff PIN). Feature gating uses `requireFeature()` with JWT fast-path and DB fallback on mutations. Tenant resolution is middleware-injected `x-store-id` header. Impersonation uses a shadow `sa_impersonation` jose JWT cookie — not `supabase.auth.signInAsUser()` — to preserve the super-admin's own Supabase session. Stripe analytics data is materialised into a local snapshot table via a sync job; the analytics page reads from Supabase, not the live Stripe API. Role strings are centralised in `src/config/roles.ts` and imported by middleware, JWT issuance, and Zod schemas to prevent the "manager added to DB but not middleware" failure mode.

**Major components:**
1. Staff RBAC layer — `requireRole()` utility + `resolveStaffAuthVerified()` DB-verified check in all role-gated Server Actions; shared `POS_ROLES` constant; new admin routes `/admin/staff/**`
2. Admin dashboard charts — `SalesTrendChart` (Client Component, recharts) + `MetricsComparisonRow` (Server Component); server aggregates orders, serializes to client
3. Store settings expansion — two new columns (`receipt_header`, `receipt_footer`), new form components following `BrandingForm.tsx` pattern; `address`/`phone`/`gst_number` already exist
4. Customer management — new `/admin/customers/**` routes; standard server client enforces RLS isolation; paginated list + detail with order history
5. Super-admin billing panel — `TenantBillingPanel` added to existing tenant detail page; reads Stripe subscriptions/invoices by `stripe_customer_id`
6. Super-admin analytics — new `/super-admin/analytics` page with `platform_analytics_snapshots` Supabase table; daily Stripe sync job; 5-minute page-level revalidation
7. Merchant impersonation — shadow `sa_impersonation` jose cookie; middleware branch injects `x-store-id` for impersonated store; `ImpersonationBanner` in admin layout; audit trail for all mutations during session

### Critical Pitfalls

1. **Stale role in staff JWT after role change** — JWT embeds role, valid for 8 hours. After demotion, staff can act under the old role until re-login. Fix: `resolveStaffAuthVerified()` does a DB role lookup for all role-gated mutations; never trust JWT role for write actions. On role change, force re-login by setting `pin_locked_until` to now.

2. **Impersonation overwrites super-admin Supabase session** — `supabase.auth.signInAsUser()` replaces the session cookie, logging out the super-admin on impersonation end. Fix: shadow `sa_impersonation` jose cookie independent of Supabase session cookies; `endImpersonation` deletes only the jose cookie, original session untouched.

3. **Manager role breaks existing middleware POS gate** — middleware currently allows only `role='owner' || 'staff'`; adding `manager` to the DB without updating the middleware allowlist locks managers out of POS. Fix: centralise role enum in `src/config/roles.ts`, import in `middleware.ts`, `staffPin.ts`, and `staff.ts` Zod schema.

4. **Stripe analytics rate limiting** — super-admin analytics via live Stripe API on page load can trigger 30–50+ API calls when paginating subscriptions across tenants, hitting Stripe's 100 req/s limit. Fix: materialise to `platform_analytics_snapshots` in Supabase; page reads from DB with 5-minute revalidation; on-demand "Refresh now" rate-limited to once per 5 minutes.

5. **Cross-tenant customer data leak** — using Supabase admin client (service role) for merchant-facing customer list bypasses RLS and returns all tenants' customers. This is a Privacy Act 2020 breach. Fix: always use standard server client for merchant admin routes; admin client only in super-admin routes with explicit `store_id` filter.

6. **MRR miscalculation for annual plans** — summing `plan.amount` without normalising interval overstates annual plans by 12x. Fix: divide annual plan amounts by 12 in the Stripe sync job; add a unit test asserting a $120/year plan contributes $10/month to MRR.

## Implications for Roadmap

Based on research, the natural phase structure follows dependency chains: unblock schemas and shared constants first, then add CRUD UI, then analytics, then high-security features last.

### Phase 1: Schema and Staff RBAC Foundation
**Rationale:** Two features block everything else. The manager role CHECK constraint must exist before any role-gated UI can be built. The shared `POS_ROLES` constant refactor must be the very first commit — otherwise Pitfall 4 (middleware gate breakage) is guaranteed when manager is added. The `receipt_header`/`receipt_footer` columns must exist before the settings form can save.
**Delivers:** `manager` role in DB, updated middleware and JWT issuance, `requireRole()` utility, `resolveStaffAuthVerified()` DB-verified role check, staff management UI (list, add, edit, deactivate, PIN reset), `receipt_header`/`receipt_footer` migration
**Features:** Staff management UI, manager role migration + permission gates, store settings (receipt columns)
**Avoids:** Pitfall 1 (stale role in mutations), Pitfall 4 (middleware gate broken), Pitfall 7 (Server Action bypass)

### Phase 2: Admin Operational UI
**Rationale:** Low complexity, high merchant value, no security risk. Customer management and promo edit/delete follow established patterns with no new schema. Admin dashboard charts require only one new dependency (recharts) and an aggregation query on existing `orders` data. All work is additive to existing pages.
**Delivers:** Customer list + search + order history + account disable; promo edit and soft delete; admin dashboard sales chart + period comparison + recent orders widget; store settings form for address/phone/IRD number/receipt text
**Features:** All remaining P1 admin features
**Avoids:** Pitfall 8 (cross-tenant customer data — enforce server client + RLS in acceptance criteria for customer list)

### Phase 3: Super-Admin Billing Visibility
**Rationale:** Read-only Stripe integration with no new schema. `stripe_customer_id` already on `stores`. Pattern already exists in `admin/billing/page.tsx`. This is isolated enough to build without touching impersonation or analytics infrastructure.
**Delivers:** Per-tenant subscription/invoice/payment-failure view in existing tenant detail page; platform overview metrics (tenant count, signup trend, active add-ons count)
**Features:** Super-admin billing visibility, platform overview metrics
**Avoids:** Pitfall 5 by keeping this phase read-only per-tenant (no aggregation pagination loops yet)

### Phase 4: Super-Admin Analytics (MRR, Churn, Add-on Revenue)
**Rationale:** Requires materialised snapshot architecture before any code is written — this cannot be retrofitted. Phase 3 establishes the Stripe API call patterns; Phase 4 adds the sync job and the analytics page that reads from local DB.
**Delivers:** `platform_analytics_snapshots` table, daily Stripe sync job (Vercel Cron or pg_cron), super-admin analytics page with MRR/churn/add-on revenue breakdown, payment failures list, platform growth chart
**Features:** Super-admin MRR/churn analytics (v4.1)
**Avoids:** Pitfall 5 (rate limiting via snapshot architecture), Pitfall 6 (MRR normalisation for annual plans — unit test required)

### Phase 5: Merchant Impersonation
**Rationale:** Highest security surface in v4.0. Must be designed in isolation, with session isolation (Pitfall 2) and audit trail completeness (Pitfall 3) as explicit acceptance criteria. Building last ensures all other admin features are stable and that the impersonation context (injecting `x-store-id`) is tested against a mature admin surface.
**Delivers:** Shadow `sa_impersonation` jose cookie, middleware branch for impersonation routing, `ImpersonationBanner` persistent in admin layout, `startImpersonation`/`endImpersonation` Server Actions with audit rows, `resolveImpersonationContext()` helper enforcing audit logging on mutations during impersonation
**Features:** Merchant impersonation (v4.1)
**Avoids:** Pitfall 2 (session overwrite — never use `supabase.auth.signInAsUser()`), Pitfall 3 (missing audit trail for mutations during impersonation)

### Phase Ordering Rationale

- Phase 1 must come first: role enum and DB constraint are hard prerequisites for all role-gated code throughout v4.0
- Phases 2 and 3 can largely run in parallel — they share no dependencies; sequence them by priority
- Phase 4 references Phase 3's Stripe API patterns but has no hard dependency; can follow Phase 3 or run overlapping
- Phase 5 is deliberately last — impersonation touching a half-built admin creates unpredictable audit noise and an untestable security surface

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 4 (Super-admin analytics):** Vercel Cron availability on free tier vs Supabase pg_cron; `platform_analytics_snapshots` schema finalisation for MRR/churn queries; webhook event handling for incremental updates between daily syncs
- **Phase 5 (Impersonation):** Security review of middleware branch; CSRF protection for `startImpersonation`; final policy decision on impersonation write-mode (read-only vs audited writes)

Phases with standard patterns (skip research-phase):
- **Phase 1 (Staff RBAC):** Schema migration + CRUD UI; all patterns already exist in codebase
- **Phase 2 (Admin operational UI):** Follows existing `admin/orders` and `admin/promos` patterns exactly; recharts integration is well-documented
- **Phase 3 (Super-admin billing):** Stripe list API documented in research; pattern already exists in `admin/billing/page.tsx`

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Verified against live Next.js 16.2.1 docs; all packages confirmed current; recharts v2.13+ React 19 compatibility confirmed |
| Features | HIGH | Existing schema verified in codebase migrations 001–026; competitor patterns (Square, Lightspeed) confirmed via WebSearch |
| Architecture | HIGH | Direct codebase analysis of middleware, resolveAuth, staffPin, existing admin patterns; decisions validated against official Supabase and Next.js docs |
| Pitfalls | HIGH | Critical pitfalls confirmed against existing codebase files (`middleware.ts` lines 204–208, `staffPin.ts`, `resolveAuth.ts`); Stripe rate limits from official docs |

**Overall confidence:** HIGH

### Gaps to Address

- **Vercel Cron on free tier:** Phase 4 needs a Stripe sync job scheduler. Vercel Cron supports 1 job on free tier (last confirmed 2025) — verify before committing. Alternative: Supabase pg_cron (available on free tier via extensions).
- **Manager admin read-only access:** Architecture recommends deferring manager `/admin` route access to a later task (Option A). If product decides managers need read-only admin access before v4.0 ships, middleware must be extended in Phase 1. Flag for product confirmation before Phase 1 planning begins.
- **Impersonation write mode policy:** Research recommends read-only impersonation with explicit super-admin Server Actions for writes. Final policy needed before Phase 5 spec.
- **`receipt_header`/`receipt_footer` columns confirmed absent:** Architecture research confirmed these two columns do not yet exist. All other settings columns (`address`, `phone`, `gst_number`, `opening_hours`) are present from migrations 010/011. The gap is two SQL columns — trivial to add.

## Sources

### Primary (HIGH confidence)
- Next.js 16.2.1 official docs (confirmed 2026-03-25) — Server Components, Server Actions, middleware, testing (Vitest, Playwright)
- Supabase custom claims and RBAC docs — JWT claims pattern, RLS policy structure
- Stripe API docs — subscriptions list, invoices list, rate limits (100 req/s), pagination
- Existing codebase: `src/middleware.ts`, `src/actions/auth/staffPin.ts`, `src/lib/resolveAuth.ts`, `src/schemas/staff.ts`, `supabase/migrations/001–026`

### Secondary (MEDIUM confidence)
- Stripe MRR calculation accuracy analysis (getlago.com) — confirmed interval normalisation requirement and common mistakes
- WorkOS multi-tenant RBAC design — three-tier role model validation against industry norms
- OWASP Session Management Cheat Sheet — impersonation session isolation pattern
- Supabase user impersonation pattern (jjacky.substack.com) — shadow cookie approach confirmation
- Stripe SaaS analytics patterns (stripe.com/resources) — pull-on-demand vs webhook-sourced MRR trade-offs

### Tertiary (LOW confidence)
- Supabase free tier limits (from training data; pricing page not confirmed) — 500MB DB, 1GB storage, 50K MAU; assumed sufficient for v1
- Vercel Cron free tier (1 job) — assumed available; verify before Phase 4 planning

---
*Research completed: 2026-04-05*
*Ready for roadmap: yes*
