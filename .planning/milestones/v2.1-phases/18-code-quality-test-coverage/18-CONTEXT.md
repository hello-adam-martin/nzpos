# Phase 18: Code Quality + Test Coverage - Context

**Gathered:** 2026-04-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Clean up the codebase (dead code removal, consistent error handling, TypeScript strict compliance) and fill test coverage gaps so that all money-touching critical paths have 80%+ line coverage with a hard CI gate. Covers QUAL-01 through QUAL-05 and TEST-01 through TEST-05.

</domain>

<decisions>
## Implementation Decisions

### Coverage Strategy
- **D-01:** Hard CI gate — GST, money, auth, RLS, Stripe webhooks, and Xero sync paths must maintain 80%+ line coverage. CI fails if any critical path drops below threshold.
- **D-02:** Critical path scope includes all money-touching code: `gst.ts`, `money.ts`, `resolveAuth.ts`, middleware auth, PIN auth, RLS tests, both Stripe webhook handlers (order + billing), and Xero sync logic. Broader than the REQUIREMENTS minimum.
- **D-03:** Use `@vitest/coverage-v8` as the coverage provider. Fast, native Node coverage, standard Vitest choice.
- **D-04:** Non-critical code has no minimum coverage threshold but coverage is reported for visibility.
- **D-05:** IRD specimen validation (TEST-05) uses real IRD-published GST calculation examples. Gold standard for compliance — no synthetic substitutes.

### Dead Code Removal
- **D-06:** Use automated tooling (knip) for dead code detection. Systematic scan for unused exports, files, and dependencies.
- **D-07:** Remove all flagged items aggressively. Trust the tooling — git history preserves anything needed later.
- **D-08:** Full dependency cleanup included — remove unused packages from package.json alongside source code cleanup.

### Error Handling
- **D-09:** Standardized Server Action response shape: `{ success: boolean, error?: string, data?: T }`. No stack traces in responses — user-friendly messages only.
- **D-10:** Route Handlers mirror the same pattern: `NextResponse.json({ success, error }, { status })` with appropriate HTTP status codes.
- **D-11:** Server-side error logging uses `console.error` with action name and store_id context. No logging library — Vercel captures console output. Keep it simple for v2.1.

### JSDoc Documentation
- **D-12:** All exported functions across the codebase get JSDoc comments. Not limited to the 5 named files in QUAL-05.
- **D-13:** Function-level detail: brief description + `@param` + `@returns`. No module-level essays. Enough for IDE hover tooltips.

### Claude's Discretion
- Claude determines the specific knip configuration and any necessary ignore patterns
- Claude determines the vitest coverage configuration thresholds per critical-path module
- Claude determines the plan breakdown (audit/scan phase vs fix phase vs test-writing phase)
- Claude determines database index recommendations for QUAL-04 performance review

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### GST & Money Logic
- `src/lib/gst.ts` — Core GST calculation logic (15%, tax-inclusive, per-line rounding)
- `src/lib/gst.test.ts` — Existing GST tests (baseline for coverage)
- `src/lib/money.ts` — Money arithmetic utilities
- `src/lib/money.test.ts` — Existing money tests

### Auth Flows
- `src/lib/resolveAuth.ts` — Auth resolution logic
- `src/middleware.ts` — Main middleware (tenant routing, auth checks)
- `src/middleware.test.ts` — Existing middleware tests

### RLS & Tenant Isolation
- `src/lib/__tests__/rls.test.ts` — Existing RLS integration tests (need v2.0 table coverage)
- `supabase/migrations/015_rls_policy_rewrite.sql` — Multi-tenant RLS rewrite
- `supabase/migrations/016_super_admin.sql` — Super admin role policies
- `supabase/migrations/020_super_admin_panel.sql` — Super admin panel policies

### Stripe Webhooks
- `src/app/api/webhooks/stripe/route.ts` — Order webhook handler
- `src/app/api/webhooks/stripe/webhook.test.ts` — Existing order webhook tests
- `src/app/api/webhooks/stripe/billing/route.ts` — Billing webhook handler
- `src/app/api/webhooks/stripe/billing/__tests__/billing.test.ts` — Existing billing tests

### Xero Sync
- `src/lib/xero/sync.ts` — Xero daily sales sync logic (if exists)
- `src/lib/xero/vault.ts` — Vault RPC access

### Complex Business Logic (JSDoc priority)
- `src/lib/requireFeature.ts` — JWT fast path + DB fallback feature gating
- `src/lib/tenantCache.ts` — Tenant cache with suspension check
- `src/actions/auth/provisionStore.ts` — Atomic store provisioning

### Security Audit (Phase 17 foundation)
- `.planning/phases/17-security-audit/17-01-SECURITY-AUDIT.md` — Security findings report (if exists)

### Configuration
- `vitest.config.mts` — Existing Vitest configuration (needs coverage addition)
- `tsconfig.json` — TypeScript config (strict: true already enabled)
- `package.json` — Dependencies and scripts

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- 52 test files already exist covering GST, money, RLS, middleware, webhooks, billing, super-admin actions, cash sessions, auth, and setup wizard
- Vitest 4.1.2 configured with `vitest.config.mts`
- ESLint 9 with eslint-config-next 16.2.1
- TypeScript strict mode already enabled

### Established Patterns
- Test files use `*.test.ts` / `*.test.tsx` naming convention
- Tests co-located with source files or in `__tests__/` subdirectories
- Server Actions in `src/actions/` directory (48 files)
- Route Handlers in `src/app/api/` directory

### Integration Points
- Coverage reporting needs to be added to `vitest.config.mts` and `package.json` scripts
- knip needs to be added as a dev dependency
- No coverage thresholds currently configured

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches for tooling configuration and test structure.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 18-code-quality-test-coverage*
*Context gathered: 2026-04-04*
