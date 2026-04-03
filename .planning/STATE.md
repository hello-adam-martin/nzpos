---
gsd_state_version: 1.0
milestone: v1.1
milestone_name: Production Launch + Feature Waves
status: executing
stopped_at: Completed 14-03-PLAN.md
last_updated: "2026-04-03T02:47:08.696Z"
last_activity: 2026-04-03
progress:
  total_phases: 10
  completed_phases: 7
  total_plans: 25
  completed_plans: 25
  percent: 100
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-03)

**Core value:** A store owner can ring up a sale in-store and take an order online, from a single inventory that stays in sync, with GST handled correctly.
**Current focus:** Phase 14 — store-setup-wizard-marketing

## Current Position

Phase: 14 (store-setup-wizard-marketing) — COMPLETE
Plan: 3 of 3
Status: All plans complete
Last activity: 2026-04-03

Progress: [██████████] 100%

## Performance Metrics

**Velocity:**

- Total plans completed: 0 (v2.0)
- Average duration: — min
- Total execution time: — hours

*Updated after each plan completion*

## Accumulated Context

### Decisions

- [v2.0]: Custom domains deferred to v2.1 — too complex, lowest immediate demand
- [v2.0]: Per-add-on billing model (not plan tiers) — avoids upgrade cliffs, NZ market expects no-card signup
- [v2.0]: store_plans boolean columns (not Stripe Entitlements API) — simpler, always available offline from Stripe; revisit in Phase 15 planning
- [v1.1]: Phase 7 (production deploy) partially complete — DEPLOY-02/03/04 still pending real infrastructure
- [Phase 12]: slug DEFAULT 'demo' trick allows migration on existing rows before default is dropped — ensures new stores must explicitly provide slug
- [Phase 12]: middlewareAdmin.ts omits server-only and Database type generic to remain compatible with Edge Runtime
- [Phase 12-multi-tenant-infrastructure]: orders_public_read policy preserved from 006 (guest checkout confirmation requires anon read of online orders)
- [Phase 12-multi-tenant-infrastructure]: store_plans owner-read only (not staff) — billing info is owner-sensitive
- [Phase 12-multi-tenant-infrastructure]: super admin check runs before staff/customer in auth hook (D-12: cross-tenant, no store_id required)
- [Phase 12]: storeId TypeScript narrowing: explicit string variable with if/else branch avoids null type error when assigning from cache vs DB lookup
- [Phase 12]: x-store-id middleware header takes priority over JWT store_id in resolveAuth — subdomain is authoritative tenant context
- [Phase 12]: allowedDevOrigins added to next.config.ts for *.lvh.me subdomain dev compatibility
- [Phase 12-multi-tenant-infrastructure]: app_metadata set via admin.auth.admin.updateUserById before sign-in in RLS tests — auth hook not firing in Vitest jsdom test environment; mirrors established seed.ts pattern
- [Phase 12-multi-tenant-infrastructure]: Store B product created as is_active=false in RLS tests to bypass products_public_read and test tenant_access RLS isolation
- [Phase 13-merchant-self-serve-signup]: provision_store REVOKE from authenticated/anon/public — service_role only to prevent client-side invocation
- [Phase 13-merchant-self-serve-signup]: enable_confirmations = true in supabase/config.toml — local dev must use Inbucket for email verification
- [Phase 13]: ownerSignup does not call redirect() — client page handles navigation after success (keeps Server Action testable)
- [Phase 13]: vi.hoisted() required for mock functions in vi.mock() factories — avoids TDZ ReferenceError in Vitest
- [Phase 13]: Auth callback /api/auth/callback on root domain redirects to {slug}.{domain}/admin/dashboard after PKCE exchange
- [Phase 13]: ProvisioningScreen animates through steps as UX affordance — actual provisioning already completed in ownerSignup Server Action before redirect
- [Phase 13]: Subdomain redirect uses NEXT_PUBLIC_ROOT_DOMAIN env var with lvh.me fallback for local dev; protocol auto-detected based on domain
- [Phase 14-store-setup-wizard-marketing]: Zod v4 installed despite ^3.x spec — uses .issues[] not .errors[] on ZodError
- [Phase 14-store-setup-wizard-marketing]: saveLogoStep accepts null for both logo and color (skip case still marks step complete via bit 1)
- [Phase 14-store-setup-wizard-marketing]: Middleware admin client used for setup_wizard_dismissed check to bypass RLS (consistent with tenant resolution pattern)
- [14-03]: Mobile hamburger nav uses HTML details/summary pattern — no JavaScript, page remains fully static
- [14-03]: Landing page hero illustration is CSS-only iPad mockup (no external images) — keeps page lightweight and static

### Blockers/Concerns

- Wildcard SSL requires Vercel nameserver delegation (NS delegation, not CNAME) — must be configured before Phase 12 middleware code
- Transactional email provider needed for signup verification in Phase 13 — Resend is the standard choice but not yet provisioned
- Supabase free tier limits (500MB DB, 50K MAU) — validate before onboarding >20 merchants; plan Pro upgrade timing

## Session Continuity

Last session: 2026-04-03T02:47:08.694Z
Stopped at: Completed 14-03-PLAN.md
Resume file: None
