# Phase 17: Security Audit - Context

**Gathered:** 2026-04-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Verify every security boundary in the platform: tenant isolation (RLS), auth flows (owner/staff/customer/super admin), webhook integrity (Stripe signatures), input validation (Zod on all Server Actions), secrets hygiene (no leaks, complete .env.example), security headers (CSP), and audit trail completeness. Covers all 14 SEC requirements.

</domain>

<decisions>
## Implementation Decisions

### Audit Approach
- **D-01:** Risk-prioritized audit structure. Work through security boundaries in order of blast radius: (1) RLS tenant isolation, (2) Auth bypass vectors, (3) Webhook integrity, (4) Server Action validation, (5) Secrets/env hygiene, (6) CSP/security headers, (7) Audit trail completeness.
- **D-02:** Produce a formal SECURITY-AUDIT.md findings report with severity classification, then fix all issues in a separate pass. Discovery and remediation are separate plans.
- **D-03:** Cover all 14 SEC requirements plus opportunistic findings — flag anything suspicious found along the way without expanding scope.
- **D-04:** 3-level severity classification: Critical (data leak/auth bypass), High (missing validation/weak headers), Low (hygiene/documentation). Critical must be fixed; Low can be deferred.
- **D-05:** Complete full audit before fixing anything. Even Critical findings are documented first, then all fixes applied by severity. No stop-and-fix during discovery.

### CSP Header Policy
- **D-06:** Start with Content-Security-Policy-Report-Only. Switch to enforcing after verifying no false positives against Stripe JS, Supabase auth, and any other external resources.
- **D-07:** CSP headers set in existing Next.js middleware (src/middleware.ts) alongside tenant routing. Single location for all request-level security headers.
- **D-08:** Single CSP policy for all surfaces (storefront, POS, admin, super admin). No per-surface differentiation in v2.1 — the attack surface difference doesn't justify the maintenance cost.

### Secrets & Env Hygiene
- **D-09:** Grep all `process.env` references in the codebase, cross-check against .env.example, ensure nothing is missing and no undocumented vars exist.
- **D-10:** Scan current HEAD only for hardcoded secrets — no git history scan. Repo has always been private.

### Findings Handling
- **D-11:** Two-phase approach: Plan 1 is the systematic audit producing SECURITY-AUDIT.md. Plan 2+ is remediation of all findings ordered by severity. Clear separation between discovery and fix.

### Claude's Discretion
- Claude determines the specific CSP directives (script-src, style-src, connect-src, etc.) based on what external domains the app actually loads.
- Claude determines the optimal plan breakdown within the two-phase structure (audit → fix).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### RLS & Tenant Isolation
- `supabase/migrations/002_rls_policies.sql` — Original RLS policy definitions
- `supabase/migrations/009_security_fixes.sql` — Security-related migration fixes
- `supabase/migrations/015_rls_policy_rewrite.sql` — Multi-tenant RLS rewrite for v2.0
- `supabase/migrations/016_super_admin.sql` — Super admin role policies
- `supabase/migrations/020_super_admin_panel.sql` — Super admin panel policies
- `src/lib/__tests__/rls.test.ts` — Existing RLS integration tests

### Auth Flows
- `src/middleware.ts` — Main middleware (tenant routing, auth checks, JWT verification)
- `src/lib/supabase/admin.ts` — service_role admin client
- `src/lib/supabase/middlewareAdmin.ts` — Middleware admin client
- `src/lib/resolveAuth.ts` — Auth resolution logic
- `supabase/migrations/003_auth_hook.sql` — Custom JWT claims hook

### Webhook Integrity
- `src/app/api/webhooks/stripe/route.ts` — Order webhook handler
- `src/app/api/webhooks/stripe/billing/route.ts` — Billing webhook handler
- `src/app/api/webhooks/stripe/webhook.test.ts` — Webhook tests
- `src/app/api/webhooks/stripe/billing/__tests__/billing.test.ts` — Billing webhook tests

### Server Actions & Validation
- `src/actions/` — All 48 Server Action files (need to verify Zod usage in each)

### Secrets & Service Role
- `src/lib/supabase/admin.ts` — service_role key usage
- `src/lib/supabase/middlewareAdmin.ts` — service_role in middleware
- `src/actions/auth/ownerSignup.ts` — service_role for signup
- `src/actions/auth/provisionStore.ts` — service_role for store provisioning
- `src/lib/xero/vault.ts` — Vault RPC access with service_role
- `.env.example` — Environment variable template (20 lines, completeness TBD)

### Feature Gating
- `src/lib/requireFeature.ts` — JWT fast path + DB fallback (Phase 15 decision)
- `src/lib/tenantCache.ts` — Tenant cache with suspension check

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/__tests__/rls.test.ts` — Existing RLS test infrastructure, can be extended for v2.0 tables
- `src/lib/__tests__/schema.test.ts` — Schema validation tests
- `src/lib/signupRateLimit.ts` — Rate limiting already implemented for signup (SEC-13 partial)
- `src/middleware.ts` — Already handles tenant routing and auth; natural place for CSP headers

### Established Patterns
- `server-only` import guards on files using service_role (15 files have it)
- Zod validation pattern used across Server Actions (needs verification of completeness)
- Stripe `constructEvent()` for webhook signature verification (needs verification on both endpoints)
- SECURITY DEFINER RPCs for privileged operations (provision_store, vault access)

### Integration Points
- CSP headers will be added to middleware response alongside existing tenant routing headers
- SECURITY-AUDIT.md will be a new file in .planning/phases/17-security-audit/ or project docs/
- Fixes will touch migrations (if RLS gaps found), middleware (CSP), Server Actions (Zod gaps), and possibly .env.example

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches within the decisions above.

**Priority flags from STATE.md:**
- Verify JWT claims source from `raw_app_meta_data` not `user_metadata` — potential complete RLS bypass if incorrect
- Storage bucket policies may not exist in migrations (configured via Supabase dashboard) — must query `storage.policies` explicitly

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 17-security-audit*
*Context gathered: 2026-04-04*
