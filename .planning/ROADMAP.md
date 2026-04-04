# Roadmap: NZPOS

## Milestones

- ✅ **v1.0 MVP** — Phases 1-6 (shipped 2026-04-02). [Archive](milestones/v1.0-ROADMAP.md)
- ✅ **v2.0 SaaS Platform** — Phases 7-16 (shipped 2026-04-03). [Archive](milestones/v2.0-ROADMAP.md)
- 🚧 **v2.1 Hardening & Documentation** — Phases 17-20 (in progress)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1-6) — SHIPPED 2026-04-02</summary>

- [x] Phase 1: Foundation (5/5 plans) — completed 2026-04-01
- [x] Phase 2: Product Catalog (5/5 plans) — completed 2026-04-01
- [x] Phase 3: POS Checkout (6/6 plans) — completed 2026-04-01
- [x] Phase 4: Online Store (7/7 plans) — completed 2026-04-01
- [x] Phase 5: Admin & Reporting (6/6 plans) — completed 2026-04-01
- [x] Phase 6: Xero Integration (4/4 plans) — completed 2026-04-01

</details>

<details>
<summary>✅ v2.0 SaaS Platform (Phases 7-16) — SHIPPED 2026-04-03</summary>

- [x] Phase 7: Production Launch (3/3 plans) — completed 2026-04-02
- [x] Phase 8: Checkout Speed (3/3 plans) — completed 2026-04-02
- [x] Phase 9: Notifications (4/4 plans) — completed 2026-04-02
- [x] Phase 10: Customer Accounts (3/3 plans) — completed 2026-04-02
- [x] Phase 11: Partial Refunds (2/2 plans) — completed 2026-04-02
- [x] Phase 12: Multi-Tenant Infrastructure (4/4 plans) — completed 2026-04-02
- [x] Phase 13: Merchant Self-Serve Signup (3/3 plans) — completed 2026-04-03
- [x] Phase 14: Store Setup Wizard + Marketing (3/3 plans) — completed 2026-04-03
- [x] Phase 15: Stripe Billing + Feature Gating (4/4 plans) — completed 2026-04-03
- [x] Phase 16: Super Admin Panel (4/4 plans) — completed 2026-04-03

</details>

### 🚧 v2.1 Hardening & Documentation (In Progress)

**Milestone Goal:** Comprehensive security audit, code quality review, test coverage gap-filling, and full documentation suite to prepare the platform for external merchant onboarding and production deployment.

- [x] **Phase 17: Security Audit** — Verify tenant isolation, auth flows, webhook integrity, and input validation across the entire codebase (completed 2026-04-03)
- [x] **Phase 18: Code Quality + Test Coverage** — Remove dead code, enforce consistent error handling, fill test coverage gaps on critical paths (completed 2026-04-04)
- [x] **Phase 19: Developer Documentation** — Write setup guide, architecture overview, env var reference, and Server Action inventory (completed 2026-04-04)
- [ ] **Phase 20: Deployment + User Documentation** — Production runbook, merchant onboarding guide, and GST compliance explanation

## Phase Details

### Phase 17: Security Audit
**Goal**: Every security boundary in the platform is verified correct — tenant isolation holds, auth flows enforce all constraints, webhooks are signature-verified, and no secrets exist in source code
**Depends on**: Phase 16
**Requirements**: SEC-01, SEC-02, SEC-03, SEC-04, SEC-05, SEC-06, SEC-07, SEC-08, SEC-09, SEC-10, SEC-11, SEC-12, SEC-13, SEC-14
**Success Criteria** (what must be TRUE):
  1. Every database table with store_id has confirmed RLS policies for all four operations (SELECT/INSERT/UPDATE/DELETE), and storage bucket policies prevent cross-tenant file access
  2. Auth flows are verified: owner JWT expiry is enforced, staff PIN lockout fires after failed attempts, super admin routes reject regular merchant and staff sessions, and customer auth cannot invoke POS or admin Server Actions
  3. All 48 Server Actions accept Zod-validated input before touching the database, and no stack traces or secrets are exposed in error responses
  4. Stripe webhook handlers verify signatures via constructEvent() and both webhook secrets are environment-specific; all sensitive mutations are recorded in the immutable audit trail
  5. No secrets exist in source code, .env.example is complete and accurate, all service_role imports are guarded by server-only, and Content Security Policy headers are configured
**Plans:** 5/5 plans complete
Plans:
- [x] 17-01-PLAN.md — Systematic security audit producing SECURITY-AUDIT.md findings report
- [x] 17-02-PLAN.md — Fix Critical/High RLS, storage, Zod validation, and error leak findings
- [x] 17-03-PLAN.md — Fix Critical/High CSP headers, .env.example, and server-only guards
- [x] 17-04-PLAN.md — Fix Low severity findings: defense-in-depth server-only, PIN rate limiting, audit trail
- [x] 17-05-PLAN.md — Gap closure: server-only imports, drop anon orders policy, fix action count

### Phase 18: Code Quality + Test Coverage
**Goal**: The codebase is clean, consistent, and validated — dead code removed, error handling uniform, TypeScript strict mode passing, and critical paths have 80%+ test coverage
**Depends on**: Phase 17
**Requirements**: QUAL-01, QUAL-02, QUAL-03, QUAL-04, QUAL-05, TEST-01, TEST-02, TEST-03, TEST-04, TEST-05
**Success Criteria** (what must be TRUE):
  1. A vitest --coverage report exists showing per-file coverage; GST, money, auth, and RLS paths are at 80%+ line coverage
  2. RLS integration tests cover all v2.0 tables (add_ons, subscriptions, audit_logs, store_plans) and Stripe webhook handlers have tests for all subscription lifecycle events
  3. GST calculations are validated against IRD-published specimen examples and all test assertions pass
  4. Dead code is removed across all source files, Server Actions and Route Handlers have consistent error handling with no stack trace leaks, and TypeScript strict mode passes with zero errors or documented suppressions
  5. Complex business logic (gst.ts, requireFeature.ts, tenantCache.ts, xero/sync.ts, provision_store) has inline JSDoc documentation and performance-critical paths have confirmed database indexes
**Plans:** 4/4 plans complete
Plans:
- [x] 18-01-PLAN.md — Fix CI blockers (TS errors, failing tests) and install coverage infrastructure
- [x] 18-02-PLAN.md — Write critical-path tests (resolveAuth, tenantCache, IRD GST, RLS v2.0, Stripe lifecycle)
- [x] 18-03-PLAN.md — Dead code removal with knip (unused files, exports, dependencies)
- [x] 18-04-PLAN.md — Error handling standardization, JSDoc sweep, performance indexes

### Phase 19: Developer Documentation
**Goal**: Any developer (including the founder returning after months away) can clone the repo, configure environment variables, and have the app running locally within 20 minutes, with complete reference for the architecture and all Server Actions
**Depends on**: Phase 18
**Requirements**: DOC-01, DOC-02, DOC-03, DOC-04
**Success Criteria** (what must be TRUE):
  1. A local development setup guide exists and a new developer can follow it from clone to running app in under 20 minutes with no undocumented steps
  2. An environment variable reference table exists listing every variable with its name, purpose, source, and required/optional status — no env var is undocumented
  3. An architecture overview document exists covering the three auth systems (owner, staff PIN, customer), tenant isolation model (RLS + custom JWT claims + SECURITY DEFINER RPCs), feature gating dual-path, and key data flows
  4. A Server Action inventory exists cataloguing all actions with name, input schema, auth requirement, and description — the full 48-action surface area is documented
**Plans:** 3/3 plans complete
Plans:
- [x] 19-01-PLAN.md — Setup guide, env var reference, and seed script (DOC-01, DOC-02)
- [x] 19-02-PLAN.md — Architecture overview with auth, tenancy, feature gating (DOC-03)
- [x] 19-03-PLAN.md — Server Action inventory for all 48 actions (DOC-04)
**UI hint**: no

### Phase 20: Deployment + User Documentation
**Goal**: The platform can be deployed to production following a verified runbook, and a new merchant can complete their first sale end-to-end using the onboarding guide
**Depends on**: Phase 19
**Requirements**: DEPLOY-01, DEPLOY-02, DEPLOY-03, DEPLOY-04, USER-01, USER-02
**Success Criteria** (what must be TRUE):
  1. A production Supabase setup guide exists covering project creation, migration application in order, seed data (super admin user, default plans), auth config, storage buckets, and email templates
  2. A Stripe live key configuration checklist exists covering webhook endpoint registration, live vs test secret separation, and webhook replay verification; a Vercel production config guide covers wildcard DNS, env vars, and tenant routing verification
  3. A post-deploy smoke test checklist exists and a deployer can verify signup, product creation, POS sale, online order, Stripe payment, and Xero sync are all functioning
  4. A merchant onboarding guide exists walking through signup through first product through first sale through first online order — a new merchant can complete setup without support
  5. A GST compliance explanation exists that a non-technical merchant can read to understand how NZPOS handles 15% tax-inclusive pricing and IRD compliance
**Plans**: TBD

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|---------------|--------|-----------|
| 1. Foundation | v1.0 | 5/5 | Complete | 2026-04-01 |
| 2. Product Catalog | v1.0 | 5/5 | Complete | 2026-04-01 |
| 3. POS Checkout | v1.0 | 6/6 | Complete | 2026-04-01 |
| 4. Online Store | v1.0 | 7/7 | Complete | 2026-04-01 |
| 5. Admin & Reporting | v1.0 | 6/6 | Complete | 2026-04-01 |
| 6. Xero Integration | v1.0 | 4/4 | Complete | 2026-04-01 |
| 7. Production Launch | v2.0 | 3/3 | Complete | 2026-04-02 |
| 8. Checkout Speed | v2.0 | 3/3 | Complete | 2026-04-02 |
| 9. Notifications | v2.0 | 4/4 | Complete | 2026-04-02 |
| 10. Customer Accounts | v2.0 | 3/3 | Complete | 2026-04-02 |
| 11. Partial Refunds | v2.0 | 2/2 | Complete | 2026-04-02 |
| 12. Multi-Tenant Infrastructure | v2.0 | 4/4 | Complete | 2026-04-02 |
| 13. Merchant Self-Serve Signup | v2.0 | 3/3 | Complete | 2026-04-03 |
| 14. Store Setup Wizard + Marketing | v2.0 | 3/3 | Complete | 2026-04-03 |
| 15. Stripe Billing + Feature Gating | v2.0 | 4/4 | Complete | 2026-04-03 |
| 16. Super Admin Panel | v2.0 | 4/4 | Complete | 2026-04-03 |
| 17. Security Audit | v2.1 | 5/5 | Complete    | 2026-04-03 |
| 18. Code Quality + Test Coverage | v2.1 | 4/4 | Complete    | 2026-04-04 |
| 19. Developer Documentation | v2.1 | 3/3 | Complete   | 2026-04-04 |
| 20. Deployment + User Documentation | v2.1 | 0/TBD | Not started | - |
