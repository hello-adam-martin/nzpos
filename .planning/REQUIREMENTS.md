# Requirements: NZPOS

**Defined:** 2026-04-04
**Core Value:** A store owner can ring up a sale in-store and take an order online, from a single inventory that stays in sync, with GST handled correctly.

## v2.1 Requirements

Requirements for the Hardening & Documentation milestone. Each maps to roadmap phases.

### Security Audit

- [ ] **SEC-01**: All database tables have RLS policies with correct store_id filtering for SELECT/INSERT/UPDATE/DELETE
- [ ] **SEC-02**: Storage bucket policies prevent cross-tenant file access
- [ ] **SEC-03**: SECURITY DEFINER RPCs (provision_store, vault RPCs) validate caller identity and inputs
- [ ] **SEC-04**: Owner auth flow verifies JWT expiry enforcement and session cookie handling
- [ ] **SEC-05**: Staff PIN auth verifies lockout after failed attempts and 8h session expiry
- [ ] **SEC-06**: Super admin routes are inaccessible to regular merchants and staff
- [ ] **SEC-07**: Customer auth cannot access POS or admin Server Actions
- [ ] **SEC-08**: All 67 Server Actions use Zod validation before database access
- [ ] **SEC-09**: No secrets exist in source code and .env.example is complete and accurate
- [ ] **SEC-10**: service_role key imports are guarded by server-only in all files
- [ ] **SEC-11**: Stripe webhook handlers verify signatures via constructEvent()
- [ ] **SEC-12**: Content Security Policy headers configured for all routes
- [ ] **SEC-13**: Rate limiting verified on signup and extended to PIN login attempts
- [ ] **SEC-14**: All sensitive mutations are logged in audit trail and logs are immutable

### Code Quality

- [ ] **QUAL-01**: Dead code removed across all 336 source files using static analysis
- [ ] **QUAL-02**: Server Actions and Route Handlers have consistent error handling with no stack trace leaks
- [ ] **QUAL-03**: TypeScript strict mode passes with zero errors or documented suppressions
- [ ] **QUAL-04**: Performance-critical paths reviewed (GST calculations, stock decrements, product queries have proper indexes)
- [ ] **QUAL-05**: Complex business logic has inline JSDoc documentation (gst.ts, requireFeature.ts, tenantCache.ts, xero/sync.ts, provision_store)

### Test Coverage

- [ ] **TEST-01**: Test coverage report generated with vitest --coverage showing per-file coverage
- [ ] **TEST-02**: Critical paths (GST, money, auth, RLS) have 80%+ line coverage
- [ ] **TEST-03**: RLS integration tests cover v2.0 tables (add_ons, subscriptions, audit_logs, store_plans)
- [ ] **TEST-04**: Stripe webhook handlers tested for all subscription lifecycle events
- [ ] **TEST-05**: GST calculations validated against IRD-published specimen examples

### Developer Documentation

- [ ] **DOC-01**: Local development setup guide (clone to running app in under 20 minutes)
- [ ] **DOC-02**: Environment variable reference table (name, purpose, source, required/optional)
- [ ] **DOC-03**: Architecture overview document (auth systems, tenant isolation, feature gating, data flows)
- [ ] **DOC-04**: Server Action inventory (all actions: name, input schema, auth requirement, description)

### Deployment & Operations

- [ ] **DEPLOY-01**: Production Supabase setup guide (project creation, migrations, seed data, auth config)
- [ ] **DEPLOY-02**: Stripe live key configuration checklist (webhook endpoint, keys, verification)
- [ ] **DEPLOY-03**: Vercel production config guide (wildcard DNS, env vars, middleware verification)
- [ ] **DEPLOY-04**: Post-deploy smoke test checklist (signup, product, POS sale, online order, Stripe, Xero)

### User Documentation

- [ ] **USER-01**: Merchant onboarding guide (signup → first product → first sale → first online order)
- [ ] **USER-02**: GST compliance explanation for merchants (how NZPOS handles 15% tax-inclusive, IRD-compliant)

## Future Requirements

Deferred from v2.1. Tracked but not in current roadmap.

### Security

- **SEC-F01**: Structured RLS penetration test with documented results (two test tenants, crafted requests)
- **SEC-F02**: Full OWASP Top 10 formal assessment report

### Documentation

- **DOC-F01**: Contribution guide (branch naming, commit format, test requirements, PR process)
- **DOC-F02**: Admin dashboard reference documentation (each section, common tasks)
- **DOC-F03**: Data model diagram (ERD from Supabase schema)
- **DOC-F04**: Video walkthrough for merchants (5-minute Loom of first sale)
- **DOC-F05**: Decision log expansion (DECISIONS.md with tried-and-rejected context)

### Code Quality

- **QUAL-F01**: Structured logging pattern (request ID, store_id, action name)
- **QUAL-F02**: Automated migration CI check (GitHub Action with supabase db diff)

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| SOC 2 compliance audit | 6-12 month process with external auditors, premature at single-store launch |
| GDPR deep-dive | NZ operates under Privacy Act 2020, not GDPR. Document NZ compliance posture instead. |
| DAST scanner (OWASP ZAP) | High false positive rate against Next.js/Supabase. Manual targeted review is higher signal. |
| OpenAPI/Swagger docs | App uses Server Actions, not a public REST API. No audience for API docs. |
| i18n / localisation | Target market is NZ English speakers. Zero near-term audience for other languages. |
| Performance benchmarking suite | Meaningful benchmarks require production traffic. POS is single-user-per-store. |
| 100% test coverage enforcement | Coverage-gaming incentive. 80%+ on critical paths is the right target. |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| SEC-01 | Phase 17 | Pending |
| SEC-02 | Phase 17 | Pending |
| SEC-03 | Phase 17 | Pending |
| SEC-04 | Phase 17 | Pending |
| SEC-05 | Phase 17 | Pending |
| SEC-06 | Phase 17 | Pending |
| SEC-07 | Phase 17 | Pending |
| SEC-08 | Phase 17 | Pending |
| SEC-09 | Phase 17 | Pending |
| SEC-10 | Phase 17 | Pending |
| SEC-11 | Phase 17 | Pending |
| SEC-12 | Phase 17 | Pending |
| SEC-13 | Phase 17 | Pending |
| SEC-14 | Phase 17 | Pending |
| QUAL-01 | Phase 18 | Pending |
| QUAL-02 | Phase 18 | Pending |
| QUAL-03 | Phase 18 | Pending |
| QUAL-04 | Phase 18 | Pending |
| QUAL-05 | Phase 18 | Pending |
| TEST-01 | Phase 18 | Pending |
| TEST-02 | Phase 18 | Pending |
| TEST-03 | Phase 18 | Pending |
| TEST-04 | Phase 18 | Pending |
| TEST-05 | Phase 18 | Pending |
| DOC-01 | Phase 19 | Pending |
| DOC-02 | Phase 19 | Pending |
| DOC-03 | Phase 19 | Pending |
| DOC-04 | Phase 19 | Pending |
| DEPLOY-01 | Phase 20 | Pending |
| DEPLOY-02 | Phase 20 | Pending |
| DEPLOY-03 | Phase 20 | Pending |
| DEPLOY-04 | Phase 20 | Pending |
| USER-01 | Phase 20 | Pending |
| USER-02 | Phase 20 | Pending |

**Coverage:**
- v2.1 requirements: 34 total
- Mapped to phases: 34
- Unmapped: 0 ✓

---
*Requirements defined: 2026-04-04*
*Last updated: 2026-04-04 — traceability populated after roadmap creation*
