# Feature Landscape

**Domain:** Hardening & Documentation — multi-tenant SaaS POS preparing for production launch
**Researched:** 2026-04-04
**Confidence:** HIGH — domain is well-established engineering practice; specifics drawn from OWASP, Next.js App Router patterns, and project codebase analysis

---

## Scope Note

This document covers **v2.1 Hardening & Documentation** — the milestone that bridges a shipped SaaS platform (336 source files, 36,329 LOC, 365+ tests) to a production-ready product that can be onboarded by external merchants with confidence.

The research question: for a multi-tenant Next.js + Supabase + Stripe SaaS app at this stage, what are table stakes vs differentiators across security audit, code quality, test coverage, API documentation, developer documentation, user documentation, and deployment readiness?

Prior milestones (v1.0, v2.0) are shipped. All feature work is complete. This milestone is entirely about hardening, validation, and documentation.

---

## Table Stakes

These are non-negotiable for a production launch. Missing any of these is a liability — either a security exposure, an onboarding blocker, or a support burden.

### Security Audit

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| RLS policy review for all tables | Row-level security is the primary tenant isolation mechanism. A misconfigured policy = data leak between tenants. One missed table is catastrophic. | MEDIUM | Audit every table in Supabase schema: stores, products, orders, order_items, customers, subscriptions, add_ons, audit_logs, etc. Verify `store_id` filter is on SELECT/INSERT/UPDATE/DELETE. Check SECURITY DEFINER RPCs. |
| Auth flow verification (owner + staff PIN) | Owner email/password via Supabase Auth and staff PIN via custom jose JWT are two separate auth systems. Both must be verified end-to-end. | MEDIUM | Verify: JWT expiry enforced, PIN lockout fires correctly, staff session cannot escalate to owner privileges, PINs are hashed (not plaintext) in DB. |
| Server Action input validation audit | Every Server Action must use `z.safeParse()` before DB access. Unvalidated inputs = SQL injection surface or data corruption. | MEDIUM | Grep for Server Actions without Zod validation. 67 action files to check. Flag any that accept user input without schema validation. |
| OWASP Top 10 spot-check | Industry baseline. Investors, enterprise merchants, and penetration testers will ask about this. | MEDIUM | Check: injection (Zod covers most), broken auth (both auth systems), sensitive data exposure (Xero tokens in Vault, env vars), security misconfiguration (Supabase anon key vs service_role boundaries), insecure direct object references (store_id RLS), CSRF (Server Actions have CSRF protection built-in in Next.js). |
| Stripe webhook signature verification | Webhooks without signature verification = any attacker can fake subscription events, granting free access to paid features. | LOW | Confirm `stripe.webhooks.constructEvent()` is called with `STRIPE_WEBHOOK_SECRET` in all webhook handlers. Currently one handler in `/api/webhooks/stripe/`. |
| Environment variable audit | Secrets in source code, .env committed, or wrong keys in production are common pre-launch failures. | LOW | Verify: no secrets in source, .env.example is complete and accurate, service_role key is never exposed to client bundle, STRIPE_SECRET_KEY vs STRIPE_PUBLISHABLE_KEY usage is correct. |
| Super admin route protection | Super admin panel must be completely inaccessible to regular merchants. A bypassed check here = full platform compromise. | LOW | Verify `is_super_admin` check cannot be bypassed. Confirm it reads from JWT claim or server-side DB check — not client-provided data. |
| Supabase anon vs service_role boundary | `service_role` bypasses RLS entirely. Any file importing the admin client must be server-only. A client-side import of the admin client = all RLS bypassed for all tenants. | LOW | Grep for `createClient` with service_role key. Confirm `server-only` guard is on every file that imports it. 15 files in `src/lib` currently have service_role usage — all must be verified. |

### Code Quality Review

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Dead code removal | 336 source files across 16 phases. Refactors and pivots leave orphaned exports, unused imports, and commented-out logic. Dead code confuses future developers and inflates bundle size. | MEDIUM | Use TypeScript compiler + ESLint `no-unused-vars` to surface. Manual review of flagged items. Focus on large files. |
| Consistent error handling | Unhandled rejections in Server Actions return 500 errors to users. Error handling must be uniform: try/catch, structured error returns, user-facing messages vs internal logs. | MEDIUM | Audit Server Actions and Route Handlers. Verify every async path has error handling. Check that error messages don't leak stack traces to clients. |
| TypeScript strict mode compliance | `strict: true` catches null dereferences, implicit any, and unchecked index access. Any type suppressions (`as any`, `!` non-null assertions) should be documented and justified. | LOW | Run `tsc --strict --noEmit`. Count and triage errors. Fix or document with justification. |
| Performance-critical path review | Money calculations, GST rounding, and stock decrements are correctness-critical. Any slow query on a hot path (POS checkout, storefront product list) needs a Supabase index. | MEDIUM | Check: RLS policies don't cause full table scans (add indexes on `store_id` columns if missing), N+1 queries in product list or order history, Server Component data fetching patterns. |
| Inline documentation for complex business logic | GST calculation, Xero sync, tenant provisioning, `requireFeature()` dual-path, `provision_store` RPC — these are non-obvious. Future maintainers (including the solo developer after 6 months away) need comments. | MEDIUM | JSDoc comments on `gst.ts`, `xero/sync.ts`, `requireFeature.ts`, `tenantCache.ts`, `provision_store` migration. Explain the "why", not the "what". |

### Test Coverage Gap Analysis

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Coverage report generation | 365+ tests exist but coverage distribution is unknown. Some critical paths may have zero tests while utility functions have exhaustive coverage. | LOW | Run `vitest --coverage`. Identify files below 80% coverage. Prioritize: GST logic, money utilities, Server Actions, RLS integration. |
| GST and money calculation coverage | Per-line GST on discounted amounts is the IRD-compliance core. If this breaks, the product is non-compliant. Must be 100% covered. | LOW | `gst.ts` and `money.ts` already have tests. Verify edge cases: zero price, 100% discount, fractional cents, large orders. |
| Authentication path coverage | Staff PIN lockout, owner session expiry, super admin guard — authentication failures are the highest-risk paths. | MEDIUM | Verify: PIN lockout after N failures, expired JWT handling, session cookie manipulation, super admin bypass attempts. |
| Webhook handler coverage | Stripe webhooks update subscription state. Missing coverage here = undetected billing bugs. | MEDIUM | Test: subscription.created, subscription.updated, subscription.deleted, invoice.payment_failed. Each event type with valid and invalid payloads. |
| RLS integration tests | The existing `rls.test.ts` covers initial RLS. Verify v2.0 tables (add_ons, subscriptions, audit_logs) are also covered. Cross-tenant access attempts must fail. | MEDIUM | Expand `rls.test.ts` or add `rls-v2.test.ts`. Test: tenant A cannot read tenant B's data on any table. |

### Developer Documentation

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Setup guide (local dev) | Without this, a new contributor (or the founder returning after 3 months) cannot run the project. | LOW | Steps: clone, install, env vars, Supabase local, seed data, run dev. Should take under 20 minutes to follow. |
| Environment variable reference | 336 source files with multiple env vars. What is each one? Where does it come from? What breaks if it's missing? | LOW | Table: variable name, purpose, where to get it, required vs optional, which environments. |
| Architecture overview | The system has non-obvious patterns: custom JWT claims for RLS, dual-path `requireFeature()`, separate staff PIN auth, SECURITY DEFINER RPCs, tenant cache. These need documentation. | MEDIUM | Diagrams or prose: tenant isolation model, auth system map (owner vs staff vs super admin), feature gating architecture, data flow for POS sale, data flow for online order. |
| Server Action + Route Handler inventory | 67 action files, multiple API route directories. Developers need a map of what exists and what it does. | MEDIUM | Table or structured list: action name, input schema, auth required, what it does, what it returns. |
| Contribution guide | When a second developer joins (or the founder hires a contractor), they need conventions: branch naming, commit format, test requirements, PR process. | LOW | Brief guide: how to run tests, what to test, code style, how phases/plans work with GSD, how to update PROJECT.md. |

### Deployment Runbook

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Production Supabase setup | Supabase free tier is used for development. Production requires a Supabase project with proper settings: connection pooling, prod credentials, migration application. | MEDIUM | Step-by-step: create org + project, apply migrations in order, seed required data (super admin user, default plans), configure auth providers, set up storage buckets, configure email templates. |
| Stripe live key configuration | Test keys and live keys are different. Going live requires: live publishable key, live secret key, live webhook endpoint registered with Stripe, live webhook signing secret. | LOW | Checklist: register webhook endpoint in Stripe dashboard, copy live keys to Vercel env vars, verify webhook handler receives live events, test with a real card. |
| Vercel production config | Wildcard subdomains require DNS delegation. Custom domains require Vercel project configuration. Environment variables in Vercel must match .env.example. | MEDIUM | Steps: add `*.nzpos.app` wildcard DNS, configure Vercel env vars (production vs preview vs development), verify Next.js middleware runs on correct domains, test tenant routing end-to-end. |
| Database migration strategy | 16 phases of migrations must apply in order. A missed or out-of-order migration breaks the schema. | LOW | Document: migration file naming convention, how to apply to a new Supabase project, how to verify schema is correct, rollback approach if a migration fails. |
| Monitoring and alerting baseline | A production SaaS with external merchants needs error visibility. Silent failures in Stripe webhooks, Xero sync, or email delivery are undetectable without monitoring. | LOW | Minimum viable: Vercel error logs, Supabase logs, Stripe dashboard for failed webhook deliveries. Document how to check each. Add Sentry or similar when budget allows. |

### User-Facing Documentation

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Merchant onboarding guide | The setup wizard covers UI steps. Documentation covers: what the POS is, how to take a first sale, how the storefront works, how inventory syncs. Without this, support volume is high. | MEDIUM | Format: step-by-step with screenshots. Scope: signup → first product → first sale → first online order. Not a full manual — the critical first-hour experience. |
| Admin dashboard reference | 336 source files means a large feature surface. Merchants navigating the admin for the first time need a map. | MEDIUM | Structured reference: each section of admin (Products, Orders, Reports, Billing, Settings), what it does, common tasks. |
| GST and compliance explanation | NZ merchants need to trust that GST is handled correctly. A brief explanation of how NZPOS handles GST (15%, tax-inclusive, per-line rounding, IRD-compliant) builds confidence and reduces support tickets about "why does the GST number look different?" | LOW | Short prose in merchant docs. Link to the relevant IRD guidance. |

---

## Differentiators

Hardening work that goes beyond baseline and meaningfully differentiates a serious production product.

### Security

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Rate limiting on auth and signup endpoints | Prevents brute-force PIN attacks, credential stuffing on owner login, and spam signups. Most SaaS apps skip this at launch and regret it. | MEDIUM | The project has `signupRateLimit.ts` — verify it's applied and effective. Extend to PIN login attempts. Use Upstash Redis or Vercel KV for distributed rate limit state (free tier available). |
| Penetration testing of RLS isolation | Automated RLS tests verify logic. Manual pen test attempts to leak cross-tenant data via crafted requests, malformed JWTs, or exploiting SECURITY DEFINER functions. Gives high confidence in isolation. | MEDIUM | Structured test: use two test tenants, attempt cross-tenant reads via REST API, GraphQL (if enabled), RPC calls. Document results. |
| Audit log completeness review | v2.0 includes an audit trail for super admin actions. Verify: all sensitive mutations are logged (suspend, plan override, Xero token access), log entries are immutable (no UPDATE/DELETE on audit_log table), logs are retained. | LOW | Check RLS on audit_log table: INSERT allowed for service_role, no UPDATE or DELETE. Verify trigger or explicit log call on all sensitive actions. |
| Content Security Policy headers | CSP prevents XSS attacks from injecting scripts. Next.js makes CSP configuration easy via `next.config.ts` headers. Uncommon at early-stage SaaS but meaningful for merchant trust. | LOW | Add CSP headers: `default-src 'self'`, allow Stripe.js, Supabase CDN, and any other third-party scripts. Use report-only mode first to catch violations. |

### Code Quality

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| GST specimen test suite | The IRD publishes GST calculation specimens. A test suite that directly validates against IRD-published examples is a genuine compliance artifact. Gives merchants and accountants confidence that the software is correct. | LOW | Locate IRD GST rounding examples (integer cents, per-line). Add them as named test cases in `gst.test.ts`. Comment with IRD source. |
| Money invariant tests | Integer-only arithmetic is correct, but tests should assert the invariants: no floating point results, no values below zero, refund amounts never exceed original. | LOW | Add property-based tests or explicit invariant assertions to `money.test.ts`. |
| Structured logging pattern | `console.log` scattered through Server Actions makes production debugging hard. A structured logger (with request ID, store_id, action name) makes logs searchable in Vercel. | MEDIUM | Thin wrapper around `console.log` that adds context. Not a full observability stack — just consistent format. Replace raw `console.log` in Server Actions with the structured logger. |

### Documentation

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Data model diagram | ERD or table-relationship diagram for the Supabase schema. Enormously useful for onboarding developers, debugging, and understanding foreign key chains (store → products → order_items, etc.). | LOW | Can be generated from Supabase schema inspector or drawn in Mermaid. Embed in ARCHITECTURE.md. |
| Decision log | PROJECT.md already has a key decisions table. Expanding it with the "what we tried and rejected" context — especially for GST rounding, Xero token storage, and staff PIN design — is rare but valuable for a codebase that will be maintained for years. | LOW | Add to PROJECT.md or a separate `DECISIONS.md`. Each entry: decision, date, rationale, outcome. |
| Video walkthrough (merchant-facing) | A 5-minute Loom of taking a first sale through the POS and fulfilling an online order converts better than written docs for non-technical merchant users. | MEDIUM | Record after deployment runbook is complete (requires live Supabase + Stripe). Not a blocker for written docs. |

### Deployment

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Smoke test suite post-deploy | After deploying to production, run a structured smoke test: sign up a new merchant, create a product, take a POS sale, place a storefront order, verify Stripe payment, check Xero sync. Catches environment misconfigurations immediately. | MEDIUM | Checklist format in runbook. Could be partially automated with Playwright against the production URL. |
| Automated migration CI check | GitHub Action that runs `supabase db diff` on PRs to catch schema drift. Prevents "works on dev, breaks on prod" migration failures. | MEDIUM | Supabase CLI supports this. Requires Supabase access token in GitHub secrets. Appropriate to add now before the codebase grows further. |

---

## Anti-Features

Things that are commonly added during hardening milestones but create more work than value at this stage.

| Anti-Feature | Why Requested | Why Problematic | Alternative |
|--------------|---------------|-----------------|-------------|
| Full SOC 2 compliance audit | "We're a SaaS, we need SOC 2" | SOC 2 Type II is a 6-12 month process involving external auditors. Premature at single-store launch. The audit requires logging infrastructure, access controls, and organizational policies that don't yet exist. | OWASP Top 10 review + RLS audit + documented key management is the appropriate baseline. Revisit SOC 2 when first enterprise merchant requires it. |
| GDPR compliance deep-dive | "We handle personal data" | NZ operates under the Privacy Act 2020 (not GDPR). The relevant compliance is the NZ Privacy Principles. A full GDPR implementation (right to erasure workflows, DPA agreements, cookie consent banners) is over-scoped. | Document Privacy Act 2020 compliance posture: what data is collected, how it's stored, how merchants can delete a customer. Soft-delete pattern for customer records. |
| Automated security scanner (DAST) | "Run OWASP ZAP against production" | DAST tools generate large volumes of false positives against Next.js/Supabase apps. Triaging results takes more time than the targeted manual review justified by this codebase's size. | Manual OWASP Top 10 review + structured RLS pen test is higher signal for this app. |
| Full API documentation site (OpenAPI/Swagger) | "Document all API endpoints" | This app uses Server Actions for most mutations — not a REST API. Route Handlers exist for webhooks, Stripe, and Xero callbacks, but they're not a public API. Generating OpenAPI docs for internal webhook handlers has no audience. | Document Server Actions in a structured table in ARCHITECTURE.md. Reserve OpenAPI for when a public API is actually needed (v3+). |
| i18n / localisation | "Support multiple languages for documentation" | The target market is NZ English speakers. Multiple language support adds translation workflow overhead with zero near-term audience. | Write all docs in NZ English. Localise if and when a non-English-speaking market is targeted. |
| Comprehensive performance benchmarking suite | "We need p95 latency baselines" | Meaningful performance benchmarks require production traffic patterns. Synthetic benchmarks against a dev environment are misleading. The POS is single-user-per-store; latency is not the constraint. | Document known performance considerations (index on store_id, avoid N+1 in product list). Add Vercel analytics after launch for real data. |
| Full test coverage enforcement (100%) | "We should have 100% coverage" | 100% coverage is a coverage-gaming incentive, not a quality metric. It encourages trivial tests for getters/setters while not improving coverage of complex conditional paths. Supabase RLS integration tests and GST edge cases are higher value than 100% line coverage. | Target 80%+ on critical paths (GST, money, auth, RLS). Accept lower coverage on UI components and boilerplate. |

---

## Feature Dependencies

```
Security audit
    └──requires──> RLS policy review (must happen before deployment)
    └──requires──> Auth flow verification (must happen before external merchants)
    └──requires──> Webhook signature verification (must be confirmed, not assumed)
    └──informs──> Test coverage gaps (audit reveals untested paths)

Deployment runbook
    └──requires──> Environment variable audit (know what vars are needed)
    └──requires──> Database migration strategy (know migration order)
    └──requires──> Stripe live key configuration
    └──requires──> Production Supabase setup
    └──enables──> Smoke test suite (needs production to run against)
    └──enables──> Merchant onboarding guide (screenshots require live environment)

Developer documentation
    └──requires──> Architecture is stable (don't document what's about to change)
    └──requires──> Server Action inventory (must enumerate what exists)
    └──informs──> Contribution guide (conventions must be agreed before documenting)

User-facing documentation
    └──requires──> Deployment runbook complete (screenshots need live environment)
    └──requires──> Feature set stable (docs for shipped v2.1 features, not in-progress)
    └──enhances──> Merchant onboarding (reduces time-to-first-sale)

Test coverage gap analysis
    └──requires──> Coverage report run (vitest --coverage)
    └──informs──> Which security paths need additional tests
    └──informs──> Whether GST/money coverage is complete

Code quality review
    └──requires──> Dead code removal (before documenting architecture, remove what's dead)
    └──informs──> Inline documentation (document complex code that survives review)
    └──enhances──> Developer documentation (cleaner code = easier to document)
```

### Dependency Notes

- **Security audit must precede external merchant onboarding.** RLS and auth verification cannot be deferred — they're the foundation of multi-tenant trust.
- **Deployment runbook must precede user documentation.** Screenshots and URLs in merchant docs require a live production environment.
- **Code quality review should precede inline documentation.** Documenting code that will be removed is wasted work.
- **Test coverage gaps should be filled before the security audit is declared complete.** Untested auth paths are unknown security posture.

---

## MVP Definition for v2.1

### Must Complete Before First External Merchant (P0)

Non-negotiable. These are active liabilities if skipped.

- [ ] RLS policy audit across all tables (new v2.0 tables: add_ons, subscriptions, audit_logs, store_wizard_state) — security liability
- [ ] Auth flow verification: PIN lockout, JWT expiry, super admin guard — security liability
- [ ] Stripe webhook signature verification confirmed — billing integrity
- [ ] Server Action Zod validation audit (67 action files) — input safety
- [ ] Environment variable audit + .env.example updated — deployment blocker
- [ ] Deployment runbook: production Supabase + Stripe live keys + Vercel wildcard DNS — launch blocker
- [ ] Setup guide (local dev) — developer productivity, solo dev returning after time away

### High Value, Ship Early in Milestone (P1)

- [ ] Test coverage report — identify gaps before shipping to production
- [ ] RLS integration tests for v2.0 tables (add_ons, subscriptions, audit_logs)
- [ ] Webhook handler test coverage (Stripe subscription events)
- [ ] Inline documentation for: `gst.ts`, `requireFeature.ts`, `tenantCache.ts`, `xero/sync.ts`, `provision_store` RPC
- [ ] Architecture overview document (auth systems map, tenant isolation model, feature gating)
- [ ] Server Action inventory (67 actions, what each does, auth required)
- [ ] Merchant onboarding guide (first sale walkthrough)
- [ ] Smoke test checklist post-deploy

### Meaningful but Deferrable (P2)

- [ ] Dead code removal — code quality, not correctness
- [ ] Consistent error handling audit — user experience improvement
- [ ] TypeScript strict mode compliance check — developer quality
- [ ] Content Security Policy headers — security hardening above baseline
- [ ] Structured logging pattern — production debugging quality
- [ ] Admin dashboard reference documentation
- [ ] Contribution guide
- [ ] Data model diagram (ERD)
- [ ] Rate limiting audit and extension to PIN login
- [ ] Audit log completeness review

### Nice to Have (P3)

- [ ] GST IRD specimen test suite — compliance confidence artifact
- [ ] Video walkthrough for merchants — conversion aid, not a support substitute
- [ ] Automated migration CI check — developer tooling
- [ ] Decision log / DECISIONS.md expansion
- [ ] Penetration testing of RLS isolation (structured, documented)

---

## Feature Prioritization Matrix

| Feature | Value | Cost | Priority |
|---------|-------|------|----------|
| RLS policy audit (v2.0 tables) | HIGH | MEDIUM | P0 |
| Auth flow verification | HIGH | MEDIUM | P0 |
| Stripe webhook signature verification | HIGH | LOW | P0 |
| Server Action Zod audit | HIGH | MEDIUM | P0 |
| Env var audit + .env.example | HIGH | LOW | P0 |
| Production deployment runbook | HIGH | MEDIUM | P0 |
| Local dev setup guide | HIGH | LOW | P0 |
| Test coverage report | HIGH | LOW | P1 |
| RLS tests for v2.0 tables | HIGH | MEDIUM | P1 |
| Webhook handler test coverage | HIGH | MEDIUM | P1 |
| Inline docs (GST, requireFeature, tenantCache, Xero, provision_store) | HIGH | MEDIUM | P1 |
| Architecture overview | HIGH | MEDIUM | P1 |
| Server Action inventory | MEDIUM | MEDIUM | P1 |
| Merchant onboarding guide | HIGH | MEDIUM | P1 |
| Smoke test checklist | HIGH | LOW | P1 |
| Dead code removal | MEDIUM | MEDIUM | P2 |
| Error handling consistency | MEDIUM | MEDIUM | P2 |
| TypeScript strict check | MEDIUM | LOW | P2 |
| CSP headers | MEDIUM | LOW | P2 |
| Structured logging | MEDIUM | MEDIUM | P2 |
| Admin dashboard reference | MEDIUM | MEDIUM | P2 |
| Contribution guide | MEDIUM | LOW | P2 |
| ERD / data model diagram | MEDIUM | LOW | P2 |
| Rate limiting audit | MEDIUM | MEDIUM | P2 |
| Audit log completeness | MEDIUM | LOW | P2 |
| GST IRD specimen tests | LOW | LOW | P3 |
| Merchant video walkthrough | MEDIUM | MEDIUM | P3 |
| Automated migration CI | LOW | MEDIUM | P3 |
| Decision log expansion | LOW | LOW | P3 |
| RLS pen test (structured) | MEDIUM | HIGH | P3 |

---

## Domain-Specific Complexity Notes

### What Makes This Harder Than a Typical SaaS Hardening

**Two auth systems.** Owner Supabase Auth + staff PIN jose JWTs are independent. Both must be audited. Edge cases: can a staff PIN JWT be used to trigger owner-level Server Actions? Can an expired owner session fall through to staff permissions?

**Custom JWT claims for RLS.** The `store_id` claim in JWTs is not Supabase-native — it's a custom claim that drives all RLS policies. If the claim is missing from a JWT (new auth flow, edge case), RLS policies that use it fall back to no-match = no data (safe) or might error. Verify the fallback is safe silence, not an exception that breaks the request.

**SECURITY DEFINER RPCs.** `provision_store` runs with elevated privileges. Any flaw in its input validation allows privilege escalation. It must be audited in isolation: what inputs does it accept? Does it validate the caller's identity? Can it be called by a merchant to overprovision?

**67 Server Actions across 16 phases.** These were written incrementally. Patterns evolved. Early actions may not follow conventions established in later phases. The audit must be systematic, not spot-check.

**Xero tokens in Supabase Vault.** Vault access is service_role only, via SECURITY DEFINER RPCs. This is a correct pattern but must be verified: are there any paths that expose Vault values to the client bundle or logs?

---

## Sources

- OWASP Top 10 (2021, remains current): https://owasp.org/Top10/ — HIGH confidence
- Next.js App Router security guidance: https://nextjs.org/docs/app/guides/authentication — HIGH confidence
- Supabase RLS documentation: https://supabase.com/docs/guides/database/row-level-security — HIGH confidence
- Supabase Vault documentation: https://supabase.com/docs/guides/database/vault — HIGH confidence
- Stripe webhook signature verification: https://docs.stripe.com/webhooks/signature-verification — HIGH confidence
- Next.js security headers: https://nextjs.org/docs/app/api-reference/config/next-config-js/headers — HIGH confidence
- Codebase analysis: 336 source files, 67 action files in `src/actions/`, 51 lib files in `src/lib/`, 570 test files — direct inspection
- PROJECT.md analysis: known gaps (DEPLOY-02/03/04 pending, human UAT pending) — direct read

---

*Feature research for: NZPOS v2.1 Hardening & Documentation*
*Researched: 2026-04-04*
