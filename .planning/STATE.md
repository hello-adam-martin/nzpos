---
gsd_state_version: 1.0
milestone: v2.1
milestone_name: Hardening & Documentation
status: verifying
stopped_at: Phase 19 context gathered
last_updated: "2026-04-04T02:32:00.976Z"
last_activity: 2026-04-04
progress:
  total_phases: 4
  completed_phases: 2
  total_plans: 9
  completed_plans: 9
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-04)

**Core value:** A store owner can ring up a sale in-store and take an order online, from a single inventory that stays in sync, with GST handled correctly.
**Current focus:** Phase 18 — code-quality-test-coverage

## Current Position

Phase: 19
Plan: Not started
Status: Phase complete — ready for verification
Last activity: 2026-04-04

Progress: [░░░░░░░░░░] 0%

## Performance Metrics

**Velocity:**

- Total plans completed: 0 (v2.1)
- Average duration: — min
- Total execution time: — hours

*Updated after each plan completion*

## Accumulated Context

### Decisions

- [v2.0]: Per-add-on billing model (not plan tiers) — avoids upgrade cliffs, NZ market expects no-card signup
- [v2.0]: Custom domains deferred to v2.1 — too complex, lowest immediate demand
- [Phase 15]: requireFeature never throws — returns structured { authorized, feature, upgradeUrl } for redirect-friendly caller pattern
- [Phase 15]: Billing webhook uses STRIPE_BILLING_WEBHOOK_SECRET (not STRIPE_WEBHOOK_SECRET) — separate endpoint, separate signing secret
- [Phase 16]: Cached-path suspension check adds one indexed DB lookup per request — accepted for correctness across serverless instances
- [Phase 16]: super admin check runs before staff/customer in auth hook (cross-tenant, no store_id required)
- [Phase 17-01]: orders_public_read RLS policy is IDOR — any anon user can enumerate all online orders; Critical fix required
- [Phase 17-01]: 13 env vars missing from .env.example including all Stripe price IDs, Xero OAuth vars, Resend keys — Critical deployment blocker
- [Phase 17-01]: increment_promo_uses and restore_stock SECURITY DEFINER RPCs have no GRANT/REVOKE — any authenticated user can call them
- [Phase 17-03]: CSP set as Report-Only — allows violation monitoring before switching to enforcing in production
- [Phase 17-03]: addSecurityHeaders() helper pattern in middleware — single function wraps all return points, DRY and maintainable
- [Phase 17-03]: server-only placed after 'use server' in Server Actions — 'use server' must be first statement per Next.js spec
- [Phase 17]: orders_public_read policy changed to require lookup_token IS NOT NULL as DB-layer defense in depth (application layer enforces token via .eq() filter)
- [Phase 17]: SECURITY DEFINER RPCs (increment_promo_uses, restore_stock, check_rate_limit, complete_pos_sale, complete_online_sale) restricted to service_role via REVOKE/GRANT in migration 021
- [Phase 17]: All 9 modified Server Actions now log real errors server-side with console.error before returning generic client messages — no PostgreSQL error details exposed to clients
- [Phase 17-04]: IP rate limit threshold for PIN login set at 20/5min (not 10) — allows multiple staff shift-changes on shared iPad; check_rate_limit RPC used (not in-memory) for cold-start survival
- [Phase 17-04]: All Server Action files (46 total) have direct server-only import — defense-in-depth against accidental client bundling
- [Phase 17-05]: Drop orders_public_read_by_token RLS policy — admin client bypasses RLS, anon policy was enumeration vector with no legitimate use
- [Phase 17-05]: ROADMAP.md Server Action count was already 48 — only REQUIREMENTS.md SEC-08 needed correction
- [Phase 18]: Mock resolveStaffAuth at module level in tests (not next/headers+jose individually) — resolveAuth calls both cookies() and headers(), mocking only one was insufficient
- [Phase 18]: Coverage thresholds set at per-file 80% for 8 critical paths; thresholds for resolveAuth, tenantCache, middleware expected to fail until Plan 02 writes those tests
- [Phase 18]: tailwindcss and postcss added to knip ignoreDependencies — CSS directive imports not detected by knip static analysis
- [Phase 18]: scripts/generate-icons.ts treated as entry point in knip.json — one-off CLI scripts must be entries, not project files
- [Phase 18]: IRD specimen tests in separate gst.ird.test.ts to distinguish compliance from implementation tests
- [Phase 18]: Middleware tests expanded in-plan (was at 50.94%) — added 17 tests covering webhook passthrough, tenant resolution, admin/POS protection
- [Phase 18]: RPC structured error parsing uses local alias variable to avoid error.message in return path while preserving OUT_OF_STOCK/PRODUCT_NOT_FOUND code detection in completeSale
- [Phase 18]: customerSignup duplicate detection uses error.status === 422 (not error.message string match) — more robust against Supabase API changes

### Pending Todos

None.

### Blockers/Concerns

- Wildcard SSL requires Vercel nameserver delegation (NS delegation, not CNAME) — must be resolved before production deploy (Phase 20)
- Supabase free tier limits (500MB DB, 50K MAU) — validate before onboarding >20 merchants; plan Pro upgrade timing
- Phase 17 priority: verify JWT claims source from raw_app_meta_data not user_metadata — potential complete RLS bypass if incorrect
- Phase 17 priority: storage.objects policies may not exist in migrations (configured via dashboard) — must run SELECT * FROM storage.policies explicitly

## Session Continuity

Last session: 2026-04-04T02:32:00.973Z
Stopped at: Phase 19 context gathered
Resume file: .planning/phases/19-developer-documentation/19-CONTEXT.md
