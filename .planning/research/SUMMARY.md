# Project Research Summary

**Project:** NZPOS v2.0 — SaaS Platform Transformation
**Domain:** Multi-tenant SaaS POS platform (single-tenant NZ retail POS to multi-merchant SaaS)
**Researched:** 2026-04-03
**Confidence:** HIGH (core stack + architecture verified against official docs; features via live web research)

## Executive Summary

NZPOS is converting a working single-tenant NZ retail POS into a multi-tenant SaaS platform where any NZ small business can self-serve sign up, get a subdomain storefront, and optionally pay for add-ons (Xero, email notifications, custom domain). The existing v1 codebase has the right foundation: every table has `store_id`, RLS is enforced via JWT claims, and the `custom_access_token_hook` already injects tenant identity into every session. The v2.0 work is additive infrastructure — subdomain routing, tenant provisioning, Stripe subscriptions, feature gating, super admin, and a marketing page — layered on top of the existing POS that must keep working throughout.

The recommended approach is to build in strict dependency order: schema changes first, then middleware tenant resolution, then signup/provisioning, then billing/gating, then admin tooling. The most dangerous pitfalls are security-architectural: middleware must NEVER be the sole authority for tenant identity (JWT claims + RLS are the enforcement layers), and feature gates must be enforced server-side rather than UI-only. The single biggest UX risk is a broken or race-conditioned signup flow — if a merchant's first experience is an empty dashboard or a permissions error, they churn immediately. The entire provisioning sequence must be atomic (Postgres RPC) with explicit session refresh and provision-status verification before any dashboard redirect.

The competitive angle is strong: NZ-first defaults (GST 15%, NZD, EFTPOS), native Xero integration (not third-party), per-add-on billing instead of forced tier upgrades, and a 3-step skippable setup wizard targeting under-5-minute time-to-value. Square, Lightspeed/Vend, and Shopify all have weaknesses in the NZ market that NZPOS directly addresses. The tech stack needs no changes — Next.js 16 + Supabase + Stripe + Tailwind CSS is the right choice, with one new package (`@vercel/sdk`) for custom domain provisioning.

## Key Findings

### Recommended Stack

The existing stack is correct and validated. No framework or database changes are needed for v2.0. The only new dependency is `@vercel/sdk ^1.x` for programmatic Vercel domain provisioning (custom domain add-on). Everything else — subdomain routing, feature gating, Stripe subscriptions, super admin, marketing page — is implemented with existing libraries.

Critical version notes: Next.js is **16.2.1** (verify scaffold version); Tailwind is **v4.2** with CSS-first config (no `tailwind.config.js`); use `@supabase/ssr` not the deprecated `auth-helpers-nextjs`; Stripe node is `^17.x`.

**Core technologies:**
- **Next.js 16.2 + React 19:** Full-stack framework — App Router, Server Actions, Server Components, middleware. Wildcard subdomain tenant routing via pure middleware with no new libraries.
- **Supabase (supabase-js ^2.x + @supabase/ssr):** Postgres + Auth + RLS + Storage. The `custom_access_token_hook` pattern (already live) handles all JWT claim injection for tenant isolation. Service role admin client already exists for provisioning.
- **Stripe (^17.x node + ^4.x JS):** Two distinct uses — existing customer payments (POS/storefront) and new merchant billing (subscriptions). Must use separate webhook endpoints with separate signing secrets.
- **Tailwind CSS 4.2:** CSS-first config (`@theme` in globals.css). Deep navy + amber design system maps directly to Tailwind utilities.
- **Zod ^3.x:** Every Server Action validates inputs before any DB operation. Required for signup slug validation including reserved-word blocklist.
- **jose ^5.x:** Staff PIN JWT sessions (already in use). No change needed.
- **@vercel/sdk ^1.x (NEW):** The only new package. Used only for custom domain add-on. Programmatically calls Vercel REST API to add/verify/remove merchant custom domains.

**What not to add:** Prisma, NextAuth/Clerk, Supabase Realtime for inventory, Stripe Terminal SDK, feature flag services (PostHog/LaunchDarkly), headless CMS for marketing page, multi-plan tier packaging.

### Expected Features

**Must have for v2.0 launch (P1 table stakes):**
- Wildcard subdomain routing — `[slug].nzpos.app` per merchant, middleware tenant resolution
- Self-serve merchant signup with automatic store provisioning (atomic, idempotent Postgres RPC)
- Email verification before dashboard access
- Store setup wizard — 3 steps, fully skippable (name/slug, logo, first product)
- Feature gating for existing add-ons (Xero, Email Notifications) — server-side enforcement mandatory
- Stripe subscription checkout per add-on + webhook handler for subscription state sync
- Stripe Customer Portal link in admin billing section (self-serve cancel/upgrade)
- Super admin panel — tenant list, view details, suspend
- Marketing landing page — hero, pricing, signup CTA, mobile-optimised, static rendering

**Should have after first external merchants (P2 differentiators):**
- Custom domains — bring-your-own domain as paid add-on with Vercel SDK provisioning and DNS verification UX
- Impersonate-tenant in super admin (act-as for support debugging)
- Setup completion checklist persistent in admin dashboard
- Per-tenant usage metrics in super admin

**Defer to v3+ (premature complexity or anti-features):**
- Live storefront preview during setup wizard (high complexity)
- Email drip onboarding sequences
- White-label / removing "Powered by NZPOS"
- Multi-plan tiers (Starter/Pro/Enterprise) — keep per-add-on billing model
- Tenant self-service subdomain slug changes (slug is immutable; display name is editable)
- Database-per-tenant isolation (row-level isolation via `store_id` + RLS scales to thousands of tenants)
- Free trial with credit card required (NZ segment is skeptical; Square's no-card model built their NZ share)

### Architecture Approach

The architecture is additive — existing v1 routes, RLS policies, JWT hook, and Supabase client patterns remain unchanged. New work adds a route group layer (`(marketing)`, `(onboarding)`, `(tenant)`, `superadmin`) and a library layer (`lib/tenant.ts`, `lib/features.ts`, `lib/stripe-billing.ts`, `lib/vercel-domains.ts`). Middleware gains hostname-based tenant resolution, injecting `x-tenant-id` for routing purposes only — JWT claims remain the security authority. The `store_plans` table is the application source of truth for feature entitlements; Stripe webhooks write to it, Server Actions read from it; Stripe is never called at request time for access checks.

**Major components:**
1. **Middleware (modified)** — hostname to tenant slug/custom domain lookup, `x-tenant-id` header injection, additive before existing auth checks
2. **Tenant provisioning (new)** — atomic Postgres RPC `provision_store()` creating auth user + stores row + staff row + store_plans row in one transaction; idempotent
3. **`store_plans` table (new)** — per-store feature flags (`xero_enabled`, `email_notifications_enabled`, `custom_domain_enabled`), Stripe subscription refs, plan tier; webhooks write to it synchronously
4. **Feature gate helpers `hasFeature()` / `requireFeature()` (new)** — single server-side entitlement check at top of every gated Server Action and Server Component; UI gates are cosmetic only
5. **Stripe billing (new)** — separate webhook endpoint `/api/webhooks/stripe-billing` distinct from existing `/api/webhooks/stripe`; handles `customer.subscription.*` and `invoice.*` events
6. **Super admin `/superadmin` route group (new)** — `is_super_admin` JWT claim guard in middleware AND layout; service role client confined to DDL/admin ops
7. **Vercel SDK domain provisioning (new)** — Server Action wrapping `projectsAddProjectDomain`, polls verification, stores DNS record set for re-display in UI

### Critical Pitfalls

1. **Middleware-only tenant isolation (CVE-2025-29927)** — Next.js middleware can be bypassed by crafted headers. The `x-tenant-id` header is for routing only. The authoritative `store_id` always comes from the authenticated JWT claim. RLS enforces isolation at the DB layer regardless. Never accept `store_id` as a client-supplied input to any Server Action. Verify in Phase 1 with a cross-tenant isolation E2E test.

2. **Stale JWT claims after provisioning or plan change** — Supabase JWTs cache claims for up to 1 hour. After provisioning, immediately call `supabase.auth.refreshSession()` client-side and gate the wizard redirect behind it. For plan changes triggered by webhooks, store a `plan_updated_at` timestamp and force refresh on next navigation if stale. Keep JWT lifetime to 15-30 minutes in SaaS context.

3. **Tenant provisioning race condition** — Auth user creation and store row creation are not a single atomic operation at the application layer. Use a Postgres RPC function to wrap the full provisioning sequence atomically. Make it idempotent. Verify `store_id` is in the JWT before any dashboard redirect. Show a "provisioning failed — retry" screen, not a blank dashboard.

4. **Stripe webhook routing confusion** — The existing webhook at `/api/webhooks/stripe` handles POS payment events. Subscription billing events must go to a separate endpoint `/api/webhooks/stripe-billing` with its own signing secret. Mixing them causes cross-domain side effects that are difficult to debug and test.

5. **Client-only feature gating** — React component gates can be bypassed by disabling JavaScript or inspecting the API response. Every gated Server Action and Route Handler must call `requireFeature(storeId, feature)` server-side before executing. The UI gate is cosmetic; the server-side check is the enforcer.

6. **Wildcard SSL requires Vercel nameserver delegation** — Wildcard certificate provisioning requires ACME DNS-01 challenges which require full NS delegation (`ns1.vercel-dns.com`, `ns2.vercel-dns.com`). A CNAME record alone does not work for wildcards. Must be configured before writing any tenant routing code.

## Implications for Roadmap

Based on research, the architecture has hard dependencies that dictate build order. Each phase depends on the previous — the routing will not work without schema, provisioning will not work without routing, billing will not work without provisioned stores.

### Phase 1: Multi-Tenant Infrastructure
**Rationale:** Everything else depends on this. Schema changes, RLS policy updates, and wildcard DNS must be in place before any tenant-aware feature can be built or tested.
**Delivers:** Schema ready for multi-tenancy (`stores.slug`, `stores.custom_domain`, `stores.stripe_customer_id`; `store_plans` table); updated RLS policies with `is_super_admin` bypass; working wildcard subdomain routing middleware; wildcard SSL verified end-to-end with a real test subdomain; `lib/tenant.ts` resolving tenant from hostname.
**Addresses:** Subdomain routing (table stakes), tenant data isolation (table stakes)
**Avoids:** Middleware-only isolation pitfall (CVE-2025-29927), RLS-not-updated-for-super-admin pitfall, wildcard SSL misconfiguration pitfall

### Phase 2: Merchant Self-Serve Signup
**Rationale:** Without a working signup there are no tenants to operate on. Must ship before the setup wizard (which requires a provisioned store) and before billing (which requires a Stripe Customer per store).
**Delivers:** Signup page, `provision_store()` Postgres RPC (atomic + idempotent), Stripe Customer created at provisioning time, session refresh after provisioning, `provision_status` verification before dashboard redirect, reserved slug blocklist (Zod + server-side), rate limiting on signup.
**Addresses:** Self-serve signup (table stakes), automatic store creation (table stakes), email verification (table stakes)
**Avoids:** Tenant provisioning race condition pitfall, stale JWT after provisioning pitfall, free tier signup abuse (rate limit 1 store per verified email)

### Phase 3: Store Setup Wizard + Marketing Landing Page
**Rationale:** Wizard requires a provisioned store (Phase 2 dependency) but is logically separate from billing. Marketing page has no dependencies but pairs naturally here as the entry point into signup.
**Delivers:** 3-step skippable setup wizard (store name/slug confirmation, logo upload, optional first product); post-wizard redirect to admin dashboard; marketing landing page (hero, pricing, signup CTA, mobile-optimised, static rendering for fast LCP); NZ-specific social proof copy.
**Addresses:** Store setup wizard (table stakes), marketing landing page (table stakes), progress indicator (table stakes), skip option on every step (table stakes)
**Avoids:** Empty dashboard on wizard completion, redirect-before-provision-complete UX pitfall

### Phase 4: Stripe Billing + Feature Gating
**Rationale:** Billing requires provisioned stores with `stripe_customer_id` (Phase 2). Feature gating requires `store_plans` rows to exist (created at provisioning). This is the monetisation phase — must ship before the v2.0 SaaS label is justified.
**Delivers:** Separate `/api/webhooks/stripe-billing` endpoint with its own signing secret; subscription checkout per add-on (Xero, Email Notifications); `store_plans` table written by webhooks; `requireFeature()` / `hasFeature()` server-side entitlement helpers enforced in all existing Xero and email Server Actions; Stripe Customer Portal link in admin billing section; billing idempotency (`stripe_billing_events` table); contextual upgrade prompts at gated features.
**Addresses:** Feature gating (table stakes), Stripe subscription checkout (table stakes), webhook state sync (table stakes), graceful access revocation (table stakes), contextual upgrade prompts (differentiator)
**Avoids:** Client-only feature gating pitfall, Stripe webhook routing confusion pitfall, stale JWT after plan change pitfall, Stripe Customer race condition at first checkout

### Phase 5: Super Admin Panel
**Rationale:** Can read from all previous phases. Logical last step before external merchants — needs stores, subscriptions, and plan data to be meaningful. Required before onboarding real merchants (for support debugging).
**Delivers:** `/superadmin` route group with `is_super_admin` middleware + layout guard; tenant list with pagination and search; tenant detail view (plan, created, last active, subscription status); suspend/soft-delete with 30-day recovery window; admin audit log (`admin_audit_log` table); manual plan override for comping merchants.
**Addresses:** Super admin route protection (table stakes), tenant list/search/suspend (table stakes), manual plan override (differentiator)
**Avoids:** Super admin sharing owner auth path anti-pattern, service role client leaking into tenant query paths, destructive actions without confirmation

### Phase 6: Custom Domains (Paid Add-on)
**Rationale:** Requires billing/gating (Phase 4) because custom domain is a paid add-on. Requires stable subdomain routing (Phase 1) because custom domain is an alias. Most complex feature; lowest priority until merchants request it.
**Delivers:** `@vercel/sdk` integration for `projectsAddProjectDomain`; DNS verification UX (copy-paste DNS records, live polling status, activation email); `custom_domain_status` column (`pending_verification` | `active` | `failed`); middleware custom domain lookup branch; 301 redirect from subdomain to custom domain once active; domain ownership verification enforced before activation.
**Addresses:** Custom domain bring-your-own (differentiator), canonical redirect (differentiator), domain verification flow (differentiator)
**Avoids:** Custom domain verification UX black hole pitfall, custom domain hijacking security mistake, CNAME vs NS delegation confusion

### Phase Ordering Rationale

- Schema and DNS must precede all tenant-aware code — no tenant routing is possible without both.
- Signup must precede billing — Stripe Customer is created at provisioning; billing depends on this foreign key.
- Feature gating must run before external merchants are onboarded — ungated Xero access is a revenue leak.
- Super admin pairs with Phase 4 completion because it needs real subscription data to be useful; building it last avoids maintaining it against changing schemas.
- Custom domains are deliberately last — they are the most complex feature, depend on stable billing, and have the narrowest immediate demand.

### Research Flags

Phases likely needing `/gsd:research-phase` during planning:
- **Phase 4 (Stripe Billing):** The Stripe Entitlements API (`stripe.entitlements.activeEntitlements.list()`) is a verified differentiator that could replace the custom `store_plans` boolean columns approach. Determine whether it simplifies entitlement sync or adds indirection before committing to either model.
- **Phase 6 (Custom Domains):** Vercel SDK domain verification polling patterns, DNS propagation UX edge cases (wrong record added, domain already on another Vercel project), and the merchant-facing DNS instruction UI warrant a targeted research pass.

Phases with well-documented standard patterns (skip research phase):
- **Phase 1 (Infrastructure):** Vercel wildcard DNS, Next.js middleware subdomain routing, Supabase RLS with `is_super_admin` — all verified in official docs.
- **Phase 2 (Signup):** Supabase admin client provisioning, Postgres RPC atomicity — established patterns with codebase precedent.
- **Phase 3 (Wizard + Marketing):** Next.js static rendering, Supabase Storage uploads, multi-step form with React state — straightforward.
- **Phase 5 (Super Admin):** Route group with middleware guard, service role client scoping — well-documented patterns.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Core stack verified against Next.js 16.2.1 official docs (2026-03-25); @vercel/sdk confirmed from npm + Vercel official docs (2026-03-31); Stripe ^17.x from official docs |
| Features | MEDIUM-HIGH | Table stakes verified via live web research + competitor analysis; differentiators from Stripe and Vercel official docs; competitor feature data is MEDIUM (training knowledge + web research) |
| Architecture | HIGH | Patterns verified against official Vercel multi-tenant docs, Next.js subscription payments reference, and existing codebase review (`src/middleware.ts`, RLS migrations, `resolveAuth.ts`) |
| Pitfalls | MEDIUM-HIGH | CVE-2025-29927 verified from Snyk + ProjectDiscovery; Supabase JWT staleness from official docs; Stripe webhook patterns from official docs; UX pitfalls from web research (MEDIUM) |

**Overall confidence:** HIGH

### Gaps to Address

- **Stripe Entitlements API vs custom `store_plans` columns:** Research confirms Entitlements is production-ready as of 2025, but the tradeoff between Stripe-as-source-of-truth vs DB-as-source-of-truth needs a final call before Phase 4 implementation. Recommendation: use `store_plans` boolean columns for initial implementation (simpler, always available offline from Stripe), research Entitlements API during Phase 4 planning and migrate if it simplifies the sync model.
- **Supabase free tier limits under multi-tenant load:** Pricing page was blocked during research; free tier limits (500MB DB, 1GB storage, 50K MAU) are from training data. Validate current limits before onboarding more than ~20 merchants to plan the Supabase Pro upgrade timing.
- **NZ domain registrar nameserver delegation:** Wildcard SSL requires Vercel nameserver delegation. If the domain is registered at a NZ registrar (Domains.co.nz, 1st Domains, etc.), confirm they support custom nameserver delegation before Phase 1 is scheduled.
- **Transactional email provider for signup verification:** The Email Notifications add-on is gated behind billing, but a transactional email provider is needed for email verification at signup (Phase 2). Resend is the standard Next.js choice. Not covered in the research files — add to Phase 2 planning.

## Sources

### Primary (HIGH confidence)
- Next.js 16.2.1 official documentation (2026-03-25): https://nextjs.org/docs
- Next.js multi-tenant guide (official, 2026-03-31): https://nextjs.org/docs/app/guides/multi-tenant
- Vercel multi-tenant domain management (official): https://vercel.com/docs/multi-tenant/domain-management
- Vercel Platforms Starter Kit: https://vercel.com/templates/next.js/platforms-starter-kit
- @vercel/sdk npm package (~1.19.x, Apr 2026): https://www.npmjs.com/package/@vercel/sdk
- Supabase Custom Access Token Hook (official): https://supabase.com/docs/guides/auth/auth-hooks/custom-access-token-hook
- Supabase RLS (official): https://supabase.com/docs/guides/database/postgres/row-level-security
- Stripe Entitlements API (official): https://docs.stripe.com/billing/entitlements
- Stripe Customer Portal (official): https://docs.stripe.com/customer-management/integrate-customer-portal
- Stripe Subscription Webhooks (official): https://docs.stripe.com/billing/subscriptions/webhooks
- CVE-2025-29927 Next.js Middleware Bypass (Snyk): https://snyk.io/blog/cve-2025-29927-authorization-bypass-in-next-js-middleware/
- CVE-2025-29927 Technical Analysis (ProjectDiscovery): https://projectdiscovery.io/blog/nextjs-middleware-authorization-bypass
- Existing codebase: `src/middleware.ts`, `supabase/migrations/001-003`, `src/lib/resolveAuth.ts`

### Secondary (MEDIUM confidence)
- SaaS onboarding best practices (DesignRevision, 2026)
- Feature gating in freemium SaaS (DEV community)
- Multi-tenant architecture best practices (Relevant Software)
- B2B SaaS landing page best practices (GenesysGrowth, 2026)
- Stripe subscription lifecycle in Next.js (DEV, 2026)
- Square / Lightspeed / Shopify feature comparison (training knowledge + web research)
- Subdomain-based routing in Next.js (Medium)
- Multi-tenant leakage: when RLS fails (InstaTunnel)

---
*Research completed: 2026-04-03*
*Ready for roadmap: yes*
