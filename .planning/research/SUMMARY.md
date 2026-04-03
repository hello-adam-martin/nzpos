# Project Research Summary

**Project:** NZPOS — v2.1 Hardening & Documentation
**Domain:** Multi-tenant SaaS POS + Online Store — security hardening, code quality review, and documentation pass
**Researched:** 2026-04-04
**Confidence:** HIGH

## Executive Summary

NZPOS v2.1 is a hardening and documentation milestone, not a feature milestone. The platform is complete: 336 source files, 36,329 LOC, 365+ tests, 20 database migrations, a shipped SaaS billing system, and a working Xero integration. This milestone bridges "code that works for the founder" to "code that can onboard external merchants safely." The research is grounded in direct codebase inspection rather than greenfield exploration — every finding maps to a specific file, migration, or pattern already in production.

The recommended approach is risk-ordered and sequential, not parallel. Security audit must precede documentation because documenting incorrect behaviour is waste. Code quality review must precede inline documentation because documenting dead code is waste. Deployment runbook must precede user-facing documentation because screenshots require a live environment. This ordering is non-negotiable: the dependency chain from ARCHITECTURE.md and FEATURES.md agree on it independently.

The key risks are concentrated in three areas. First, the multi-tenant isolation model (RLS + custom JWT claims + SECURITY DEFINER RPCs) is architecturally correct but has specific, identified gaps that need confirmation rather than assumption: storage bucket policies, suspension enforcement at the Server Action layer, and JWT claims sourced from `user_metadata` vs `app_metadata`. Second, the Xero token rotation logic has a non-atomic failure mode that silently breaks merchant accounting sync with no recovery path. Third, documentation written in a burst without a "docs must be updated" gate in the Definition of Done will be stale within one shipping cycle — the structure of docs matters as much as their content.

---

## Key Findings

### Recommended Stack

The stack is locked and validated. NZPOS runs Next.js 16.2 (App Router) + Supabase + Stripe + Tailwind CSS v4. No changes recommended. For v2.1, two tooling additions are relevant: the `vitest --coverage` flag to generate the coverage report, and the Stripe CLI for local webhook testing with live signing secrets. The existing stack is the right foundation for the hardening work.

**Core technologies for v2.1 work:**
- Next.js 16.2 / Supabase / Stripe: unchanged — the hardening review operates on existing code
- Vitest + Playwright: existing test suite — extend with coverage reporting and cross-tenant E2E tests
- Supabase CLI: needed for `db diff` migration validation and local `storage.policies` inspection
- Stripe CLI: needed for live-mode webhook testing with correct signing secrets

### Expected Features

The feature scope for v2.1 is entirely hardening, review, and documentation. No user-visible features ship. The research establishes a clear P0/P1/P2/P3 priority stack.

**Must complete before first external merchant (P0):**
- RLS policy audit across all tables including v2.0 additions (add_ons, subscriptions, audit_logs, store_wizard_state) — active security liability
- Auth flow verification: PIN lockout, JWT expiry, super admin guard — security liability
- Stripe webhook signature verification confirmed on both webhook handlers — billing integrity
- Server Action Zod validation audit across all 67 action files — input safety
- Environment variable audit with .env.example updated — deployment blocker
- Production deployment runbook: Supabase, Stripe live keys, Vercel wildcard DNS — launch blocker
- Local dev setup guide — solo developer returning after time away blocker

**High value, ship early in milestone (P1):**
- Test coverage report to identify gaps before production
- RLS integration tests for v2.0 tables
- Webhook handler test coverage for Stripe subscription events
- Inline documentation for GST calculation, `requireFeature.ts`, `tenantCache.ts`, Xero sync, `provision_store` RPC
- Architecture overview document covering auth systems, tenant isolation, and feature gating
- Server Action inventory (67 actions catalogued)
- Merchant onboarding guide (first sale walkthrough)
- Smoke test checklist post-deploy

**Meaningful but deferrable (P2):**
- Dead code removal, error handling consistency, TypeScript strict mode check
- Content Security Policy headers, structured logging, admin dashboard reference
- Rate limiting audit extended to PIN login, audit log completeness

**Nice to have (P3):**
- GST IRD specimen test suite, merchant video walkthrough, automated migration CI, decision log expansion, structured RLS pen test

**Confirmed anti-features for this milestone:**
- SOC 2 audit (premature at single-store launch)
- Full GDPR compliance (NZ Privacy Act 2020 is the applicable law, not GDPR)
- OpenAPI/Swagger documentation (this app uses Server Actions, not a public REST API)
- 100% test coverage enforcement (coverage gaming; 80%+ on critical paths is the target)

### Architecture Approach

The architecture is fully built and in production. v2.1 makes no new routes, components, or major structural changes. The review applies to an existing system with well-defined component boundaries. The review order is risk-based: middleware and RLS first, financial logic second, general code quality third, then documentation.

**Major components and their review priority:**
1. `src/middleware.ts` (221 LOC, Edge Runtime) — ALL tenant routing flows through here; CRITICAL review target
2. `supabase/migrations/015_rls_policy_rewrite.sql` + migrations 016–020 — primary tenant isolation mechanism; CRITICAL
3. `src/lib/resolveAuth.ts` + `src/lib/requireFeature.ts` — auth context resolution for all Server Actions; HIGH
4. `src/app/api/webhooks/stripe/` (two handlers) — payment completion and billing; HIGH
5. `src/actions/auth/` (14 files) — both Supabase Auth and jose JWT staff PIN flows; HIGH
6. `src/lib/gst.ts` + `src/lib/money.ts` — financial calculation utilities; HIGH (IRD compliance)
7. `src/lib/xero/` — token rotation, Vault access, sync error handling; HIGH (silent failure risk)
8. `docs/` directory — to be created; developer and merchant documentation

**Key patterns confirmed in codebase:**
- SECURITY DEFINER RPCs for all atomic multi-table mutations (provision_store, complete_pos_sale, complete_online_sale)
- Dual-path feature gating: JWT fast path for most checks, DB fallback (`requireDbCheck: true`) for billing-critical mutations
- Tenant header propagation: middleware injects `x-store-id`, Server Actions read via `resolveAuth()` which cross-checks against JWT `store_id`
- In-memory tenant cache with per-request `is_active` verification (suspension is immediate even for cached stores)
- Idempotent webhook processing via `stripe_events` dedup table with insert-after-success ordering

### Critical Pitfalls

1. **RLS audit missing storage buckets** — `storage.objects` policies are separate from table RLS and not covered by standard migration review. A public product image bucket may allow cross-tenant writes. Audit step: run `SELECT * FROM storage.policies` explicitly; verify INSERT/DELETE policies restrict to owning store via path segment check.

2. **JWT claims sourced from `user_metadata` instead of `app_metadata`** — `user_metadata` is user-writable via `supabase.auth.updateUser()`. If any RLS-critical claim (especially `store_id` or `is_super_admin`) sources from `user_metadata` in the access token hook, any user can forge their own store_id and read another tenant's data. This is a complete RLS bypass. Verify every claim in `003_auth_hook.sql` sources from `raw_app_meta_data`.

3. **Suspension enforcement stops at middleware** — Middleware gates page loads. Long-lived POS sessions (iPad open for a full trading day) bypass middleware after initial load. A suspended merchant's Server Actions may continue processing sales. Suspension must be enforced at the data layer (RLS policy referencing `is_suspended`, or `requireActiveStore()` check in POS Server Actions).

4. **Xero token rotation is non-atomic** — Token refresh fetches new tokens from Xero, then writes to Supabase Vault. If the Vault write fails, the old (now-invalidated) refresh token is gone and the connection is permanently broken with no merchant notification. Audit: verify Vault write failure triggers reconnect email and sets `xero_connection_status = 'token_error'` on the store record.

5. **IDOR in financial data routes** — OWASP automated scanners confirm authentication (logged in) but miss authorisation (do you own this resource?). Any Server Action or Route Handler accepting an object ID that uses the admin Supabase client without ownership verification is vulnerable. Manual test protocol: logged in as Store A, attempt to read Store B's order ID — expect 403 or empty result.

6. **Dead code removal breaks runtime behaviour** — TypeScript static analysis cannot see dynamic references (string-keyed dispatch tables, `dynamic()` imports). In a 336-file codebase, dynamic patterns are certain to exist. Never bulk-delete flagged exports. Delete in batches of 10-20 with a full test run (including E2E) between each batch.

---

## Implications for Roadmap

Based on the dependency chain identified across all four research files, the milestone maps cleanly to four sequential phases. The ordering is driven by risk, not convenience.

### Phase 1: Security Audit

**Rationale:** Security issues found here require code changes. Documenting incorrect code before fixing it creates immediate documentation debt. No other phase can be considered reliable until the security foundation is verified. This is the mandatory first gate.

**Delivers:** Confirmed tenant isolation, verified auth flows, validated webhook handling, and runtime evidence of security posture (not just policy screenshots). Any security fixes shipped as surgical code changes.

**Addresses:** All P0 features except deployment runbook. RLS audit, auth flow verification, Stripe webhook verification, Server Action Zod audit, environment variable audit, super admin guard.

**Avoids:** Pitfalls 1-4, 8 (storage RLS gap, JWT metadata source, suspension enforcement, IDOR).

**Specific review targets (in order):**
- `supabase/migrations/015_rls_policy_rewrite.sql` + migrations 016–020 + `storage.objects` policies
- `src/middleware.ts` (all auth gates, webhook bypass correctness)
- `src/lib/resolveAuth.ts` (x-store-id trust, role check gap for customer sessions)
- Both Stripe webhook handlers (raw body handling, idempotency, separate signing secrets per environment)
- `src/actions/auth/` — all 14 files (PIN lockout server-side state, JWT expiry, orphaned user cleanup)
- `src/actions/super-admin/` — all 4 files (independent re-verification of `is_super_admin`)
- `003_auth_hook.sql` (claims from `raw_app_meta_data` not `user_metadata`)
- `src/lib/signupRateLimit.ts` (in-memory vs DB-backed — critical for multi-instance Vercel)

**Research flags:** Standard patterns. ARCHITECTURE.md and PITFALLS.md together provide a complete audit checklist. No additional research sprint needed.

---

### Phase 2: Code Quality and Financial Logic Review

**Rationale:** Code quality fixes follow security fixes because a security fix may touch code about to be refactored. Financial logic review is grouped here because it requires the same precision discipline, and GST/money utilities are correctness-critical (IRD compliance).

**Delivers:** GST calculation edge case coverage, fixed code quality issues identified in Phase 1 (GST utility deduplication in webhook handler, rate limiting migration if needed), safe dead code removal (small batches with E2E between each), consistent error handling in Server Actions.

**Addresses:** P1 features — test coverage report, RLS integration tests for v2.0 tables, webhook handler test coverage, GST edge case tests.

**Avoids:** Pitfalls 5, 6, 9 (dead code removal risks, GST edge cases undocumented, Xero token rotation failure).

**Specific targets:**
- `src/lib/gst.ts` + `src/lib/money.ts`: formula documentation, edge cases (zero, half-cent, negative quantity)
- `src/actions/orders/completeSale.ts`, `processPartialRefund.ts`, `processRefund.ts`
- `supabase/migrations/005_pos_rpc.sql` + `006_online_store.sql` (PL/pgSQL financial RPCs)
- `src/lib/xero/`: token rotation atomicity, failure recovery, Vault write error handling
- Dead code scan: knip + manual dynamic reference check, small batches with E2E between
- `src/app/api/webhooks/stripe/route.ts`: GST utility deduplication (one-line import fix)

**Research flags:** Standard patterns. Xero token rotation atomicity is documented in Xero OAuth official docs.

---

### Phase 3: Developer Documentation

**Rationale:** Documentation can only be written accurately after the code it documents is correct (Phases 1-2 complete). Developer docs come before user docs because user docs for a merchant-facing product require a live production environment (screenshots, live URLs).

**Delivers:** Complete developer-facing documentation suite: `docs/setup.md`, `docs/architecture.md`, `docs/security.md`, `docs/api-reference.md` (Server Action catalogue), inline JSDoc on complex business logic, environment variable reference, contribution guide.

**Addresses:** P1 features — architecture overview, Server Action inventory (67 actions), inline docs for `gst.ts`, `requireFeature.ts`, `tenantCache.ts`, `xero/sync.ts`, `provision_store` RPC.

**Avoids:** Pitfall 7 (documentation staleness) — design docs to be updateable: living files in the repo, `Last verified:` dates on infrastructure docs, "update docs" in Definition of Done, inline JSDoc as primary reference not external docs.

**Documentation build order:** `docs/security.md` first (documents the now-correct auth model), then `docs/architecture.md` (system overview, Mermaid data flow diagrams), then `docs/api-reference.md` (Server Action catalogue), then `docs/setup.md` (local dev), then contribution guide.

**Research flags:** Standard patterns. No additional research needed.

---

### Phase 4: Deployment Runbook and User Documentation

**Rationale:** Must come last because: (1) the deployment runbook can only be finalised after all production security configuration decisions are known, and (2) merchant-facing documentation with screenshots requires a live production environment.

**Delivers:** Production deployment runbook (`docs/deployment.md`), merchant onboarding guide (first sale walkthrough), admin dashboard reference, smoke test checklist (post-deploy), GST and compliance explanation for merchants.

**Addresses:** Remaining P0 — the production deployment runbook. P1 — merchant onboarding guide, smoke test checklist.

**Avoids:** Pitfall 7 for user-facing content — prefer step descriptions over screenshots, or annotated screenshots with explicit "last verified" dates.

**Deployment runbook must cover:**
- Production Supabase: org creation, migration application in order, seed data (super admin user, default plans), auth config, storage buckets, email templates
- Stripe live keys: webhook endpoint registration, live vs test secret separation (separate `STRIPE_WEBHOOK_SECRET` per environment), webhook replay verification
- Vercel: `*.nzpos.app` wildcard DNS, env vars (production vs preview vs development), tenant routing E2E test
- Database migration strategy: naming convention, application order, schema verification, rollback approach
- Monitoring baseline: Vercel error logs, Supabase logs, Stripe dashboard for failed webhook deliveries

**Research flags:** Standard patterns. Vercel wildcard DNS and Supabase production migration workflow are well-documented.

---

### Phase Ordering Rationale

- **Security before everything:** Code changes from security findings invalidate any documentation written before them. No exceptions.
- **Financial logic with code quality:** The same precision discipline applies to both. GST edge cases are also a security/compliance concern.
- **Developer docs before user docs:** Developer docs can be written against the codebase alone. User docs require a live environment.
- **Deployment runbook last:** Cannot be finalized until all security configuration decisions (env vars, Stripe live key setup, Supabase production org) are known.
- **Dead code removal after test coverage:** Adding tests then removing dead code is correct. Removing code then adding tests to replace coverage is backwards.

### Research Flags

All four phases follow well-documented patterns. No phase requires an additional `/gsd:research-phase` sprint.

- **Phase 1:** Security audit checklist is fully specified in ARCHITECTURE.md and PITFALLS.md. Audit targets, failure modes, and verification steps are all mapped.
- **Phase 2:** Financial logic review targets are identified. GST formula is documented. Dead code removal process is specified.
- **Phase 3:** Documentation structure is specified in ARCHITECTURE.md with target files and content per file.
- **Phase 4:** Deployment runbook structure is specified in FEATURES.md with step-level detail.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Core stack locked. Validated against live Next.js 16.2.1 official docs. v2.1 adds no new dependencies. |
| Features | HIGH | Well-established engineering practice (OWASP, Next.js, Supabase official docs). Codebase analysis confirmed 67 action files, 336 source files, 365+ tests. |
| Architecture | HIGH | Based on direct codebase inspection: middleware.ts, 20 migrations, all action files, webhook routes. Not inference — actual file reads. |
| Pitfalls | HIGH (RLS/Stripe/Next.js), MEDIUM (documentation staleness, code-review sequencing) | RLS/Stripe pitfalls backed by official docs and CVE evidence. Doc staleness based on practitioner consensus. |

**Overall confidence:** HIGH

### Gaps to Address

- **Rate limiting implementation:** `signupRateLimit.ts` may still use an in-memory `Map` rather than the DB-backed `check_rate_limit` RPC added in migration 009. In-memory rate limiting does not survive Vercel instance restarts. Must be verified as the first item in Phase 1.

- **Storage bucket policy existence:** No evidence in migrations that `storage.objects` policies exist. Buckets may have been configured via Supabase dashboard UI (outside the migration workflow). The Phase 1 audit must explicitly run `SELECT * FROM storage.policies` to determine current state.

- **`orders_public_read` data exposure scope:** The policy intentionally has no `store_id` filter (required for guest checkout order confirmation). The audit must confirm no sensitive merchant data is on the `orders` row that could be harvested via enumeration.

- **Xero connection health signaling:** Whether a `xero_connection_status` field or equivalent error signaling mechanism exists on the `stores` table is unknown from research alone. Phase 2 must audit the Xero sync failure path specifically.

---

## Sources

### Primary (HIGH confidence)

- Direct codebase inspection: `src/middleware.ts` (221 LOC), `src/lib/resolveAuth.ts`, `src/lib/requireFeature.ts`, `src/lib/tenantCache.ts`, `src/lib/gst.ts`, `supabase/migrations/002–020`, `src/actions/auth/ownerSignup.ts`, `src/actions/orders/completeSale.ts`, `src/actions/super-admin/suspendTenant.ts`, both Stripe webhook handlers
- Next.js 16.2.1 official documentation (2026-03-25): https://nextjs.org/docs
- Next.js authentication guide (official): https://nextjs.org/docs/app/guides/authentication
- Supabase RLS documentation: https://supabase.com/docs/guides/database/row-level-security
- Supabase Vault documentation: https://supabase.com/docs/guides/database/vault
- Supabase Custom Claims & app_metadata vs user_metadata: https://supabase.com/docs/guides/database/postgres/custom-claims-and-role-based-access-control-rbac
- Stripe webhook signature verification: https://docs.stripe.com/webhooks/signature-verification
- OWASP Top 10 (2021): https://owasp.org/Top10/
- IRD GST rounding rules: https://www.ird.govt.nz/gst/filing-and-paying-gst-and-refunds/calculating-gst

### Secondary (MEDIUM confidence)

- CVE-2025-48757: Supabase missing RLS on 170+ apps — https://byteiota.com/supabase-security-flaw-170-apps-exposed-by-missing-rls/
- CVE-2025-29927: Next.js Middleware Authorization Bypass — https://projectdiscovery.io/blog/nextjs-middleware-authorization-bypass
- Stripe webhook raw body in Next.js App Router — https://kitson-broadhurst.medium.com/next-js-app-router-stripe-webhook-signature-verification-ea9d59f3593f
- BOLA/IDOR as #1 SaaS vulnerability — https://dzone.com/articles/secure-multi-tenancy-saas-developer-checklist
- Xero OAuth 2.0 token expiry and rotation — https://developer.xero.com/documentation/guides/oauth2/token-types

### Tertiary (LOW confidence)

- Multi-tenant SaaS suspension handling pattern — https://sollybombe.medium.com/handling-tenant-suspension-and-reactivation-gracefully-in-multi-tenant-saas-0af58945545a
- Supabase Storage Access Control — https://supabase.com/docs/guides/storage/security/access-control

---
*Research completed: 2026-04-04*
*Ready for roadmap: yes*
